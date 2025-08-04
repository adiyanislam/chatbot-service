// src/db.ts
import { Pool } from 'pg';
import pgvector from 'pgvector/pg';

// Initialize a connection pool.
// It will automatically use the environment variables PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'myuser',
  password: 'mypassword',
  database: 'dija_ai_db',
});

// Register the pgvector type with the connection pool
pool.on('connect', async (client) => {
  await pgvector.registerType(client);
});

// ------------- DATABASE FUNCTIONS ------------- 

interface Chunk {
  source_content_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
}


// Inserts an array of content chunks into the database.
export const insertChunks = async (chunks: Chunk[]) => {
  for (const chunk of chunks) {
    await pool.query(
      'INSERT INTO content_chunks (source_content_id, chunk_index, chunk_text, embedding) VALUES ($1, $2, $3, $4)',
      [
        chunk.source_content_id,
        chunk.chunk_index,
        chunk.chunk_text,
        `[${chunk.embedding.join(',')}]`, // We have to format the embedding for pgvector
      ]
    );
  }
  console.log(`Successfully inserted ${chunks.length} chunks into the database.`);
};


// Deletes all chunks associated with a specific source content ID.
export const deleteChunksBySourceId = async (sourceId: string) => {
  const result = await pool.query(
    'DELETE FROM content_chunks WHERE source_content_id = $1',
    [sourceId]
  );
  console.log(`Deleted ${result.rowCount} chunks for source ID: ${sourceId}`);
};