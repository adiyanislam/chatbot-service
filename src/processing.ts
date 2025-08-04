// src/processing.ts
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { pipeline } from '@xenova/transformers';

// 1. TEXT CHUNKING LOGIC
// This takes a long string of text and splits it into smaller chunks for storing.
export const chunkText = async (text: string): Promise<string[]> => {
  // This splitter tries to split on paragraphs, then sentences, etc.
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500, 
    chunkOverlap: 50, 
  });

  const chunks = await splitter.splitText(text);
  console.log(`Split text into ${chunks.length} chunks.`);
  return chunks;
};


// 2. EMBEDDING LOGIC
// This class will handle loading the embedding model and creating embeddings.
class EmbeddingPipeline {
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      console.log('Loading embedding model for the first time...');
      // This will download the model to the .cache folder on first run.
      // Current Model: 'Xenova/all-MiniLM-L6-v2'. Great for general use.
      this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('Embedding model loaded.');
    }
    return this.instance;
  }
}

// This function takes a text chunk and returns its vector embedding.
export const createEmbedding = async (text: string): Promise<number[]> => {
  const embedder = await EmbeddingPipeline.getInstance();
  const result = await embedder(text, { pooling: 'mean', normalize: true });
  // The actual embedding is in result.data in Float32 format. We convert it back here.
  return Array.from(result.data);
};