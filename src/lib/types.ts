export type Category = {
  id: string;
  nama: string;
  urutan: number;
  aktif: boolean;
};

export type ProductWithPrice = {
  id: string;
  nama: string;
  harga: number; // sudah di-resolve (override atau default)
  category_id: string;
  gambar_url?: string | null;
};