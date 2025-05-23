import mongoose, {Schema, model} from "mongoose";
import { Gamercomunity, GamercomunityModel, PrivacyStatus  } from "@/contracts/gamer-comunity.contract";


    const gamerComunity = new Schema<Gamercomunity, GamercomunityModel>({
        title: { 
            type: String, 
            required: [true, 'Title is required'],
          },
          description: { 
            type: String, 
            required: [true, 'Description is required'],
          },
          image: { 
            type: String, 
            required: [true, 'Image URL is required'],
          },
          privacy: { 
            type: String, 
            enum: Object.values(PrivacyStatus),
            default: PrivacyStatus.PUBLIC,
            required: true
          }
    })

    export const GamerComunity = model("gamercomunity", gamerComunity)