import { logger } from "sc-common";

export type JobHandle = {
  timeoutId: NodeJS.Timeout;
  name: string;
};

export class BroadcastScheduler {
  private jobs: Map<string, JobHandle> = new Map();
  private readonly logService: typeof logger;

  constructor(logService: typeof logger) {
    this.logService = logService;
  }

  scheduleJob(name: string, time: Date, callback: () => Promise<void>) {
    const delay = time.getTime() - Date.now();

    if (delay <= 0) {
      console.log(`Scheduled time is in the past for job ${name}`);
      return;
    }

    if (this.jobs.has(name)) {
      console.log(`Job ${name} already exists, cancelling it`);
      this.cancelJob(name);
    }

    const timeoutId = setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        console.error(`Job ${name} failed:`, error);
      } finally {
        this.jobs.delete(name);
      }
    }, delay);

    this.jobs.set(name, { name, timeoutId });
  }

  cancelJob(name: string) {
    const job = this.jobs.get(name);
    if (job) {
      clearTimeout(job.timeoutId);
      this.jobs.delete(name);
    }
  }

  stopAll() {
    for (const job of this.jobs.values()) {
      clearTimeout(job.timeoutId);
    }
    this.jobs.clear();
  }
}
