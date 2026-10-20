import { useAuth } from '@/contexts/auth';
import { useCart } from '@/contexts/cart';
import { formatRupiah } from '@/lib/format';
import { saveTransaction } from '@/lib/transactions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Metode = 'cash' | 'qris';

export default function CheckoutScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);

  const total = items.reduce((sum, i) => sum + i.harga * i.qty, 0);
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

  const [metode, setMetode] = useState<Metode>('cash');
  const [bayarStr, setBayarStr] = useState('');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);

  const bayar = parseInt(bayarStr.replace(/\D/g, ''), 10) || 0;
  const kembalian = bayar - total;
  const cashValid = metode === 'qris' || bayar >= total;

  // Quick nominal buttons
  const quickAmounts = [
    total,
    Math.ceil(total / 5000) * 5000,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
    .slice(0, 4);

  const handleKonfirmasi = async () => {
    if (!profile) return;
    if (items.length === 0) {
      Alert.alert('Oops', 'Keranjang kosong');
      return;
    }
    if (metode === 'cash' && bayar < total) {
      Alert.alert('Oops', 'Nominal bayar kurang dari total');
      return;
    }

    setLoading(true);
    const { data, error } = await saveTransaction({
      outletId: profile.outlet_id,
      kasirId: profile.id,
      items,
      metodeBayar: metode,
      bayar: metode === 'cash' ? bayar : total,
      kembalian: metode === 'cash' ? kembalian : 0,
      catatan: catatan.trim() || undefined,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Gagal menyimpan', error);
      return;
    }

    clear();
    router.replace(`/struk/${data.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Ringkasan item */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Ringkasan ({totalQty} item)
            </Text>
            {items.map((i) => (
              <View key={i.product_id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{i.nama_produk}</Text>
                  <Text style={styles.itemSub}>
                    {i.qty} × {formatRupiah(i.harga)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatRupiah(i.harga * i.qty)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
            </View>
          </View>

          {/* Metode */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Metode Pembayaran</Text>
            <View style={styles.metodeRow}>
              <TouchableOpacity
                style={[
                  styles.metodeBtn,
                  metode === 'cash' && styles.metodeBtnActive,
                ]}
                onPress={() => setMetode('cash')}
              >
                <Ionicons
                  name="cash"
                  size={22}
                  color={metode === 'cash' ? '#fff' : '#0ea5e9'}
                />
                <Text
                  style={[
                    styles.metodeText,
                    metode === 'cash' && styles.metodeTextActive,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metodeBtn,
                  metode === 'qris' && styles.metodeBtnActive,
                ]}
                onPress={() => setMetode('qris')}
              >
                <Ionicons
                  name="qr-code"
                  size={22}
                  color={metode === 'qris' ? '#fff' : '#0ea5e9'}
                />
                <Text
                  style={[
                    styles.metodeText,
                    metode === 'qris' && styles.metodeTextActive,
                  ]}
                >
                  QRIS
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Input cash */}
          {metode === 'cash' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nominal Bayar</Text>
              <TextInput
                style={styles.input}
                value={bayarStr}
                onChangeText={(t) =>
                  setBayarStr(t.replace(/\D/g, ''))
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#aaa"
              />

              {/* Quick amount */}
              <View style={styles.quickRow}>
                {quickAmounts.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickBtn}
                    onPress={() => setBayarStr(String(amt))}
                  >
                    <Text style={styles.quickText}>
                      {formatRupiah(amt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Kembalian */}
              <View
                style={[
                  styles.kembalianBox,
                  kembalian < 0 && { backgroundColor: '#fef2f2' },
                ]}
              >
                <Text style={styles.kembalianLabel}>Kembalian</Text>
                <Text
                  style={[
                    styles.kembalianValue,
                    { color: kembalian < 0 ? '#ef4444' : '#16a34a' },
                  ]}
                >
                  {kembalian >= 0
                    ? formatRupiah(kembalian)
                    : `Kurang ${formatRupiah(Math.abs(kembalian))}`}
                </Text>
              </View>
            </View>
          )}

          {/* Catatan */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Catatan (opsional)</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              value={catatan}
              onChangeText={setCatatan}
              placeholder="Misal: tanpa sambal, bungkus, dll"
              placeholderTextColor="#aaa"
              multiline
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!cashValid || loading) && { opacity: 0.5 },
            ]}
            onPress={handleKonfirmasi}
            disabled={!cashValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.confirmText}>Konfirmasi Pembayaran</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  scroll: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 15, color: '#666' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#0ea5e9' },
  metodeRow: { flexDirection: 'row', gap: 10 },
  metodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    backgroundColor: '#fff',
  },
  metodeBtnActive: {
    backgroundColor: '#0ea5e9',
  },
  metodeText: { fontSize: 15, fontWeight: '600', color: '#0ea5e9' },
  metodeTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
  },
  quickText: { fontSize: 13, color: '#0369a1', fontWeight: '600' },
  kembalianBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kembalianLabel: { fontSize: 14, color: '#666' },
  kembalianValue: { fontSize: 16, fontWeight: 'bold' },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});