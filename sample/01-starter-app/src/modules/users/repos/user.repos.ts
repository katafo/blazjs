import {
  DataSourceMode,
  InferEntityManager,
  TypeOrmDataSource,
  TypeOrmRepos,
} from "@blazjs/datasource";
import { Inject, Service } from "typedi";
import { INJECT_SQL } from "../../../datasource";
import { UserCreateDTO } from "../dtos/user-create.dto";
import { User } from "../entities/user.entity";

@Service()
export class UserRepos extends TypeOrmRepos<User> {
  constructor(@Inject(INJECT_SQL) datasource: TypeOrmDataSource) {
    super(User, datasource);
  }

  async createUser(data: UserCreateDTO, manager: InferEntityManager) {
    return manager.save(
      User.create({
        name: data.name,
      })
    );
  }

  async getUsers(mode?: DataSourceMode) {
    return this.datasource.query(mode, async (manager) => {
      return manager.find(User);
    });
  }
}
