<?php
/**
 * GET /api/v1/muhasebe/ay-sonu-rapor-html.php
 *   ?donem=YYYY-MM (default: bu ay)
 *   ?avukat_ortak_id=N (zorunlu — Av. mutabakat raporu)
 *
 * MR HASAR — Avukat Bazlı Aylık Mutabakat Raporu
 * Hibrit: DB'den otomatik doldurur + form üzerinden düzelt + Print = sadece rapor
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

$user = auth_required(['admin', 'uzman']);
$db = getDB();

$donem = clean($_GET['donem'] ?? date('Y-m'));
if (!preg_match('/^\d{4}-\d{2}$/', $donem)) {
    http_response_code(422);
    echo 'Geçersiz dönem (YYYY-MM)'; exit;
}
$avukatId = (int)($_GET['avukat_ortak_id'] ?? 0);
if (!$avukatId) {
    // Kullanılabilir avukat listesini göster
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Avukat Seçimi</title><style>body{font-family:system-ui;background:#ECEFF1;padding:40px;color:#2C3E50}h1{color:#2C3E50}a{display:block;padding:10px 14px;margin:6px 0;background:#fff;border-left:4px solid #3498DB;border-radius:6px;text-decoration:none;color:#2C3E50;font-weight:600}a:hover{background:#EAF4FB}</style></head><body>';
    echo '<h1>Avukat Mutabakat Raporu — Avukat Seçin</h1>';
    echo '<p style="color:#7F8C8D">Bir avukat seçerek o aya ait mutabakat raporunu üret.</p>';
    $stmt = $db->query("SELECT id, ad_soyad, firma FROM ortaklar WHERE durum='aktif' ORDER BY ad_soyad");
    while ($av = $stmt->fetch()) {
        echo '<a href="?donem=' . htmlspecialchars($donem) . '&avukat_ortak_id=' . $av['id'] . '">';
        echo '<strong>' . htmlspecialchars($av['ad_soyad']) . '</strong>';
        if (!empty($av['firma'])) echo ' — ' . htmlspecialchars($av['firma']);
        echo ' &nbsp;·&nbsp; ' . htmlspecialchars($donem);
        echo '</a>';
    }
    echo '</body></html>';
    exit;
}

$baslangic = $donem . '-01';
$bitis     = date('Y-m-t', strtotime($baslangic));
$ayNo      = (int)date('n', strtotime($baslangic));
$yil       = date('Y', strtotime($baslangic));
$AY = ['','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
$ayAdi = $AY[$ayNo];

// Firma adı
$firmaAdi = 'MR HASAR DANIŞMANLIK';
try {
    $r = $db->query("SELECT deger FROM ayarlar WHERE anahtar='firma_adi' LIMIT 1")->fetch();
    if ($r && !empty($r['deger'])) $firmaAdi = $r['deger'];
} catch (\Exception $e) {}

// Avukat
$stmt = $db->prepare("SELECT id, ad_soyad, firma FROM ortaklar WHERE id = ?");
$stmt->execute([$avukatId]);
$avukat = $stmt->fetch();
if (!$avukat) { http_response_code(404); echo 'Avukat bulunamadı'; exit; }

// BÖLÜM 1 — Bu ay açılan dosyalar (avukat=X)
$stmt = $db->prepare("SELECT d.id, d.dosya_no, d.dosya_turu, d.dosya_kaynagi, d.acilis_tarihi as tarih,
                            COALESCE(m.ad_soyad,'-') as musteri,
                            COALESCE((SELECT SUM(ms.tutar) FROM masraflar ms WHERE ms.dosya_id = d.id), 0) as masraf
                     FROM dosyalar d
                     LEFT JOIN magdurlar m ON m.dosya_id = d.id
                     WHERE d.ortak_id = ? AND d.acilis_tarihi BETWEEN ? AND ?
                       AND (d.silindi IS NULL OR d.silindi = 0)
                     ORDER BY d.acilis_tarihi, d.id");
$stmt->execute([$avukatId, $baslangic, $bitis]);
$dosyalarRaw = $stmt->fetchAll();

$dosyaJSON = [];
$KAYNAK_ETIKET = function($k) {
    if (mb_stripos($k, 'OFİS') !== false || mb_stripos($k, 'CRM') !== false) return 'OFİS CRM';
    if (mb_stripos($k, 'PAYDAŞ') !== false || mb_stripos($k, 'YÖNLENDİREN') !== false) return 'YÖNLENDİREN';
    if (empty($k)) return 'MR';
    return mb_strtoupper($k, 'UTF-8');
};
$DOSYA_TURU_ADI = function($t) {
    return $t === 'ADK' ? 'ARAÇ DEĞER KAYBI' : ($t === 'BH' ? 'BEDENİ HASAR' : ($t === 'MDK' ? 'MADDİ HASAR / KAZA' : strtoupper($t)));
};
foreach ($dosyalarRaw as $d) {
    $dosyaJSON[] = [
        'date'  => date('d.m.Y', strtotime($d['tarih'])),
        'name'  => $d['musteri'],
        'tip'   => $DOSYA_TURU_ADI($d['dosya_turu']),
        'kanal' => $KAYNAK_ETIKET($d['dosya_kaynagi']),
        'tutar' => (float)$d['masraf']
    ];
}

// BÖLÜM 3 — Kapanan dosyalar
$stmt = $db->prepare("SELECT k.* FROM dosya_kapanis_kayitlari k
                     WHERE k.avukat_ortak_id = ? AND k.kapatma_tarihi BETWEEN ? AND ?");
$stmt->execute([$avukatId, $baslangic, $bitis]);
$kapanislar = $stmt->fetchAll();
$pozAdet = 0; $pozToplam = 0; $mahsupAdet = 0; $mahsupToplam = 0;
foreach ($kapanislar as $k) {
    $onur = (float)$k['onur_payi'];
    if ($onur > 0) { $pozAdet++; $pozToplam += $onur; }
    $kes = (float)$k['mahsup_uygulanan'] + (float)$k['zarar_tutari'];
    if ($kes > 0) { $mahsupAdet++; $mahsupToplam += $kes; }
}

$hazirlayan = strtoupper($user['ad_soyad'] ?? 'SİSTEM');

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title><?= htmlspecialchars($firmaAdi) ?> — <?= $ayAdi ?> <?= $yil ?> AY SONU RAPORU</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  background: #ECEFF1;
  color: #2C3E50;
  padding: 20px;
}

/* ============ FORM PANEL ============ */
.form-panel {
  max-width: 880px;
  margin: 0 auto 24px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}
