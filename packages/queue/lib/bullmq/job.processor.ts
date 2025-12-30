import { Logger } from "@blazjs/common";
import {
  BulkJobOptions,
  Job,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from "bullmq";
import Redis, { RedisOptions } from "ioredis";

export interface BulkJob {
  name: string;
  data: unknown;
  opts?: BulkJobOptions;
}

export interface JobProcessorOptions {
  connection: Omit<RedisOptions, "maxRetriesPerRequest">;
  queue: {
    name: string;
    options?: Omit<QueueOptions, "connection">;
  };
  worker?: Omit<WorkerOptions, "connection">;
  logger?: Logger;
}

export abstract class JobProcessor<JobData = unknown> {
  public queue: Queue;
  protected outputQueues: Queue[] = [];
  protected readonly logger: Logger | undefined;
  protected readonly workerOptions: Omit<WorkerOptions, "connection"> = {};
  private workers: Record<string, Worker> = {};
  private queueConnection: Redis;

  constructor(private options: JobProcessorOptions) {
    const { connection, queue, logger } = options;
    this.logger = logger;

    this.queueConnection = new Redis(connection);
    this.queue = new Queue(queue.name, {
      ...queue.options,
      defaultJobOptions: queue.options?.defaultJobOptions || {
        removeOnComplete: 100,
        removeOnFail: 100,
      },
      connection: this.queueConnection,
    });

    if (options.worker) {
      this.workerOptions = options.worker;
    }
  }

  on(queue?: Queue): this {
    if (queue) this.queue = queue;
    return this;
  }

  out(queues: Queue[]): this {
    this.outputQueues = queues;
    return this;
  }

  protected abstract process(job: Job<JobData>): Promise<BulkJob[] | void>;

  protected async dispatchJobsToOutputQueues(jobs: BulkJob[]): Promise<void> {
    if (!jobs.length || !this.outputQueues.length) return;
    await Promise.allSettled(
      this.outputQueues.map((queue) => queue.addBulk(jobs))
    );
  }

  private async _process(job: Job<JobData>): Promise<void> {
    try {
      const jobs = await this.process(job);
      if (jobs) {
        await this.dispatchJobsToOutputQueues(jobs);
      }
    } catch (error) {
      this.logger?.error(`Error processing job ${job.id}:`, error);
      throw error;
    }
  }

  spawn(instance: number = 1): void {
    if (!this.queue) throw new Error("Process queue not found");
    for (let i = 0; i < instance; i++) {
      const worker = new Worker(
        this.queue.name,
        async (job) => this._process(job),
        {
          ...this.workerOptions,
          connection: new Redis({
            ...this.options.connection,
            maxRetriesPerRequest: null,
          }),
        }
      );
      this.workers[worker.name] = worker;
    }
  }

  async close(): Promise<void> {
    await Promise.allSettled(
      Object.values(this.workers).map((worker) => worker.close())
    );
    await this.queue.close();
  }
}
