import { AppAuth } from "@app/auth/auth";
import { DataRequestDTO } from "@blazjs/common";
import { Service } from "typedi";
import { UserCreateDTO } from "./dtos/user-create.dto";
import { UserSignInDTO } from "./dtos/user-signin.dto";
import { UserRepos } from "./repos/user.repos";
import { UserError } from "./user.error";

@Service()
export class UserService {
  constructor(private repos: UserRepos, private auth: AppAuth) {}

  async signIn(data: UserSignInDTO) {
    const { email, password } = data;
    if (email === "demo@blazjs.com" && password === "demo") {
      const token = await this.auth.sign(
        {
          userId: "1",
          sub: "1",
        },
        "access",
        "salt123"
      );
      return token;
    }
    throw UserError.InvalidAccount;
  }

  async createUser(data: UserCreateDTO) {
    return this.repos.transaction(async (manager) => {
      return this.repos.createUser(data, manager);
    });
  }

  async getUsers(data: DataRequestDTO) {
    return this.repos.getUsers(data);
  }
}
