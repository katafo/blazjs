import { EntityTarget, ObjectLiteral, Repository } from "typeorm";
import { TypeOrmDataSource } from "./typeorm.datasource";

export class TypeOrmRepos<T extends ObjectLiteral> {
  protected readonly repos: Repository<T>;
  protected readonly datasource: TypeOrmDataSource;

  constructor(entity: EntityTarget<T>, datasource: TypeOrmDataSource) {
    this.datasource = datasource;
    this.repos = datasource.source.getRepository(entity);
  }
}
