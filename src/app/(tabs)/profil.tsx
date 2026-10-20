import { useAuth } from '@/contexts/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfilScreen() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin mau keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Judul */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Saya</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Nama</Text>
          <Text style={styles.value}>{profile?.nama ?? '-'}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? '-'}</Text>

          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{profile?.role ?? '-'}</Text>
        </View>

        {/* Menu Admin: Hanya muncul jika role adalah admin */}
        {profile?.role === 'admin' && (
          <>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => router.push('/admin/produk')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="fast-food" size={22} color="#0ea5e9" />
                <Text style={styles.menuText}>Kelola Produk & Harga</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => router.push('/admin/outlet')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="storefront" size={22} color="#0ea5e9" />
                <Text style={styles.menuText}>Pengaturan Outlet</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => router.push('/admin/kasir')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="people" size={22} color="#0ea5e9" />
                <Text style={styles.menuText}>Kelola Karyawan</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

                        <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => router.push('/admin/kategori')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="grid" size={22} color="#0ea5e9" />
                <Text style={styles.menuText}>Kelola Kategori</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </>

          
        )}

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push('/ubah-password')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="lock-closed" size={22} color="#0ea5e9" />
            <Text style={styles.menuText}>Ubah Password Saya</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  scroll: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  label: { fontSize: 12, color: '#999', marginTop: 12 },
  value: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  menuBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  logoutBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});