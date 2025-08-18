// src/llm.ts

/**
 * Generates a response from the local LLM based on a user's question and retrieved context.
 * @param question The user's original question.
 * @param contextChunks An array of relevant text chunks from our database.
 * @returns The generated answer from the AI model.
 */
export const generateAnswer = async (question: string, contextChunks: string[]): Promise<string> => {
  const context = contextChunks.join('\n\n---\n\n');

  // --- NEW, IMPROVED TWO-STEP PROMPT ---
  const prompt = `You are an AI assistant for Dija, a financial education app. Your persona is friendly, helpful, and concise. You will follow a strict two-step process to ensure accuracy.

      **Step 1: Draft an Answer**
      First, draft a friendly and concise answer to the "USER'S QUESTION" using ONLY the information provided in the "CONTEXT".

      **Step 2: Final Review**
      Before providing your final answer, you MUST review your draft against the following rules:
      - **Rule 1 (No Outside Info):** Does my answer contain ANY information not explicitly present in the CONTEXT? If yes, I must delete that information.
      - **Rule 2 (Handle Insufficient Context):** If the CONTEXT was empty, irrelevant, or did not contain the necessary information, does my answer consist ONLY of the exact sentence: "That's a great question, but I don't have enough information to answer it right now."? If no, I must replace my answer with that exact sentence.
      - **Rule 3 (Conciseness):** Is my answer short, to the point, and easy to understand? If not, I must simplify it.

      After reviewing, provide only the final, approved answer.

      CONTEXT:
      ${context}

      USER'S QUESTION:
      ${question}

      FINAL ANSWER:`;

  console.log('--- Sending Prompt to LLM ---');

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'phi3', // Sticking with phi3
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API responded with status: ${response.status}`);
    }

    const responseData = await response.json();

    console.log('--- Received Response from LLM ---');
    console.log(responseData.message.content);
    console.log('----------------------------------');

    return responseData.message.content;

  } catch (error) {
    console.error('Failed to communicate with Ollama server:', error);
    throw error;
  }
};
