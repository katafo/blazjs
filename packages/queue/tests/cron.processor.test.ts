import { Job, Queue } from "bullmq";
import { CronJobProcessor } from "../lib/bullmq/cron.processor";
import { BulkJob, JobProcessorOptions } from "../lib/bullmq/job.processor";

// Mock ioredis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    status: "ready",
    disconnect: jest.fn(),
    quit: jest.fn(),
  }));
});

// Mock bullmq
const mockGetJobSchedulers = jest.fn();
const mockRemoveJobScheduler = jest.fn();
const mockQueueAdd = jest.fn();
const mockQueueClose = jest.fn();

jest.mock("bullmq", () => {
  return {
    Queue: jest.fn().mockImplementation((name) => ({
      name,
      getJobSchedulers: mockGetJobSchedulers,
      removeJobScheduler: mockRemoveJobScheduler,
      add: mockQueueAdd,
      close: mockQueueClose,
    })),
    Worker: jest.fn().mockImplementation(() => ({
      name: `worker-${Math.random()}`,
      close: jest.fn().mockResolvedValue(undefined),
    })),
    Job: jest.fn(),
  };
});

// Concrete implementation for testing
class TestCronProcessor extends CronJobProcessor {
  protected async process(job: Job): Promise<BulkJob[] | void> {
    return undefined;
  }
}

describe("CronJobProcessor", () => {
  let processor: TestCronProcessor;
  const defaultOptions: JobProcessorOptions = {
    connection: { host: "localhost", port: 6379 },
    queue: { name: "cron-queue" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetJobSchedulers.mockResolvedValue([]);
    mockRemoveJobScheduler.mockResolvedValue(undefined);
    mockQueueAdd.mockResolvedValue({ id: "job-1" });
    mockQueueClose.mockResolvedValue(undefined);

    processor = new TestCronProcessor(defaultOptions);
  });

  afterEach(async () => {
    await processor.close();
  });

  describe("cron()", () => {
    it("should return this for chaining", async () => {
      const result = await processor.cron({ pattern: "* * * * *" });
      expect(result).toBe(processor);
    });

    it("should throw error when queue is not set", async () => {
      const originalQueue = (processor as any).queue;
      (processor as any).queue = null;

      await expect(processor.cron({ pattern: "* * * * *" })).rejects.toThrow(
        "Process queue not found"
      );

      // Restore queue for cleanup
      (processor as any).queue = originalQueue;
    });

    it("should get existing job schedulers", async () => {
      await processor.cron({ pattern: "0 * * * *" });

      expect(mockGetJobSchedulers).toHaveBeenCalled();
    });

    it("should remove existing job schedulers", async () => {
      mockGetJobSchedulers.mockResolvedValue([
        { key: "scheduler-1" },
        { key: "scheduler-2" },
      ]);

      await processor.cron({ pattern: "0 * * * *" });

      expect(mockRemoveJobScheduler).toHaveBeenCalledTimes(2);
      expect(mockRemoveJobScheduler).toHaveBeenCalledWith("scheduler-1");
      expect(mockRemoveJobScheduler).toHaveBeenCalledWith("scheduler-2");
    });

    it("should add new job with repeat options", async () => {
      const repeatOpts = { pattern: "0 0 * * *" };

      await processor.cron(repeatOpts);

      expect(mockQueueAdd).toHaveBeenCalledWith("cron-queue", null, {
        repeat: repeatOpts,
      });
    });

    it("should handle cron with every option", async () => {
      const repeatOpts = { every: 60000 };

      await processor.cron(repeatOpts);

      expect(mockQueueAdd).toHaveBeenCalledWith("cron-queue", null, {
        repeat: repeatOpts,
      });
    });

    it("should clear schedulers before adding new one", async () => {
      mockGetJobSchedulers.mockResolvedValue([{ key: "old-scheduler" }]);

      await processor.cron({ pattern: "* * * * *" });

      // Verify order: first remove, then add
      expect(mockRemoveJobScheduler).toHaveBeenCalledBefore(mockQueueAdd);
    });
  });
});

// Helper to check call order
expect.extend({
  toHaveBeenCalledBefore(received: jest.Mock, other: jest.Mock) {
    const receivedOrder = received.mock.invocationCallOrder[0];
    const otherOrder = other.mock.invocationCallOrder[0];

    if (receivedOrder < otherOrder) {
      return {
        message: () => `expected ${received.getMockName()} not to have been called before ${other.getMockName()}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received.getMockName()} to have been called before ${other.getMockName()}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledBefore(other: jest.Mock): R;
    }
  }
}
