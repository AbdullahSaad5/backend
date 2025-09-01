import fs from "fs";
import path from "path";

export interface StripeLogEvent {
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  event: string;
  data?: any;
  error?: Error | string;
  paymentIntentId?: string;
  customerId?: string;
  subscriptionId?: string;
  amount?: number;
  currency?: string;
}

class StripeLogger {
  private logFile: string;

  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFile = path.join(logsDir, "stripe.log");
  }

  private writeLog(event: StripeLogEvent) {
    const logEntry = {
      ...event,
      timestamp: event.timestamp.toISOString(),
    };

    // Console output for development
    const consoleMessage = `[${event.level.toUpperCase()}] ${event.event}`;
    switch (event.level) {
      case "error":
        console.error(`🔴 ${consoleMessage}`, event.error || event.data);
        break;
      case "warn":
        console.warn(`🟡 ${consoleMessage}`, event.data);
        break;
      case "info":
        console.log(`🔵 ${consoleMessage}`, event.data);
        break;
      case "debug":
        console.debug(`⚫ ${consoleMessage}`, event.data);
        break;
    }

    // File logging
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + "\n");
    } catch (error) {
      console.error("Failed to write to stripe log file:", error);
    }
  }

  // Payment Intent Events
  paymentIntentCreated(paymentIntentId: string, amount: number, currency: string, customerId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "info",
      event: "payment_intent.created",
      paymentIntentId,
      amount,
      currency,
      customerId,
    });
  }

  paymentIntentSucceeded(paymentIntentId: string, amount: number, currency: string, customerId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "info",
      event: "payment_intent.succeeded",
      paymentIntentId,
      amount,
      currency,
      customerId,
    });
  }

  paymentIntentFailed(paymentIntentId: string, error: string | Error, amount?: number, customerId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "error",
      event: "payment_intent.failed",
      paymentIntentId,
      amount,
      customerId,
      error,
    });
  }

  paymentIntentCanceled(paymentIntentId: string, customerId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "warn",
      event: "payment_intent.canceled",
      paymentIntentId,
      customerId,
    });
  }

  // Order Events
  orderCreated(orderId: string, paymentIntentId: string, amount: number, customerId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "info",
      event: "order.created",
      data: { orderId, paymentIntentId, amount, customerId },
    });
  }

  orderCreationFailed(paymentIntentId: string, error: string | Error, customerId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "error",
      event: "order.creation_failed",
      paymentIntentId,
      customerId,
      error,
    });
  }

  // Webhook Events
  webhookReceived(eventType: string, eventId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "info",
      event: "webhook.received",
      data: { eventType, eventId },
    });
  }

  webhookProcessed(eventType: string, eventId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "info",
      event: "webhook.processed",
      data: { eventType, eventId },
    });
  }

  webhookFailed(eventType: string, error: string | Error, eventId?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "error",
      event: "webhook.failed",
      data: { eventType, eventId },
      error,
    });
  }

  webhookSignatureVerificationFailed(signature: string, error: string | Error) {
    this.writeLog({
      timestamp: new Date(),
      level: "error",
      event: "webhook.signature_verification_failed",
      data: { signature: signature.substring(0, 20) + "..." }, // Truncate for security
      error,
    });
  }

  // Customer Events
  customerCreated(customerId: string, email?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "info",
      event: "customer.created",
      customerId,
      data: { email },
    });
  }

  // Subscription Events
  subscriptionCreated(subscriptionId: string, customerId: string, priceId: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "info",
      event: "subscription.created",
      subscriptionId,
      customerId,
      data: { priceId },
    });
  }

  subscriptionCanceled(subscriptionId: string, customerId: string, reason?: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "warn",
      event: "subscription.canceled",
      subscriptionId,
      customerId,
      data: { reason },
    });
  }

  // Generic Error Logging
  apiError(operation: string, error: string | Error, context?: any) {
    this.writeLog({
      timestamp: new Date(),
      level: "error",
      event: `stripe.api_error.${operation}`,
      error,
      data: context,
    });
  }

  // Security Events
  suspiciousActivity(event: string, data: any, reason: string) {
    this.writeLog({
      timestamp: new Date(),
      level: "warn",
      event: "security.suspicious_activity",
      data: { event, data, reason },
    });
  }

  // Performance Monitoring
  performanceMetric(operation: string, duration: number, success: boolean, context?: any) {
    this.writeLog({
      timestamp: new Date(),
      level: success ? "info" : "warn",
      event: `performance.${operation}`,
      data: { duration, success, context },
    });
  }
}

export const stripeLogger = new StripeLogger();
