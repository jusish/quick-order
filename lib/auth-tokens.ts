export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const AUTH_TOKENS_STORAGE_KEY = "quick-order-auth-tokens";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredAuthTokens(): AuthTokens | null {
  if (!canUseStorage()) return null;

  try {
    const rawValue = window.localStorage.getItem(AUTH_TOKENS_STORAGE_KEY);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as Partial<AuthTokens>;
    if (!parsedValue.accessToken || !parsedValue.refreshToken) return null;

    return {
      accessToken: parsedValue.accessToken,
      refreshToken: parsedValue.refreshToken,
    };
  } catch {
    return null;
  }
}

export function setStoredAuthTokens(tokens: AuthTokens) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTH_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredAuthTokens() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_TOKENS_STORAGE_KEY);
}
