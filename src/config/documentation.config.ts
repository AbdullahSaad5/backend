import { ApiDocumentationConfig } from "../utils/api-documentation.util";

export const documentationConfig: ApiDocumentationConfig = {
  title: "Bavit Backend API",
  version: "1.0.0",
  host: process.env.API_HOST || "localhost:6969",
  basePath: "/api",
  schemes: ["http", "https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  securityDefinitions: {
    Bearer: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description:
        'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"',
    },
  },
  security: [{ Bearer: [] }],
};
