import { IsNumber, IsString } from "class-validator";

export class JwtConfig {
  @IsString()
  secret: string;

  @IsNumber()
  expiresIn: number;
}
