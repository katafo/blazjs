import { Response } from "express";
import { ErrorResp, ResponseWrapper } from ".";
import { logger } from "../logger";

export const errorHandler = (err: Error, res: Response) => {
  if (err instanceof ErrorResp) {
    res
      .status(err.status || 400)
      .send(new ResponseWrapper(null, undefined, err));
  } else {
    logger.error("Error:", err);
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
