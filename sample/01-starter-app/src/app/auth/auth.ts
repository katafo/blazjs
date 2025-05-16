import { AppConfig, logger } from "@app/index";
import { JwtAuth, JwtAuthPayload, JwtUnauthorizedError } from "@blazjs/auth";
import { DataRequestDTO } from "@blazjs/common";
import { NextFunction, Request, Response } from "express";
import { Service } from "typedi";

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
        throw JwtUnauthorizedError;
      }
      const payload = await this.verify(token, "access", async (decoded) => {
        logger.debug("JWT decoded", decoded);
        return "salt123";
      });
      req["sub"] = payload.sub;
      req["userId"] = payload.userId;

      next();
    } catch (error) {
      next(error);
    }
  }
}
