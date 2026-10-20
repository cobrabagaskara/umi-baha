import { useCart } from '@/contexts/cart';
import { formatRupiah } from '@/lib/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function CartModal({ visible, onClose }: Props) {
    const items = useCart((s) => s.items);
    const increment = useCart((s) => s.increment);
    const decrement = useCart((s) => s.decrement);
    const clear = useCart((s) => s.clear);
    const total = items.reduce((sum, i) => sum + i.harga * i.qty, 0);
    const router = useRouter();

    const handleCheckout = () => {
    onClose();
    router.push('/checkout');
    
  };
  const handleClear = () => {
  Alert.alert(
    'Kosongkan Keranjang',
    'Yakin mau hapus semua item dari keranjang?',
    [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya, Kosongkan',
        style: 'destructive',
        onPress: () => {
          clear();
          onClose();
        },
      },
    ]
  );
};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Keranjang</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {items.length > 0 && (
  <TouchableOpacity onPress={handleClear}>
    <Text style={styles.clearText}>Kosongkan</Text>
  </TouchableOpacity>
)}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={48} color="#ccc" />
              <Text style={{ color: '#999', marginTop: 8 }}>
                Keranjang kosong
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.product_id}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.nama_produk}</Text>
                    <Text style={styles.itemPrice}>
                      {formatRupiah(item.harga)} × {item.qty} ={' '}
                      <Text style={{ color: '#0ea5e9', fontWeight: 'bold' }}>
                        {formatRupiah(item.harga * item.qty)}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => decrement(item.product_id)}
                    >
                      <Ionicons name="remove" size={18} color="#0ea5e9" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.qty}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => increment(item.product_id)}
                    >
                      <Ionicons name="add" size={18} color="#0ea5e9" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}

          {/* Footer */}
          {items.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
              </View>
              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutText}>Lanjut ke Pembayaran</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  clearText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  itemPrice: { fontSize: 13, color: '#666', marginTop: 4 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 4,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: { fontSize: 16, color: '#666' },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: '#0ea5e9' },
  checkoutBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});