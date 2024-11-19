import { IUser } from "./user.contract";


export type UserRegisterPayload = Pick<IUser ,  "firstName" | "lastName" | "email" | "password" | "signUpThrough">
export type UserLoginPayload = Pick<IUser ,  "email" | "password" >
export type UserUpdateProfilePayload = Pick<IUser ,  "firstName" | "lastName" | "phoneNumber" | "profileImage"> & {
    oldPassword: string,
    newPassword: string
}
