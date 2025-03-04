import { Response } from "express";
import { logger } from "./logger";
import { ErrorResp, ResponseWrapper } from "./responses";

export const errorHandler = (err: Error, res: Response) => {
  if (err instanceof ErrorResp) {
    res
      .status(err.status || 400)
      .send(new ResponseWrapper(null, undefined, err));
  } else {
    logger.error(err);
    // hide internal server error details in production
    if (process.env.APP_ENV === "production") {
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
      JSON.stringify(err),
      500
    );
    res.status(500).send(new ResponseWrapper(null, undefined, errResp));
  }
};
