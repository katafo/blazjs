import { RequestHandler } from "@blazjs/common";
import { Service } from "typedi";
import { UserCreateReqDTO } from "./dtos/user-create.dto";
import { UserService } from "./user.service";

@Service()
export class UserController {
  constructor(private userService: UserService) {}

  @RequestHandler(UserCreateReqDTO)
  async createUser(data: UserCreateReqDTO) {
    const user = await this.userService.createUser(data);
    return user;
  }

  @RequestHandler()
  async getUsers() {
    return await this.userService.getUsers();
  }
}
