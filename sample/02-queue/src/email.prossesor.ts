import { AppConfig } from "@app/app.config";
import { logger } from "@app/app.logger";
import { BulkJob, JobProcessor } from "@blazjs/queue";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { Service } from "typedi";

@Service()
export class EmailJobProcessor extends JobProcessor {
  constructor(config: AppConfig) {
    super(
      new Queue("email", {
        connection: new Redis(config.redis),
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      }),
      {
        connection: new Redis({
          ...config.redis,
          maxRetriesPerRequest: null,
        }),
        concurrency: 1,
      }
    );
  }

  async process(job: Job): Promise<BulkJob[]> {
    logger.debug(`Sent welcome mail to: ${job.data.to}`);
    return [
      {
        name: "discount-offer",
        data: {
          email: job.data.to,
        },
      },
    ];
  }
}
