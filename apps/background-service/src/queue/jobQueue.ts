import Queue from 'bull';

export interface MonthlyDigestJob {
  userId: string;
  month: number;
  year: number;
}

// Create a queue for monthly digest jobs
export const monthlyDigestQueue = new Queue<MonthlyDigestJob>('monthly-digest', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

/**
 * Add a monthly digest job to the queue
 */
export async function addMonthlyDigestJob(data: MonthlyDigestJob): Promise<void> {
  await monthlyDigestQueue.add(data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
  
  console.log(`Added monthly digest job for user ${data.userId}, ${data.month}/${data.year}`);
}
