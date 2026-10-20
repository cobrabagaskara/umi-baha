import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatRupiah, formatTanggal } from './format';

type TrxData = {
  id: string;
  created_at: string;
  total: number;
  metode_bayar: string;
  bayar: number;
  kembalian: number;
  catatan: string | null;
  outlets: { nama: string; alamat: string | null; logo_url: string | null } | null;
  kasir: { nama: string } | null;
  items: {
    nama_produk: string;
    harga: number;
    qty: number;
    subtotal: number;
  }[];
};

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStrukHtml(trx: TrxData): string {
  const logoUrl = trx.outlets?.logo_url;
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="max-width: 60px; max-height: 60px; margin-bottom: 4px;" />`
    : '';

  const itemsHtml = trx.items
    .map(
      (i) => `
      <tr>
        <td colspan="2" style="padding-top: 4px;">
          <div style="font-weight: 600;">${escapeHtml(i.nama_produk)}</div>
        </td>
      </tr>
      <tr>
        <td style="font-size: 10px; color: #444; padding-bottom: 4px;">
          ${i.qty} x ${formatRupiah(i.harga)}
        </td>
        <td style="text-align: right; font-size: 11px; padding-bottom: 4px;">
          ${formatRupiah(i.subtotal)}
        </td>
      </tr>
    `
    )
    .join('');

  const cashRows =
    trx.metode_bayar === 'cash'
      ? `
    <tr>
      <td style="font-size: 11px;">Bayar</td>
      <td style="text-align: right; font-size: 11px;">${formatRupiah(trx.bayar)}</td>
    </tr>
    <tr>
      <td style="font-size: 11px;">Kembalian</td>
      <td style="text-align: right; font-size: 11px;">${formatRupiah(trx.kembalian)}</td>
    </tr>
  `
      : '';

  const catatanHtml = trx.catatan
    ? `
    <tr>
      <td colspan="2" style="padding-top: 6px; font-size: 10px;">
        <b>Catatan:</b> ${escapeHtml(trx.catatan)}
      </td>
    </tr>
  `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: 58mm auto;
      margin: 3mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      color: #000;
      margin: 0;
      padding: 0;
      width: 52mm;
      font-size: 11px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dashed {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td { vertical-align: top; }
    .title { font-size: 13px; font-weight: bold; }
    .sub { font-size: 10px; color: #333; }
    .total-row td { font-size: 13px; font-weight: bold; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="center">
    ${logoHtml}
    <div class="title">${escapeHtml(trx.outlets?.nama ?? 'Outlet')}</div>
    ${trx.outlets?.alamat ? `<div class="sub">${escapeHtml(trx.outlets.alamat)}</div>` : ''}
  </div>

  <div class="dashed"></div>

  <div class="sub">
    ${formatTanggal(trx.created_at)}<br/>
    Kasir: ${escapeHtml(trx.kasir?.nama ?? '-')}
  </div>

  <div class="dashed"></div>

  <table>
    ${itemsHtml}
  </table>

  <div class="dashed"></div>

  <table>
    <tr class="total-row">
      <td>TOTAL</td>
      <td style="text-align: right;">${formatRupiah(trx.total)}</td>
    </tr>
    <tr>
      <td style="font-size: 11px;">Metode</td>
      <td style="text-align: right; font-size: 11px;">${trx.metode_bayar.toUpperCase()}</td>
    </tr>
    ${cashRows}
    ${catatanHtml}
  </table>

  <div class="dashed"></div>

  <div class="center sub">
    Terima kasih 🙏<br/>
    Selamat menikmati
  </div>
</body>
</html>
`;
}

export async function shareStrukPDF(trx: TrxData) {
  const html = buildStrukHtml(trx);

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Bagikan Struk',
      UTI: 'com.adobe.pdf',
    });
    return { uri, shared: true };
  } else {
    return { uri, shared: false };
  }
}