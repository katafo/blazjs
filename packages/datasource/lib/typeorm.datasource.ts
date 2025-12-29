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
  private isReconnecting: boolean = false;

  constructor(options: DataSourceOptions, private logger?: Logger) {
    this.source = new DataSource(options);
    this.source.logger = new TypeOrmLogger(logger);
  }

  async initialize(): Promise<void> {
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
      return await queryRunner.manager.transaction(runInTransaction);
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
  ): Promise<T> {
    // If mode is EntityManager, use it directly
    if (mode instanceof EntityManager) {
      return await handler(mode);
    }
    // Create query runner for both slave and master modes
    const queryRunner = this.source.createQueryRunner(mode || "slave");
    try {
      return await handler(queryRunner.manager);
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
  }): Promise<void> {
    await this.source.runMigrations(options);
  }

  /**
   * Close the connection to the database.
   */
  async close(): Promise<void> {
    await this.source.destroy();
  }

  /** Check if database connection is alive */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.source.isInitialized) return false;
      await this.source.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  /** Reconnect to database if connection is lost.
   @param ms: milliseconds to wait before checking connection again
   @returns interval ID that can be used to stop reconnection
  */
  reconnect(ms: number): NodeJS.Timeout {
    return setInterval(async () => {
      const isConnected = await this.isConnected();
      if (!isConnected) {
        if (this.isReconnecting) return;
        this.isReconnecting = true;
        try {
          if (this.source.isInitialized) {
            await this.source.destroy();
            this.logger?.info("Database connection closed");
          }
          this.logger?.info("Reconnecting to database...");
          await this.source.initialize();
          this.logger?.info("Database reconnected");
        } catch (e) {
          this.logger?.error("Failed to reconnect to database", e);
        } finally {
          this.isReconnecting = false;
        }
      }
    }, ms);
  }
}
