import {
  PrivacyStatus,
  Gamercomunity,
} from "@/contracts/gamer-comunity.contract";
import { GamerComunity } from "@/models/gamer-comunity.model";

export const GamerComunityService = {
  creategamercomunity: (
    title: string,
    description: string,
    image: string,
    privacy: PrivacyStatus,
    isBlocked?: boolean,
  ) => {
    const newgamercomunity = new GamerComunity({
      title,
      description,
      image,
      privacy,
      isBlocked,
    });
    return newgamercomunity.save();
  },

  editgamercomunity: (
    id: string,
    data: {
      title?: string;
      description?: string;
      image?: string;
      privacy?: PrivacyStatus;
      isBlocked?: boolean;
    }
  ) => {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    return GamerComunity.findByIdAndUpdate(id, updateData, { new: true });
  },

  deletegamercomunity: (id: string) => {
    return GamerComunity.findByIdAndDelete(id);
  },

  getAllgamercomunitys: () => {
    return GamerComunity.find();
  },

  getgamercomunityById: (id: string) => {
    return GamerComunity.findById(id);
  },



  // Join request methods
};
