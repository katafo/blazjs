import { AppAuth } from "@app/auth/auth";
import { BaseRoute } from "@blazjs/common";
import { Service } from "typedi";
import { UserController } from "./user.controller";

@Service()
export class UserRoute extends BaseRoute {
  route? = "users";

  constructor(private controller: UserController, private auth: AppAuth) {
    super();
    this.router.post("/sign-in", this.controller.signIn.bind(this.controller));

    // require authorization
    this.router.use(this.auth.authorize.bind(this.auth));
    this.router.post("/", this.controller.createUser.bind(this.controller));
    this.router.get("/", this.controller.getUsers.bind(this.controller));
  }
}
