/**
 * Art Therapy Navigation Integration Example
 * 
 * This file shows how to integrate the Art Therapy module into your app navigation.
 * Copy the relevant parts to your actual navigation files.
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';

// Import Art Therapy Components
import ArtTherapyScreen from '../components/ArtTherapyScreen';
import ArtTherapySessionChat from '../components/ArtTherapySessionChat';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * OPTION 1: Tab Navigation (Recommended)
 * Add Art Therapy as a main tab in your app
 */
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      {/* Your existing tabs */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
        }}
      />
      
      {/* NEW: Art Therapy Tab */}
      <Tab.Screen
        name="ArtTherapy"
        component={ArtTherapyScreen}
        options={{
          title: 'Art Therapy',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🎨</Text>,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * OPTION 2: Stack Navigation
 * Add Art Therapy as a modal or full-screen stack
 */
function MainStackNavigator() {
  return (
    <Stack.Navigator>
      {/* Main Tabs */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />

      {/* Art Therapy Session Chat (Modal Style) */}
      <Stack.Screen
        name="ArtTherapySession"
        component={ArtTherapySessionChat}
        options={{
          headerShown: false,
          presentation: 'modal', // iOS modal presentation
          animation: 'slide_from_bottom',
        }}
      />

      {/* Or as a regular stack screen */}
      <Stack.Screen
        name="ArtTherapyFullscreen"
        component={ArtTherapyScreen}
        options={{
          title: 'Art Therapy',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * OPTION 3: Drawer Navigation
 * Add Art Therapy to a sidebar drawer
 */
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          drawerLabel: 'Home',
          drawerIcon: () => <Text>🏠</Text>,
        }}
      />
      
      <Drawer.Screen
        name="ArtTherapy"
        component={ArtTherapyScreen}
        options={{
          drawerLabel: 'Art Therapy',
          drawerIcon: () => <Text>🎨</Text>,
        }}
      />
    </Drawer.Navigator>
  );
}

/**
 * EXPO ROUTER INTEGRATION (app/(tabs) structure)
 * 
 * If you're using Expo Router, create these files:
 */

// File: app/(tabs)/arttherapy.tsx
/*
import ArtTherapyScreen from '../../components/ArtTherapyScreen';

export default ArtTherapyScreen;
*/

// File: app/(tabs)/_layout.tsx
/*
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      
      <Tabs.Screen
        name="arttherapy"
        options={{
          title: 'Art Therapy',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🎨</Text>,
        }}
      />
    </Tabs>
  );
}
*/

// File: app/arttherapy-session.tsx (for modal)
/*
import ArtTherapySessionChat from '../components/ArtTherapySessionChat';

export default ArtTherapySessionChat;
*/

/**
 * TypeScript Navigation Types
 * Add these types to your navigation type definitions
 */
export type RootStackParamList = {
  MainTabs: undefined;
  ArtTherapySession: {
    sessionId: number;
  };
  // ... other screens
};

export type TabParamList = {
  Home: undefined;
  Chat: undefined;
  ArtTherapy: undefined;
  Profile: undefined;
};

/**
 * Usage in Components
 */

// Navigate to Art Therapy from anywhere
/*
import { useNavigation } from '@react-navigation/native';

function SomeComponent() {
  const navigation = useNavigation();

  const openArtTherapy = () => {
    navigation.navigate('ArtTherapy');
  };

  const openSpecificSession = (sessionId: number) => {
    navigation.navigate('ArtTherapySession', { sessionId });
  };

  return (
    <TouchableOpacity onPress={openArtTherapy}>
      <Text>Start Art Therapy</Text>
    </TouchableOpacity>
  );
}
*/

/**
 * Deep Linking Support
 * Add to your linking configuration
 */
const linking = {
  prefixes: ['behappy://', 'https://behappy.app'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          ArtTherapy: 'arttherapy',
        },
      },
      ArtTherapySession: 'arttherapy/:sessionId',
    },
  },
};

// This enables URLs like:
// behappy://arttherapy
// behappy://arttherapy/3

export default MainStackNavigator;

// Placeholder components (replace with your actual screens)
function HomeScreen() { return null; }
function ChatScreen() { return null; }
function ProfileScreen() { return null; }
