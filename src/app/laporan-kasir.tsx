import { useAuth } from '@/contexts/auth';
import { formatRupiah, formatTanggal } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Trx = {
  id: string;
  total: number;
  metode_bayar: string;
  created_at: string;
};

export default function LaporanKasirScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  
  const [transactions, setTransactions] = useState<Trx[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    // Ambil transaksi HARI INI milik kasir yang login
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('transactions')
      .select('id, total, metode_bayar, created_at')
      .eq('is_void', false) // ← Tambahkan ini
      .eq('kasir_id', profile.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error.message);
      Alert.alert('Error', 'Gagal memuat laporan');
    } else {
      setTransactions(data ?? []);
    }
    setLoading(false);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Hitung-hitung
  const totalSemua = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalCash = transactions
    .filter((t) => t.metode_bayar === 'cash')
    .reduce((sum, t) => sum + t.total, 0);
  const totalQris = transactions
    .filter((t) => t.metode_bayar === 'qris')
    .reduce((sum, t) => sum + t.total, 0);

  const handleShareWA = async () => {
    try {
      const tanggal = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const pesan = 
`*LAPORAN SHIFT KASIR*
Tanggal: ${tanggal}

Nama Kasir: ${profile?.nama}
Total Transaksi: ${transactions.length}x

*Rincian Penjualan:*
• Tunai (Cash): ${formatRupiah(totalCash)}
• QRIS: ${formatRupiah(totalQris)}

*TOTAL: ${formatRupiah(totalSemua)}*

_Pesan ini dibuat otomatis oleh Aplikasi UMI BAHA._`;

      await Share.share({
        message: pesan,
        title: 'Laporan Shift Kasir',
      });
    } catch (error: any) {
      Alert.alert('Gagal', 'Tidak dapat membagikan laporan');
    }
  };

  const handleTutupKasir = () => {
    Alert.alert(
      'Tutup Kasir',
      'Pastikan uang tunai sudah disetor ke admin/owner. Lanjutkan logout?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan Shift Saya</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.nama}</Text>
            <Text style={styles.date}>{formatTanggal(new Date().toISOString())}</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Total Transaksi</Text>
            <Text style={styles.value}>{transactions.length}x</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Total Penjualan</Text>
            <Text style={[styles.value, { color: '#0ea5e9', fontSize: 18 }]}>
              {formatRupiah(totalSemua)}
            </Text>
          </View>
        </View>

        {/* Rincian Pembayaran */}
        <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
        
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cash" size={20} color="#16a34a" />
              <Text style={styles.label}>Tunai (Cash)</Text>
            </View>
            <Text style={styles.value}>{formatRupiah(totalCash)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="qr-code" size={20} color="#2563eb" />
              <Text style={styles.label}>QRIS</Text>
            </View>
            <Text style={styles.value}>{formatRupiah(totalQris)}</Text>
          </View>
        </View>

        {/* Catatan Setoran */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle" size={20} color="#0ea5e9" />
          <Text style={styles.noteText}>
            Pastikan uang tunai sebesar <Text style={{ fontWeight: 'bold' }}>{formatRupiah(totalCash)}</Text> diserahkan ke admin/owner sebelum logout.
          </Text>
        </View>

        <TouchableOpacity style={styles.buttonShare} onPress={handleShareWA}>
          <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
          <Text style={styles.buttonShareText}>Kirim Laporan ke WA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonLogout} onPress={handleTutupKasir}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Tutup Kasir & Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userInfo: { alignItems: 'center', marginBottom: 12 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    marginLeft: 4,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  noteText: { flex: 1, fontSize: 13, color: '#0369a1', lineHeight: 18 },
  buttonShare: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#16a34a',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  buttonShareText: { color: '#16a34a', fontSize: 16, fontWeight: 'bold' },
  buttonLogout: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});