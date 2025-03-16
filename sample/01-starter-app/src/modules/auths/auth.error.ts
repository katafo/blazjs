import { ErrorResp } from "@blazjs/common";

export const AuthError = {
  Unauthorized: new ErrorResp("AuthError.Unauthorized", "Unauthorized", 401),
};
