import { DataRequestDTO, validateRequest } from "@blazjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";

/**
 * Validate request with class constructor
 * @param cls ClassConstructor
 * @returns
 */
export const validateClsRequest = <T extends DataRequestDTO>(
  cls: ClassConstructor<T>
) => validateRequest((data) => plainToInstance(cls, data));
