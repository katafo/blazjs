import { IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { Request } from "express";
import { validateRequest } from "../../lib/requests/request.validator";
import { BaseRequestDTO, DataRequestDTO } from "../../lib/requests/request.dto";
import { ErrorResp } from "../../lib/responses";

// Test DTOs
class TestDTO extends DataRequestDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  age!: number;
}

class NestedItemDTO {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

class TestNestedDTO extends DataRequestDTO {
  @ValidateNested()
  @Type(() => NestedItemDTO)
  item!: NestedItemDTO;
}

describe("validateRequest", () => {
  const createMockRequest = (
    params: Record<string, unknown> = {},
    query: Record<string, unknown> = {},
    body: Record<string, unknown> = {}
  ): Request => {
    return {
      params,
      query,
      body,
    } as unknown as Request;
  };

  describe("data merging", () => {
    it("should merge params, query, body into DTO", async () => {
      const req = createMockRequest(
        { id: "123" },
        { filter: "active" },
        { name: "John", age: 25 }
      );

      const result = await validateRequest(TestDTO, req);

      expect(result.name).toBe("John");
      expect(result.age).toBe(25);
      expect((result as any).id).toBe("123");
      expect((result as any).filter).toBe("active");
    });

    it("should call bind() on DTO", async () => {
      const req = createMockRequest({}, { page: "1", limit: "10" }, { name: "Test", age: 30 });

      const result = await validateRequest(TestDTO, req);

      expect(result.pagination).toBeDefined();
      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.limit).toBe(10);
    });
  });

  describe("implicit conversion", () => {
    it("should enable implicit conversion (string to number)", async () => {
      const req = createMockRequest({}, {}, { name: "Test", age: "25" });

      const result = await validateRequest(TestDTO, req);

      expect(result.age).toBe(25);
      expect(typeof result.age).toBe("number");
    });
  });

  describe("validation errors", () => {
    it("should throw ErrorResp on validation failure", async () => {
      const req = createMockRequest({}, {}, { name: "", age: 25 });

      await expect(validateRequest(TestDTO, req)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should return first validation error message from constraints", async () => {
      const req = createMockRequest({}, {}, { name: "", age: 25 });

      try {
        await validateRequest(TestDTO, req);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorResp);
        expect((error as ErrorResp).code).toBe("error.badRequest");
        expect((error as ErrorResp).status).toBe(400);
      }
    });

    it("should handle nested validation errors (children)", async () => {
      const req = createMockRequest({}, {}, { item: { title: "" } });

      try {
        await validateRequest(TestNestedDTO, req);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorResp);
        expect((error as ErrorResp).code).toBe("error.badRequest");
      }
    });

    it("should throw ErrorResp for missing required field", async () => {
      const req = createMockRequest({}, {}, { age: 25 });

      await expect(validateRequest(TestDTO, req)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should throw ErrorResp for invalid number (negative when min 0)", async () => {
      const req = createMockRequest({}, {}, { name: "Test", age: -5 });

      await expect(validateRequest(TestDTO, req)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should include details array with field and message", async () => {
      const req = createMockRequest({}, {}, { name: "", age: 25 });

      try {
        await validateRequest(TestDTO, req);
        fail("Should have thrown an error");
      } catch (error) {
        const errorResp = error as ErrorResp;
        expect(errorResp.details).toBeDefined();
        expect(Array.isArray(errorResp.details)).toBe(true);
        expect(errorResp.details!.length).toBeGreaterThan(0);
        expect(errorResp.details![0]).toHaveProperty("field");
        expect(errorResp.details![0]).toHaveProperty("message");
      }
    });

    it("should collect all validation errors in details", async () => {
      const req = createMockRequest({}, {}, { name: "", age: -5 });

      try {
        await validateRequest(TestDTO, req);
        fail("Should have thrown an error");
      } catch (error) {
        const errorResp = error as ErrorResp;
        expect(errorResp.details).toBeDefined();
        // Should have errors for both name (empty) and age (negative)
        expect(errorResp.details!.length).toBeGreaterThanOrEqual(2);
        const fields = errorResp.details!.map((d) => d.field);
        expect(fields).toContain("name");
        expect(fields).toContain("age");
      }
    });

    it("should include nested field path in details", async () => {
      const req = createMockRequest({}, {}, { item: { title: "" } });

      try {
        await validateRequest(TestNestedDTO, req);
        fail("Should have thrown an error");
      } catch (error) {
        const errorResp = error as ErrorResp;
        expect(errorResp.details).toBeDefined();
        const nestedDetail = errorResp.details!.find((d) => d.field.includes("item.title"));
        expect(nestedDetail).toBeDefined();
      }
    });
  });

  describe("DataRequestDTO default", () => {
    it("should work with DataRequestDTO when no validation needed", async () => {
      const req = createMockRequest({}, { page: "2", limit: "20" }, { foo: "bar" });

      const result = await validateRequest(DataRequestDTO, req);

      expect(result).toBeInstanceOf(DataRequestDTO);
      expect(result.pagination?.page).toBe(2);
      expect(result.pagination?.limit).toBe(20);
    });
  });
});
