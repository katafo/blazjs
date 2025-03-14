import { EntityTarget, ObjectLiteral, Repository } from "typeorm";
import { InferEntityManager, TypeOrmDataSource } from "./typeorm.datasource";

export class TypeOrmRepos<T extends ObjectLiteral> extends Repository<T> {
  protected readonly datasource: TypeOrmDataSource;

  constructor(entity: EntityTarget<T>, datasource: TypeOrmDataSource) {
    const repos = datasource.source.getRepository(entity);
    super(repos.target, repos.manager);
    this.datasource = datasource;
  }

  async transaction<T>(handler: (manager: InferEntityManager) => Promise<T>) {
    return this.datasource.transaction(handler);
  }
}
