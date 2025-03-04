import { DataRequest, ResponseWrapper } from "@blazjs/common";
import { NextFunction, Response } from "express";
import { Service } from "typedi";
import { UserCreateReqDTO } from "./dtos/user-create.dto";
import { UserService } from "./user.service";

@Service()
export class UserController {
  constructor(private readonly userService: UserService) {}

  async createUser(
    req: DataRequest<UserCreateReqDTO>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await this.userService.createUser(req.data);
      res.send(new ResponseWrapper(user));
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await this.userService.getUsers();
      res.send(new ResponseWrapper(users));
    } catch (error) {
      next(error);
    }
  }
}
