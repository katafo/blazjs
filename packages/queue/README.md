# @blazjs/queue

A BullMQ-based job queue processor library for Node.js applications.

## Installation

```bash
npm install @blazjs/queue
```

## Features

- Abstract job processor with Redis connection management
- Cron job scheduling support
- Output queue chaining for job pipelines
- Bull Board dashboard integration with basic auth
- Worker spawning with concurrency control

## Usage

### Basic Job Processor

```typescript
import { JobProcessor, JobProcessorOptions, BulkJob } from "@blazjs/queue";
import { Job } from "bullmq";

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

class EmailProcessor extends JobProcessor<EmailJobData> {
  protected async process(job: Job<EmailJobData>): Promise<BulkJob[] | void> {
    const { to, subject, body } = job.data;
    await sendEmail(to, subject, body);

    // Optionally return jobs to dispatch to output queues
    return [{ name: "email-sent", data: { to, sentAt: new Date() } }];
  }
}

const processor = new EmailProcessor({
  connection: { host: "localhost", port: 6379 },
  queue: { name: "emails" },
  worker: { concurrency: 5 },
});

// Spawn 3 worker instances
processor.spawn(3);
```

### Cron Job Processor

```typescript
import { CronJobProcessor } from "@blazjs/queue";
import { Job } from "bullmq";

class DailyReportProcessor extends CronJobProcessor {
  protected async process(job: Job): Promise<void> {
    await generateDailyReport();
  }
}

const processor = new DailyReportProcessor({
  connection: { host: "localhost", port: 6379 },
  queue: { name: "daily-reports" },
});

// Run every day at midnight
await processor.cron({ pattern: "0 0 * * *" });
processor.spawn();
```

### Output Queue Chaining

```typescript
const processorA = new ProcessorA(options);
const processorB = new ProcessorB(options);
const processorC = new ProcessorC(options);

// Jobs returned from ProcessorA will be dispatched to ProcessorB and ProcessorC
processorA.out([processorB.queue, processorC.queue]);

processorA.spawn();
processorB.spawn();
processorC.spawn();
```

### Bull Board Dashboard

```typescript
import express from "express";
import { BullQueueRoute } from "@blazjs/queue";

const app = express();

const emailProcessor = new EmailProcessor(options);
const reportProcessor = new ReportProcessor(options);

const dashboardRoute = new BullQueueRoute(
  [emailProcessor, reportProcessor],
  {
    route: "admin/queues",
    title: "Job Queue Dashboard",
    logo: { path: "/logo.png", width: 100 },
    users: { admin: "secret123" },
  }
);

app.use("/" + dashboardRoute.route, dashboardRoute.router);
```

## API Reference

### JobProcessor

Abstract class for processing jobs from a BullMQ queue.

#### Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| `connection` | `RedisOptions` | Redis connection options |
| `queue.name` | `string` | Queue name |
| `queue.options` | `QueueOptions` | BullMQ queue options |
| `worker` | `WorkerOptions` | BullMQ worker options |
| `logger` | `Logger` | Logger instance |

#### Methods

| Method | Description |
|--------|-------------|
| `on(queue?)` | Set input queue (chainable) |
| `out(queues)` | Set output queues for job dispatching (chainable) |
| `spawn(count)` | Spawn worker instances (default: 1) |
| `close()` | Close all workers and queue connections |

### CronJobProcessor

Extends JobProcessor with cron scheduling support.

#### Methods

| Method | Description |
|--------|-------------|
| `cron(opts)` | Schedule recurring jobs with cron pattern or interval |

#### Cron Options

```typescript
// Cron pattern
await processor.cron({ pattern: "0 * * * *" }); // Every hour

// Fixed interval
await processor.cron({ every: 60000 }); // Every 60 seconds
```

### BullQueueRoute

Express route for Bull Board dashboard with basic authentication.

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `route` | `string` | Route path (default: "admin/queues") |
| `title` | `string` | Dashboard title |
| `logo` | `object` | Logo configuration |
| `users` | `object` | Username/password pairs for basic auth |

## License

MIT
