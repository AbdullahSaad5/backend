export const ENUMS = {
  USER_TYPES: ["admin", "user"] as const,
  DEVICE_TYPES: ["web", "android", "ios"] as const,
  USER_STATUS: ["active", "inactive", "blocked", "deleted", "reported"] as const,
  NOTIFICATION_STATUS: ["on", "off", "mute"] as const,
  LOCATION_STATUS: ["on", "off"] as const,
  SIGNUP_THROUGH: ["Google" , "Facebook" , "Web"] as const,
  NOTIFICATION_TYPES: [
    "message",
    "payment",
    "alert",
    "system",
    "reminder",
    "invitation",
    "info",
    "conversation",
  ] as const,
};
