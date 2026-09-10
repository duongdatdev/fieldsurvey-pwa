import { Capacitor } from '@capacitor/core';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { LocationCoordinate } from '../types/survey';

export const locationService = {
  /**
   * Check if running in a native mobile shell (Capacitor Android / iOS)
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Request GPS / Location permissions
   */
  async requestPermission(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const status = await Geolocation.requestPermissions();
        return status.location === 'granted';
      } catch (err) {
        console.warn('[LocationService] Native permission request failed:', err);
        return false;
      }
    }

    // Web browser permissions check
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state === 'granted' || result.state === 'prompt';
      } catch {
        return true;
      }
    }
    return 'geolocation' in navigator;
  },

  /**
   * Get current GPS location using @capacitor/geolocation with web browser fallback
   */
  async getCurrentLocation(options?: PositionOptions): Promise<LocationCoordinate | null> {
    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 5000,
      ...options,
    };

    // 1. Native Capacitor Geolocation
    if (this.isNative()) {
      try {
        const pos = await Geolocation.getCurrentPosition(defaultOptions);
        return {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          altitude: pos.coords.altitude || null,
          timestamp: pos.timestamp || Date.now(),
        };
      } catch (nativeErr) {
        console.warn('[LocationService] Native Geolocation error:', nativeErr);
      }
    }

    // 2. Browser Geolocation Fallback
    if ('geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: Number(pos.coords.latitude.toFixed(6)),
              longitude: Number(pos.coords.longitude.toFixed(6)),
              accuracy: Math.round(pos.coords.accuracy),
              altitude: pos.coords.altitude || null,
              timestamp: pos.timestamp || Date.now(),
            });
          },
          (err) => {
            console.warn('[LocationService] Web Geolocation failed:', err.message);
            resolve(null);
          },
          defaultOptions
        );
      });
    }

    console.warn('[LocationService] Geolocation is not supported on this platform');
    return null;
  },
};
