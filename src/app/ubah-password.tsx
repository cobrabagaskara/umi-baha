import { useAuth } from '@/contexts/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UbahPasswordScreen() {
  const router = useRouter();
  const { changePassword } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Oops', 'Semua kolom wajib diisi');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Oops', 'Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Oops', 'Konfirmasi password baru tidak cocok');
      return;
    }

    setLoading(true);
    const { error } = await changePassword(oldPassword, newPassword);
    setLoading(false);

    if (error) {
      Alert.alert('Gagal', error);
    } else {
      Alert.alert('Sukses', 'Password berhasil diubah');
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ubah Password Saya</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <Text style={styles.label}>Password Lama</Text>
          <TextInput style={styles.input} value={oldPassword} onChangeText={setOldPassword} secureTextEntry />

          <Text style={styles.label}>Password Baru (min. 6 karakter)</Text>
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />

          <Text style={styles.label}>Konfirmasi Password Baru</Text>
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Simpan Password Baru</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  content: { padding: 20 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 16, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff' },
  saveBtn: { backgroundColor: '#0ea5e9', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});