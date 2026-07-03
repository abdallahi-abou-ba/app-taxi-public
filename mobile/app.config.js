module.exports = ({ config }) => ({
  ...config,
  expo: {
    name: 'mobile',
    slug: 'mobile',
    owner: 'abdallahi_abou',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-secure-store',
      'expo-notifications',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Allow this app to use your location to show your position and share it during a ride.',
        },
      ],
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.5:3000',
      eas: {
        projectId: '85c57c6c-008e-4d4a-a673-bd5cb85ebe1d',
      },
    },
  },
});
