import { DataRequestDTO } from "@blazjs/common";
import { Service } from "typedi";
import { UserCreateDTO } from "./dtos/user-create.dto";
import { UserRepos } from "./repos/user.repos";

export interface IUserService {
  createUser(data: UserCreateDTO): Promise<any>;
  getUsers(data: DataRequestDTO): Promise<any>;
}

@Service()
export class UserService implements IUserService {
  constructor(private repos: UserRepos) {}

  async createUser(data: UserCreateDTO) {
    return this.repos.transaction(async (manager) => {
      return this.repos.createUser(data, manager);
    });
  }

  async getUsers(data: DataRequestDTO) {
    return this.repos.getUsers(data);
  }
}
