// src/llm.ts

/**
 * Generates a response from the local LLM based on a user's question and retrieved context.
 * @param question The user's original question.
 * @param contextChunks An array of relevant text chunks from our database.
 * @returns The generated answer from the AI model.
 */
export const generateAnswer = async (question: string, contextChunks: string[]): Promise<string> => {
  const context = contextChunks.join('\n\n---\n\n');

  // --- NEW, INFERENTIAL PROMPT V6 ---
  const prompt = `You are Dija, a friendly and helpful AI assistant specializing in financial education. Your primary goal is to provide helpful, synthesized answers based on the provided context.

      **Your Thought Process:**
      1.  Analyze the User's Question to understand their core need.
      2.  Thoroughly read all information in the CONTEXT.
      3.  Synthesize the information from the CONTEXT to form a cohesive, easy-to-understand answer. It is okay to summarize and connect related ideas found within the context.

      **CRITICAL RULES:**
      -   **No Outside Knowledge:** Your entire answer MUST be derived from the CONTEXT. Do not introduce any facts, figures, or concepts not present in the provided text.
      -   **Handle Insufficient Context:** If the CONTEXT is empty or does not contain information relevant to the question, you MUST respond with the exact sentence: "That's a great question, but I don't have enough information to answer it right now."

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
        model: 'llama3:8b', // Sticking with phi3
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
