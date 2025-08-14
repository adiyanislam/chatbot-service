// scripts/evaluate.ts
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  host: 'localhost', port: 5433, user: 'myuser', password: 'mypassword', database: 'dija_ai_db',
});

const MODEL_BEING_TESTED = 'phi3';
const NUMBER_OF_TESTS = 10;

const getRandomChunk = async (): Promise<string | null> => {
  const result = await pool.query('SELECT chunk_text FROM content_chunks ORDER BY RANDOM() LIMIT 1');
  return result.rows[0]?.chunk_text || null;
};

const generateQuestionFromContext = async (context: string): Promise<string> => {
    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          messages: [{ role: 'user', content: `Based on the following text, please generate one single, specific question that can be answered by it. Do not add any preamble. Just the question itself.\n\nCONTEXT:\n${context}` }],
          stream: false,
        }),
      });
      const data = await response.json();
      return data.message.content.trim();
};

const generateAdversarialQuestion = async (): Promise<string> => {
    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          messages: [{ role: 'user', content: `Generate a single, persuasive question about a niche financial topic like "algorithmic trading strategies for cryptocurrency" or "the impact of quantum computing on stock market prediction". The question should sound like it comes from a real, curious user. Do not add any preamble. Just the question itself.` }],
          stream: false,
        }),
      });
      const data = await response.json();
      return data.message.content.trim();
};

const getAnswerFromChatbot = async (question: string): Promise<{ answer: string, duration: number }> => {
    const startTime = performance.now();
    const response = await fetch('http://localhost:3000/api/v1/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }),
    });
    const data = await response.json();
    const endTime = performance.now();
    return { answer: data.answer, duration: Math.round(endTime - startTime) };
};

const checkAnswerAccuracy = async (context: string, answer: string): Promise<{ is_accurate: boolean, reasoning: string }> => {
    const prompt = `You are an impartial AI judge. Your task is to determine if the "Answer" is factually supported by the "Original Context". CRITICAL RULE: If the "Original Context" is empty or null, the only correct answer is one that states "I do not have enough information". Any other answer is a hallucination and is NOT accurate.

    Original Context:\n---\n${context || 'No context was provided.'}\n---
    Answer to Evaluate:\n---\n${answer}\n---

    Respond with ONLY a JSON object in the format: {"is_accurate": boolean, "reasoning": "your explanation"}`;

    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mistral', messages: [{ role: 'user', content: prompt }], stream: false, format: 'json' }),
    });
    const data = await response.json();
    try {
        return JSON.parse(data.message.content);
    } catch (e) {
        return { is_accurate: false, reasoning: "Failed to parse judge's response." };
    }
};

const saveResult = async (result: any) => {
  await pool.query(
    'INSERT INTO evaluation_results (model_name, test_type, question, answer, retrieved_context, response_time_ms, is_accurate, accuracy_reasoning) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [result.model, result.test_type, result.question, result.answer, result.context, result.duration, result.is_accurate, result.reasoning]
  );
};

const runEvaluation = async () => {
  console.log(`Starting our evaluation for ${MODEL_BEING_TESTED} with ${NUMBER_OF_TESTS} tests...`);
  for (let i = 0; i < NUMBER_OF_TESTS; i++) {
    console.log(`\n--- Running Test ${i + 1} of ${NUMBER_OF_TESTS} ---`);
    let context: string | null = null;
    let question: string = '';
    let test_type: string = '';

    if (Math.random() > 0.5) {
        test_type = 'factual';
        context = await getRandomChunk();
        if (!context) { continue; }
        question = await generateQuestionFromContext(context);
    } else {
        test_type = 'adversarial';
        question = await generateAdversarialQuestion();
        context = '';
    }
    console.log(`TEST TYPE: ${test_type}`);
    console.log("GENERATED QUESTION:", question);

    const { answer, duration } = await getAnswerFromChatbot(question);
    console.log("CHATBOT ANSWER:", answer.substring(0, 100) + "...");
    const { is_accurate, reasoning } = await checkAnswerAccuracy(context, answer);
    console.log("IS ACCURATE:", is_accurate);

    await saveResult({
      model: MODEL_BEING_TESTED, test_type, question, answer, context: context || '', duration, is_accurate, reasoning,
    });
    console.log("Result saved to our database.");
  }
  console.log('\nEvaluation finished!');
  process.exit(0);
};

runEvaluation();
