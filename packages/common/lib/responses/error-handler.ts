import { NextFunction, Request, Response } from "express";
import { ErrorResp, ResponseWrapper } from ".";
import { logger } from "../logger";

const mask = (keys: Set<string>, data: any) => {
  if (typeof data === "object" && data !== null) {
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        keys.has(key) ? "**********" : value
      )
    );
  }
  return data;
};

export const errorRequestHandler = (
  sanitizedLogKeys: Set<string>,
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err.message, {
    request: {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      params: mask(sanitizedLogKeys, req.params),
      query: mask(sanitizedLogKeys, req.query),
      body: mask(sanitizedLogKeys, req.body),
      statusCode: res.statusCode,
    },
    error: {
      name: err.name,
      code: err["code"],
      message: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    },
  });
  if (err instanceof ErrorResp) {
    res
      .status(err.status || 400)
      .send(new ResponseWrapper(null, undefined, err));
  } else {
    // hide internal server error details in production
    if (process.env.NODE_ENV === "production") {
      res
        .status(500)
        .send(
          new ResponseWrapper(
            null,
            undefined,
            new ErrorResp(
              "error.internalServerError",
              "Internal server error",
              500
            )
          )
        );
      return;
    }
    const errResp = new ErrorResp(
      "error.internalServerError",
      err.message,
      500
    );
    res.status(500).send(new ResponseWrapper(null, undefined, errResp));
  }
};
