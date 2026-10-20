import { formatRupiah } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Category = { id: string; nama: string };
type Outlet = { id: string; nama: string };
type Product = {
  id: string;
  nama: string;
  harga_default: number;
  category_id: string;
  aktif: boolean;
  categories: { nama: string } | null;
};

export default function AdminProdukScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [harga, setHarga] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // State untuk Ketersediaan & Harga Khusus
  const [productOutlets, setProductOutlets] = useState<Record<string, { aktif: boolean; harga: string }>>({});

  const loadData = useCallback(async () => {
    setLoading(true);

    // 1. Load Produk
    const { data: prods } = await supabase
      .from('products')
      .select('id, nama, harga_default, category_id, aktif, categories(nama)')
      .order('nama');
    
    // 2. Load Kategori
    const { data: cats } = await supabase.from('categories').select('*').order('urutan');

    // 3. Load Outlet
    const { data: outs } = await supabase.from('outlets').select('id, nama').order('nama');

    setProducts((prods as any) ?? []);
    setCategories(cats ?? []);
    setOutlets(outs ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Buka Modal untuk Tambah Baru
  const handleAdd = () => {
    setEditId(null);
    setNama('');
    setHarga('');
    setCategoryId(categories[0]?.id ?? '');
    
    // Reset ketersediaan per outlet (default: true, harga kosong = pakai default)
    const initialOutlets: any = {};
    outlets.forEach((o) => {
      initialOutlets[o.id] = { aktif: true, harga: '' };
    });
    setProductOutlets(initialOutlets);
    setModalVisible(true);
  };

  // Buka Modal untuk Edit
  const handleEdit = async (prod: Product) => {
    setEditId(prod.id);
    setNama(prod.nama);
    setHarga(prod.harga_default.toString());
    setCategoryId(prod.category_id);

    // Load override harga outlet
    const { data: overrides } = await supabase
      .from('product_outlets')
      .select('*')
      .eq('product_id', prod.id);

    const initialOutlets: any = {};
    outlets.forEach((o) => {
      const ov = overrides?.find((x) => x.outlet_id === o.id);
      initialOutlets[o.id] = {
        aktif: ov ? ov.aktif : true,
        harga: ov ? ov.harga.toString() : '',
      };
    });
    setProductOutlets(initialOutlets);
    setModalVisible(true);
  };

  // Simpan Data
  const handleSave = async () => {
    if (!nama || !harga || !categoryId) {
      Alert.alert('Oops', 'Nama, Harga, dan Kategori wajib diisi');
      return;
    }
    setSaving(true);

    try {
      let prodId = editId;

      // 1. Simpan ke tabel products
      if (editId) {
        const { error } = await supabase
          .from('products')
          .update({
            nama,
            harga_default: parseInt(harga.replace(/\D/g, ''), 10),
            category_id: categoryId,
          })
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({
            nama,
            harga_default: parseInt(harga.replace(/\D/g, ''), 10),
            category_id: categoryId,
          })
          .select()
          .single();
        if (error) throw error;
        prodId = data.id;
      }

      // 2. Simpan Override Harga & Ketersediaan (product_outlets)
      for (const outlet of outlets) {
        const ov = productOutlets[outlet.id];
        const hargaOverride = ov.harga ? parseInt(ov.harga.replace(/\D/g, ''), 10) : null;

        // Kalau aktif = true dan harga kosong, artinya sama dengan default (tidak perlu insert row)
        // Tapi kalau aktif = false (barang tidak dijual), kita perlu simpan statusnya
        if (hargaOverride || !ov.aktif) {
          const { error } = await supabase.from('product_outlets').upsert(
            {
              product_id: prodId,
              outlet_id: outlet.id,
              harga: hargaOverride || parseInt(harga.replace(/\D/g, ''), 10), // fallback ke default
              aktif: ov.aktif,
            },
            { onConflict: 'product_id,outlet_id' }
          );
          if (error) throw error;
        } else {
          // Kalau tidak ada override, hapus row lama (kalau ada)
          await supabase.from('product_outlets')
            .delete()
            .eq('product_id', prodId)
            .eq('outlet_id', outlet.id);
        }
      }

      setModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelola Produk</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* List Produk */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleEdit(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.nama}</Text>
                <Text style={styles.cardCat}>{item.categories?.nama ?? '-'}</Text>
              </View>
              <Text style={styles.cardPrice}>{formatRupiah(item.harga_default)}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* MODAL FORM */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <KeyboardAvoidingView 
              style={{ flex: 1 }} 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editId ? 'Edit Produk' : 'Produk Baru'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

            <ScrollView>
              <Text style={styles.label}>Nama Produk</Text>
              <TextInput style={styles.input} value={nama} onChangeText={setNama} placeholder="Misal: Nasi Goreng" />

              <Text style={styles.label}>Harga Default (Rp)</Text>
              <TextInput
                style={styles.input}
                value={harga}
                onChangeText={(t) => setHarga(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="15000"
              />

              <Text style={styles.label}>Kategori</Text>
              <View style={styles.dropdownContainer}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.dropdownItem, categoryId === c.id && styles.dropdownActive]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={categoryId === c.id ? { color: '#fff' } : {}}>{c.nama}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Pengaturan per Outlet</Text>
              <Text style={styles.hint}>Kosongkan harga jika sama dengan default. Matikan switch jika barang tidak dijual di outlet tersebut.</Text>

              {outlets.map((o) => (
                <View key={o.id} style={styles.outletRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.outletName}>{o.nama}</Text>
                    <TextInput
                      style={[styles.input, { marginTop: 4, paddingVertical: 8 }]}
                      placeholder={`Harga: ${formatRupiah(parseInt(harga || '0', 10))}`}
                      value={productOutlets[o.id]?.harga || ''}
                      onChangeText={(t) =>
                        setProductOutlets((prev) => ({
                          ...prev,
                          [o.id]: { ...prev[o.id], harga: t.replace(/\D/g, '') },
                        }))
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      productOutlets[o.id]?.aktif ? styles.toggleActive : styles.toggleInactive,
                    ]}
                    onPress={() =>
                      setProductOutlets((prev) => ({
                        ...prev,
                        [o.id]: { ...prev[o.id], aktif: !prev[o.id]?.aktif },
                      }))
                    }
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                      {productOutlets[o.id]?.aktif ? 'JUAL' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Simpan Produk</Text>}
            </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardCat: { fontSize: 12, color: '#888', marginTop: 2 },
  cardPrice: { fontSize: 14, fontWeight: 'bold', color: '#0ea5e9', marginRight: 8 },
  
  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  dropdownContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  dropdownActive: { backgroundColor: '#0ea5e9' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  hint: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 12 },
  outletRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  outletName: { fontSize: 14, fontWeight: '600' },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#16a34a' },
  toggleInactive: { backgroundColor: '#ef4444' },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});