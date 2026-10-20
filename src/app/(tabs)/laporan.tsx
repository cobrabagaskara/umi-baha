import { useAuth } from '@/contexts/auth';
import { formatRupiah } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterType = 'today' | 'custom';

type TrxData = {
  id: string;
  total: number;
  outlet_id: string;
  metode_bayar: string;
  outlets: { nama: string } | null;
};

export default function LaporanAdminScreen() {
  const { profile } = useAuth();
  
  // State Filter Waktu
  const [filterType, setFilterType] = useState<FilterType>('today');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // State Modal Custom Date
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [showPicker, setShowPicker] = useState(false);

  const [outletFilter, setOutletFilter] = useState<string>('all'); // 'all' atau ID outlet
  const [outlets, setOutlets] = useState<{ id: string; nama: string }[]>([]);
  const [transactions, setTransactions] = useState<TrxData[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper untuk menghitung rentang tanggal
  const getDateRange = () => {
    const start = new Date();
    const end = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (filterType === 'today') {
      return { start, end };
    }
    
    // Custom
    const customStart = new Date(startDate);
    customStart.setHours(0, 0, 0, 0);
    const customEnd = new Date(endDate);
    customEnd.setHours(23, 59, 59, 999);
    return { start: customStart, end: customEnd };
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    // Ambil daftar outlet untuk filter
    if (outlets.length === 0) {
      const { data: outs } = await supabase.from('outlets').select('id, nama').order('nama');
      if (outs) setOutlets(outs);
    }

    const { start, end } = getDateRange();

    // Ambil transaksi
    let query = supabase
      .from('transactions')
      .select('id, total, outlet_id, metode_bayar, outlets(nama)')
      .eq('is_void', false)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (outletFilter !== 'all') {
      query = query.eq('outlet_id', outletFilter);
    }

    const { data, error } = await query;

    if (!error) setTransactions((data as any) ?? []);
    setLoading(false);
  }, [filterType, startDate, endDate, outletFilter, outlets.length]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

  const getFilterLabel = () => {
    if (filterType === 'today') return 'Hari Ini';
    return `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
  };

  // Hitung Ringkasan
  const totalPendapatan = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalCash = transactions.filter(t => t.metode_bayar === 'cash').reduce((s, t) => s + t.total, 0);
  const totalQris = transactions.filter(t => t.metode_bayar === 'qris').reduce((s, t) => s + t.total, 0);

  // Hitung per Outlet
  const perOutlet = outlets.map(o => {
    const trxOutlet = transactions.filter(t => t.outlet_id === o.id);
    const cash = trxOutlet.filter(t => t.metode_bayar === 'cash').reduce((s, t) => s + t.total, 0);
    const qris = trxOutlet.filter(t => t.metode_bayar === 'qris').reduce((s, t) => s + t.total, 0);
    return {
      ...o,
      total: cash + qris,
      cash,
      qris,
      count: trxOutlet.length,
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Laporan Bisnis</Text>
        <Text style={styles.headerSub}>Halo, {profile?.nama}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Filter Waktu */}
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

        {/* Filter Outlet */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <TouchableOpacity
            style={[styles.outletChip, outletFilter === 'all' && styles.outletChipActive]}
            onPress={() => setOutletFilter('all')}
          >
            <Text style={outletFilter === 'all' ? { color: '#fff', fontWeight: 'bold' } : {}}>Semua Outlet</Text>
          </TouchableOpacity>
          {outlets.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[styles.outletChip, outletFilter === o.id && styles.outletChipActive]}
              onPress={() => setOutletFilter(o.id)}
            >
              <Text style={outletFilter === o.id ? { color: '#fff', fontWeight: 'bold' } : {}}>{o.nama}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Kartu Total */}
            <View style={styles.cardTotal}>
              <Text style={styles.cardTotalLabel}>Total Pendapatan</Text>
              <Text style={styles.cardTotalValue}>{formatRupiah(totalPendapatan)}</Text>
              
              <View style={styles.rowDetail}>
                <Text style={styles.detailText}>Tunai: {formatRupiah(totalCash)}</Text>
                <Text style={styles.detailText}>QRIS: {formatRupiah(totalQris)}</Text>
              </View>
              <Text style={styles.detailText}>Dari {transactions.length} transaksi</Text>
            </View>

            {/* Rincian per Outlet */}
            {outletFilter === 'all' && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Rincian per Outlet</Text>
                {perOutlet.map(o => (
                  <View key={o.id} style={styles.cardOutlet}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.outletName}>{o.nama}</Text>
                      <Text style={styles.outletCount}>{o.count} transaksi</Text>
                      
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                        <Text style={styles.detailTextBlack}>Cash: {formatRupiah(o.cash)}</Text>
                        <Text style={styles.detailTextBlack}>QRIS: {formatRupiah(o.qris)}</Text>
                      </View>
                    </View>
                    <Text style={styles.outletTotal}>{formatRupiah(o.total)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

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
                loadData();
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  scroll: { padding: 16 },
  
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  chipTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
  
  outletChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 8,
  },
  outletChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },

  cardTotal: {
    backgroundColor: '#0ea5e9',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  cardTotalLabel: { color: '#e0f2fe', fontSize: 14, fontWeight: '600' },
  cardTotalValue: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginVertical: 8 },
  rowDetail: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  detailText: { color: '#bae6fd', fontSize: 12 },
  detailTextBlack: { fontSize: 11, color: '#666', fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10 },
  cardOutlet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  outletName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  outletCount: { fontSize: 12, color: '#888', marginTop: 2 },
  outletTotal: { fontSize: 15, fontWeight: 'bold', color: '#0ea5e9' },

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