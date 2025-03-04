import { EntityTarget, ObjectLiteral, Repository } from "typeorm";
import { TypeOrmDataSource } from "./typeorm.datasource";

export class TypeOrmRepos<T extends ObjectLiteral> {
  readonly repos: Repository<T>;
  readonly datasource: TypeOrmDataSource;

  constructor(entity: EntityTarget<T>, datasource: TypeOrmDataSource) {
    this.repos = datasource.source.getRepository(entity);
  }
}
