import {
  BulkJobOptions,
  ConnectionOptions,
  Job,
  Queue,
  RateLimiterOptions,
  Worker,
  WorkerOptions,
} from "bullmq";

export interface BulkJob {
  name: string;
  data: unknown;
  opts?: BulkJobOptions;
}

export interface JobProcessorOptions {
  concurrency: number;
  limiter?: RateLimiterOptions;
  connection: ConnectionOptions;
}

export abstract class JobProcessor {
  protected outputQueues: Queue[] = [];

  constructor(public queue: Queue, private options: WorkerOptions) {}

  on(queue?: Queue) {
    if (queue) this.queue = queue;
    return this;
  }

  out(queues: Queue[]) {
    this.outputQueues = queues;
    return this;
  }

  protected abstract process(job: Job): Promise<BulkJob[] | void>;

  protected async dispatchJobsToOutputQueues(jobs: BulkJob[]) {
    await Promise.allSettled(
      this.outputQueues.map((queue) => queue.addBulk(jobs))
    );
  }

  private async _process(job: Job): Promise<void> {
    const jobs = await this.process(job);
    if (jobs) {
      await this.dispatchJobsToOutputQueues(jobs);
    }
  }

  spawn() {
    if (!this.queue) throw new Error("process queue not found");
    return new Worker(
      this.queue.name,
      async (job) => {
        await this._process(job);
      },
      this.options
    );
  }
}
