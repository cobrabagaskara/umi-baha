import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

type Outlet = {
  id: string;
  nama: string;
  alamat: string | null;
  telepon: string | null;
  kode: string | null;
};

export default function AdminOutletScreen() {
  const router = useRouter();
  const { profile, loadProfile } = useAuth();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  // Jika null, berarti mode Tambah Baru
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [kode, setKode] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Load daftar outlet
  const loadOutlets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('outlets').select('*').order('nama');
    
    if (error) {
      Alert.alert('Error', 'Gagal memuat data outlet');
    } else {
      setOutlets(data ?? []);
      
            // Jika belum ada outlet yang dipilih, pilih yang pertama (jika ada)
      // TAPI jangan lakukan ini jika kita sedang di mode "Tambah Baru"
      const isAdding = selectedOutletId === null; 
      
      if (data && data.length > 0 && !selectedOutletId && isAdding === false) {
        const current = data[0];
        setSelectedOutletId(current.id);
        setNama(current.nama);
        setAlamat(current.alamat ?? '');
        setTelepon(current.telepon ?? '');
        setKode(current.kode ?? '');
      }
    }
    setLoading(false);
  }, [selectedOutletId]);

  useEffect(() => {
    loadOutlets();
  }, [loadOutlets]);

  // Saat admin ganti pilihan dropdown
  const handleSelectOutlet = (outlet: Outlet) => {
    setSelectedOutletId(outlet.id);
    setNama(outlet.nama);
    setAlamat(outlet.alamat ?? '');
    setTelepon(outlet.telepon ?? '');
    setKode(outlet.kode ?? '');
  };

  // Saat admin klik tombol Tambah (+)
  const handleAddNew = () => {
    setSelectedOutletId(null);
    setNama('');
    setAlamat('');
    setTelepon('');
    setKode('');
  };

  const handleSave = async () => {
    if (!nama.trim()) {
      Alert.alert('Oops', 'Nama outlet wajib diisi');
      return;
    }

    setSaving(true);
    const payload = {
      nama: nama.trim(),
      alamat: alamat.trim() || null,
      telepon: telepon.trim() || null,
      kode: kode.trim().toUpperCase() || null,
    };

    if (selectedOutletId) {
      // MODE EDIT
      const { error } = await supabase
        .from('outlets')
        .update(payload)
        .eq('id', selectedOutletId);
      
      setSaving(false);

      if (error) {
        Alert.alert('Gagal', error.message);
        return;
      }

      // Refresh data di aplikasi jika yang diedit adalah outlet tempat admin ini bernaung
      if (selectedOutletId === profile?.outlet_id) {
        await loadProfile();
      }
      
      Alert.alert('Sukses', 'Pengaturan outlet berhasil disimpan');
      loadOutlets();

    } else {
      // MODE TAMBAH BARU
      const { data, error } = await supabase
        .from('outlets')
        .insert(payload)
        .select()
        .single();
      
      setSaving(false);

      if (error) {
        Alert.alert('Gagal', error.message);
        return;
      }

      Alert.alert('Sukses', 'Outlet baru berhasil ditambahkan');
      // Set form ke outlet yang baru dibuat
      if (data) {
        setSelectedOutletId(data.id);
      }
      loadOutlets();
    }
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Outlet</Text>
        
        {/* Tombol Tambah Outlet Baru */}
        {isAdmin ? (
          <TouchableOpacity onPress={handleAddNew} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#0369a1" />
            <Text style={styles.infoText}>
              {selectedOutletId 
                ? 'Data ini akan tercetak di bagian atas struk pembayaran dan tampil di halaman utama Kasir.' 
                : 'Isi form di bawah untuk mendaftarkan cabang/toko baru ke dalam sistem.'}
            </Text>
          </View>

          {/* Pilihan Outlet (HANYA untuk Admin, sembunyikan saat mode tambah baru) */}
          {isAdmin && outlets.length > 0 && selectedOutletId && (
            <View style={styles.card}>
              <Text style={styles.label}>Pilih Outlet yang Ingin Diedit</Text>
              <View style={styles.dropdownContainer}>
                {outlets.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[
                      styles.dropdownItem,
                      selectedOutletId === o.id && styles.dropdownActive,
                    ]}
                    onPress={() => handleSelectOutlet(o)}
                  >
                    <Text
                      style={
                        selectedOutletId === o.id
                          ? { color: '#fff', fontSize: 13, fontWeight: 'bold' }
                          : { color: '#333', fontSize: 13 }
                      }
                    >
                      {o.nama}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Nama Outlet / Toko</Text>
            <TextInput
              style={styles.input}
              value={nama}
              onChangeText={setNama}
              placeholder="Misal: UMI BAHA - Cabang C"
            />

            <Text style={styles.label}>Kode Outlet (Untuk Struk)</Text>
            <TextInput
              style={styles.input}
              value={kode}
              onChangeText={setKode}
              placeholder="Misal: CBC"
              autoCapitalize="characters"
              maxLength={4}
            />

            <Text style={styles.label}>Alamat Lengkap</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={alamat}
              onChangeText={setAlamat}
              placeholder="Misal: Jl. Merdeka No. 1, Jakarta"
              multiline
            />

            <Text style={styles.label}>Nomor Telepon / WA</Text>
            <TextInput
              style={styles.input}
              value={telepon}
              onChangeText={setTelepon}
              placeholder="Misal: 08123456789"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveText}>
                  {selectedOutletId ? 'Simpan Perubahan' : 'Daftarkan Outlet Baru'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  addBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  scroll: { padding: 16 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: { flex: 1, fontSize: 13, color: '#0369a1', lineHeight: 18 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    marginTop: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  dropdownActive: {
    backgroundColor: '#0ea5e9',
  },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});