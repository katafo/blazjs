import { BaseRoute } from "@blazjs/common";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import basicAuth from "express-basic-auth";
import { JobProcessor } from "./job.processor";

export interface BullQueueRouteOptions {
  route?: string;
  title?: string;
  logo?: {
    path: string;
    width?: string | number | undefined;
    height?: string | number | undefined;
  };
  users: {
    [username: string]: string;
  };
}

export class BullQueueRoute extends BaseRoute {
  route = "admin/queues";

  constructor(processors: JobProcessor[], opts: BullQueueRouteOptions) {
    super();
    this.route = opts.route || this.route;
    const queueAdapter = new ExpressAdapter();
    createBullBoard({
      queues: processors.map((processor) => new BullMQAdapter(processor.queue)),
      serverAdapter: queueAdapter,
      options: {
        uiConfig: {
          boardTitle: opts.title || "",
          boardLogo: opts.logo || { path: "" },
        },
      },
    });
    queueAdapter.setBasePath("/" + this.route);

    this.router.use(
      basicAuth({
        challenge: true,
        users: opts.users,
      }),
      queueAdapter.getRouter()
    );
  }
}
