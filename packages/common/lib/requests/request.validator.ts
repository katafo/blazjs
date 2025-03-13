import { ClassConstructor, plainToInstance } from "class-transformer";
import { ValidationError, validateOrReject } from "class-validator";
import { Request } from "express";
import { ErrorResp } from "../responses";
import { BaseRequestDTO } from "./request.dto";

/**
 * Validate and bind data from express request.
 */
export const validateRequest = async <T extends BaseRequestDTO>(
  cls: ClassConstructor<T>,
  req: Request
): Promise<T> => {
  try {
    const data = plainToInstance(
      cls,
      {
        ...req.params,
        ...req.query,
        ...req.body,
      },
      { enableImplicitConversion: true }
    );
    data.bind(req);
    await validateOrReject(data);
    return data;
  } catch (error) {
    throw parseValidationError(error);
  }
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
