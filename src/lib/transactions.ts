import type { CartItem } from '@/contexts/cart';
import { supabase } from '@/lib/supabase';

type SaveTransactionParams = {
  outletId: string;
  kasirId: string;
  items: CartItem[];
  metodeBayar: 'cash' | 'qris';
  bayar?: number;
  kembalian?: number;
  catatan?: string;
};

export async function saveTransaction(params: SaveTransactionParams) {
  const {
    outletId, kasirId, items, metodeBayar, bayar, kembalian, catatan,
  } = params;

  const total = items.reduce((sum, i) => sum + i.harga * i.qty, 0);

  // 1. AMBIL KODE OUTLET
  const { data: outletData } = await supabase
    .from('outlets')
    .select('kode')
    .eq('id', outletId)
    .single();
  
  const kodeOutlet = outletData?.kode || 'OUT';

  // 2. HITUNG NOMOR URUT HARI INI
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('outlet_id', outletId)
    .gte('created_at', today.toISOString());

  const urutan = (count ?? 0) + 1;

  // 3. BUAT FORMAT NOMOR STRUK (Misal: PST-251023-001)
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const urutStr = String(urutan).padStart(3, '0');
  
  const noStruk = `${kodeOutlet}-${dd}${mm}${yy}-${urutStr}`;

  // 4. INSERT TRANSAKSI
  const { data: trx, error: trxError } = await supabase
    .from('transactions')
    .insert({
      outlet_id: outletId,
      kasir_id: kasirId,
      total,
      metode_bayar: metodeBayar,
      bayar: bayar ?? total,
      kembalian: kembalian ?? 0,
      catatan: catatan ?? null,
      is_void: false,
      no_struk: noStruk, // ← Simpan nomor struk
    })
    .select()
    .single();

  if (trxError) return { data: null, error: trxError.message };

  // 5. INSERT ITEMS
  const itemRows = items.map((i) => ({
    transaction_id: trx.id,
    product_id: i.product_id,
    nama_produk: i.nama_produk,
    harga: i.harga,
    qty: i.qty,
    subtotal: i.harga * i.qty,
  }));

  const { error: itemsError } = await supabase.from('transaction_items').insert(itemRows);

  if (itemsError) {
    await supabase.from('transactions').delete().eq('id', trx.id);
    return { data: null, error: itemsError.message };
  }

  return { data: trx, error: null };
}