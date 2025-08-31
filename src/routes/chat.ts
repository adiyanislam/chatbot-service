// src/routes/chat.ts
import express, { Request, Response } from 'express';
import { createEmbedding } from '../processing';
import { findRelevantChunks } from '../db';
import { generateAnswer } from '../llm';

const router = express.Router();

router.post('/api/v1/chat', async (req: Request, res: Response) => {
  try {
    // 1. Get the user's question from the request body
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).send({ error: 'Question is required and must be a string.' });
    }
    console.log(`Received question: "${question}"`);

    // 2. Create an embedding for the user's question
    const queryEmbedding = await createEmbedding(question);

    // 3. Find relevant chunks from the database
    const contextChunks = await findRelevantChunks(queryEmbedding);
    if (contextChunks.length === 0) {
      console.log('No relevant context found in the database.');
    }

    // 4. Generate an answer using the LLM with the retrieved context
    const answer = await generateAnswer(question, contextChunks);

    // 5. Send the final answer AND the context back to the user
    res.status(200).send({ 
        answer: answer,
        context: contextChunks 
    });

  } catch (error) {
    console.error('An error occurred in the chat endpoint:', error);
    res.status(500).send({ error: 'An internal server error occurred.' });
  }
});

export { router as chatRouter };
