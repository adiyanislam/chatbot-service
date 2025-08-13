// src/index.ts
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors'; 
import { webhookRouter } from './routes/webhook';
import { chatRouter } from './routes/chat';

dotenv.config();

const start = async () => {
  const app = express();

  app.use(cors()); 
  app.use(express.json());

  app.use(webhookRouter);
  app.use(chatRouter);

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`AI service listening on port ${PORT}`);
  });
};

start();
