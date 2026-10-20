import { useAuth } from '@/contexts/auth';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const { initialized, session, initialize, profile, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Inisialisasi session sekali saat app dibuka
  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect otomatis berdasarkan status login
  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/kasir');
    }
  }, [initialized, session, segments, router]);

  // Kalau session ada tapi profile kosong (offline / session invalid),
  // logout otomatis supaya user bisa login ulang
  // useEffect(() => {
  //   if (!initialized) return;
  //   if (session && !profile) {
  //     const t = setTimeout(() => {
  //       const currentProfile = useAuth.getState().profile;
  //       if (!currentProfile) {
  //        // console.log('Profile kosong, logout otomatis');
  //         signOut();
  //       }
  //     }, 3000);
  //     return () => clearTimeout(t);
  //   }
  // }, [initialized, session, profile, signOut]);

  // Tampilkan loading sampai inisialisasi selesai
  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="struk/[id]" />
        <Stack.Screen name="laporan-kasir" />
        <Stack.Screen name="admin/produk" />
        <Stack.Screen name="admin/outlet" />
        <Stack.Screen name="admin/kasir" />
        <Stack.Screen name="admin/kategori" />
        <Stack.Screen name="ubah-password" />
      </Stack>
    </>
  );
}