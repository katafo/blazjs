export class ErrorResp extends Error {
  status: number;
  code: string;
  message: string;

  constructor(code: string, message: string, status?: number) {
    super();
    this.code = code;
    this.message = message;
    this.status = status || 400;
  }
}
