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

/**
 * Finds the most relevant text chunks from the database for a given embedding.
 * @param queryEmbedding The vector embedding of the user's question.
 * @param limit The maximum number of chunks to retrieve.
 * @returns An array of the most relevant chunk texts.
 */
export const findRelevantChunks = async (queryEmbedding: number[], limit: number = 5): Promise<string[]> => {
  // The <=> operator is the "cosine distance" function from pgvector.
  // It finds the vectors in the table that are most similar to the input vector.
  const result = await pool.query(
    'SELECT chunk_text FROM content_chunks ORDER BY embedding <=> $1 LIMIT $2',
    [`[${queryEmbedding.join(',')}]`, limit]
  );

  // Return just the text of the chunks
  return result.rows.map((row) => row.chunk_text);
};