import Queue from 'bull';
import axios from 'axios';

interface MonthlyDigestJob {
  userId: string;
  month: number;
  year: number;
}

/**
 * Trigger a monthly digest job by sending it to the background service queue
 * This should be called from the backend API
 */
export async function triggerMonthlyDigest(
  userId: string,
  month: number,
  year: number
): Promise<void> {
  try {
    // Create a queue connection to add the job
    const monthlyDigestQueue = new Queue<MonthlyDigestJob>('monthly-digest', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    await monthlyDigestQueue.add(
      {
        userId,
        month,
        year,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`Triggered monthly digest job for user ${userId}, ${month}/${year}`);
    
    await monthlyDigestQueue.close();
  } catch (error) {
    console.error('Error triggering monthly digest:', error);
    throw error;
  }
}
