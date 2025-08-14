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

-- Making a table for the results from out evaluation bot
/*
CREATE TABLE IF NOT EXISTS evaluation_results (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    retrieved_context TEXT NOT NULL,
    response_time_ms INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
*/

DROP TABLE IF EXISTS evaluation_results;

CREATE TABLE evaluation_results (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL, 
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    retrieved_context TEXT NOT NULL,
    response_time_ms INT NOT NULL,
    is_accurate BOOLEAN,
    accuracy_reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
