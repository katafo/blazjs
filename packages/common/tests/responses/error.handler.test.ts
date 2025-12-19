import { NextFunction, Request, Response } from "express";
import { errorRequestHandler } from "../../lib/responses/error.handler";
import { ErrorResp, ResponseWrapper } from "../../lib/responses";

describe("errorRequestHandler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ send: sendMock });
    mockResponse = {
      status: statusMock,
      send: sendMock,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("ErrorResp handling", () => {
    it("should return 400 for ErrorResp with default status", () => {
      const error = new ErrorResp("validation.error", "Validation failed");

      errorRequestHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "validation.error",
            message: "Validation failed",
            status: 400,
          }),
        })
      );
    });

    it("should return custom status for ErrorResp", () => {
      const error = new ErrorResp("user.notFound", "User not found", 404);

      errorRequestHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "user.notFound",
            message: "User not found",
            status: 404,
          }),
        })
      );
    });

    it("should wrap response in ResponseWrapper", () => {
      const error = new ErrorResp("test.error", "Test", 400);

      errorRequestHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const sentResponse = sendMock.mock.calls[0][0];
      expect(sentResponse).toBeInstanceOf(ResponseWrapper);
    });
  });

  describe("Internal error handling", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should hide error details in production", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("Sensitive database error details");

      errorRequestHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "error.internalServerError",
            message: "Internal server error",
            status: 500,
          }),
        })
      );
    });

    it("should show error message in development", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Detailed error message for debugging");

      errorRequestHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "error.internalServerError",
            message: "Detailed error message for debugging",
            status: 500,
          }),
        })
      );
    });

    it("should return 500 for generic Error", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Something went wrong");

      errorRequestHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
