import { Router } from "express";
import { BullQueueRoute, BullQueueRouteOptions } from "../lib/bullmq/queue.route";
import { JobProcessor } from "../lib/bullmq/job.processor";

// Mock functions - defined before jest.mock calls
const mockBasicAuth = jest.fn().mockReturnValue((req: any, res: any, next: any) => next());
const mockCreateBullBoard = jest.fn();
const mockBullMQAdapter = jest.fn().mockImplementation((queue) => ({ queue }));
const mockGetRouter = jest.fn().mockReturnValue(Router());
const mockSetBasePath = jest.fn();
const mockExpressAdapter = jest.fn().mockImplementation(() => ({
  getRouter: mockGetRouter,
  setBasePath: mockSetBasePath,
}));

// Mock modules
jest.mock("express-basic-auth", () => {
  return (opts: any) => mockBasicAuth(opts);
});

jest.mock("@bull-board/api", () => ({
  createBullBoard: (opts: any) => mockCreateBullBoard(opts),
}));

jest.mock("@bull-board/api/bullMQAdapter", () => ({
  BullMQAdapter: function (queue: any) {
    return mockBullMQAdapter(queue);
  },
}));

jest.mock("@bull-board/express", () => ({
  ExpressAdapter: function () {
    return mockExpressAdapter();
  },
}));

describe("BullQueueRoute", () => {
  const mockQueue1 = { name: "queue-1" };
  const mockQueue2 = { name: "queue-2" };

  const mockProcessor1 = {
    queue: mockQueue1,
  } as unknown as JobProcessor;

  const mockProcessor2 = {
    queue: mockQueue2,
  } as unknown as JobProcessor;

  const defaultOptions: BullQueueRouteOptions = {
    users: { admin: "password123" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use default route when not specified", () => {
      const route = new BullQueueRoute([mockProcessor1], defaultOptions);
      expect(route.route).toBe("admin/queues");
    });

    it("should use custom route when specified", () => {
      const route = new BullQueueRoute([mockProcessor1], {
        ...defaultOptions,
        route: "custom/queue-dashboard",
      });
      expect(route.route).toBe("custom/queue-dashboard");
    });

    it("should create ExpressAdapter", () => {
      new BullQueueRoute([mockProcessor1], defaultOptions);
      expect(mockExpressAdapter).toHaveBeenCalled();
    });

    it("should create BullMQAdapter for each processor queue", () => {
      new BullQueueRoute([mockProcessor1, mockProcessor2], defaultOptions);

      expect(mockBullMQAdapter).toHaveBeenCalledTimes(2);
      expect(mockBullMQAdapter).toHaveBeenCalledWith(mockQueue1);
      expect(mockBullMQAdapter).toHaveBeenCalledWith(mockQueue2);
    });

    it("should call createBullBoard with queues and options", () => {
      new BullQueueRoute([mockProcessor1], {
        ...defaultOptions,
        title: "My Queue Dashboard",
      });

      expect(mockCreateBullBoard).toHaveBeenCalledWith({
        queues: expect.any(Array),
        serverAdapter: expect.any(Object),
        options: {
          uiConfig: {
            boardTitle: "My Queue Dashboard",
            boardLogo: { path: "" },
          },
        },
      });
    });

    it("should use empty title when not specified", () => {
      new BullQueueRoute([mockProcessor1], defaultOptions);

      expect(mockCreateBullBoard).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            uiConfig: {
              boardTitle: "",
              boardLogo: { path: "" },
            },
          },
        })
      );
    });

    it("should use custom logo when specified", () => {
      const logoOptions = {
        path: "/logo.png",
        width: 100,
        height: 50,
      };

      new BullQueueRoute([mockProcessor1], {
        ...defaultOptions,
        logo: logoOptions,
      });

      expect(mockCreateBullBoard).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            uiConfig: {
              boardTitle: "",
              boardLogo: logoOptions,
            },
          },
        })
      );
    });

    it("should set base path on adapter", () => {
      new BullQueueRoute([mockProcessor1], defaultOptions);

      expect(mockSetBasePath).toHaveBeenCalledWith("/admin/queues");
    });

    it("should set custom base path when route is specified", () => {
      new BullQueueRoute([mockProcessor1], {
        ...defaultOptions,
        route: "dashboard/jobs",
      });

      expect(mockSetBasePath).toHaveBeenCalledWith("/dashboard/jobs");
    });

    it("should configure basic auth with users", () => {
      new BullQueueRoute([mockProcessor1], {
        ...defaultOptions,
        users: {
          admin: "admin123",
          user: "user456",
        },
      });

      expect(mockBasicAuth).toHaveBeenCalledWith({
        challenge: true,
        users: {
          admin: "admin123",
          user: "user456",
        },
      });
    });

    it("should have router from BaseRoute", () => {
      const route = new BullQueueRoute([mockProcessor1], defaultOptions);
      expect(route.router).toBeDefined();
    });
  });

  describe("with multiple processors", () => {
    it("should create adapters for all processor queues", () => {
      const processors = [mockProcessor1, mockProcessor2];
      new BullQueueRoute(processors, defaultOptions);

      expect(mockBullMQAdapter).toHaveBeenCalledTimes(2);
    });

    it("should pass all queue adapters to createBullBoard", () => {
      const processors = [mockProcessor1, mockProcessor2];
      new BullQueueRoute(processors, defaultOptions);

      const callArg = mockCreateBullBoard.mock.calls[0][0];
      expect(callArg.queues).toHaveLength(2);
    });
  });

  describe("with empty processors", () => {
    it("should handle empty processors array", () => {
      new BullQueueRoute([], defaultOptions);

      expect(mockBullMQAdapter).not.toHaveBeenCalled();
      expect(mockCreateBullBoard).toHaveBeenCalledWith(
        expect.objectContaining({
          queues: [],
        })
      );
    });
  });
});
