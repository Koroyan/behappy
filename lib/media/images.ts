/**
 * Picks an image and prepares it for AI: always JPEG (avoids HEIC/RAW
 * issues), downscaled and compressed toward ~700 KB.
 */
// Static imports only: in Expo Go a dynamic import() loads a separate bundle
// that restarts the module system ("Cannot find native module 'ExpoAsset'",
// '"main" has not been registered') and crashes the app.
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface PreparedImage {
  /** Shown in the UI. */
  displayUri: string;
  /** data:image/jpeg;base64,... sent to the AI. */
  dataUrl: string;
  width: number;
  height: number;
}

export class ImagePermissionError extends Error {}
export class ImageTooLargeError extends Error {}

const TARGET_BYTES = 700 * 1024;

async function compress(uri: string, width: number): Promise<{ base64: string; uri: string; width: number; height: number }> {
  const steps: [number, number][] = [
    [Math.min(width || 1600, 1600), 0.78],
    [1280, 0.72],
    [1024, 0.66],
    [900, 0.6],
    [768, 0.55],
  ];
  let best: ImageManipulator.ImageResult | null = null;
  for (const [w, q] of steps) {
    const result = await ImageManipulator.manipulateAsync(uri, w && width > w ? [{ resize: { width: w } }] : [], {
      compress: q,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    best = result;
    const bytes = ((result.base64?.length || 0) * 3) / 4;
    if (bytes <= TARGET_BYTES) break;
  }
  if (!best?.base64) throw new Error('Could not encode image');
  return { base64: best.base64, uri: best.uri, width: best.width, height: best.height };
}

export async function pickImage(source: 'library' | 'camera'): Promise<PreparedImage | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new ImagePermissionError('camera');
  } else if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new ImagePermissionError('library');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.9, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const out = await compress(asset.uri, asset.width);
  const dataUrl = `data:image/jpeg;base64,${out.base64}`;
  if (dataUrl.length > 12 * 1024 * 1024) throw new ImageTooLargeError('too large');
  return { displayUri: Platform.OS === 'web' ? dataUrl : out.uri, dataUrl, width: out.width, height: out.height };
}

/** Loads a bundled asset (e.g. a card image) as a data URL for the AI. */
export async function assetToDataUrl(moduleId: number, maxWidth = 1024): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: maxWidth } }], {
    compress: 0.75,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  return `data:image/jpeg;base64,${result.base64}`;
}
