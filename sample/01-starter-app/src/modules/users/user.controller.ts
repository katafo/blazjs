import { DataRequestDTO, Request } from "@blazjs/common";
import { Service } from "typedi";
import { UserCreateReqDTO } from "./dtos/user-create.dto";
import { UserService } from "./user.service";

@Service()
export class UserController {
  constructor(private userService: UserService) {}

  @Request(UserCreateReqDTO)
  async createUser(data: UserCreateReqDTO) {
    const user = await this.userService.createUser(data);
    return user;
  }

  @Request()
  async getUsers(data: DataRequestDTO) {
    return await this.userService.getUsers(data);
  }
}
