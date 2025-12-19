import { Request } from "express";
import { BaseRequestDTO, DataRequestDTO } from "../../lib/requests/request.dto";

describe("BaseRequestDTO", () => {
  it("should be an abstract class with bind method", () => {
    // BaseRequestDTO is abstract, so we test through DataRequestDTO
    const dto = new DataRequestDTO();
    expect(typeof dto.bind).toBe("function");
  });
});

describe("DataRequestDTO", () => {
  const createMockRequest = (query: Record<string, string> = {}): Request => {
    return { query } as unknown as Request;
  };

  describe("bind", () => {
    it("should set pagination from request with page and limit", () => {
      const dto = new DataRequestDTO();
      const req = createMockRequest({ page: "2", limit: "20" });

      dto.bind(req);

      expect(dto.pagination).toBeDefined();
      expect(dto.pagination?.page).toBe(2);
      expect(dto.pagination?.limit).toBe(20);
    });

    it("should set pagination undefined when no page in query", () => {
      const dto = new DataRequestDTO();
      const req = createMockRequest({ limit: "10" });

      dto.bind(req);

      expect(dto.pagination).toBeUndefined();
    });

    it("should set pagination undefined when page is not a number", () => {
      const dto = new DataRequestDTO();
      const req = createMockRequest({ page: "invalid" });

      dto.bind(req);

      expect(dto.pagination).toBeUndefined();
    });

    it("should use default limit when limit is not provided", () => {
      const dto = new DataRequestDTO();
      const req = createMockRequest({ page: "1" });

      dto.bind(req);

      expect(dto.pagination).toBeDefined();
      expect(dto.pagination?.page).toBe(1);
      expect(dto.pagination?.limit).toBe(10); // default limit
    });

    it("should use default limit when limit is not a number", () => {
      const dto = new DataRequestDTO();
      const req = createMockRequest({ page: "1", limit: "invalid" });

      dto.bind(req);

      expect(dto.pagination).toBeDefined();
      expect(dto.pagination?.limit).toBe(10);
    });

    it("should handle empty query", () => {
      const dto = new DataRequestDTO();
      const req = createMockRequest({});

      dto.bind(req);

      expect(dto.pagination).toBeUndefined();
    });
  });

  describe("inheritance", () => {
    it("should extend BaseRequestDTO", () => {
      const dto = new DataRequestDTO();

      expect(dto).toBeInstanceOf(DataRequestDTO);
      // Check that bind method exists (from BaseRequestDTO)
      expect(dto.bind).toBeDefined();
    });

    it("should allow custom DTOs to extend DataRequestDTO", () => {
      class CustomDTO extends DataRequestDTO {
        customField?: string;

        bind(req: Request): void {
          super.bind(req);
          this.customField = req.query.custom as string;
        }
      }

      const dto = new CustomDTO();
      const req = createMockRequest({ page: "1", custom: "value" });

      dto.bind(req);

      expect(dto.pagination?.page).toBe(1);
      expect(dto.customField).toBe("value");
    });
  });
});
