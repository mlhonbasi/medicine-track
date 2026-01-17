import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

export default function Layout() {
  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: '#F8F9FA' },
      }}
    >
      {/* index header'ını kapat */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* add ekranında header kalsın */}
      <Stack.Screen
        name="add"
        options={{
          title: 'Yeni İlaç Ekle',
          presentation: 'modal',
          headerStyle: { backgroundColor: '#F8F9FA' },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        }}
      />
    </Stack>
  );
}
