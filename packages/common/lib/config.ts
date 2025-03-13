import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

export class Config {
  nodeEnv: string;
  appEnv: string;
  port: number;

  constructor() {
    this.nodeEnv = process.env.NODE_ENV || "development";
    this.appEnv = process.env.APP_ENV || "development";
    this.port = Number(process.env.PORT) || 3000;
  }

  /**
   * Check if the node environment is production
   * @returns boolean
   */
  isProductionNodeEnv() {
    return this.nodeEnv === "production";
  }

  /**
   * Check if the app environment is production.
   * Useful for apps that have multiple environments (production, staging, development)
   * @returns boolean
   */
  isProductionAppEnv() {
    return this.appEnv === "production";
  }

  /**
   * Decode the stringified object
   * @param str
   * @returns object
   */
  decodeObj(str: string | undefined) {
    if (!str) return new Error("Env validation error");
    return JSON.parse(str.replace(/\\/g, ""));
  }

  validate() {
    const errors = validateSync(
      plainToInstance(Object.getPrototypeOf(this).constructor, this, {
        enableImplicitConversion: true,
      })
    );
    if (!errors.length) return;
    const props = errors.map((e) => e.property);
    throw new Error(`Env validation error: ${props.join(", ")}`);
  }
}
