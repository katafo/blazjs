import { NextFunction, Request, Response } from "express";
import { ErrorResp, ResponseWrapper } from ".";

export const errorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ErrorResp) {
    res
      .status(err.status || 400)
      .send(new ResponseWrapper(null, undefined, err));
    return;
  }
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
  const errResp = new ErrorResp("error.internalServerError", err.message, 500);
  res.status(500).send(new ResponseWrapper(null, undefined, errResp));
};
