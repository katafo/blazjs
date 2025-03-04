import { Request } from "express";
import { DataRequestDTO } from "./data-request.dto";

export interface DataRequest<T extends DataRequestDTO> extends Request {
  data: T;
}
