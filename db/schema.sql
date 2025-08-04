-- db/schema.sql

-- Enabling the pgvector extension 
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the main table to store content chunks and their embeddings
CREATE TABLE IF NOT EXISTS content_chunks (
    id SERIAL PRIMARY KEY,
    source_content_id VARCHAR(255) NOT NULL,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Making an index for faster similarity searches on the embeddings
CREATE INDEX IF NOT EXISTS idx_content_chunks_embedding ON content_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Adding a unique constraint so there are no duplicate chunks for the same contentid
ALTER TABLE content_chunks
ADD CONSTRAINT unique_chunk UNIQUE (source_content_id, chunk_index);