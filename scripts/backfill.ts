// scripts/backfill.ts
import dotenv from 'dotenv';
import { gql } from 'graphql-tag';
import { Client, cacheExchange, fetchExchange } from '@urql/core';
import { parseHygraphPayload } from '../src/parser';
import { chunkText, createEmbedding } from '../src/processing';
import { insertChunks, deleteChunksBySourceId } from '../src/db';

dotenv.config();

const hygraphClient = new Client({
  url: process.env.HYGRAPH_URL || '',
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    const token = process.env.HYGRAPH_TOKEN;
    return {
      headers: { authorization: token ? `Bearer ${token}` : '' },
    };
  },
});

const GetAllNewsQuery = gql`
  query GetAllNews {
    newsCollectionConnection {
      edges {
        node {
          id
          localizations(includeCurrent: true) {
            locale
            title
            body {
              raw
            }
          }
        }
      }
    }
  }
`;

const backfill = async () => {
  console.log('Starting backfill process...');

  try {
    const result = await hygraphClient.query(GetAllNewsQuery, {}).toPromise();

    if (result.error) {
      console.error('GraphQL Error:', result.error.message);
      throw new Error('Failed to fetch news items due to a GraphQL error.');
    }
    
    // Using the correct data path
    if (!result.data || !result.data.newsCollectionConnection) {
      throw new Error('Failed to fetch news items from Hygraph (data is null or empty).');
    }

    // Adjusting the data access to the new query structure
    const newsItems = result.data.newsCollectionConnection.edges.map((edge: any) => edge.node);
    console.log(`Found ${newsItems.length} news items to process.`);

    for (const item of newsItems) {
      console.log(`--- Processing item ID: ${item.id} ---`);
      const { id, text } = parseHygraphPayload(item);

      if (!text) {
        console.log(`No English text found for content ID: ${id}. Skipping.`);
        continue;
      }

      await deleteChunksBySourceId(id);
      const textChunks = await chunkText(text);
      const chunksForDb = [];

      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const embedding = await createEmbedding(chunk);
        chunksForDb.push({
          source_content_id: id,
          chunk_index: i,
          chunk_text: chunk,
          embedding: embedding,
        });
      }

      await insertChunks(chunksForDb);
      console.log(`--- Finished processing item ID: ${id} ---`);
    }

    console.log('Backfill process completed successfully!');
  } catch (error) {
    console.error('An error occurred during the backfill process:', error);
  }

  process.exit(0);
};

backfill();