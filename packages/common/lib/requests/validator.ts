import { ValidationError, validateOrReject } from "class-validator";
import { NextFunction, Response } from "express";
import { ErrorResp } from "../responses";
import { DataRequest } from "./data-request";
import { DataRequestDTO } from "./data-request.dto";

/**
 * Validate and bind data from express request.
 * @param cls
 */
export const validateRequest = <T extends DataRequestDTO>(
  transform: (data: any) => T
) => {
  return async (req: DataRequest<T>, res: Response, next: NextFunction) => {
    try {
      const data = {
        ...req.params,
        ...req.query,
        ...req.body,
      };

      // transform data to target instance
      req.data = transform(data);

      // binding data from req
      req.data.bind(req);

      // validate instance
      await validateOrReject(req.data);
      next();
    } catch (err) {
      next(parseValidationError(err));
    }
  };
};

const parseValidationError = (err: unknown) => {
  if (!Array.isArray(err)) {
    return err;
  }

  const validationErrs = err as ValidationError[];
  if (validationErrs.length == 0) {
    return err;
  }

  const [firstErr] = validationErrs;
  const { contexts, constraints, children } = firstErr;

  if (contexts && Object.values(contexts).length > 0) {
    return new ErrorResp("error.badRequest", Object.values(contexts)[0], 400);
  }

  if (constraints && Object.values(constraints).length > 0) {
    return new ErrorResp(
      "error.badRequest",
      Object.values(constraints)[0],
      400
    );
  }

  if (children && children.length > 0) {
    return parseValidationError(children);
  }

  return new ErrorResp("error.badRequest", "Bad request", 400);
};
