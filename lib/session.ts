/**
 * Session management utility for anonymous users
 * Uses cookies to persist session IDs across browser sessions
 */

const SESSION_ID_COOKIE_NAME = "blogish_session_id";
const SESSION_ID_LENGTH = 32;

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < SESSION_ID_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get or create a session ID from cookies
 * This works on both client and server side
 */
export function getSessionId(): string {
  if (typeof window === "undefined") {
    // Server-side: would need to read from request cookies
    // For now, return empty string - session will be handled in API routes
    return "";
  }

  // Client-side: check localStorage first, then cookies
  let sessionId = localStorage.getItem(SESSION_ID_COOKIE_NAME);

  if (!sessionId) {
    // Try to get from cookies
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find((c) =>
      c.trim().startsWith(`${SESSION_ID_COOKIE_NAME}=`)
    );

    if (sessionCookie) {
      sessionId = sessionCookie.split("=")[1];
      // Store in localStorage for easier access
      localStorage.setItem(SESSION_ID_COOKIE_NAME, sessionId);
    }
  }

  if (!sessionId) {
    // Generate new session ID
    sessionId = generateSessionId();
    // Store in both localStorage and cookie
    localStorage.setItem(SESSION_ID_COOKIE_NAME, sessionId);
    // Set cookie with 1 year expiration
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    document.cookie = `${SESSION_ID_COOKIE_NAME}=${sessionId}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
  }

  return sessionId;
}

/**
 * Get session ID from request cookies (server-side)
 */
export function getSessionIdFromRequest(cookies: string): string {
  const sessionCookie = cookies
    .split(";")
    .find((c) => c.trim().startsWith(`${SESSION_ID_COOKIE_NAME}=`));

  if (sessionCookie) {
    return sessionCookie.split("=")[1].trim();
  }

  return "";
}
