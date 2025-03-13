import { CorsOptions } from "cors";
import { HelmetOptions } from "helmet";
import { Logger } from "./loggers";

export interface AppOptions {
  /** Enable trust proxy to get the client IP address.
   * @default true
   */
  trustProxy?: boolean;

  /** Config CORS.
   * @default true
   */
  cors?: {
    enabled: boolean;
    options?: CorsOptions;
  };

  /** Config Helmet.
   * @default true
   */
  helmet?: {
    enabled: boolean;
    options?: HelmetOptions;
  };

  /** Logger */
  logger?: Logger;
}
