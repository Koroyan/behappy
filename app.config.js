require('dotenv').config();

// EXPO_PUBLIC_* variables are inlined into the app bundle that every visitor
// downloads. The project-root .env of older checkouts held the OpenAI key as
// EXPO_PUBLIC_API_KEY; that key was published and must be revoked. Drop it here
// so it can never reach a bundle again, even if some code referenced it.
if (process.env.EXPO_PUBLIC_API_KEY) {
  delete process.env.EXPO_PUBLIC_API_KEY;
  console.warn('[security] Ignoring EXPO_PUBLIC_API_KEY from .env: secrets never go into the app. Revoke that key and delete the line (AI keys live only in server/.env).');
}

// Single source of Expo config (app.json was removed in 2.0: when both exist,
// a function-less app.config.js silently ignores app.json — which had dropped
// the microphone permission from native builds).
const MIC = 'BeHappy uses the microphone only while you record a voice message.';
const CAMERA = 'BeHappy uses the camera only when you photograph your paper artwork.';
const PHOTOS = 'BeHappy opens your photos only when you choose a picture of your artwork to share.';

module.exports = {
  expo: {
    name: 'BeHappy',
    slug: 'beHappy',
    version: '2.0.0',
    orientation: 'default',
    icon: './assets/images/icon.png',
    scheme: 'behappy',
    userInterfaceStyle: 'automatic',
    backgroundColor: '#F7F8F5',
    // The New Architecture is the only one from Expo SDK 55 on (no flag needed).
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription: MIC,
        NSCameraUsageDescription: CAMERA,
        NSPhotoLibraryUsageDescription: PHOTOS,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        // The new logo's teal (the foreground is the transparent artwork).
        backgroundColor: '#3A7D73',
      },
      // Edge-to-edge is always on from Expo SDK 55.
      permissions: ['RECORD_AUDIO', 'CAMERA'],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
      name: 'BeHappy',
      themeColor: '#4B9388',
      backgroundColor: '#F7F8F5',
    },
    plugins: [
      'expo-router',
      'expo-web-browser',
      'expo-font',
      'expo-asset',
      ['expo-image-picker', { photosPermission: PHOTOS, cameraPermission: CAMERA }],
      // Background playback for Sound Lab (iOS UIBackgroundModes=audio, Android media service).
      ['expo-audio', { microphonePermission: MIC, enableBackgroundPlayback: true }],
      // Reminders (local) and chat notifications (Expo push). Icon colour = brand.
      ['expo-notifications', { color: '#4B9388' }],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#F7F8F5',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    // No secrets here: everything in app config ships inside the app bundle.
    // AI and payment credentials live only on the BeHappy server (server/.env).
    extra: {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      // Phone notifications need the EAS project id (public, not a secret):
      // `npx eas init` prints it; put EAS_PROJECT_ID=<id> in the root .env.
      // Without it, reminders and in-app notifications still work.
      ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
    },
  },
};
