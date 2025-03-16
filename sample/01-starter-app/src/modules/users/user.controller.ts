import { DataRequestDTO, Request } from "@blazjs/common";
import { Service } from "typedi";
import { UserCreateReqDTO } from "./dtos/user-create.dto";
import { UserSignInReqDTO } from "./dtos/user-signin.dto";
import { UserService } from "./user.service";

@Service()
export class UserController {
  constructor(private userService: UserService) {}

  @Request(UserSignInReqDTO)
  async signIn(data: UserSignInReqDTO) {
    return await this.userService.signIn(data);
  }

  @Request(UserCreateReqDTO)
  async createUser(data: UserCreateReqDTO) {
    return await this.userService.createUser(data);
  }

  @Request()
  async getUsers(data: DataRequestDTO) {
    return await this.userService.getUsers(data);
  }
}
