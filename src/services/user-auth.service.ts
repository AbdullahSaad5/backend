import { Address, User, UserCategory } from "@/models";
import { IUser } from "@/contracts/user.contract";
import { UserRegisterPayload } from "@/contracts/user-auth.contract";
import { createHash } from "@/utils/hash.util";
import { IUserAddress } from "@/contracts/user-address.contracts";

export const authService = {
  findExistingEmail: (email: string, select?: string) => {
    if (select) {
      return User.findOne({ email }).select(select).populate("userType");
    }
    return User.findOne({ email });
  },

  findExistingPhoneNumber: (phoneNumber: number) => {
    return User.findOne({phoneNumber})
  },

  createUser: async (data: UserRegisterPayload) => {
    const { firstName, lastName, email, phoneNumber , password, signUpThrough , userType } = data;
    console.log("usertype : " , userType)
    // const hasedPassword = await createHash(password);

    const newUser = await new User({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: User.prototype.hashPassword(password),
      signUpThrough,
      userType,
    });
    return await newUser.save();
  },

  findAddressByUserId: (userId: string) => {
    return Address.find({ userId: userId });
  },

  findAddressandUpdate: (id: string, address: IUserAddress) => {
    return Address.findByIdAndUpdate(id, address, { new: true });
  },

  createAddress: (address: IUserAddress) => {
    const newAddress = new Address(address);
    return newAddress.save();
  },

  // New: Find user by reset token
  findUserById: (id: string, select?: string) => {
    if (select) {
      return User.findById(id).select(select).populate("userType");
    }
    return User.findById(id).populate("userType");
  },

  // New: Find user by reset token
  findUserByResetToken: async (resetTokenHash: string) => {
    console.log("Searching for user with token hash:", resetTokenHash);
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });
    // console.log("Userrrr : " , user)
    if (!user) {
      console.log("No user found or token expired.");
    }
    return user;
  },

};
