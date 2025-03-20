import { AppConfig } from "@app/app.config";
import { logger } from "@app/app.logger";
import { BulkJob, JobProcessor } from "@blazjs/queue";
import { Job } from "bullmq";
import { Service } from "typedi";

@Service()
export class EmailJobProcessor extends JobProcessor {
  constructor(config: AppConfig) {
    super({
      connection: config.redis,
      queue: {
        name: "email",
      },
      logger,
    });
  }

  async process(job: Job): Promise<BulkJob[]> {
    logger.debug(`Sent welcome mail`, job.data);
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
