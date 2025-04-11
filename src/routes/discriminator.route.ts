import { Router } from "express";
import { Producttt } from "../models/discriminator.model";
import mongoose from "mongoose";

export const discriminatorRouter = Router();

// Create a new product with basic details
discriminatorRouter.post("/", async (req, res) => {
  try {
    const { name, kind, details } = req.body;

    if (!name || !kind || !details) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newProduct = await Producttt.create({
      name,
      kind,
      details,
    });

    res
      .status(201)
      .json({ message: "Product created successfully", data: newProduct });
  } catch (error: any) {
    console.error("Error creating product:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Update techSpecf for an existing product
discriminatorRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { techSpecf } = req.body;

    if (!techSpecf) {
      return res.status(400).json({ message: "Missing techSpecf field" });
    }

    // Find the product by ID and check its kind
    const product = (await Producttt.findById(id)) as mongoose.Document & {
      kind: string;
    };
    console.log("product : ", product);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!Producttt.discriminators) {
      return res
        .status(500)
        .json({ message: "Discriminator models are not properly registered" });
    }
    console.log("Producttt.discriminators : ", Producttt.discriminators);

    console.log("product.kind : ", product.kind);
    // Determine the model based on the kind
    const model = product.kind === "PC" ? "PC" : "Projector";
    console.log("model : ", model);

    // Use the discriminator model to update the specific fields
    const discriminatorModel = Producttt.discriminators[model];
    if (!discriminatorModel) {
      return res.status(400).json({ message: `Unknown kind: ${model}` });
    }

    const updatedProduct = await discriminatorModel.findByIdAndUpdate(
      id,
      { techSpecf },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Failed to update product" });
    }

    res.status(200).json({
      message: "TechSpecf updated successfully",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error("Error updating techSpecf:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Get all products
discriminatorRouter.get("/", async (req, res) => {
  try {
    const products = await Producttt.find();
    res.status(200).json({ data: products });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Get a product by ID
discriminatorRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Producttt.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ data: product });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Delete a product by ID
discriminatorRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Producttt.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});
