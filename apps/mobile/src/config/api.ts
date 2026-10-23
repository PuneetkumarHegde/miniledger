import { Platform } from 'react-native';
import { storage } from '../services/storage';

// Development machine IP detected on the local Wi-Fi interface
const DEV_MACHINE_LAN_IP = '192.168.1.34';
const PORT = '4000';

export function getDefaultBaseUrl(): string {
  // 1. Check environment variable first
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  // 2. Platform-aware fallbacks
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes(':8081')) {
      return window.location.origin;
    }
    return `http://localhost:${PORT}`;
  }

  if (Platform.OS === 'android') {
    // When running on physical device or Expo Go, use local network IP
    // For standard Android Studio emulator, 10.0.2.2 is loopback
    return `http://${DEV_MACHINE_LAN_IP}:${PORT}`;
  }

  // iOS Simulator or physical iOS device
  return `http://${DEV_MACHINE_LAN_IP}:${PORT}`;
}

export async function getActiveBaseUrl(): Promise<string> {
  const customUrl = await storage.getCustomApiUrl();
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  return getDefaultBaseUrl();
}
