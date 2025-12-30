import { Logger } from "@blazjs/common";
import { Job, Queue, Worker } from "bullmq";
import { JobProcessor, JobProcessorOptions, BulkJob } from "../lib/bullmq/job.processor";

// Mock ioredis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    status: "ready",
    disconnect: jest.fn(),
    quit: jest.fn(),
  }));
});

// Mock bullmq
const mockQueueClose = jest.fn().mockResolvedValue(undefined);
const mockQueueAddBulk = jest.fn().mockResolvedValue([]);

jest.mock("bullmq", () => {
  return {
    Queue: jest.fn().mockImplementation((name) => ({
      name,
      close: mockQueueClose,
      addBulk: mockQueueAddBulk,
    })),
    Worker: jest.fn().mockImplementation((name, processor, opts) => ({
      name: `worker-${Math.random()}`,
      close: jest.fn().mockResolvedValue(undefined),
    })),
    Job: jest.fn(),
  };
});

// Mock Logger
class MockLogger extends Logger {
  protected logger = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    add: jest.fn(),
  };
  protected options = {};

  getMockLogger() {
    return this.logger;
  }
}

// Concrete implementation for testing
class TestJobProcessor extends JobProcessor<{ data: string }> {
  public processResult: BulkJob[] | void = undefined;
  public processCalled = false;
  public lastJob: Job<{ data: string }> | null = null;

  protected async process(job: Job<{ data: string }>): Promise<BulkJob[] | void> {
    this.processCalled = true;
    this.lastJob = job;
    return this.processResult;
  }

  // Expose protected methods for testing
  public async testDispatchJobsToOutputQueues(jobs: BulkJob[]) {
    return this.dispatchJobsToOutputQueues(jobs);
  }
}

describe("JobProcessor", () => {
  let processor: TestJobProcessor;
  let mockLogger: MockLogger;
  const defaultOptions: JobProcessorOptions = {
    connection: { host: "localhost", port: 6379 },
    queue: { name: "test-queue" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new MockLogger();
    processor = new TestJobProcessor({
      ...defaultOptions,
      logger: mockLogger,
    });
  });

  afterEach(async () => {
    await processor.close();
  });

  describe("constructor", () => {
    it("should create Queue with name", () => {
      expect(Queue).toHaveBeenCalledWith(
        "test-queue",
        expect.objectContaining({
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 100,
          },
        })
      );
    });

    it("should use custom queue options", () => {
      const customProcessor = new TestJobProcessor({
        ...defaultOptions,
        queue: {
          name: "custom-queue",
          options: {
            defaultJobOptions: {
              removeOnComplete: 50,
              removeOnFail: 50,
            },
          },
        },
      });

      expect(Queue).toHaveBeenLastCalledWith(
        "custom-queue",
        expect.objectContaining({
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 50,
          },
        })
      );
    });

    it("should store logger", () => {
      expect((processor as any).logger).toBe(mockLogger);
    });

    it("should store worker options", () => {
      const processorWithWorkerOpts = new TestJobProcessor({
        ...defaultOptions,
        worker: { concurrency: 5 },
      });

      expect((processorWithWorkerOpts as any).workerOptions).toEqual({
        concurrency: 5,
      });
    });
  });

  describe("on()", () => {
    it("should return this for chaining", () => {
      const result = processor.on();
      expect(result).toBe(processor);
    });

    it("should set queue when provided", () => {
      const newQueue = { name: "new-queue", close: jest.fn() } as unknown as Queue;
      processor.on(newQueue);
      expect(processor.queue).toBe(newQueue);
    });

    it("should keep existing queue when not provided", () => {
      const originalQueue = processor.queue;
      processor.on();
      expect(processor.queue).toBe(originalQueue);
    });
  });

  describe("out()", () => {
    it("should return this for chaining", () => {
      const result = processor.out([]);
      expect(result).toBe(processor);
    });

    it("should set output queues", () => {
      const queues = [{ name: "output-1" }, { name: "output-2" }] as Queue[];
      processor.out(queues);
      expect((processor as any).outputQueues).toBe(queues);
    });
  });

  describe("spawn()", () => {
    it("should create one worker by default", () => {
      processor.spawn();
      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it("should create multiple workers", () => {
      processor.spawn(3);
      expect(Worker).toHaveBeenCalledTimes(3);
    });

    it("should create worker with queue name", () => {
      processor.spawn();
      expect(Worker).toHaveBeenCalledWith(
        "test-queue",
        expect.any(Function),
        expect.any(Object)
      );
    });

    it("should throw error when queue is not set", async () => {
      const originalQueue = processor.queue;
      (processor as any).queue = null;
      expect(() => processor.spawn()).toThrow("Process queue not found");
      // Restore queue for cleanup
      (processor as any).queue = originalQueue;
    });
  });

  describe("close()", () => {
    it("should close all workers", async () => {
      processor.spawn(2);
      const workers = Object.values((processor as any).workers);

      await processor.close();

      workers.forEach((worker: any) => {
        expect(worker.close).toHaveBeenCalled();
      });
    });

    it("should close queue", async () => {
      await processor.close();
      expect(mockQueueClose).toHaveBeenCalled();
    });
  });

  describe("dispatchJobsToOutputQueues()", () => {
    it("should not dispatch when jobs array is empty", async () => {
      const outputQueue = { addBulk: jest.fn() } as unknown as Queue;
      processor.out([outputQueue]);

      await processor.testDispatchJobsToOutputQueues([]);

      expect(outputQueue.addBulk).not.toHaveBeenCalled();
    });

    it("should not dispatch when no output queues", async () => {
      processor.out([]);

      await processor.testDispatchJobsToOutputQueues([
        { name: "job1", data: {} },
      ]);

      // No error should be thrown
    });

    it("should dispatch jobs to all output queues", async () => {
      const outputQueue1 = { addBulk: jest.fn().mockResolvedValue([]) } as unknown as Queue;
      const outputQueue2 = { addBulk: jest.fn().mockResolvedValue([]) } as unknown as Queue;
      processor.out([outputQueue1, outputQueue2]);

      const jobs: BulkJob[] = [
        { name: "job1", data: { test: 1 } },
        { name: "job2", data: { test: 2 } },
      ];

      await processor.testDispatchJobsToOutputQueues(jobs);

      expect(outputQueue1.addBulk).toHaveBeenCalledWith(jobs);
      expect(outputQueue2.addBulk).toHaveBeenCalledWith(jobs);
    });
  });
});
