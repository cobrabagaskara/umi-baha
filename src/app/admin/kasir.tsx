import { useAuth } from '@/contexts/auth';
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Outlet = { id: string; nama: string };
type Kasir = {
  id: string;
  nama: string;
  role: string;
  aktif: boolean;
  outlet_id: string;
  outlets: { nama: string } | null;
};

export default function AdminKasirScreen() {
  const router = useRouter();
  const { profile: myProfile } = useAuth();
  const [kasirs, setKasirs] = useState<Kasir[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState(''); // Hanya untuk tambah baru
  const [password, setPassword] = useState(''); // Hanya untuk tambah baru
  const [role, setRole] = useState<'kasir' | 'admin'>('kasir');
  const [outletId, setOutletId] = useState('');
  const [aktif, setAktif] = useState(true);

  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);


    const handleResetPassword = () => {
    if (!resetPassword || resetPassword.length < 6) {
      Alert.alert('Oops', 'Password baru minimal 6 karakter');
      return;
    }
    Alert.alert('Reset Password', `Yakin ingin mereset password ${nama}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya, Reset',
        style: 'destructive',
        onPress: async () => {
          setResetting(true);
          const { data, error } = await supabase.functions.invoke('reset-password', {
            body: { target_user_id: editId, new_password: resetPassword },
          });
          setResetting(false);

          if (error || data?.error) {
            Alert.alert('Gagal', data?.error || error?.message);
            return;
          }
          setResetPassword('');
          Alert.alert('Sukses', 'Password berhasil direset');
        },
      },
    ]);
  };



  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, nama, role, aktif, outlet_id, outlets(nama)')
      .order('nama');

    const { data: outs } = await supabase.from('outlets').select('id, nama').order('nama');

    if (!error) setKasirs((users as any) ?? []);
    if (outs && outs.length > 0) {
      setOutlets(outs);
      if (!editId) setOutletId(outs[0].id); // Default
    }
    setLoading(false);
  }, [editId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAdd = () => {
    setEditId(null);
    setNama('');
    setEmail('');
    setPassword('');
    setRole('kasir');
    setOutletId(outlets[0]?.id ?? '');
    setAktif(true);
    setModalVisible(true);
  };

  const handleEdit = (kasir: Kasir) => {
    setEditId(kasir.id);
    setNama(kasir.nama);
    setRole(kasir.role as 'kasir' | 'admin');
    setOutletId(kasir.outlet_id);
    setAktif(kasir.aktif);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nama || !outletId) {
      Alert.alert('Oops', 'Nama dan Outlet wajib diisi');
      return;
    }

    setSaving(true);

    if (editId) {
      // MODE EDIT (Update Profiles)
      const { error } = await supabase
        .from('profiles')
        .update({
          nama,
          role,
          outlet_id: outletId,
          aktif,
        })
        .eq('id', editId);

      setSaving(false);

      if (error) {
        Alert.alert('Gagal', error.message);
        return;
      }
    } else {
      // MODE TAMBAH BARU (Panggil Edge Function)
      if (!email || !password) {
        Alert.alert('Oops', 'Email dan Password wajib diisi untuk karyawan baru');
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-kasir', {
        body: {
          nama,
          email,
          password,
          role,
          outlet_id: outletId,
        },
      });

      setSaving(false);

      if (error) {
        Alert.alert('Gagal', error.message);
        return;
      }
      if (data?.error) {
        Alert.alert('Gagal', data.error);
        return;
      }
    }

    setModalVisible(false);
    loadData();
    Alert.alert('Sukses', 'Data karyawan berhasil disimpan');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelola Karyawan</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* List Kasir */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={kasirs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleEdit(item)}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.cardName, !item.aktif && { color: '#999' }]}>
                    {item.nama}
                  </Text>
                  {!item.aktif && (
                    <View style={styles.badgeOff}>
                      <Text style={styles.badgeText}>NONAKTIF</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardCat}>
                  {item.role.toUpperCase()} • {item.outlets?.nama ?? 'Tanpa Outlet'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
              <Text style={styles.modalTitle}>{editId ? 'Edit Karyawan' : 'Karyawan Baru'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Nama Lengkap</Text>
              <TextInput style={styles.input} value={nama} onChangeText={setNama} />

              {!editId && (
                <>
                  <Text style={styles.label}>Email (Untuk Login)</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </>
              )}

              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'kasir' && styles.roleBtnActive]}
                  onPress={() => setRole('kasir')}
                >
                  <Text style={role === 'kasir' ? { color: '#fff', fontWeight: 'bold' } : {}}>Kasir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]}
                  onPress={() => setRole('admin')}
                  disabled={editId === myProfile?.id} // Admin tidak bisa turunkan jabatannya sendiri
                >
                  <Text style={role === 'admin' ? { color: '#fff', fontWeight: 'bold' } : {}}>Admin</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Penempatan Outlet</Text>
              <View style={styles.dropdownContainer}>
                {outlets.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.dropdownItem, outletId === o.id && styles.dropdownActive]}
                    onPress={() => setOutletId(o.id)}
                  >
                    <Text style={outletId === o.id ? { color: '#fff', fontWeight: 'bold' } : {}}>{o.nama}</Text>
                  </TouchableOpacity>
                ))}
              </View>
                            {editId && (
                <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' }}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Reset Password Karyawan</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={resetPassword}
                      onChangeText={setResetPassword}
                      placeholder="Password baru (min. 6)"
                      secureTextEntry
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: '#ef4444', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' }}
                      onPress={handleResetPassword}
                      disabled={resetting}
                    >
                      {resetting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reset</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {editId && (
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchLabel}>Status Keaktifan</Text>
                    <Text style={styles.switchHint}>Matikan jika karyawan resign / berhenti</Text>
                  </View>
                  <Switch
                    value={aktif}
                    onValueChange={setAktif}
                    trackColor={{ false: '#ccc', true: '#16a34a' }}
                    disabled={editId === myProfile?.id} // Admin tidak bisa nonaktifkan dirinya sendiri
                  />
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Simpan Data</Text>}
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
  cardCat: { fontSize: 12, color: '#888', marginTop: 4 },
  badgeOff: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
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
  roleRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  dropdownContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  dropdownActive: { backgroundColor: '#0ea5e9' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  switchLabel: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  switchHint: { fontSize: 12, color: '#888', marginTop: 2 },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});