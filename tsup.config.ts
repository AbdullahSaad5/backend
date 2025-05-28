import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src"],
  external: ["src/uploads/*", "src/uploads/**"], // Exclude the uploads folder
  splitting: false,
  sourcemap: true,
  clean: true,
});
