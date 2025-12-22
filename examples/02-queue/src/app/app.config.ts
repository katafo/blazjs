import { Config } from "@blazjs/common";
import { ValidateNested } from "class-validator";
import { Service } from "typedi";
import { RedisConfig } from "./configs/redis.config";

@Service()
export class AppConfig extends Config {
  @ValidateNested()
  redis: RedisConfig;

  constructor() {
    super();
    this.redis = this.decodeObj(process.env.REDIS);
  }
}
