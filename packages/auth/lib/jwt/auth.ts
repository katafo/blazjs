import { CacheProvider } from "@blazjs/cache/dist/providers/cache.provider";
import { ErrorResp } from "@blazjs/common";
import jwt, { SignOptions } from "jsonwebtoken";
import { JwtConfig } from "./config";

export interface JwtAuthPayload {
  sub: string;
}

export const JwtUnauthorizedError = new ErrorResp(
  "JwtError.Unauthorized",
  "Unauthorized",
  401
);

export type JwtAuthType = "access" | "refresh";

export class JwtAuth<T extends JwtAuthPayload> {
  constructor(private config: JwtConfig, private cache?: CacheProvider) {}

  /**
   * Sign JWT token
   * @param payload Payload for token
   * @param type Access or refresh
   * @param salt Salt for secret, add more security to token.
   */
  async sign(payload: T, type: JwtAuthType = "access", salt?: string) {
    const {
      secret,
      expiresIn,
      refreshSecret,
      refreshExpiresIn,
      issuer,
      audience,
    } = this.config;

    let jwtSecret = (type === "access" ? secret : refreshSecret) ?? "";
    if (salt) {
      jwtSecret = `${jwtSecret}-${salt}`;
    }

    let jwtExpires = type === "access" ? expiresIn : refreshExpiresIn;

    const signOptions: SignOptions = {
      expiresIn: jwtExpires,
    };
    if (issuer) signOptions.issuer = issuer;
    if (audience) signOptions.audience = audience;

    const signed = jwt.sign(payload, jwtSecret, signOptions);

    if (this.cache) {
      this.cache.set(this.getCacheKey(type, signed, payload), "", jwtExpires);
    }

    return signed;
  }

  /**
   * Verify JWT token
   * @param token JWT token
   * @param extractSalt Extract salt from payload
   */
  async verify(
    token: string,
    type: JwtAuthType = "access",
    salt?: (payload: T) => Promise<string | undefined>
  ) {
    const decoded = jwt.decode(token, {
      complete: true,
    });
    if (!decoded) {
      throw JwtUnauthorizedError;
    }

    let jwtsecret =
      type === "access" ? this.config.secret : this.config.refreshSecret;
    if (!jwtsecret) {
      throw JwtUnauthorizedError;
    }

    const payload = decoded.payload as T;
    const extractedSalt = salt ? await salt(payload) : undefined;
    if (extractedSalt) {
      jwtsecret = `${jwtsecret}-${extractedSalt}`;
    }

    try {
      jwt.verify(token, jwtsecret);
    } catch {
      throw JwtUnauthorizedError;
    }

    if (this.cache) {
      const cacheKey = this.getCacheKey(type, token, payload);
      const cached = await this.cache.exist(cacheKey);
      if (!cached) {
        throw JwtUnauthorizedError;
      }
    }

    return payload;
  }

  /**
   * Revoke JWT token.
   * Only work when cache is enabled
   * @param token JWT token
   */
  async revoke(token: string, type: JwtAuthType = "access") {
    if (!this.cache) {
      throw new Error("Jwt cache is not enabled");
    }
    const decoded = jwt.decode(token, {
      complete: true,
    });
    if (!decoded) {
      throw JwtUnauthorizedError;
    }
    const payload = decoded.payload as JwtAuthPayload;
    const cacheKey = this.getCacheKey(type, token, payload);
    await this.cache.del(cacheKey);
  }

  private getCacheKey(
    type: JwtAuthType,
    token: string,
    payload: JwtAuthPayload
  ) {
    return `${type}-tokens:${payload.sub}:${token}`;
  }
}
