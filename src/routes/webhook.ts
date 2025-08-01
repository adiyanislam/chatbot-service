// src/routes/webhook.ts
import express, { Request, Response } from 'express';
import { verifyWebhookSignature } from '@hygraph/utils';
import { parseHygraphPayload } from '../parser'; // <-- IMPORT THE NEW PARSER

const router = express.Router();

router.post('/api/v1/webhooks/hygraph', (req: Request, res: Response) => {
  console.log('Received a request on the Hygraph webhook!');

  try {
    // We'll skip signature verification for local testing
    // const secret = process.env.WEBHOOK_SECRET || 'your-secret-here';
    // ... verification logic ...

    const { operation, data } = req.body;

    if (operation === 'publish') {
      console.log('Operation: PUBLISH');

      // Use our new parser to extract the ID and text
      const { id, text } = parseHygraphPayload(data);

      if (text) {
        console.log(`Successfully parsed content for ID: ${id}`);
        console.log('Extracted Text:', text);
        // NEXT STEP: Chunk this text and save it to the database.
      } else {
        console.log(`Could not find English content for ID: ${id}`);
      }

    } else if (operation === 'unpublish') {
      console.log('Operation: UNPUBLISH');
      const contentId = data.id;
      console.log(`Received unpublish event for ID: ${contentId}`);
      // NEXT STEP: Delete all chunks from the database associated with this ID.

    } else {
      console.log(`Received unknown operation: ${operation}`);
    }

    res.status(200).send({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export { router as webhookRouter };