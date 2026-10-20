import CartModal from '@/components/CartModal';
import { useAuth } from '@/contexts/auth';
import { useCart } from '@/contexts/cart';
import { formatRupiah } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Category, ProductWithPrice } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function KasirScreen() {
  const router = useRouter();
  const { profile, outlet } = useAuth();
  const items = useCart((s) => s.items);
const addItem = useCart((s) => s.addItem);
const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
const total = items.reduce((sum, i) => sum + i.harga * i.qty, 0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartVisible, setCartVisible] = useState(false);

  const outletId = profile?.outlet_id;

  const loadData = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);

    // Load kategori
    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .eq('aktif', true)
      .order('urutan', { ascending: true });

    if (catErr) {
      Alert.alert('Error', catErr.message);
      setLoading(false);
      return;
    }

    // Load produk + override harga per outlet
    const { data: prods, error: prodErr } = await supabase
      .from('products')
      .select(
        `
        id, nama, harga_default, category_id, gambar_url, aktif,
        product_outlets ( harga, aktif, outlet_id )
      `
      )
      .eq('aktif', true);

    if (prodErr) {
      Alert.alert('Error', prodErr.message);
      setLoading(false);
      return;
    }

    // Resolve harga: pakai override kalau ada, kalau tidak pakai default
    const resolved: ProductWithPrice[] = (prods ?? [])
      .map((p: any) => {
        const override = (p.product_outlets ?? []).find(
          (po: any) => po.outlet_id === outletId
        );
        // Kalau override ada dan non-aktif → skip produk ini
        if (override && override.aktif === false) return null;

        return {
          id: p.id,
          nama: p.nama,
          harga: override?.harga ?? p.harga_default,
          category_id: p.category_id,
          gambar_url: p.gambar_url,
        };
      })
      .filter(Boolean) as ProductWithPrice[];

    setCategories(cats ?? []);
    setProducts(resolved);
    if ((cats ?? []).length > 0) {
      setActiveCategory(cats![0].id);
    }
    setLoading(false);
  }, [outletId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter(
    (p) => p.category_id === activeCategory
  );

const handleAddProduct = (p: ProductWithPrice) => {
  // console.log('TAP PRODUK:', p.nama, 'HARGA:', p.harga);
  addItem({
    product_id: p.id,
    nama_produk: p.nama,
    harga: p.harga,
  });
 //  console.log('CART SEKARANG:', useCart.getState().items);
};
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Memuat produk...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
  <View>
    <Text style={styles.headerOutlet}>
      {outlet?.nama ?? 'UMI BAHA'}
    </Text>
    <Text style={styles.headerKasir}>
      Kasir: {profile?.nama ?? '-'}
    </Text>
  </View>
  <View style={{ flexDirection: 'row', gap: 12 }}>
    {/* Tombol Laporan */}
    <TouchableOpacity 
      onPress={() => router.push('/laporan-kasir')} 
      style={styles.refreshBtn}
    >
      <Ionicons name="document-text" size={22} color="#0ea5e9" />
    </TouchableOpacity>

    {/* Tombol Refresh */}
    <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
      <Ionicons name="refresh" size={20} color="#0ea5e9" />
    </TouchableOpacity>
  </View>
</View>

      {/* Kategori */}
      <View style={styles.catWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {categories.map((c) => {
            const active = c.id === activeCategory;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setActiveCategory(c.id)}
              >
                <Text
                  style={[styles.catText, active && styles.catTextActive]}
                >
                  {c.nama}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Grid produk */}
      {filteredProducts.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: '#999' }}>Belum ada produk di kategori ini</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleAddProduct(item)}
              activeOpacity={0.6}
>
              <View style={styles.cardIcon}>
                <Ionicons name="fast-food" size={32} color="#0ea5e9" />
              </View>
              <Text style={styles.cardName} numberOfLines={2}>
                {item.nama}
              </Text>
              <Text style={styles.cardPrice}>{formatRupiah(item.harga)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating cart button */}
      {totalQty > 0 && (
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => setCartVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.cartLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalQty}</Text>
            </View>
            <Text style={styles.cartLabel}>Lihat Keranjang</Text>
          </View>
          <Text style={styles.cartTotal}>{formatRupiah(total)}</Text>
        </TouchableOpacity>
      )}

      {/* Modal keranjang */}
      <CartModal
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
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
  headerOutlet: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  headerKasir: { fontSize: 12, color: '#666', marginTop: 2 },
  refreshBtn: { padding: 8 },
  catWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  catScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  catChipActive: { backgroundColor: '#0ea5e9' },
  catText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  catTextActive: { color: '#fff' },
  listContent: { padding: 12, paddingBottom: 100 },
  row: { justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardIcon: {
    backgroundColor: '#e0f2fe',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    alignSelf: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    minHeight: 36,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0ea5e9',
    textAlign: 'center',
    marginTop: 4,
  },
  cartBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cartLeft: { flexDirection: 'row', alignItems: 'center' },
  cartBadge: {
    backgroundColor: '#fff',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cartBadgeText: { color: '#0ea5e9', fontWeight: 'bold' },
  cartLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cartTotal: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});