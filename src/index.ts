// src/index.ts
import express from 'express';
import { webhookRouter } from './routes/webhook'; // We will create this next

const start = async () => {
  const app = express();

  // This is crucial for Express to be able to read the JSON body of the request
  app.use(express.json());

  // Tell our app to use the new router we're about to create
  app.use(webhookRouter);

  const PORT = 3000; // A standard port for a local web server
  app.listen(PORT, () => {
    console.log(`AI service listening on port ${PORT}`);
  });
};

start();