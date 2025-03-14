import { DataRequestDTO } from "@blazjs/common";
import {
  DataSourceMode,
  InferEntityManager,
  TypeOrmRepos,
} from "@blazjs/datasource";
import { Service } from "typedi";
import { AppDataSource } from "../../../datasource";
import { UserCreateDTO } from "../dtos/user-create.dto";
import { User } from "../entities/user.entity";

@Service()
export class UserRepos extends TypeOrmRepos<User> {
  constructor(datasource: AppDataSource) {
    super(User, datasource);
  }

  async createUser(data: UserCreateDTO, manager: InferEntityManager) {
    return manager.save(
      this.create({
        name: data.name,
      })
    );
  }

  async getUsers(data: DataRequestDTO, mode?: DataSourceMode) {
    const { pagination } = data;
    return this.datasource.query(mode, async (manager) => {
      return manager.find(User, {
        take: pagination?.limit,
        skip: pagination?.getOffset(),
      });
    });
  }
}
