import { IsNotEmpty, IsString } from "class-validator";
import { Request as RequestDecorator } from "../../lib/decorators/request.decorator";
import { DataRequestDTO } from "../../lib/requests/request.dto";
import { Request, Response, NextFunction } from "express";
import { ResponseWrapper } from "../../lib/responses";

// Custom DTO for testing
class TestRequestDTO extends DataRequestDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

describe("@Request decorator", () => {
  const createMockRequest = (
    body: Record<string, unknown> = {},
    query: Record<string, unknown> = {},
    params: Record<string, unknown> = {}
  ): Request => {
    return {
      body,
      query,
      params,
    } as unknown as Request;
  };

  const createMockResponse = (): Response => {
    const res: Partial<Response> = {
      send: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  const createMockNext = (): NextFunction => jest.fn();

  describe("basic functionality", () => {
    it("should validate request and call original method", async () => {
      const originalMethod = jest.fn().mockResolvedValue({ success: true });

      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(_data: TestRequestDTO) {
          return originalMethod(_data);
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "test" });
      const res = createMockResponse();
      const next = createMockNext();

      // The decorator replaces the method, so we call with req, res, next
      await (controller.testMethod as any)(req, res, next);

      expect(originalMethod).toHaveBeenCalled();
    });

    it("should pass validated data to method", async () => {
      let receivedData: TestRequestDTO | null = null;

      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(data: TestRequestDTO) {
          receivedData = data;
          return { received: true };
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "John" });
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      expect(receivedData).toBeDefined();
      expect(receivedData!.name).toBe("John");
    });

    it("should wrap response in ResponseWrapper", async () => {
      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(_data: TestRequestDTO) {
          return { id: 1, name: "test" };
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "test" });
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      expect(res.send).toHaveBeenCalledWith(expect.any(ResponseWrapper));
      const sentResponse = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentResponse.data).toEqual({ id: 1, name: "test" });
    });

    it("should include pagination in response", async () => {
      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(_data: TestRequestDTO) {
          return [{ id: 1 }, { id: 2 }];
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "test" }, { page: "1", limit: "10" });
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      const sentResponse = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentResponse.pagination).toBeDefined();
      expect(sentResponse.pagination.page).toBe(1);
      expect(sentResponse.pagination.limit).toBe(10);
    });
  });

  describe("error handling", () => {
    it("should call next() on validation error", async () => {
      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(_data: TestRequestDTO) {
          return { success: true };
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "" }); // Invalid - empty name
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it("should call next() on method error", async () => {
      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(_data: TestRequestDTO) {
          throw new Error("Something went wrong");
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "test" });
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("default DTO", () => {
    it("should use DataRequestDTO as default when cls not provided", async () => {
      class TestController {
        @RequestDecorator()
        async testMethod(_data: DataRequestDTO) {
          return { success: true };
        }
      }

      const controller = new TestController();
      const req = createMockRequest({}, { page: "2" });
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      expect(res.send).toHaveBeenCalled();
      const sentResponse = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentResponse.pagination?.page).toBe(2);
    });
  });

  describe("custom DTO", () => {
    it("should use custom DTO class when provided", async () => {
      let receivedData: TestRequestDTO | null = null;

      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(data: TestRequestDTO) {
          receivedData = data;
          return { success: true };
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "CustomName" });
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      expect(receivedData).toBeInstanceOf(TestRequestDTO);
      expect(receivedData!.name).toBe("CustomName");
    });
  });

  describe("async method handling", () => {
    it("should handle async methods correctly", async () => {
      class TestController {
        @RequestDecorator(TestRequestDTO)
        async testMethod(_data: TestRequestDTO) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { delayed: true };
        }
      }

      const controller = new TestController();
      const req = createMockRequest({ name: "test" });
      const res = createMockResponse();
      const next = createMockNext();

      await (controller.testMethod as any)(req, res, next);

      expect(res.send).toHaveBeenCalled();
      const sentResponse = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentResponse.data).toEqual({ delayed: true });
    });
  });
});
