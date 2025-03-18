import { AppConfig } from "@app/app.config";
import { logger } from "@app/app.logger";
import { BulkJob, CronJobProcessor } from "@blazjs/queue";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { Service } from "typedi";

@Service()
export class EmailCronJobProcessor extends CronJobProcessor {
  constructor(config: AppConfig) {
    super(
      new Queue("cron-welcome-mail", {
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
    logger.debug(`Start sending welcome mail...`);
    return [
      {
        name: "welcome-mail",
        data: {
          to: "demo@blazjs.com",
        },
      },
    ];
  }
}
