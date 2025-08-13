import { Schema, model, models } from "mongoose";

export type IntegrationProvider = "ebay" | "amazon";
export type IntegrationEnvironment = "PRODUCTION" | "SANDBOX";

export interface IIntegrationToken {
  provider: IntegrationProvider;
  environment: IntegrationEnvironment;
  useClient?: boolean;

  access_token: string;
  refresh_token?: string;
  token_type?: string;

  expires_in: number; // seconds
  refresh_token_expires_in?: number; // seconds (eBay)
  generated_at: number; // epoch ms when access_token issued

  metadata?: Record<string, unknown>;
}

export interface IIntegrationTokenModel extends Document {}

const IntegrationTokenSchema = new Schema<IIntegrationToken, IIntegrationTokenModel>(
  {
    provider: { type: String, required: true, index: true },
    environment: { type: String, required: true, index: true },
    useClient: { type: Boolean, default: undefined },

    access_token: { type: String, required: true },
    refresh_token: { type: String },
    token_type: { type: String },

    expires_in: { type: Number, required: true },
    refresh_token_expires_in: { type: Number },
    generated_at: { type: Number, required: true },

    metadata: { type: Object },
  },
  { timestamps: true }
);

// Unique per provider + environment + useClient (undefined allowed for providers that don't use it)
IntegrationTokenSchema.index({ provider: 1, environment: 1, useClient: 1 }, { unique: true });

export const IntegrationTokenModel =
  (models as any).IntegrationToken || model<IIntegrationToken>("IntegrationToken", IntegrationTokenSchema);


