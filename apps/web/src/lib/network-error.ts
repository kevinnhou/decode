export function isNetworkErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("offline") ||
    m.includes("load failed") ||
    m.includes("connection") ||
    m.includes("econnrefused") ||
    m.includes("econnreset") ||
    m.includes("socket") ||
    m.includes("timed out") ||
    m.includes("timeout")
  );
}
