// src/listener.ts
import { PubSub } from '@google-cloud/pubsub';

// Create a new Pub/Sub client
const pubSubClient = new PubSub();

// The name of the topic you want to subscribe to.
// We'll use a placeholder for now. Ask your manager for the real project ID and topic name later.
const topicName = 'projects/your-gcp-project-id/topics/hygraph.content.published';
const subscriptionName = 'dija-ai-service-sub'; // A unique name for your service's subscription

export const listenForMessages = async () => {
  // Creates a new subscription
  const subscription = pubSubClient.topic(topicName).subscription(subscriptionName);

  // Create an event handler to handle messages
  const messageHandler = (message: any) => {
    console.log(`Received message ${message.id}:`);
    console.log(`\tData: ${message.data}`);
    console.log(`\tAttributes: ${JSON.stringify(message.attributes)}`);

    // "Ack" (acknowledge) the message so Pub/Sub doesn't send it again
    message.ack();
  };

  // Listen for new messages
  subscription.on('message', messageHandler);

  console.log(`Listening for messages on ${subscriptionName}...`);
};