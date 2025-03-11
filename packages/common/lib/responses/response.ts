import { Request } from "express";
import { ErrorResp } from "./error.response";

export class ResponseWrapper {
  data: any;
  error?: ErrorResp;
  pagination?: Pagination;

  constructor(data: any, pagination?: Pagination, error?: ErrorResp) {
    this.data = data;
    this.error = error;
    this.pagination = pagination;
  }
}

export class Pagination {
  total: number;
  page: number;
  limit: number;

  constructor(page = 1, limit = 10, total?: number) {
    this.page = page;
    this.limit = limit;
    this.total = total || 0;
  }

  /**
   * Create pagination object from express request.
   * If page not a number, return undefined.
   * If limit not provided, use default value 10.
   * @param req: Request
   * @returns
   */
  static fromReq = (req: Request): Pagination | undefined => {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    if (isNaN(page)) return;
    return new Pagination(page, isNaN(limit) ? 10 : limit);
  };

  getOffset = () => {
    return (this.page - 1) * this.limit;
  };
}
