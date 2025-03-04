import { DataRequestDTO } from "@blazjs/common";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export interface UserCreateDTO {
  name: string;
}

export class UserCreateReqDTO extends DataRequestDTO implements UserCreateDTO {
  @Expose()
  @IsString()
  name: string;
}
