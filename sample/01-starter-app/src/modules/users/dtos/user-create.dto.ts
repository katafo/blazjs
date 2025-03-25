import { AuthRequestDTO } from "@app/auth";
import { IsString } from "class-validator";

export interface UserCreateDTO {
  name: string;
}

export class UserCreateReqDTO extends AuthRequestDTO implements UserCreateDTO {
  @IsString()
  name: string;
}
