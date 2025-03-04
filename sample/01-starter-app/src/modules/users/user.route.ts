import { BaseRoute } from "@blazjs/common";
import { Router } from "express";
import { Service } from "typedi";
import { validateClsRequest } from "../../utils/validator";
import { UserCreateReqDTO } from "./dtos/user-create.dto";
import { UserController } from "./user.controller";

@Service()
export class UserRoute implements BaseRoute {
  route? = "users";
  router: Router = Router();

  constructor(private readonly userController: UserController) {
    this.router.post(
      "/",
      validateClsRequest(UserCreateReqDTO),
      this.userController.createUser.bind(this.userController)
    );

    this.router.get(
      "/",
      this.userController.getUsers.bind(this.userController)
    );
  }
}
