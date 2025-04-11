import mongoose from "mongoose";

const options = { discriminatorKey: "kind" };

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    details: {
      processor: { type: String },
      model: { type: String },
      brand: { type: String },
    },
  },
  options
);

const Producttt = mongoose.model("Producttt", ProductSchema);

Producttt.discriminator(
  "PC",
  new mongoose.Schema(
    {
      techSpecf: {
        cpu: { type: String },
        gpu: { type: String },
        ram: { type: String },
      },
    },
    options
  )
);

Producttt.discriminator(
  "Projector",
  new mongoose.Schema(
    {
      techSpecf: {
        resolution: { type: String },
        lumens: { type: String },
        contrast: { type: String },
      },
    },
    options
  )
);

export { Producttt };
