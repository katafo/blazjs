import { TypeOrmDataSource } from "@blazjs/datasource";
import { Inject, Service } from "typedi";
import { INJECT_SQL } from "../../datasource";
import { UserCreateDTO } from "./dtos/user-create.dto";
import { UserRepos } from "./repos/user.repos";

@Service()
export class UserService {
  constructor(
    @Inject(INJECT_SQL) private datasource: TypeOrmDataSource,
    private userRepos: UserRepos
  ) {}

  async createUser(data: UserCreateDTO) {
    // create user with transaction
    return this.datasource.transaction(async (manager) => {
      return this.userRepos.createUser(data, manager);
    });
  }

  async getUsers() {
    return this.userRepos.getUsers();
  }
}
