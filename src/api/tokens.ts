import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where the tokens live.
 *
 * A refresh token is a 30-day credential, so it goes in the device keychain,
 * not AsyncStorage — backend README §7.5 is explicit about this. SecureStore
 * has no web implementation, so the web build falls back to localStorage; that
 * is acceptable for the dev/admin console and never ships to a phone.
 */
const ACCESS_KEY = 'app.auth.access_token';
const REFRESH_KEY = 'app.auth.refresh_token';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string) {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type TokenPair = { accessToken: string; refreshToken: string };

export const tokenStore = {
  async save({ accessToken, refreshToken }: TokenPair) {
    await Promise.all([setItem(ACCESS_KEY, accessToken), setItem(REFRESH_KEY, refreshToken)]);
  },

  async read(): Promise<TokenPair | null> {
    const [accessToken, refreshToken] = await Promise.all([
      getItem(ACCESS_KEY),
      getItem(REFRESH_KEY),
    ]);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },

  async clear() {
    await Promise.all([removeItem(ACCESS_KEY), removeItem(REFRESH_KEY)]);
  },
};
