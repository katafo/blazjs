import { Logger } from "@blazjs/common";
import {
  DataSource,
  DataSourceOptions,
  EntityManager,
  ReplicationMode,
} from "typeorm";
import { TypeOrmLogger } from "./typeorm.logger";

// infer the type of the data source entity manager
// to fix issue mismatch type of the entity manager when import
export type InferEntityManager = EntityManager;
export type DataSourceMode = ReplicationMode | InferEntityManager;

export class TypeOrmDataSource {
  readonly source: DataSource;

  constructor(options: DataSourceOptions, logger?: Logger) {
    this.source = new DataSource(options);
    this.source.logger = new TypeOrmLogger(logger);
  }

  async initialize() {
    await this.source.initialize();
  }

  /**
   * Start a transaction with a entity manager.
   * @param runInTransaction
   * @returns
   */
  async transaction<T>(
    runInTransaction: (manager: InferEntityManager) => Promise<T>
  ): Promise<T> {
    const queryRunner = this.source.createQueryRunner("master");
    try {
      return await queryRunner.connection.transaction(runInTransaction);
    } finally {
      await queryRunner.release();
    }
  }

  /** Create a query builder based on dbsource
   *
   * - ReplicationMode: Perform queries on a single database connection (MASTER | SLAVE).
   * - EntityManager: Used for custom entity manager, like performing queries in transaction.
   */
  async query<T>(
    mode: DataSourceMode | undefined,
    handler: (manager: InferEntityManager) => Promise<T>
  ) {
    if (!mode || mode === "slave") {
      return await handler(this.source.manager);
    }
    if (mode instanceof EntityManager) {
      return await handler(mode);
    }
    // create a connection to MASTER database
    const queryRunner = this.source.createQueryRunner(mode);
    try {
      const { manager } = queryRunner;
      return await handler(manager);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Run migration on the database.
   */
  async runMigration(options?: {
    transaction?: "all" | "none" | "each";
    fake?: boolean;
  }) {
    await this.source.runMigrations(options);
  }

  /**
   * Close the connection to the database.
   */
  async close() {
    await this.source.destroy();
  }
}
