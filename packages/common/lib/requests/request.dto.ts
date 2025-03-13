import { Request } from "express";
import { Pagination } from "../responses";

export abstract class BaseRequestDTO {
  abstract bind(req: Request): void;
}

export class DataRequestDTO extends BaseRequestDTO {
  pagination?: Pagination;
  bind(req: Request): void {
    this.pagination = Pagination.fromReq(req);
  }
}
