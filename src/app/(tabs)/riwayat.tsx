import { useAuth } from '@/contexts/auth';
import { formatRupiah, formatTanggal } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Trx = {
  id: string;
  no_struk: string | null;
  total: number;
  metode_bayar: string;
  created_at: string;
  outlet_id: string;
  is_void: boolean;
  kasir: { nama: string } | null;
  outlets: { nama: string } | null;
  items: { qty: number }[];
};

type FilterType = 'today' | 'this_month' | 'last_month' | 'custom';

export default function RiwayatScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Trx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State Filter Tanggal
  const [filterType, setFilterType] = useState<FilterType>('today');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // State Modal Custom Date
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [showPicker, setShowPicker] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Fungsi untuk menghitung rentang tanggal berdasarkan filter yang dipilih
  const getDateRange = () => {
    const start = new Date();
    const end = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (filterType === 'today') {
      return { start, end };
    } 
    if (filterType === 'this_month') {
      start.setDate(1); // Tanggal 1 bulan ini
      return { start, end };
    } 
    if (filterType === 'last_month') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1); // Tanggal 1 bulan lalu
      end.setDate(0); // Tanggal terakhir bulan lalu
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    // Custom
    const customStart = new Date(startDate);
    customStart.setHours(0, 0, 0, 0);
    const customEnd = new Date(endDate);
    customEnd.setHours(23, 59, 59, 999);
    return { start: customStart, end: customEnd };
  };

  const loadData = useCallback(
    async (silent = false) => {
      if (!profile) return;
      if (!silent) setLoading(true);

      const { start, end } = getDateRange();

      let query = supabase
        .from('transactions')
        .select(
          `
          id, no_struk, total, metode_bayar, created_at, outlet_id, is_void,
          kasir:profiles!transactions_kasir_id_fkey ( nama ),
          outlets ( nama ),
          items:transaction_items ( qty )
        `
        )
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('kasir_id', profile.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('riwayat error:', error.message);
      } else {
        setTransactions((data as any) ?? []);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [profile, filterType, startDate, endDate, isAdmin]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

    // Fungsi saat tanggal dipilih
  const onValueChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) {
      if (pickerMode === 'start') {
        setStartDate(date);
        if (date > endDate) setEndDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  // Fungsi saat kalender ditutup tanpa memilih (khusus Android)
  const onDismiss = () => {
    setShowPicker(false);
  };

  // Helper untuk menampilkan teks filter
  const getFilterLabel = () => {
    if (filterType === 'today') return 'Hari Ini';
    if (filterType === 'this_month') return 'Bulan Ini';
    if (filterType === 'last_month') return 'Bulan Lalu';
    return `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
  };

  const totalPenjualan = transactions.filter(t => !t.is_void).reduce((sum, t) => sum + t.total, 0);
  const totalTransaksi = transactions.filter(t => !t.is_void).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {isAdmin ? 'Rekap Penjualan' : 'Riwayat Saya'}
          </Text>
          <Text style={styles.headerSub}>
            {profile?.nama ? `${profile.nama}` : ''}
          </Text>
        </View>
      </View>

      {/* Ringkasan */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Transaksi</Text>
          <Text style={styles.summaryValue}>{totalTransaksi}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Penjualan</Text>
          <Text style={[styles.summaryValue, { color: '#0ea5e9' }]}>
            {formatRupiah(totalPenjualan)}
          </Text>
        </View>
      </View>

      {/* Filter Tanggal */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterChip, filterType === 'today' && styles.filterChipActive]}
          onPress={() => setFilterType('today')}
        >
          <Text style={filterType === 'today' ? styles.chipTextActive : styles.chipText}>Hari Ini</Text>
        </TouchableOpacity>

        

        <TouchableOpacity 
          style={[styles.filterChip, filterType === 'custom' && styles.filterChipActive, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
          onPress={() => {
            setFilterType('custom');
            setModalVisible(true);
          }}
        >
          <Ionicons name="calendar-outline" size={14} color={filterType === 'custom' ? '#fff' : '#0ea5e9'} />
          <Text style={filterType === 'custom' ? styles.chipTextActive : styles.chipText}>
            {filterType === 'custom' ? getFilterLabel() : 'Pilih Tanggal'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={{ color: '#999', marginTop: 12 }}>
            Belum ada transaksi di periode ini
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const qtyTotal = item.items.reduce((s, i) => s + i.qty, 0);
            const isCash = item.metode_bayar === 'cash';
            return (
              <TouchableOpacity
                style={[styles.card, item.is_void && { opacity: 0.6 }]}
                onPress={() => router.push(`/struk/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardLeft}>
                  <View
                    style={[
                      styles.iconWrap,
                      isCash
                        ? { backgroundColor: '#dcfce7' }
                        : { backgroundColor: '#dbeafe' },
                    ]}
                  >
                    <Ionicons
                      name={isCash ? 'cash' : 'qr-code'}
                      size={20}
                      color={isCash ? '#16a34a' : '#2563eb'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardDate}>
                      {item.no_struk ?? formatTanggal(item.created_at)}
                      {item.is_void && <Text style={{color: 'red', fontWeight: 'bold'}}> (DIBATALKAN)</Text>}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {item.kasir?.nama ?? '-'} • {item.outlets?.nama ?? '-'}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {qtyTotal} item • {item.metode_bayar.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.cardTotal, item.is_void && { textDecorationLine: 'line-through', color: '#999' }]}>
                    {formatRupiah(item.total)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#bbb"
                    style={{ marginTop: 4 }}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal Custom Date Range */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Rentang Tanggal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <View>
                <Text style={styles.label}>Tanggal Mulai</Text>
                <TouchableOpacity 
                  style={styles.dateSelectBtn} 
                  onPress={() => { setPickerMode('start'); setShowPicker(true); }}
                >
                  <Text style={styles.dateSelectText}>
                    {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.label}>Tanggal Selesai</Text>
                <TouchableOpacity 
                  style={styles.dateSelectBtn} 
                  onPress={() => { setPickerMode('end'); setShowPicker(true); }}
                >
                  <Text style={styles.dateSelectText}>
                    {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={() => {
                setModalVisible(false);
                loadData(); // Refresh data dengan rentang baru
              }}
            >
              <Text style={styles.applyText}>Terapkan Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

            {showPicker && (
        <DateTimePicker
          value={pickerMode === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          onValueChange={onValueChange}
          onDismiss={onDismiss}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#eee' },
  summaryLabel: { fontSize: 11, color: '#888' },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  filterChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  chipTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },

  listContent: { padding: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardDate: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  cardMeta: { fontSize: 11, color: '#888', marginTop: 3 },
  cardTotal: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' },

  // Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  label: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 8 },
  dateSelectBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#fafafa' },
  dateSelectText: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  applyBtn: { backgroundColor: '#0ea5e9', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  applyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});