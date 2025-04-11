import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import { IAccessToken, IJwtUser } from "@/contracts/jwt.contract";

export const jwtSign = (id: Types.ObjectId): IAccessToken => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET || "", {
    expiresIn: process.env.JWT_EXPIRATION || "1h",
  });

  const refreshToken = jwt.sign({ id }, process.env.JWT_SECRET || "", {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || "7d",
  });

  return { accessToken, refreshToken };
};

export const jwtVerify = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET || "") as IJwtUser;
};
