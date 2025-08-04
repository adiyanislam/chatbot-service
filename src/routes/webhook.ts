// src/routes/webhook.ts
import express, { Request, Response } from 'express';
import { parseHygraphPayload } from '../parser';
import { chunkText, createEmbedding } from '../processing';
import { insertChunks, deleteChunksBySourceId } from '../db';

const router = express.Router();

router.post('/api/v1/webhooks/hygraph', async (req: Request, res: Response) => {
  console.log('Received a request on the Hygraph webhook!');

  // For local testing will skip signature verification.

  try {
    const { operation, data } = req.body;

    if (operation === 'publish') {
      console.log('--- Processing PUBLISH operation ---');

      // 1. Parse the payload to get the clean text and content ID
      const { id, text } = parseHygraphPayload(data);

      if (!text) {
        console.log(`No English text found for content ID: ${id}. Skipping.`);
        return res.status(200).send({ message: 'Webhook processed successfully (no content).' });
      }

      // 2. First delete any old chunks for this ID to handle content updates correctly.
      await deleteChunksBySourceId(id);

      // 3. Chunk the text into smaller pieces
      const textChunks = await chunkText(text);

      // 4. Create an embedding for each chunk and prepare it for the database
      const chunksForDb = [];
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const embedding = await createEmbedding(chunk);
        
        chunksForDb.push({
          source_content_id: id,
          chunk_index: i,
          chunk_text: chunk,
          embedding: embedding,
        });
      }

      // 5. Insert all the new chunks into the database
      await insertChunks(chunksForDb);

      console.log(`--- Successfully processed and saved content for ID: ${id} ---`);

    } else if (operation === 'unpublish') {
      console.log('--- Processing UNPUBLISH operation ---');
      const contentId = data.id;

      // Just delete all chunks associated with this content ID
      await deleteChunksBySourceId(contentId);

      console.log(`--- Successfully unpublished content for ID: ${contentId} ---`);

    } else {
      console.log(`Received unknown operation: ${operation}. Skipping.`);
    }

    res.status(200).send({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('FATAL: An error occurred while processing the webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export { router as webhookRouter };