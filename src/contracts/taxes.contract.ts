import { Document } from "mongoose";

// Full Cart Interface
interface ITaxes extends Document {
  vatPercentage: number;
  country: string;   // Country where the tax applies
  state?: string;    
}

export { ITaxes };
