import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { Document } from "mongoose";

import { IUser } from "./user.contract";

export interface IContextRequest<T> extends Omit<Request, "context"> {
  context: T;
  headers: Request["headers"];
}

export interface IBodyRequest<T> extends Omit<Request, "body"> {
  body: T;
  headers: Request["headers"];
}

export interface IParamsRequest<T> extends Request {
  params: T & ParamsDictionary;
  headers: Request["headers"];
}

export interface IQueryRequest<T> extends Request {
  query: T & ParamsDictionary;
  headers: Request["headers"];
}

export interface ICombinedRequest<
  Context,
  Body,
  Params = Record<string, unknown>,
  Query = Record<string, unknown>,
> extends Pick<IContextRequest<Context>, "context" | "headers">,
    Pick<IBodyRequest<Body>, "body">,
    Pick<IParamsRequest<Params>, "params">,
    Pick<IQueryRequest<Query>, "query"> {
  headers: Request["headers"];
}

export interface IUserRequest {
  user: Omit<IUser, "id"> & Document;
  accessToken: string;
  headers: Request["headers"];
}
