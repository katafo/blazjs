import { DataRequestDTO } from "@blazjs/common";
import { Service } from "typedi";
import { UserCreateDTO } from "./dtos/user-create.dto";
import { UserRepos } from "./repos/user.repos";

@Service()
export class UserService {
  constructor(private repos: UserRepos) {}

  async createUser(data: UserCreateDTO) {
    // create user with transaction
    return this.repos.transaction(async (manager) => {
      return this.repos.createUser(data, manager);
    });
  }

  async getUsers(data: DataRequestDTO) {
    return this.repos.getUsers(data);
  }
}
