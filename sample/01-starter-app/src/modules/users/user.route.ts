import { BaseRoute } from "@blazjs/common";
import { Router } from "express";
import { Service } from "typedi";
import { UserController } from "./user.controller";

@Service()
export class UserRoute implements BaseRoute {
  route? = "users";
  router: Router = Router();

  constructor(private userController: UserController) {
    this.userController = userController;
    this.router.post(
      "/",
      this.userController.createUser.bind(this.userController)
    );

    this.router.get(
      "/",
      this.userController.getUsers.bind(this.userController)
    );
  }
}
