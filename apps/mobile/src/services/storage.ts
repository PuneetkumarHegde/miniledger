import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/index';

const TOKEN_KEY = '@miniledger_session_token';
const USER_KEY = '@miniledger_user_profile';
const API_BASE_URL_KEY = '@miniledger_api_base_url';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to store token', e);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove token', e);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to store user profile', e);
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to remove user', e);
    }
  },

  async getCustomApiUrl(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(API_BASE_URL_KEY);
    } catch {
      return null;
    }
  },

  async setCustomApiUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(API_BASE_URL_KEY, url);
    } catch (e) {
      console.error('Failed to store custom API URL', e);
    }
  },

  async getLocalLoans(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('@miniledger_local_loans');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async setLocalLoans(loans: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('@miniledger_local_loans', JSON.stringify(loans));
    } catch (e) {
      console.error('Failed to store local loans', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, '@miniledger_local_loans']);
    } catch (e) {
      console.error('Failed to clear session storage', e);
    }
  },
};
