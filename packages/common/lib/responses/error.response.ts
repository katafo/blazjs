export class ErrorResp extends Error {
  readonly status: number;
  readonly code: string;
  readonly message: string;

  constructor(code: string, message: string, status?: number) {
    super();
    this.code = code;
    this.message = message;
    this.stack = undefined;
    this.status = status || 500;
  }
}
