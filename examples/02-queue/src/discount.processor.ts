import { AppConfig } from "@app/app.config";
import { logger } from "@app/app.logger";
import { JobProcessor } from "@blazjs/queue";
import { Job } from "bullmq";
import { Service } from "typedi";

@Service()
export class DiscountOfferJobProcessor extends JobProcessor {
  constructor(config: AppConfig) {
    super({
      connection: config.redis,
      queue: {
        name: "discount-offer",
      },
      logger,
    });
  }

  async process(job: Job) {
    logger.debug(`Sent discount offer to email`, job.data);
    console.log("-----------------");
  }
}
