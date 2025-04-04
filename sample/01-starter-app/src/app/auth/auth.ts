import { AppConfig } from "@app/index";
import { JwtAuth, JwtAuthPayload } from "@blazjs/auth";
import { DataRequestDTO } from "@blazjs/common";
import { NextFunction, Request, Response } from "express";
import { Service } from "typedi";
import { AuthError } from "./auth.error";

export class AuthPayload implements JwtAuthPayload {
  sub: string;
  userId: string;
}

export class AuthRequestDTO extends DataRequestDTO {
  userId: string;
  bind(req: Request): void {
    super.bind(req);
    this.userId = req["userId"];
  }
}

@Service()
export class AppAuth extends JwtAuth<AuthPayload> {
  constructor(config: AppConfig) {
    super(config.jwt);
  }

  async authorize(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        throw AuthError.Unauthorized;
      }
      const payload = await this.verify(token);
      req["sub"] = payload.sub;
      req["userId"] = payload.userId;

      next();
    } catch (error) {
      next(error);
    }
  }
}
