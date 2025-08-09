// src/llm.ts

/**
 * Generates a response from the local LLM based on a user's question and retrieved context.
 * @param question The user's original question.
 * @param contextChunks An array of relevant text chunks from our database.
 * @returns The generated answer from the AI model.
 */
export const generateAnswer = async (question: string, contextChunks: string[]): Promise<string> => {
  // 1. Construct the prompt
  const context = contextChunks.join('\n\n---\n\n');
  const prompt = `You are a helpful financial education assistant for an app called Dija. 
      Answer the user's question based ONLY on the provided context below. 
      Do not use any outside knowledge. If the context does not contain the answer, say "I do not have enough information to answer that question."
      Do not provide any financial advice. Frame your answer as an educational summary.

      CONTEXT:
      ${context}

      USER'S QUESTION:
      ${question}

      ANSWER:`;

  console.log('--- Sending Prompt to LLM ---');

  // 2. Make a direct API call to the Ollama server using fetch
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'phi3',
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
    throw error; // Re-throw the error to be handled by the chat endpoint
  }
};