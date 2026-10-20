import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Category = {
  id: string;
  nama: string;
  urutan: number;
  aktif: boolean;
};

export default function AdminKategoriScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [nama, setNama] = useState('');
  const [urutan, setUrutan] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('urutan', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Gagal memuat kategori');
    } else {
      setCategories(data ?? []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAdd = () => {
    setEditId(null);
    setNama('');
    setUrutan((categories.length + 1).toString());
    setModalVisible(true);
  };

  const handleEdit = (cat: Category) => {
    setEditId(cat.id);
    setNama(cat.nama);
    setUrutan(cat.urutan.toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nama.trim()) {
      Alert.alert('Oops', 'Nama kategori wajib diisi');
      return;
    }

    setSaving(true);
    const payload = {
      nama: nama.trim(),
      urutan: parseInt(urutan, 10) || 0,
    };

    if (editId) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editId);
      if (error) Alert.alert('Gagal', error.message);
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) Alert.alert('Gagal', error.message);
    }

    setSaving(false);
    setModalVisible(false);
    loadData();
  };

  const handleToggleAktif = async (cat: Category) => {
    const { error } = await supabase
      .from('categories')
      .update({ aktif: !cat.aktif })
      .eq('id', cat.id);

    if (!error) loadData();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelola Kategori</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* List Kategori */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => handleEdit(item)}>
                <Text style={[styles.cardName, !item.aktif && { color: '#999' }]}>
                  {item.nama}
                </Text>
                <Text style={styles.cardOrder}>Urutan: {item.urutan}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.toggleBtn, item.aktif ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => handleToggleAktif(item)}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                  {item.aktif ? 'AKTIF' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* MODAL FORM */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Kategori' : 'Kategori Baru'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Nama Kategori</Text>
              <TextInput
                style={styles.input}
                value={nama}
                onChangeText={setNama}
                placeholder="Misal: Makanan, Minuman, Paket Hemat"
              />

              <Text style={styles.label}>Urutan Tampil</Text>
              <TextInput
                style={styles.input}
                value={urutan}
                onChangeText={setUrutan}
                keyboardType="numeric"
                placeholder="1, 2, 3..."
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Simpan Kategori</Text>}
            </TouchableOpacity>
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
  cardOrder: { fontSize: 12, color: '#888', marginTop: 2 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleActive: { backgroundColor: '#16a34a' },
  toggleInactive: { backgroundColor: '#ef4444' },
  
  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  saveBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});