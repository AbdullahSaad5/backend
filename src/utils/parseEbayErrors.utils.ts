export function parseEbayError(errorResponse: any): string {
  const defaultMsg = "An unknown error occurred with eBay API";

  try {
    const firstError = errorResponse?.errors?.[0];
    if (!firstError) return defaultMsg;

    // Try longMessage, fallback to message
    const mainMsg = firstError.longMessage || firstError.message;

    // Append details from parameters if any
    const params = firstError.parameters;
    if (params && Array.isArray(params)) {
      const details = params.map((p) => `${p.name}: ${p.value}`).join(", ");
      return `${mainMsg} (${details})`.trim();
    }

    return mainMsg || defaultMsg;
  } catch (e) {
    return defaultMsg;
  }
}
