import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface PhotoCaptureResult {
  dataUrl: string;
  source: 'native' | 'web';
}

export const cameraService = {
  /**
   * Check if running on native mobile device (Android / iOS)
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Capture photo on native device using @capacitor/camera.
   * On web browser, returns null so the UI falls back to the HTML file input.
   */
  async captureNativePhoto(): Promise<PhotoCaptureResult | null> {
    if (!this.isNative()) {
      return null;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 75,
        width: 1200,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // Allows Take Photo or Pick from Gallery
      });

      if (image.dataUrl) {
        return {
          dataUrl: image.dataUrl,
          source: 'native',
        };
      }
      return null;
    } catch (err: any) {
      // User cancelled or camera denied
      if (err.message && err.message.includes('User cancelled')) {
        console.log('[CameraService] User cancelled photo capture.');
        return null;
      }
      console.warn('[CameraService] Native camera error, falling back to web:', err);
      return null;
    }
  },
};
