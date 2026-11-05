require('dotenv').config();

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
    newArchEnabled: true,
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
        backgroundColor: '#F7F8F5',
      },
      edgeToEdgeEnabled: true,
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
      ['expo-av', { microphonePermission: MIC }],
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
    },
  },
};