.form-header {
  background: #2C3E50;
  color: #FFF;
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.form-header h1 { font-size: 16px; font-weight: 700; }
.form-header .actions { display: flex; gap: 8px; }
.btn { background: #F39C12; color: #FFF; border: 0; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.4px; }
.btn:hover { background: #E67E22; }
.btn.print-btn { background: #27AE60; }
.btn.print-btn:hover { background: #229954; }
.btn.add-btn { background: #3498DB; padding: 6px 10px; font-size: 11px; margin: 6px 0; }
.btn.add-btn:hover { background: #2980B9; }
.btn.del-btn { background: #C0392B; padding: 4px 8px; font-size: 11px; }
.btn.del-btn:hover { background: #A33327; }

.form-body { padding: 20px 24px; }
.form-section { margin-bottom: 22px; }
.form-section h2 { font-size: 13px; color: #2C3E50; font-weight: 700; border-bottom: 2px solid #ECF0F1; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
label { font-size: 11px; color: #7F8C8D; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; display: block; margin-bottom: 3px; }
input[type="text"], input[type="number"] { width: 100%; padding: 7px 10px; border: 1px solid #BDC3C7; border-radius: 4px; font-size: 13px; font-family: inherit; }
input[type="text"]:focus, input[type="number"]:focus { outline: none; border-color: #3498DB; }

.dyn-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
.dyn-table th { background: #F5F7F8; padding: 6px 8px; text-align: left; font-weight: 600; color: #34495E; border-bottom: 1px solid #BDC3C7; font-size: 11px; text-transform: uppercase; }
.dyn-table td { padding: 4px 6px; border-bottom: 1px solid #ECEFF1; }
.dyn-table input { padding: 4px 6px; font-size: 12px; }
.muted { font-size: 11px; color: #95A5A6; font-style: italic; margin-top: 4px; }

/* ============ REPORT ============ */
.page { max-width: 880px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); text-transform: uppercase; }
.page .header { background: #2C3E50; color: #FFFFFF; padding: 36px 40px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.page .header h1 { font-size: 24px; font-weight: 700; line-height: 1.3; max-width: 60%; }
.page .header .month { text-align: right; color: #F39C12; font-weight: 800; font-size: 32px; line-height: 1; letter-spacing: 1px; }
.body { padding: 32px 40px; }
.info-box { background: #EAF4FB; border-left: 4px solid #3498DB; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px; }
.info-box h3 { color: #C0392B; font-size: 14px; margin-bottom: 8px; font-weight: 700; }
.info-box p { font-size: 13px; margin-bottom: 3px; color: #34495E; }
.info-box p strong { color: #2C3E50; }
.section-title { font-size: 17px; font-weight: 700; color: #2C3E50; border-bottom: 2px solid #ECF0F1; padding-bottom: 8px; margin-bottom: 16px; margin-top: 8px; }
.subsection-title { font-size: 13px; font-weight: 700; color: #34495E; margin: 18px 0 8px; letter-spacing: 0.3px; }
.rep-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 6px; }
.rep-table thead { background: #2C3E50; color: #FFFFFF; }
.rep-table thead th { padding: 9px 12px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.5px; }
.rep-table thead th.right { text-align: right; }
.rep-table tbody td { padding: 7px 12px; border-bottom: 1px solid #ECEFF1; color: #34495E; }
.rep-table tbody td.right { text-align: right; font-weight: 600; }
.rep-table tbody tr:nth-child(even) { background: #FAFBFC; }
.rep-table tbody tr.totals { background: #ECF0F1 !important; font-weight: 700; }
.rep-table tbody tr.totals td { color: #2C3E50; font-weight: 700; font-size: 13px; padding: 10px 12px; }
.rep-table tbody tr.totals .red { color: #C0392B; }
.rep-table tbody tr.totals .green { color: #27AE60; }
.rep-table tbody tr.totals .blue { color: #2980B9; }
.rep-table tbody tr.totals .orange { color: #E67E22; }
.rep-table.main-table tbody td { padding: 9px 12px; font-size: 12.5px; }
.red-text { color: #C0392B; font-weight: 600; }
.green-text { color: #27AE60; font-weight: 600; }
.blue-text { color: #2980B9; font-weight: 600; }
.result-box { border-radius: 10px; padding: 24px 22px; text-align: center; margin: 18px 0 8px; color: #FFFFFF; }
.result-box .label { font-size: 12px; letter-spacing: 0.5px; opacity: 0.9; }
.result-box .amount { font-size: 34px; font-weight: 800; margin: 8px 0 5px; letter-spacing: -0.5px; }
.result-box .note { font-size: 12px; opacity: 0.9; }
.result-red { background: #C0392B; }
.result-orange { background: #E67E22; }
.result-blue { background: #2980B9; }
.result-green { background: #27AE60; }
.result-final { background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%); padding: 32px 24px; }
.result-final .amount { font-size: 44px; }
.divider { border: 0; border-top: 1px dashed #BDC3C7; margin: 32px 0; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 18px; }
.card { border-radius: 8px; padding: 14px 12px; text-align: center; }
.card .lbl { font-size: 11px; color: #FFFFFF; opacity: 0.92; letter-spacing: 0.4px; font-weight: 600; }
.card .val { font-size: 20px; font-weight: 800; margin-top: 6px; color: #FFFFFF; }
.card.red    { background: #C0392B; }
.card.orange { background: #E67E22; }
.card.blue   { background: #2980B9; }
.card.green  { background: #27AE60; }
.final-table thead th { text-align: center; }
.final-table tbody td { text-align: center; padding: 12px; font-size: 13px; font-weight: 600; }
.final-table tbody tr.row-red    { background: #FDECEA !important; }
.final-table tbody tr.row-red    td { color: #C0392B; }
.final-table tbody tr.row-orange { background: #FDF1E5 !important; }
.final-table tbody tr.row-orange td { color: #E67E22; }
.final-table tbody tr.row-blue   { background: #E8F1FB !important; }
.final-table tbody tr.row-blue   td { color: #2980B9; }
.final-table tbody tr.row-green  { background: #E6F7EE !important; }
.final-table tbody tr.row-green  td { color: #27AE60; }
.final-table tbody tr.totals     { background: #2C3E50 !important; }
.final-table tbody tr.totals td  { color: #FFFFFF; font-size: 15px; font-weight: 800; padding: 14px; }
.footer { background: #2C3E50; color: #BDC3C7; padding: 16px 40px; text-align: center; font-size: 11px; }
.footer strong { color: #FFFFFF; }
.bilgi-banner { max-width:880px; margin: 0 auto 14px; background:#FEF6E0; border-left:4px solid #F39C12; padding:10px 16px; border-radius:6px; font-size:12px; color:#6E5223; }

@media print {
  body { background: #FFFFFF; padding: 0; }
  .form-panel, .bilgi-banner { display: none; }
  .page { box-shadow: none; border-radius: 0; max-width: 100%; }
}
</style>
</head>
<body>

<div class="bilgi-banner">
  📌 <strong>SİSTEMDEN ÇEKİLDİ:</strong> Avukat <strong><?= htmlspecialchars($avukat['ad_soyad']) ?></strong> · Dönem <strong><?= $ayAdi ?> <?= $yil ?></strong> · <?= count($dosyalarRaw) ?> dosya · <?= count($kapanislar) ?> kapanış
  &nbsp;|&nbsp; Aşağıdaki <strong>devir, ödemeler, ortak masraflar</strong> alanlarını manuel doldur — rapor canlı güncellenir. <strong>YAZDIR</strong> dediğinde sadece rapor çıkar.
</div>

<!-- ============ FORM ============ -->
<div class="form-panel">
  <div class="form-header">
    <h1>📋 RAPOR VERİ GİRİŞ FORMU</h1>
    <div class="actions">
      <button class="btn print-btn" onclick="window.print()">🖨️ YAZDIR / PDF</button>
    </div>
  </div>
  <div class="form-body">

    <!-- AY BİLGİSİ -->
    <div class="form-section">
      <h2>1. AY BİLGİSİ</h2>
      <div class="field-grid">
        <div><label>AY</label><input type="text" id="ay" value="<?= $ayAdi ?>" oninput="render()"></div>
        <div><label>YIL</label><input type="text" id="yil" value="<?= $yil ?>" oninput="render()"></div>
        <div><label>SIRA NO</label><input type="text" id="sira" value="<?= $ayNo ?>" oninput="render()"></div>
        <div><label>AVUKAT</label><input type="text" id="avukat" value="<?= htmlspecialchars($avukat['ad_soyad']) ?>" oninput="render()"></div>
      </div>
    </div>

    <!-- BÖLÜM 1 -->
    <div class="form-section">
      <h2>2. BÖLÜM 1 — DOSYA MASRAFI HESABI</h2>
      <div class="field-grid">
        <div>
          <label>ÖNCEKİ AYDAN DEVİR (₺)</label>
          <input type="number" id="devir" placeholder="0" oninput="render()">
        </div>
        <div>
          <label>AY İÇİ AVUKAT ÖDEMELERİ (₺)</label>
          <input type="number" id="ay_ici" placeholder="0" oninput="render()">
        </div>
      </div>

      <p class="muted">Dosyalar sistemden çekildi; gerekirse düzeltebilirsin.</p>
      <table class="dyn-table" id="dosyaTable">
        <thead>
          <tr>
            <th style="width:14%">TARİH</th>
            <th style="width:30%">MÜŞTERİ</th>
            <th style="width:18%">DOSYA TÜRÜ</th>
            <th style="width:18%">KAYNAK</th>
            <th style="width:14%" class="right">TUTAR</th>
            <th style="width:6%"></th>
          </tr>
        </thead>
        <tbody id="dosyaBody"></tbody>
      </table>
      <button class="btn add-btn" onclick="addDosya()">+ DOSYA EKLE</button>
    </div>

    <!-- BÖLÜM 2 -->
    <div class="form-section">
      <h2>3. BÖLÜM 2 — ORTAK MASRAFLAR</h2>
      <p class="muted">SBM ve Ekran masraflarının yarısı MR alacağı; ATK varsa tamamı MR alacağı.</p>
      <div class="field-grid">
        <div>
          <label>SBM SORGU (₺)</label>
          <input type="number" id="sbm" placeholder="0" oninput="render()">
        </div>
        <div>
          <label>EKRAN ÖDEME (₺)</label>
          <input type="number" id="ekran" placeholder="0" oninput="render()">
        </div>
        <div>
          <label>ATK MASRAFI (₺) — varsa</label>
          <input type="number" id="atk" placeholder="0" oninput="render()">
        </div>
      </div>
    </div>

    <!-- BÖLÜM 3 -->
    <div class="form-section">
      <h2>4. BÖLÜM 3 — KAPANAN DOSYALAR (sistemden geldi)</h2>
      <div class="field-grid">
        <div>
          <label>POZİTİF DOSYA ADEDİ</label>
          <input type="number" id="poz_adet" value="<?= $pozAdet ?>" oninput="render()">
        </div>
        <div>
          <label>POZİTİF TOPLAM (₺)</label>
          <input type="number" id="poz_toplam" value="<?= $pozToplam ?>" oninput="render()">
        </div>
        <div>
          <label>MAHSUP ADEDİ</label>
          <input type="number" id="mahsup_adet" value="<?= $mahsupAdet ?>" oninput="render()">
        </div>
        <div>
          <label>MAHSUP TOPLAM (₺)</label>
          <input type="number" id="mahsup_toplam" value="<?= $mahsupToplam ?>" oninput="render()">
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ============ RAPOR ÇIKTISI ============ -->
<div class="page" id="report"></div>

<script>
const FIRMA = <?= json_encode($firmaAdi) ?>;
const HAZIRLAYAN = <?= json_encode($hazirlayan) ?>;
const INITIAL_DOSYALAR = <?= json_encode($dosyaJSON, JSON_UNESCAPED_UNICODE) ?>;

const $ = id => document.getElementById(id);
const num = id => parseFloat($(id).value) || 0;
const fmt = n => {
  if (n === 0) return '₺0';
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  const isInt = Number.isInteger(abs);
  return sign + '₺' + abs.toLocaleString('tr-TR', {
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: 2
  });
};
const fmtPlain = n => {
  const isInt = Number.isInteger(Math.abs(n));
  return Math.abs(n).toLocaleString('tr-TR', {
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: 2
  });
};

function addDosya(date='', name='', tip='ARAÇ DEĞER KAYBI', kanal='YÖNLENDİREN', tutar='') {
  const tbody = $('dosyaBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${date}" placeholder="01.04.2026" oninput="render()"></td>
    <td><input type="text" value="${name}" placeholder="MÜŞTERİ ADI" oninput="render()"></td>
    <td><input type="text" value="${tip}" oninput="render()"></td>
    <td><input type="text" value="${kanal}" oninput="render()"></td>
    <td><input type="number" value="${tutar}" placeholder="0" oninput="render()" style="text-align:right"></td>
    <td><button class="btn del-btn" onclick="this.closest('tr').remove(); render()">SİL</button></td>
  `;
  tbody.appendChild(tr);
  render();
}

function getDosyalar() {
  return [...$('dosyaBody').querySelectorAll('tr')].map(tr => {
    const inputs = tr.querySelectorAll('input');
    return { date: inputs[0].value, name: inputs[1].value, tip: inputs[2].value, kanal: inputs[3].value, tutar: parseFloat(inputs[4].value) || 0 };
  });
}

function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function render() {
  const ay  = $('ay').value || '____';
  const yil = $('yil').value || '____';
  const sira = $('sira').value || '_';
  const avukat = $('avukat').value || 'AVUKAT';
  const devir = num('devir');
  const ay_ici = num('ay_ici');
  const sbm = num('sbm');
  const ekran = num('ekran');
  const atk = num('atk');
  const poz_adet = parseInt($('poz_adet').value) || 0;
  const poz_toplam = num('poz_toplam');
  const mahsup_adet = parseInt($('mahsup_adet').value) || 0;
  const mahsup_toplam = num('mahsup_toplam');

  const dosyalar = getDosyalar();
  const dosya_top = dosyalar.reduce((s,d) => s + d.tutar, 0);
  const adk_dosyalar = dosyalar.filter(d => d.tip.toUpperCase().includes('ADK') || d.tip.toUpperCase().includes('ARAÇ'));
  const bh_dosyalar  = dosyalar.filter(d => d.tip.toUpperCase().includes('BH')  || d.tip.toUpperCase().includes('BEDENİ'));
  const mdk_dosyalar = dosyalar.filter(d => d.tip.toUpperCase().includes('MDK') || d.tip.toUpperCase().includes('MADDİ'));
  const adk_top = adk_dosyalar.reduce((s,d) => s + d.tutar, 0);
  const bh_top  = bh_dosyalar.reduce((s,d) => s + d.tutar, 0);
  const mdk_top = mdk_dosyalar.reduce((s,d) => s + d.tutar, 0);

  const toplam_de_odeme = devir + ay_ici;
  const b1 = dosya_top - toplam_de_odeme;
  const ortak_top = sbm + ekran;
  const b2 = ortak_top / 2 + atk;
  const b3 = poz_toplam - mahsup_toplam;
  const final = b1 + b2 + b3;

  const b1_pos = b1 >= 0;
  const b3_pos = b3 >= 0;
  const f_pos = final >= 0;

  let html = `
    <div class="header">
      <h1>${escapeHtml(FIRMA)}<br>KAPSAMLI AY SONU RAPORU</h1>
      <div class="month">${escapeHtml(ay)}<br>${escapeHtml(yil)}</div>
    </div>
    <div class="body">

      <div class="info-box">
        <h3>📌 RAPOR AÇIKLAMASI</h3>
        <p>BU RAPOR, AV. ${escapeHtml(avukat)}'İN ${escapeHtml(ay)} ${escapeHtml(yil)} AY SONU İTİBARIYLA <strong>${escapeHtml(FIRMA)} İLE OLAN CARİ HESAP MUTABAKATINI</strong> ÇIKARMAK AMACIYLA HAZIRLANMIŞTIR. ÜÇ BÖLÜMDEN OLUŞUR; FİNAL BAKİYE, BÖLÜMLERİN ARİTMETİK TOPLAMINDAN OLUŞAN NET POZİSYONDUR.</p>
        <p><strong>1. BÖLÜM:</strong> AYLIK DOSYA MASRAFLARI VE ÖDEMELER — ${escapeHtml(avukat)} HESABI</p>
        <p><strong>2. BÖLÜM:</strong> ORTAK MASRAFLARDA ${escapeHtml(FIRMA)} ALACAĞI</p>
        <p><strong>3. BÖLÜM:</strong> KAPANAN DOSYALARDAN MR HAK EDİŞİ</p>
        <p><strong>FİNAL BAKİYE:</strong> ${escapeHtml(ay)} AYI NET POZİSYON — ${escapeHtml(FIRMA)}'IN NET ALACAK / BORÇ TUTARI</p>
      </div>

      <h2 class="section-title">📋 BÖLÜM 1: AV. ${escapeHtml(avukat)} – AYLIK HESAP</h2>
      <div class="subsection-title">DOSYA LİSTESİ (${dosyalar.length} DOSYA)</div>
      <table class="rep-table main-table">
        <thead><tr><th>TARİH</th><th>MÜŞTERİ</th><th>DOSYA TÜRÜ</th><th>KAYNAK</th><th class="right">MASRAF</th></tr></thead>
        <tbody>`;
  dosyalar.forEach(d => {
    html += `<tr><td>${escapeHtml(d.date)}</td><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.tip)}</td><td>${escapeHtml(d.kanal)}</td><td class="right">${fmt(d.tutar)}</td></tr>`;
  });
  if (dosyalar.length === 0) {
    html += `<tr><td colspan="5" style="text-align:center;color:#95A5A6;font-style:italic;padding:14px;">DOSYA YOK</td></tr>`;
  }
  html += `<tr class="totals"><td colspan="4">DOSYA MASRAFLARI TOPLAMI</td><td class="right red">${fmt(dosya_top)}</td></tr>
        </tbody>
      </table>

      <div class="subsection-title">DOSYA TÜRÜ DAĞILIMI</div>
      <table class="rep-table">
        <thead><tr><th>DOSYA TÜRÜ</th><th class="right">ADET</th><th class="right">TUTAR</th></tr></thead>
        <tbody>`;
  if (adk_dosyalar.length) html += `<tr><td>ARAÇ DEĞER KAYBI (ADK)</td><td class="right">${adk_dosyalar.length}</td><td class="right">${fmt(adk_top)}</td></tr>`;
  if (bh_dosyalar.length)  html += `<tr><td>BEDENİ HASAR (BH)</td><td class="right">${bh_dosyalar.length}</td><td class="right">${fmt(bh_top)}</td></tr>`;
  if (mdk_dosyalar.length) html += `<tr><td>MADDİ HASAR / KAZA (MDK)</td><td class="right">${mdk_dosyalar.length}</td><td class="right">${fmt(mdk_top)}</td></tr>`;
  html += `<tr class="totals"><td>TOPLAM</td><td class="right">${dosyalar.length}</td><td class="right">${fmt(dosya_top)}</td></tr>
        </tbody>
      </table>

      <div class="subsection-title">BÖLÜM 1 ÖZET</div>
      <table class="rep-table">
        <thead><tr><th>AÇIKLAMA</th><th class="right">TUTAR</th></tr></thead>
        <tbody>
          <tr><td>${Math.max(parseInt(sira)-1, 0)}. AY SONU DEVİR EDEN RAKAM</td><td class="right green-text">${fmt(devir)}</td></tr>
          <tr><td>${escapeHtml(ay)} AY İÇİ ${escapeHtml(avukat)} ÖDEMELERİ</td><td class="right green-text">${fmt(ay_ici)}</td></tr>
          <tr><td>${escapeHtml(ay)} ${escapeHtml(yil)} DOSYA MASRAFLARI TOPLAMI</td><td class="right red-text">${fmt(dosya_top)}</td></tr>
          <tr class="totals"><td>BÖLÜM 1 NET — ${b1_pos ? escapeHtml(avukat)+' BORCU' : escapeHtml(avukat)+' FAZLA ÖDEMESİ'}</td><td class="right ${b1_pos?'red':'orange'}">${fmt(b1)}</td></tr>
        </tbody>
      </table>

      <div class="result-box ${b1_pos?'result-red':'result-orange'}">
        <div class="label">BÖLÜM 1 — DOSYA MASRAFI HESABI</div>
        <div class="amount">${fmt(b1)}</div>
        <div class="note">${b1_pos ? `(${escapeHtml(avukat)}'DEN ${escapeHtml(FIRMA)}'A TAHSİL EDİLECEK)` : `(${escapeHtml(avukat)} FAZLA ÖDEMESİ — ${escapeHtml(FIRMA)}'IN BORCU)`}</div>
      </div>

      <hr class="divider">

      <h2 class="section-title">⚖️ BÖLÜM 2: ORTAK MASRAFLAR — ${escapeHtml(FIRMA)} ALACAĞI</h2>
      <p style="font-size:12px;color:#7F8C8D;margin-bottom:12px;">
        BU MASRAFLAR <strong>${escapeHtml(FIRMA)} TARAFINDAN ÖDENMİŞTİR</strong>. SBM SORGU VE EKRAN ÖDEME MASRAFLARININ <strong>YARISI</strong>${atk>0?', ATK MASRAFININ İSE <strong>TAMAMI</strong>':''} ${escapeHtml(FIRMA)}'IN ALACAĞI OLARAK RAPORA EKLENİR.
      </p>

      <table class="rep-table">
        <thead><tr><th>AÇIKLAMA</th><th class="right">TUTAR</th></tr></thead>
        <tbody>`;
  if (sbm > 0)  html += `<tr><td>SBM SORGU (PAYLAŞIMLI)</td><td class="right">${fmt(sbm)}</td></tr>`;
  if (ekran > 0) html += `<tr><td>EKRAN ÖDEME (PAYLAŞIMLI)</td><td class="right">${fmt(ekran)}</td></tr>`;
  if (atk > 0)  html += `<tr><td>ATK MASRAFI (TAMAMI MR MASRAFI)</td><td class="right">${fmt(atk)}</td></tr>`;
  if (sbm+ekran+atk === 0) html += `<tr><td colspan="2" style="text-align:center;color:#95A5A6;font-style:italic;padding:10px;">ORTAK MASRAF YOK</td></tr>`;
  html += `<tr class="totals"><td>${escapeHtml(FIRMA)}'IN ÖDEDİĞİ TOPLAM</td><td class="right">${fmt(sbm+ekran+atk)}</td></tr>
        </tbody>
      </table>

      <div class="subsection-title">${escapeHtml(FIRMA)} ALACAĞININ HESAPLANMASI</div>
      <table class="rep-table">
        <thead><tr><th>KALEM</th><th class="right">TUTAR</th><th class="right">MR ALACAĞI</th></tr></thead>
        <tbody>`;
  if (sbm > 0)  html += `<tr><td>SBM SORGU</td><td class="right">${fmt(sbm)}</td><td class="right blue-text">${fmt(sbm/2)} (½)</td></tr>`;
  if (ekran > 0) html += `<tr><td>EKRAN ÖDEME</td><td class="right">${fmt(ekran)}</td><td class="right blue-text">${fmt(ekran/2)} (½)</td></tr>`;
  if (atk > 0)  html += `<tr><td>ATK MASRAFI</td><td class="right">${fmt(atk)}</td><td class="right blue-text">${fmt(atk)}</td></tr>`;
  html += `<tr class="totals"><td>TOPLAM ${escapeHtml(FIRMA)} ALACAĞI</td><td class="right">${fmt(sbm+ekran+atk)}</td><td class="right blue">${fmt(b2)}</td></tr>
        </tbody>
      </table>

      <div class="result-box result-blue">
        <div class="label">BÖLÜM 2 — ORTAK MASRAF ALACAĞI</div>
        <div class="amount">+${fmtPlain(b2)} ₺</div>
        <div class="note">(${escapeHtml(avukat)}'DEN ${escapeHtml(FIRMA)}'A TAHSİL EDİLECEK)</div>
      </div>

      <hr class="divider">

      <h2 class="section-title">💼 BÖLÜM 3: ${escapeHtml(ay)} ${escapeHtml(yil)}'DA KAPANAN DOSYALAR NET KAZANCI</h2>
      <p style="font-size:12px;color:#7F8C8D;margin-bottom:12px;">
        ${escapeHtml(ay)} AYINDA KAPANAN DOSYALARDAN ${escapeHtml(FIRMA)}'IN HAK ETTİĞİ YÜZDELİK KAZANÇ TUTARIDIR.
      </p>

      <table class="rep-table">
        <thead><tr><th>AÇIKLAMA</th><th class="right">DOSYA</th><th class="right">TUTAR</th></tr></thead>
        <tbody>
          <tr><td>POZİTİF TOPLAM (KAZANÇLAR — MR HAK EDİŞİ)</td><td class="right">${poz_adet}</td><td class="right green-text">${fmt(poz_toplam)}</td></tr>
          <tr><td>MAHSUPLAR (EKSİLER — İADE / KESİNTİ / DÜZELTME)</td><td class="right">${mahsup_adet}</td><td class="right red-text">−${fmtPlain(mahsup_toplam)} ₺</td></tr>
          <tr class="totals"><td>BÖLÜM 3 — KAPANAN DOSYA HAK EDİŞİ</td><td class="right">${poz_adet+mahsup_adet}</td><td class="right ${b3_pos?'green':'red'}">${fmt(b3)}</td></tr>
        </tbody>
      </table>

      <div class="result-box ${b3_pos?'result-green':'result-red'}">
        <div class="label">BÖLÜM 3 — KAPANAN DOSYA HAK EDİŞİ</div>
        <div class="amount">${fmt(b3)}</div>
        <div class="note">${b3_pos ? `(${escapeHtml(avukat)}'DEN ${escapeHtml(FIRMA)}'A TAHSİL EDİLECEK)` : '(NEGATİF — MAHSUPLAR KAZANÇLARI AŞTI / FİNAL TOPLAMDAN DÜŞÜLECEK)'}</div>
      </div>

      <hr class="divider">

      <h2 class="section-title">🧮 FİNAL BAKİYE — ${escapeHtml(ay)} ${escapeHtml(yil)} CARİ HESAP KAPANIŞI</h2>

      <div class="cards">
        <div class="card ${b1_pos?'red':'orange'}">
          <div class="lbl">BÖLÜM 1 ${b1_pos?'ALACAĞI':'(FAZLA ÖDEME)'}</div>
          <div class="val">${fmt(b1)}</div>
        </div>
        <div class="card blue">
          <div class="lbl">BÖLÜM 2 ALACAĞI</div>
          <div class="val">+${fmtPlain(b2)} ₺</div>
        </div>
        <div class="card ${b3_pos?'green':'red'}">
          <div class="lbl">BÖLÜM 3 ${b3_pos?'ALACAĞI':'(NEGATİF)'}</div>
          <div class="val">${fmt(b3)}</div>
        </div>
      </div>

      <table class="rep-table final-table">
        <thead><tr><th>AÇIKLAMA</th><th>TUTAR</th></tr></thead>
        <tbody>
          <tr class="row-${b1_pos?'red':'orange'}"><td>BÖLÜM 1 — ${b1_pos?'DOSYA MASRAFI BAKİYESİ':escapeHtml(avukat)+' FAZLA ÖDEMESİ (MR BORCU)'}</td><td>${fmt(b1)}</td></tr>
          <tr class="row-blue"><td>BÖLÜM 2 — ORTAK MASRAF ALACAĞI</td><td>+${fmtPlain(b2)} ₺</td></tr>
          <tr class="row-${b3_pos?'green':'red'}"><td>BÖLÜM 3 — ${b3_pos?'KAPANAN DOSYA HAK EDİŞİ':'KAPANAN DOSYA NET ZARAR'}</td><td>${fmt(b3)}</td></tr>
          <tr class="totals"><td>FİNAL BAKİYE — ${f_pos?escapeHtml(FIRMA)+'\\'IN '+escapeHtml(avukat)+'\\'DEN ALACAĞI':escapeHtml(FIRMA)+'\\'IN '+escapeHtml(avukat)+'\\'E BORCU'}</td><td>${fmt(final)}</td></tr>
        </tbody>
      </table>

      <div class="result-box result-final">
        <div class="label">${escapeHtml(ay)} ${escapeHtml(yil)} FİNAL BAKİYE</div>
        <div class="amount">${fmt(final)}</div>
        <div class="note">${f_pos ? escapeHtml(FIRMA)+'\\'A KALAN NET ÖDEME TUTARI' : escapeHtml(FIRMA)+'\\'IN '+escapeHtml(avukat)+'\\'E NET BORCU (SONRAKİ AYA DEVREDİLECEK)'}</div>
      </div>

      <p style="font-size:11px;color:#7F8C8D;margin-top:16px;line-height:1.5;text-align:center;">
        BU RAPOR; AY SONU CARİ HESAP MUTABAKATI İÇİN HAZIRLANMIŞTIR. RAKAMLAR; DOSYA AÇILIŞ KAYITLARI, AVANS VE ARA DÖNEM ÖDEME DEKONTLARI, ORTAK MASRAF BELGELERİ VE KAPANAN DOSYA TAHSİLAT DEKONTLARI ÜZERİNDEN ÇAPRAZ DOĞRULAMA İLE ELDE EDİLMİŞTİR.
      </p>
    </div>
    <div class="footer">
      <strong>${escapeHtml(FIRMA)}</strong> &nbsp;·&nbsp; ${escapeHtml(ay)} ${escapeHtml(yil)} AY SONU RAPORU &nbsp;·&nbsp; HAZIRLAYAN: ${escapeHtml(HAZIRLAYAN)}
    </div>`;

  $('report').innerHTML = html;
}

// İlk yüklemede DB'den gelen dosyaları doldur
INITIAL_DOSYALAR.forEach(d => addDosya(d.date, d.name, d.tip, d.kanal, d.tutar));
if (INITIAL_DOSYALAR.length === 0) addDosya();
render();
</script>

</body>
</html>
