import { IUserAddress } from "./user-address.contracts";
import { IUser } from "./user.contract";

export type UserRegisterPayload = Pick<IUser, "firstName" | "lastName" | "email" | "password" | "phoneNumber" | "signUpThrough" | "userType" >;
export type UserLoginPayload = Pick<IUser, "email" | "password">;
export type UserUpdateProfilePayload = Partial<
  Pick<IUser, "firstName" | "lastName" | "phoneNumber" | "profileImage" | "dob" > & {
    oldPassword: string;
    newPassword: string;
  } & { address: IUserAddress }
>;
