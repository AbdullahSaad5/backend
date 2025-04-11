import mongoose from "mongoose";

const partSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  specifications: { type: String, required: true },
  price: { type: Number, required: true },
});

export const Part = mongoose.model("Part", partSchema);
