import { RepeatOptions } from "bullmq";
import { JobProcessor } from "./job.processor";

export abstract class CronJobProcessor extends JobProcessor {
  async cron(opts: RepeatOptions) {
    if (!this.queue) throw new Error("process queue not found");
    const jobs = await this.queue.getJobSchedulers();
    await Promise.all(
      jobs.map((job) => this.queue.removeJobScheduler(job.key))
    );
    this.queue.add(this.queue.name, null, {
      repeat: opts,
    });
    return this;
  }
}
