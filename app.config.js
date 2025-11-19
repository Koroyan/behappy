import 'dotenv/config';

export default {
  expo: {
    name: "beHappy",
    slug: "beHappy",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "behappy",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      EXPO_PUBLIC_API_KEY: process.env.EXPO_PUBLIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      EXPO_PUBLIC_FLITT_MERCHANT_ID: process.env.EXPO_PUBLIC_FLITT_MERCHANT_ID,
      // Set to 'true' for sandbox/demo, 'false' for production
      EXPO_PUBLIC_FLITT_TEST_MODE: process.env.EXPO_PUBLIC_FLITT_TEST_MODE
    }
  }
};
