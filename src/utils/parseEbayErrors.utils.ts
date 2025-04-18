export function parseEbayError(errorResponse: any): string {
  const defaultMsg = "An unknown error occurred with eBay API";

  try {
    const firstError = errorResponse?.errors?.[0];
    if (!firstError) return defaultMsg;

    const { errorId, longMessage, message, parameters } = firstError;
    const paramName = parameters?.[0]?.name || "";
    const paramValue = parameters?.[0]?.value || "";

    // Use more readable messages for known eBay error codes
    switch (errorId) {
      case 20400:
        return `❌ Invalid request: ${longMessage || message}`;
      case 20401:
        return `❌ Missing field: ${paramValue || "Unknown field"}`;
      case 20402:
        return `❌ Invalid input: ${longMessage || message}`;
      case 20403:
        return `❌ Invalid ${paramName}: ${longMessage || message}`;
      case 20500:
        return "❌ System error. Try again later.";
      case 20501:
        return "❌ Service unavailable. Try again in 24 hours.";
    }

    // Fallback to original format
    const mainMsg = longMessage || message || defaultMsg;
    if (parameters && Array.isArray(parameters)) {
      const details = parameters.map((p) => `${p.name}: ${p.value}`).join(", ");
      return `${mainMsg} (${details})`.trim();
    }

    return mainMsg;
  } catch (e) {
    return defaultMsg;
  }
}
