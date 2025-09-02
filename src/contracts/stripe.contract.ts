export interface ISubscription {
  id: string;
  customerId: string;
  priceId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionPayload {
  priceId: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface CancelSubscriptionPayload {
  subscriptionId: string;
  atPeriodEnd?: boolean;
}

export interface CreatePortalSessionPayload {
  customerId: string;
  returnUrl: string;
}

export interface CreatePaymentIntentPayload {
  amount: number; // amount in cents
  currency: string;
  customerId?: string;
  paymentMethodTypes?: string[];
  description?: string;
  metadata?: Record<string, string>;
  automaticPaymentMethods?: {
    enabled: boolean;
    allow_redirects?: "always" | "never";
  };
  idempotencyKey?: string; // For preventing duplicate charges
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export interface SocketEventPayload {
  stripeCustomerId: string;
  event: string;
  eventCode?: string;
}
