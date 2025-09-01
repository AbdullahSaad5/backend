import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { stripeLogger } from "@/utils/stripe-logger.util";

// Extend Request interface to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Raw body middleware for webhook signature verification
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes("/webhook")) {
    let data = "";
    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      req.rawBody = Buffer.from(data, "utf8");
      req.body = data; // Keep as string for Stripe signature verification
      next();
    });
  } else {
    next();
  }
};

// Simple in-memory rate limiting (for production, use Redis or similar)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Rate limiting for Stripe endpoints
export const stripeRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const key = `stripe_${req.ip}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;
  const now = Date.now();

  const record = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }

  requestCounts.set(key, record);

  if (record.count > maxRequests) {
    stripeLogger.suspiciousActivity(
      "rate_limit_exceeded",
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        endpoint: req.path,
      },
      "Rate limit exceeded for Stripe endpoint"
    );

    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      status: StatusCodes.TOO_MANY_REQUESTS,
      message: "Too many requests to Stripe endpoints, please try again later",
    });
  }

  next();
};

// More restrictive rate limit for payment intent creation
export const paymentIntentRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id || "anonymous";
  const key = `payment_${req.ip}_${userId}`;
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 10;
  const now = Date.now();

  const record = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }

  requestCounts.set(key, record);

  if (record.count > maxRequests) {
    stripeLogger.suspiciousActivity(
      "payment_rate_limit_exceeded",
      {
        ip: req.ip,
        userId: (req as any).user?.id,
        userAgent: req.get("User-Agent"),
      },
      "Payment intent rate limit exceeded"
    );

    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      status: StatusCodes.TOO_MANY_REQUESTS,
      message: "Too many payment attempts, please try again in a few minutes",
    });
  }

  next();
};

// Webhook rate limiting (more permissive since these come from Stripe)
export const webhookRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const key = "stripe_webhooks";
  const windowMs = 1 * 60 * 1000; // 1 minute
  const maxRequests = 1000;
  const now = Date.now();

  if (!req.path.includes("/webhook")) {
    return next();
  }

  const record = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }

  requestCounts.set(key, record);

  if (record.count > maxRequests) {
    stripeLogger.suspiciousActivity(
      "webhook_rate_limit_exceeded",
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
      "Webhook rate limit exceeded"
    );

    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      status: StatusCodes.TOO_MANY_REQUESTS,
      message: "Too many webhook requests",
    });
  }

  next();
};

// Security headers middleware
export const stripeSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'");

  next();
};

// Request size limiting for Stripe endpoints
export const stripeSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get("content-length") || "0", 10);
  const maxSize = req.path.includes("/webhook") ? 1024 * 1024 : 10 * 1024; // 1MB for webhooks, 10KB for other endpoints

  if (contentLength > maxSize) {
    stripeLogger.suspiciousActivity(
      "oversized_request",
      {
        ip: req.ip,
        contentLength,
        maxSize,
        endpoint: req.path,
      },
      "Request size exceeds limit"
    );

    return res.status(413).json({
      status: 413,
      message: "Request payload too large",
    });
  }

  next();
};

// Suspicious activity detection
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get("User-Agent") || "";
  const ip = req.ip;

  // Check for suspicious patterns
  const suspiciousPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i, /automated/i];

  const isSuspiciousUserAgent = suspiciousPatterns.some((pattern) => pattern.test(userAgent));

  // Check for missing common headers
  const hasReferer = !!req.get("Referer");
  const hasAcceptLanguage = !!req.get("Accept-Language");

  if (isSuspiciousUserAgent || (!hasReferer && !hasAcceptLanguage)) {
    stripeLogger.suspiciousActivity(
      "suspicious_request_pattern",
      {
        ip,
        userAgent,
        hasReferer,
        hasAcceptLanguage,
        endpoint: req.path,
      },
      "Suspicious request pattern detected"
    );

    // Log but don't block - could be legitimate
    // You might want to add additional verification here
  }

  next();
};

// CORS middleware specifically for Stripe endpoints
export const stripeCors = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get("Origin");
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, stripe-signature");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
};

// Webhook IP validation (Stripe webhooks come from specific IPs)
export const validateWebhookIP = (req: Request, res: Response, next: NextFunction) => {
  // Skip IP validation in development
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev") {
    return next();
  }

  const clientIP = req.ip || "unknown";

  // Stripe's webhook IP ranges (you should get these from Stripe's documentation)
  const stripeIPRanges = [
    // Add Stripe's actual IP ranges here
    // These are examples - check Stripe's current IP ranges
    "3.18.12.63",
    "3.130.192.231",
    "13.235.14.237",
    "13.235.122.149",
    // ... add more as needed
  ];

  // For webhook endpoints, validate IP
  if (req.path.includes("/webhook")) {
    const isValidIP =
      stripeIPRanges.some((ip) => clientIP === ip) ||
      clientIP === "127.0.0.1" || // localhost IPv4 for testing
      clientIP === "::1" || // localhost IPv6 for testing
      clientIP.startsWith("10.") || // private networks
      clientIP.startsWith("192.168.") || // private networks
      clientIP === "unknown"; // fallback for development

    if (!isValidIP) {
      stripeLogger.suspiciousActivity(
        "invalid_webhook_ip",
        { ip: clientIP, endpoint: req.path },
        "Webhook request from non-Stripe IP"
      );

      return res.status(StatusCodes.FORBIDDEN).json({
        status: StatusCodes.FORBIDDEN,
        message: "Forbidden",
      });
    }
  }

  next();
};

// Request logging middleware
export const logStripeRequest = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

    stripeLogger.performanceMetric(`${req.method}_${req.path.replace(/\//g, "_")}`, duration, isSuccess, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  });

  next();
};
