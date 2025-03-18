import { AppConfig } from "@app/app.config";
import { logger } from "@app/app.logger";
import { JobProcessor } from "@blazjs/queue";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { Service } from "typedi";

@Service()
export class DiscountOfferJobProcessor extends JobProcessor {
  constructor(config: AppConfig) {
    super(
      new Queue("discount-offer", {
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

  async process(job: Job) {
    logger.debug(`Sent discount offer to email: ${job.data.email}`);
    console.log("-----------------");
  }
}
