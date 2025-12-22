import { DataRequestDTO } from "@blazjs/common";
import { IsEmail, IsString } from "class-validator";

export interface UserSignInDTO {
  email: string;
  password: string;
}

export class UserSignInReqDTO extends DataRequestDTO implements UserSignInDTO {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
