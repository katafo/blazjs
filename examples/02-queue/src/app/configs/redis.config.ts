import { IsNumber, IsOptional, IsString } from "class-validator";

export class RedisConfig {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  @IsOptional()
  password: string;

  @IsNumber()
  @IsOptional()
  db?: number;
}
