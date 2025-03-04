import { Request } from "express";
import { Pagination } from "../responses";

export class BaseRequestDTO {
  bind(req: Request): void {}
}

export class DataRequestDTO extends BaseRequestDTO {
  pagination?: Pagination;

  bind(req: Request): void {
    super.bind(req);
    this.pagination = Pagination.fromReq(req);
  }
}
