import { Request } from "express";
import { ErrorResp, Pagination, ResponseWrapper } from "../../lib/responses";

describe("Pagination", () => {
  describe("constructor", () => {
    it("should set default values", () => {
      const pagination = new Pagination();

      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(pagination.total).toBe(0);
    });

    it("should accept custom values", () => {
      const pagination = new Pagination(3, 20, 100);

      expect(pagination.page).toBe(3);
      expect(pagination.limit).toBe(20);
      expect(pagination.total).toBe(100);
    });
  });

  describe("fromReq", () => {
    const createMockRequest = (query: Record<string, string>): Request => {
      return { query } as unknown as Request;
    };

    it("should return undefined when page is NaN", () => {
      const req = createMockRequest({ page: "invalid" });

      const result = Pagination.fromReq(req);

      expect(result).toBeUndefined();
    });

    it("should return undefined when page is not provided", () => {
      const req = createMockRequest({});

      const result = Pagination.fromReq(req);

      expect(result).toBeUndefined();
    });

    it("should return Pagination with default limit when limit is NaN", () => {
      const req = createMockRequest({ page: "2", limit: "invalid" });

      const result = Pagination.fromReq(req);

      expect(result).toBeDefined();
      expect(result?.page).toBe(2);
      expect(result?.limit).toBe(10);
    });

    it("should return Pagination with custom page and limit", () => {
      const req = createMockRequest({ page: "3", limit: "25" });

      const result = Pagination.fromReq(req);

      expect(result).toBeDefined();
      expect(result?.page).toBe(3);
      expect(result?.limit).toBe(25);
    });
  });

  describe("getOffset", () => {
    it("should return 0 for page 1", () => {
      const pagination = new Pagination(1, 10);

      expect(pagination.getOffset()).toBe(0);
    });

    it("should return correct offset for page 3 with limit 20", () => {
      const pagination = new Pagination(3, 20);

      expect(pagination.getOffset()).toBe(40);
    });

    it("should return correct offset for page 5 with limit 15", () => {
      const pagination = new Pagination(5, 15);

      expect(pagination.getOffset()).toBe(60);
    });
  });
});

describe("ResponseWrapper", () => {
  it("should wrap data correctly", () => {
    const data = { id: 1, name: "test" };

    const wrapper = new ResponseWrapper(data);

    expect(wrapper.data).toEqual(data);
    expect(wrapper.pagination).toBeUndefined();
    expect(wrapper.error).toBeUndefined();
  });

  it("should include pagination when provided", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const pagination = new Pagination(1, 10, 100);

    const wrapper = new ResponseWrapper(data, pagination);

    expect(wrapper.data).toEqual(data);
    expect(wrapper.pagination).toEqual(pagination);
    expect(wrapper.error).toBeUndefined();
  });

  it("should include error when provided", () => {
    const error = new ErrorResp("test.error", "Test error", 400);

    const wrapper = new ResponseWrapper(null, undefined, error);

    expect(wrapper.data).toBeNull();
    expect(wrapper.error).toEqual(error);
  });

  it("should include all properties when provided", () => {
    const data = { id: 1 };
    const pagination = new Pagination(1, 10, 50);
    const error = new ErrorResp("test.error", "Test error", 400);

    const wrapper = new ResponseWrapper(data, pagination, error);

    expect(wrapper.data).toEqual(data);
    expect(wrapper.pagination).toEqual(pagination);
    expect(wrapper.error).toEqual(error);
  });
});

describe("ErrorResp", () => {
  it("should create error with code, message, and status", () => {
    const error = new ErrorResp("user.notFound", "User not found", 404);

    expect(error.code).toBe("user.notFound");
    expect(error.message).toBe("User not found");
    expect(error.status).toBe(404);
  });

  it("should default status to 400 when not provided", () => {
    const error = new ErrorResp("validation.failed", "Validation failed");

    expect(error.status).toBe(400);
  });

  it("should be instance of Error", () => {
    const error = new ErrorResp("test.error", "Test error");

    expect(error).toBeInstanceOf(Error);
  });
});
