import dotenv from 'dotenv';
import { monthlyDigestQueue } from './queue/jobQueue.js';
import { processMonthlyDigest } from './services/monthlyDigestService.js';

// Load environment variables
dotenv.config();

console.log('🚀 Background Service starting...');

// Process jobs from the queue
monthlyDigestQueue.process(async (job) => {
  const { userId, month, year } = job.data;
  
  console.log(`\n📋 Processing job ${job.id}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Period: ${month}/${year}`);
  
  try {
    await processMonthlyDigest(userId, month, year);
    console.log(`✅ Job ${job.id} completed successfully\n`);
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);
    throw error; // Re-throw to trigger retry logic
  }
});

// Event listeners for queue
monthlyDigestQueue.on('completed', (job) => {
  console.log(`Job ${job.id} has been completed`);
});

monthlyDigestQueue.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with error:`, err.message);
});

monthlyDigestQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await monthlyDigestQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await monthlyDigestQueue.close();
  process.exit(0);
});

console.log('✅ Background Service is running');
console.log('   Waiting for jobs...\n');
