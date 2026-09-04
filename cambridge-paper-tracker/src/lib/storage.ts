import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    // best-effort
  }
}

export async function getUser(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setUser(user: Record<string, unknown> | null): Promise<void> {
  try {
    if (user) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch {
    // best-effort
  }
}

export async function clearSession(): Promise<void> {
  await setToken(null);
  await setUser(null);
}
