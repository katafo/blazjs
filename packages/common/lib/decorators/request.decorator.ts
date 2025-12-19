import { ClassConstructor } from "class-transformer";
import { NextFunction, Request, Response } from "express";
import { DataRequestDTO, validateRequest } from "../requests";
import { ResponseWrapper } from "../responses";

/**
 * A decorator to handle request validation and response wrapping for express controller.
 * @param cls: Request data class constructor. Default is DataRequestDTO.
 * @returns
 */
export function Request<T extends DataRequestDTO>(cls?: ClassConstructor<T>) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      try {
        const data = await validateRequest(cls || DataRequestDTO, req);
        const result = await originalMethod?.apply(this, [data]);
        res.send(new ResponseWrapper(result, data?.pagination));
      } catch (error) {
        next(error);
      }
    };

    return descriptor;
  };
}
