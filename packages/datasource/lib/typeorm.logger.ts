import { logger } from "@blazjs/common";
import { AbstractLogger, LogLevel, LogMessage, QueryRunner } from "typeorm";

export class TypeOrmLogger extends AbstractLogger {
  protected writeLog(
    level: LogLevel,
    message: string | number | LogMessage | (string | number | LogMessage)[],
    queryRunner?: QueryRunner
  ): void {
    throw new Error("Method not implemented.");
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): void {
    logger.debug(`[QUERY] ${this.generateQuery(query, parameters)}`);
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ): void {
    logger.warn(
      `[QUERY] [${time}ms] - ${this.generateQuery(query, parameters)}`
    );
  }

  private generateQuery(query: string, parameters: any[] | undefined) {
    if (!parameters) return query.replace(/[\s\n]+/g, " ");
    parameters.forEach((param) => {
      query = query.replace("?", `${this.stringifyParams(param)}`);
    });
    return query.replace(/[\s\n]+/g, " ");
  }
}
