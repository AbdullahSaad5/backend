import { Document, Model } from "mongoose";

export enum PrivacyStatus {
    PUBLIC = 'public',
    PRIVATE = 'private'
  }

export interface Gamercomunity extends Document{
    title: string;
  description: string;
  image: string;
  privacy: PrivacyStatus;
}

export type GamercomunityModel = Model<Gamercomunity>