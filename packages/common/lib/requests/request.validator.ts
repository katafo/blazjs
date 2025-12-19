import { ClassConstructor, plainToInstance } from "class-transformer";
import { ValidationError, validateOrReject } from "class-validator";
import { Request } from "express";
import { ErrorResp, ValidationErrorDetail } from "../responses";
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

/**
 * Extract all validation error details from ValidationError array.
 */
const extractAllErrors = (
  errors: ValidationError[],
  parentField = ""
): ValidationErrorDetail[] => {
  const details: ValidationErrorDetail[] = [];

  for (const err of errors) {
    const field = parentField ? `${parentField}.${err.property}` : err.property;

    if (err.constraints) {
      const messages = Object.values(err.constraints);
      for (const message of messages) {
        details.push({ field, message });
      }
    }

    if (err.children && err.children.length > 0) {
      details.push(...extractAllErrors(err.children, field));
    }
  }

  return details;
};

const parseValidationError = (err: unknown) => {
  if (!Array.isArray(err)) {
    return err;
  }

  const validationErrs = err as ValidationError[];
  if (validationErrs.length === 0) {
    return err;
  }

  const details = extractAllErrors(validationErrs);
  const firstMessage =
    details.length > 0 ? details[0].message : "Validation failed";

  return new ErrorResp("error.badRequest", firstMessage, 400, details);
};
