import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { initDatabase } from '../services/database';
import { initNetworkMonitoring } from '../services/networkService';
import { initSyncService } from '../services/syncService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    // Initialize database
    initDatabase()
      .then(() => {
        setDbInitialized(true);
        // Initialize network monitoring
        initNetworkMonitoring();
        // Initialize sync service (auto-syncs when online)
        initSyncService();
        console.log('App initialized: Database, Network, and Sync ready');
      })
      .catch((err) => console.error('Failed to init app:', err));
  }, []);

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerTintColor: '#007AFF',
        }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            headerBackTitle: '', // This ensures the back button on the NEXT screen has no text
            title: '' // Also clearing title just in case
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
