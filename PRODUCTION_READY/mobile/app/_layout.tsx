import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import useStore, { SafeStorage } from '../store';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import CallManager from '../components/CallManager';
import CallOverlay from '../components/CallOverlay';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { user, token, connectSocket, fetchUserProfile } = useStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const savedToken = await SafeStorage.getItem('token');

      if (savedToken) {
        useStore.setState({ token: savedToken });
        await fetchUserProfile();
        connectSocket();
      }
      setIsReady(true);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'login';

    if (!token && !inAuthGroup) {
      router.replace('/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, segments, isReady]);

  if (!isReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ActionSheetProvider>
        <>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          </Stack>
          {/* <CallManager /> */}
          {/* <CallOverlay /> */}
          <StatusBar style="auto" />
        </>
      </ActionSheetProvider>
    </ThemeProvider>
  );
}

