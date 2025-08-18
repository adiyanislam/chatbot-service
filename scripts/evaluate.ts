// scripts/evaluate.ts
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// We'll set up a separate database pool just for this script.
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'myuser',
  password: 'mypassword',
  database: 'dija_ai_db',
});

// Here we define the model we're testing and how many tests to run.
const MODEL_BEING_TESTED = 'phi3';
const NUMBER_OF_TESTS = 20;

/**
 * We need a function to grab a random text chunk from our database to use as context.
 */
const getRandomChunk = async (): Promise<string | null> => {
  const result = await pool.query('SELECT chunk_text FROM content_chunks ORDER BY RANDOM() LIMIT 1');
  return result.rows[0]?.chunk_text || null;
};

/**
 * We'll use another AI (Mistral) to generate questions based on the context we find.
 */
const generateQuestionFromContext = async (context: string): Promise<string> => {
    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          messages: [{
            role: 'user',
            content: `Based on the following text, please generate one single, specific question that can be answered by it. Do not add any preamble. Just the question itself.\n\nCONTEXT:\n${context}`
          }],
          stream: false,
        }),
      });
      const data = await response.json();
      return data.message.content.trim();
};

/**
 * We'll generate a tricky, persuasive question about a financial topic
 * that is NOT in our database.
 */
const generateAdversarialQuestion = async (): Promise<string> => {
    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          messages: [{
            role: 'user',
            content: `Generate a single, persuasive question about a niche financial topic like "algorithmic trading strategies for cryptocurrency" or "the impact of quantum computing on stock market prediction". The question should sound like it comes from a real, curious user. Do not add any preamble. Just the question itself.`
          }],
          stream: false,
        }),
      });
      const data = await response.json();
      return data.message.content.trim();
};


/**
 * This function calls our own chatbot API to get an answer and measures how long it takes.
 */
const getAnswerFromChatbot = async (question: string): Promise<{ answer: string, duration: number }> => {
    const startTime = performance.now();
    const response = await fetch('http://localhost:3000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
    });
    const data = await response.json();
    const endTime = performance.now();
    return { answer: data.answer, duration: Math.round(endTime - startTime) };
};

/**
 * We'll use the powerful Gemini API to act as our judge with a smarter prompt.
 */
const checkAnswerAccuracy = async (context: string, question: string, answer: string): Promise<{ is_accurate: boolean, reasoning: string }> => {
    // --- NEW, SMARTER JUDGE PROMPT V2 ---
    const prompt = `You are an impartial AI judge. Your task is to evaluate if the "Answer" is a correct response given the "Original Context" and the "Question".

    **Evaluation Steps:**
    1.  First, analyze the "Original Context" and the "Question". Determine if the context contains information that is RELEVANT to the question.
    2.  Based on your analysis, evaluate the "Answer" using the following critical rules.

    **Critical Rules:**
    -   **Rule A (Factual Grounding):** If the context IS relevant, the answer is "accurate" if it is a fair and logical summary of the information in the context. It does NOT need to be a word-for-word copy, but it MUST NOT introduce new facts or contradict the context.
    -   **Rule B (Handling Irrelevance):** If the context is NOT relevant, is empty, or is insufficient to answer the question, the ONLY accurate answer is one that states "I do not have enough information". Any other answer is a hallucination and is NOT accurate.

    Original Context:
    ---
    ${context || 'No context was provided.'}
    ---

    Question:
    ---
    ${question}
    ---

    Answer to Evaluate:
    ---
    ${answer}
    ---

    Respond with ONLY a JSON object in the format: {"is_accurate": boolean, "reasoning": "your explanation"}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in the .env file.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API responded with status: ${response.status}. Body: ${errorBody}`);
        }

        const data = await response.json();
        const jsonString = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonString);

    } catch (e: any) {
        console.error("Failed to get or parse judge's response from Gemini:", e.message);
        return { is_accurate: false, reasoning: "Failed to get a valid response from the Gemini judge." };
    }
};

/**
 * We need a function to save the results of each test run to our database.
 */
const saveResult = async (result: any) => {
  await pool.query(
    'INSERT INTO evaluation_results (model_name, test_type, question, answer, retrieved_context, response_time_ms, is_accurate, accuracy_reasoning) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [result.model, result.test_type, result.question, result.answer, result.context, result.duration, result.is_accurate, result.reasoning]
  );
};


// --- This is our main evaluation loop ---
const runEvaluation = async () => {
  console.log(`Starting our evaluation for ${MODEL_BEING_TESTED} with ${NUMBER_OF_TESTS} tests...`);

  for (let i = 0; i < NUMBER_OF_TESTS; i++) {
    console.log(`\n--- Running Test ${i + 1} of ${NUMBER_OF_TESTS} ---`);
    
    let context: string | null = null;
    let question: string = '';
    let test_type: string = '';

    // --- UPDATED LOGIC: Simplified test types ---
    if (Math.random() > 0.5) {
        test_type = 'factual';
        context = await getRandomChunk();
        if (!context) { continue; }
        question = await generateQuestionFromContext(context);
    } else {
        test_type = 'adversarial';
        question = await generateAdversarialQuestion();
        // Randomly decide if the adversarial test has no context or wrong context
        if (Math.random() > 0.5) {
            context = ''; // No context
        } else {
            context = await getRandomChunk(); // Wrong context
            if (!context) { continue; }
        }
    }

    console.log(`TEST TYPE: ${test_type}`);
    console.log("GENERATED QUESTION:", question);
    console.log("CONTEXT:", context ? context.substring(0, 100) + "..." : "None");

    const { answer, duration } = await getAnswerFromChatbot(question);
    console.log("CHATBOT ANSWER:", answer.substring(0, 100) + "...");

    // Pass the question to the judge as well
    const { is_accurate, reasoning } = await checkAnswerAccuracy(context, question, answer);
    console.log("IS ACCURATE:", is_accurate);
    console.log("JUDGE'S REASONING:", reasoning);

    await saveResult({
      model: MODEL_BEING_TESTED,
      test_type,
      question,
      answer,
      context: context || '',
      duration,
      is_accurate,
      reasoning,
    });
    console.log("Result saved to our database.");
  }

  console.log('\nEvaluation finished!');
  process.exit(0);
};

runEvaluation();
