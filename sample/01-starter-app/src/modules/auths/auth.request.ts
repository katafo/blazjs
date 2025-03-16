import { BaseRequestDTO } from "@blazjs/common";
import { Request } from "express";

export class AuthRequestDTO extends BaseRequestDTO {
  userId: string;

  bind(req: Request): void {
    this.userId = req["userId"];
  }
}
