export function formatRupiah(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID');
}

export function formatTanggal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}