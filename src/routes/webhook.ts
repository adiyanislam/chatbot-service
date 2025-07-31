// src/routes/webhook.ts
import express, { Request, Response } from 'express';
import { verifyWebhookSignature } from '@hygraph/utils';

const router = express.Router();

router.post('/api/v1/webhooks/hygraph', (req: Request, res: Response) => {
  console.log('Received a request on the Hygraph webhook!');

  try {
    // 1. Verify the signature to make sure the request is from Hygraph
    // You will get the WEBHOOK_SECRET from the Hygraph dashboard when you set up the webhook
    const secret = process.env.WEBHOOK_SECRET || 'your-secret-here';
    const signature = req.headers['gcms-signature'] as string;
    const body = req.body;

    // In a real environment, you'd want more robust checking here.
    if (!signature) {
      console.error('Request is missing signature');
      return res.status(401).send('Unauthorized');
    }

    const isValid = verifyWebhookSignature({ body, signature, secret });

    if (!isValid) {
      console.error('Invalid signature');
      return res.status(401).send('Unauthorized');
    }

    console.log('Webhook signature is valid!');

    // 2. Extract the operation and data from the request body
    const { operation, data } = req.body;
    console.log(`Operation: ${operation}`);
    console.log('Data payload:', JSON.stringify(data, null, 2)); // Pretty-print the JSON

    // --- YOUR FUTURE LOGIC GOES HERE ---
    // Based on the 'operation' ('publish' or 'unpublish'), you will:
    // 1. Fetch the full content from Hygraph using its ID (data.id)
    // 2. Chunk the text
    // 3. Create embeddings
    // 4. Save to your PostgreSQL database

    // 3. Send a success response back to Hygraph
    res.status(200).send({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export { router as webhookRouter };