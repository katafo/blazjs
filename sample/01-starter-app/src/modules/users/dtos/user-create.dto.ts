import { DataRequestDTO } from "@blazjs/common";
import { IsString } from "class-validator";

export interface UserCreateDTO {
  name: string;
}

export class UserCreateReqDTO extends DataRequestDTO implements UserCreateDTO {
  @IsString()
  name: string;
}
