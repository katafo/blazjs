export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class ErrorResp extends Error {
  status: number;
  code: string;
  message: string;
  details?: ValidationErrorDetail[];

  constructor(
    code: string,
    message: string,
    status?: number,
    details?: ValidationErrorDetail[]
  ) {
    super();
    this.code = code;
    this.message = message;
    this.status = status || 400;
    this.details = details;
  }
}
