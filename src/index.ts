// src/index.ts
// src/index.ts

import { Client } from 'pg';

// This function will contain our application's logic
const start = async () => {
  console.log('Attempting to connect to the database...');

  // Create a new client instance
  // These are the same credentials from your docker-compose.yml file
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'myuser',
    password: 'mypassword',
    database: 'dija_ai_db',
  });

  try {
    // Try to connect to the database
    await client.connect();
    console.log('Connected to database successfully!');

    // You can run a simple query here to test
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0].now);

    // --- Your future application logic will go here ---

  } catch (error) {
    // If connection fails, log the error
    console.error('Failed to connect to the database:', error);
  } finally {
    // Always close the connection when the application is done
    await client.end();
    console.log('Database connection closed.');
  }
};

// Run the application
start();