import { AppConfig } from "@app/app.config";
import { logger } from "@app/app.logger";
import { BulkJob, CronJobProcessor } from "@blazjs/queue";
import { Job } from "bullmq";
import { Service } from "typedi";

@Service()
export class EmailCronJobProcessor extends CronJobProcessor {
  constructor(config: AppConfig) {
    super({
      connection: config.redis,
      queue: {
        name: "cron-welcome-mail",
      },
      logger,
    });
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
