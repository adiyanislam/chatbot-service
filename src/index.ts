// src/index.ts
import dotenv from 'dotenv';
import express from 'express';
import { webhookRouter } from './routes/webhook';

// Load environment variables from .env file
// This should be at the very top, before you use any environment variables
dotenv.config();

const start = async () => {
  const app = express();
  app.use(express.json());
  app.use(webhookRouter);

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`AI service listening on port ${PORT}`);
  });
};

start();