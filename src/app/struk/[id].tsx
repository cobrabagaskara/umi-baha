import { useAuth } from '@/contexts/auth';
import { formatRupiah, formatTanggal } from '@/lib/format';
import { shareStrukPDF } from '@/lib/struk-pdf';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type Trx = {
  id: string;
  total: number;
  metode_bayar: string;
  bayar: number;
  kembalian: number;
  catatan: string | null;
  created_at: string;
  outlets: { nama: string; alamat: string | null; logo_url: string | null } | null;
  kasir: { nama: string } | null;
  items: {
    id: string;
    nama_produk: string;
    harga: number;
    qty: number;
    subtotal: number;
  }[];
  is_void: boolean;
  no_struk: string | null;
};

export default function StrukScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trx, setTrx] = useState<Trx | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
    const { profile } = useAuth();
  const [voiding, setVoiding] = useState(false);
    const loadData = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
        id, total, metode_bayar, bayar, kembalian, catatan, created_at, is_void,
        outlets ( nama, alamat, logo_url ), no_struk,
        kasir:profiles!transactions_kasir_id_fkey ( nama ),
        items:transaction_items ( id, nama_produk, harga, qty, subtotal )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error(error);
    } else {
      setTrx(data as any);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

   const handleSelesai = () => {
    router.replace('/(tabs)/kasir');
  };

    const handleVoid = () => {
    Alert.alert(
      'Batalkan Transaksi',
      'Yakin ingin membatalkan transaksi ini? Status transaksi akan berubah menjadi DIBATALKAN dan tidak akan dihitung dalam laporan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            setVoiding(true);
            const { error } = await supabase
              .from('transactions')
              .update({
                is_void: true,
                void_reason: 'Dibatalkan oleh Admin',
                voided_at: new Date().toISOString(),
                voided_by: profile?.id,
              })
              .eq('id', id);

            setVoiding(false);

            if (error) {
              Alert.alert('Gagal', error.message);
            } else {
              // Update state lokal agar tampilan langsung berubah
              setTrx((prev) => (prev ? { ...prev, is_void: true } : prev));
              Alert.alert('Sukses', 'Transaksi telah dibatalkan.');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!trx) return;
    setSharing(true);
    try {
      const result = await shareStrukPDF(trx);
      if (!result.shared) {
        Alert.alert('Info', 'Sharing tidak tersedia di device ini');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.message ?? 'Terjadi kesalahan');
    } finally {
      setSharing(false);
    }
  };

 

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!trx) {
    return (
      <View style={styles.center}>
        <Text>Transaksi tidak ditemukan</Text>
        <TouchableOpacity onPress={handleSelesai} style={{ marginTop: 16 }}>
          <Text style={{ color: '#0ea5e9' }}>Kembali ke Kasir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
                {trx.is_void ? (
          <View style={styles.voidBadge}>
            <Text style={styles.voidText}>TRANSAKSI DIBATALKAN</Text>
          </View>
        ) : (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
            </View>
            <Text style={styles.successText}>Pembayaran Berhasil</Text>
          </>
        )}
        <Text style={styles.subText}>
          {formatTanggal(trx.created_at)}
        </Text>

        {/* Struk */}
        <View style={styles.receipt}>
          <Text style={styles.receiptTitle}>
            {trx.outlets?.nama ?? 'Outlet'}
          </Text>
          {trx.outlets?.alamat && (
            <Text style={styles.receiptSub}>{trx.outlets.alamat}</Text>
          )}
          <Text style={styles.receiptSub}>No: {trx.no_struk ?? '-'}</Text>

          <View style={styles.dashed} />

          {trx.items.map((i) => (
            <View key={i.id} style={{ marginBottom: 8 }}>
              <Text style={styles.itemName}>{i.nama_produk}</Text>
              <View style={styles.itemRow}>
                <Text style={styles.itemQty}>
                  {i.qty} × {formatRupiah(i.harga)}
                </Text>
                <Text style={styles.itemSubtotal}>
                  {formatRupiah(i.subtotal)}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.dashed} />

          <View style={styles.rowBetween}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.totalBig}>{formatRupiah(trx.total)}</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Metode</Text>
            <Text style={styles.value}>
              {trx.metode_bayar.toUpperCase()}
            </Text>
          </View>

          {trx.metode_bayar === 'cash' && (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Bayar</Text>
                <Text style={styles.value}>{formatRupiah(trx.bayar)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Kembalian</Text>
                <Text style={styles.value}>
                  {formatRupiah(trx.kembalian)}
                </Text>
              </View>
            </>
          )}

          {trx.catatan && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Catatan</Text>
              <Text style={styles.value}>{trx.catatan}</Text>
            </View>
          )}

          <View style={styles.dashed} />

          <Text style={styles.footerText}>
            Kasir: {trx.kasir?.nama ?? '-'}
          </Text>
          <Text style={styles.footerText}>Terima kasih 🙏</Text>
        </View>

        {/* Tombol aksi */}
       <TouchableOpacity
  style={[styles.shareBtn, sharing && { opacity: 0.6 }]}
  onPress={handleShare}
  disabled={sharing}
>
  {sharing ? (
    <ActivityIndicator color="#0ea5e9" />
  ) : (
    <>
      <Ionicons name="share-outline" size={20} color="#0ea5e9" />
      <Text style={styles.shareText}>Share PDF</Text>
    </>
  )}
</TouchableOpacity>

        {profile?.role === 'admin' && !trx.is_void && (
          <TouchableOpacity 
            style={styles.voidBtn} 
            onPress={handleVoid} 
            disabled={voiding}
          >
            {voiding ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.voidBtnText}>Batalkan Transaksi (Void)</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={handleSelesai}>
          <Text style={styles.doneText}>Selesai</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  successIcon: { marginTop: 12 },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16a34a',
    marginTop: 8,
  },
  subText: { fontSize: 13, color: '#888', marginTop: 2, marginBottom: 20 },
  receipt: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  receiptSub: {
    fontSize: 12,
    textAlign: 'center',
    color: '#888',
    marginTop: 2,
  },
  dashed: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    marginVertical: 12,
  },
  itemName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  itemQty: { fontSize: 12, color: '#888' },
  itemSubtotal: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  bold: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  totalBig: { fontSize: 18, fontWeight: 'bold', color: '#0ea5e9' },
  label: { fontSize: 13, color: '#888' },
  value: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#888',
    marginTop: 4,
  },
  shareBtn: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  shareText: { color: '#0ea5e9', fontSize: 15, fontWeight: '600' },
  doneBtn: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 12,
    backgroundColor: '#0ea5e9',
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    voidBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  voidText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  voidBtn: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  voidBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
