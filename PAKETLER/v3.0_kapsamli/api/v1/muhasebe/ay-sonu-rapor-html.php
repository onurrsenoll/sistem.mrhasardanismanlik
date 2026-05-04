<?php
/**
 * GET /api/v1/muhasebe/ay-sonu-rapor-html.php?donem=YYYY-MM
 *
 * v3.0 — Yazdırılabilir Aylık Mutabakat Raporu
 * dosya_kapanis_kayitlari'ndan HTML üretir.
 * Tarayıcıdan yazdır (Ctrl+P → PDF olarak kaydet) ile PDF alınır.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

$user = auth_required(['admin', 'uzman']);
$db = getDB();

$donem = clean($_GET['donem'] ?? date('Y-m'));
if (!preg_match('/^\d{4}-\d{2}$/', $donem)) {
    http_response_code(422);
    echo 'Geçersiz dönem formatı (YYYY-MM bekleniyor)';
    exit;
}

$baslangic = $donem . '-01';
$bitis = date('Y-m-t', strtotime($baslangic));
$donemAdi = date('F Y', strtotime($baslangic));
$tr_aylar = ['January'=>'OCAK','February'=>'ŞUBAT','March'=>'MART','April'=>'NİSAN','May'=>'MAYIS','June'=>'HAZİRAN','July'=>'TEMMUZ','August'=>'AĞUSTOS','September'=>'EYLÜL','October'=>'EKİM','November'=>'KASIM','December'=>'ARALIK'];
$donemAdiTR = strtr($donemAdi, $tr_aylar);

// Firma adı
$firmaAdi = 'MR HASAR DANIŞMANLIK';
try {
    $stmt = $db->query("SELECT deger FROM ayarlar WHERE anahtar='firma_adi' LIMIT 1");
    $r = $stmt->fetch();
    if ($r && !empty($r['deger'])) $firmaAdi = $r['deger'];
} catch (\Exception $e) {}

// Kayıtlar
$stmt = $db->prepare("SELECT k.*, d.dosya_no, d.dosya_turu, d.sigorta_sirket,
                             m.ad_soyad as magdur_adi,
                             o.ad_soyad as avukat_adi, o.firma as avukat_firma,
                             p.ad as yonlendiren_paydas_adi
                      FROM dosya_kapanis_kayitlari k
                      INNER JOIN dosyalar d ON d.id = k.dosya_id
                      LEFT JOIN magdurlar m ON m.dosya_id = k.dosya_id
                      LEFT JOIN ortaklar o ON o.id = k.avukat_ortak_id
                      LEFT JOIN paydaslar p ON p.id = k.yonlendiren_paydas_id
                      WHERE k.kapatma_tarihi BETWEEN ? AND ?
                      ORDER BY k.kapatma_tarihi");
$stmt->execute([$baslangic, $bitis]);
$kayitlar = $stmt->fetchAll();

// Toplamlar + paydaş + avukat
$T = ['sigorta'=>0,'havale'=>0,'yonlendiren'=>0,'noter'=>0,'masraf'=>0,'toplam'=>0,'net'=>0,'onur'=>0,'avukat'=>0,'mahsup'=>0,'zarar'=>0];
$paydasOzet = []; $avukatOzet = []; $uyumsuz = [];
foreach ($kayitlar as $k) {
    $T['sigorta'] += (float)$k['sigorta_tahsilat'];
    $T['havale']  += (float)$k['muvekkile_havale'];
    $T['yonlendiren'] += (float)$k['yonlendiren_ucreti'];
    $T['noter']   += (float)$k['noter_masrafi'];
    $T['masraf']  += (float)$k['dosya_masraflari'];
    $T['toplam']  += (float)$k['toplam_kazanc'];
    $T['net']     += (float)$k['net_toplam_kazanc'];
    $T['onur']    += (float)$k['onur_payi'];
    $T['avukat']  += (float)$k['avukat_payi'];
    $T['mahsup']  += (float)$k['mahsup_uygulanan'];
    $T['zarar']   += (float)$k['zarar_tutari'];

    // Madde 5.4 uyum kontrolü
    if ((float)$k['yonlendiren_ucreti'] > 0) {
        $hesap = (float)$k['sigorta_tahsilat'] - (float)$k['muvekkile_havale']
               - (float)$k['yonlendiren_ucreti'] - (float)$k['noter_masrafi']
               - (float)$k['azil_masrafi'] - (float)$k['diger_giderler'];
        if (abs($hesap - (float)$k['toplam_kazanc']) > 1.0) {
            $uyumsuz[$k['dosya_no']] = true;
        }
    }

    if (!empty($k['yonlendiren_paydas_id'])) {
        $pid = $k['yonlendiren_paydas_id'];
        if (!isset($paydasOzet[$pid])) $paydasOzet[$pid] = ['ad'=>$k['yonlendiren_paydas_adi']?:'-','sayi'=>0,'tutar'=>0];
        $paydasOzet[$pid]['sayi']++;
        $paydasOzet[$pid]['tutar'] += (float)$k['yonlendiren_ucreti'];
    }
    if (!empty($k['avukat_ortak_id'])) {
        $aid = $k['avukat_ortak_id'];
        if (!isset($avukatOzet[$aid])) $avukatOzet[$aid] = ['ad'=>$k['avukat_adi']?:'-','firma'=>$k['avukat_firma']?:'','sayi'=>0,'tutar'=>0];
        $avukatOzet[$aid]['sayi']++;
        $avukatOzet[$aid]['tutar'] += (float)$k['avukat_payi'];
    }
}

$fmt = function($v) { return '₺' . number_format((float)$v, 2, ',', '.'); };

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Aylık Mutabakat Raporu — <?=htmlspecialchars($donemAdiTR)?></title>
<style>
@page { size: A4 landscape; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; font-size: 11px; margin: 0; padding: 14px; background:#fff; }
.head { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom: 3px solid #2563eb; margin-bottom: 16px; }
.head h1 { margin:0; color:#1e40af; font-size: 20px; letter-spacing:.5px; }
.head .firma { font-size: 13px; font-weight: 700; color:#374151; }
.head .donem { font-size: 14px; font-weight: 800; color:#dc2626; }
.head .kvgu { font-size: 9px; color:#6b7280; }
table { width:100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10px; }
th { background: #1e40af; color:#fff; padding: 6px 5px; text-align:left; font-size: 10px; font-weight: 700; }
td { padding: 5px; border-bottom: 1px solid #e5e7eb; }
tr:nth-child(even) td { background: #f9fafb; }
.right { text-align: right; font-family: monospace; }
.bold { font-weight: 800; }
.success { color: #059669; }
.danger  { color: #dc2626; }
.warning { color: #d97706; }
.muted { color: #6b7280; }
.totals-row td { font-weight: 800; background: #fef3c7 !important; padding: 8px 5px; border-top: 2px solid #f59e0b; }
.section-title { font-size: 14px; font-weight: 800; color: #1e40af; margin: 18px 0 8px; padding-left: 6px; border-left: 4px solid #2563eb; }
.uyumsuz { background: #fee2e2 !important; }
.summary-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom: 16px; }
.summary-card { padding: 10px 12px; border-radius:8px; border:1px solid #e5e7eb; }
.summary-card .lbl { font-size:9px; color:#6b7280; text-transform:uppercase; }
.summary-card .val { font-size:16px; font-weight:800; font-family: monospace; margin-top:2px; }
.print-btn { position: fixed; right:14px; top:14px; padding:10px 18px; background:#2563eb; color:#fff; border:0; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer; z-index:99; }
@media print { .print-btn { display:none; } body { padding: 0; } }
.legend { font-size:9px; color:#6b7280; margin-top:4px; }
.bg-uyumsuz { background:#fee2e2; padding:1px 4px; border-radius:3px; }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">📄 PDF OLARAK YAZDIR</button>

<div class="head">
    <div>
        <h1>AYLIK MUTABAKAT RAPORU</h1>
        <div class="firma"><?=htmlspecialchars($firmaAdi)?></div>
        <div class="kvgu">Madde 5.4 entegre — kapanış kayıtlarından üretilmiştir</div>
    </div>
    <div style="text-align:right">
        <div class="donem"><?=htmlspecialchars($donemAdiTR)?></div>
        <div style="font-size:10px;color:#6b7280">
            <?= date('d.m.Y', strtotime($baslangic)) ?> — <?= date('d.m.Y', strtotime($bitis)) ?>
        </div>
        <div style="font-size:9px;color:#9ca3af;margin-top:2px">Üretim: <?= date('d.m.Y H:i') ?></div>
    </div>
</div>

<!-- ÖZET KARTLAR -->
<div class="summary-grid">
    <div class="summary-card" style="border-color:#2563eb">
        <div class="lbl">Dosya Sayısı</div>
        <div class="val"><?= count($kayitlar) ?></div>
    </div>
    <div class="summary-card" style="border-color:#059669">
        <div class="lbl">Toplam Sigorta Tahsilatı</div>
        <div class="val success"><?= $fmt($T['sigorta']) ?></div>
    </div>
    <div class="summary-card" style="border-color:#1e40af">
        <div class="lbl">Onur Payı (NET)</div>
        <div class="val" style="color:#1e40af"><?= $fmt($T['onur']) ?></div>
    </div>
    <div class="summary-card" style="border-color:#7c3aed">
        <div class="lbl">Avukat Payı</div>
        <div class="val" style="color:#7c3aed"><?= $fmt($T['avukat']) ?></div>
    </div>
</div>

<!-- DOSYA TABLOSU -->
<div class="section-title">DOSYA KAPANIŞ DETAY</div>
<?php if (empty($kayitlar)): ?>
    <div style="padding:30px;text-align:center;color:#6b7280;background:#f9fafb;border-radius:8px">
        Bu dönemde kapanış kaydı yok.
    </div>
<?php else: ?>
<table>
    <thead>
        <tr>
            <th>Tarih</th>
            <th>Dosya No</th>
            <th>Tür</th>
            <th>Müşteri</th>
            <th>Sigorta</th>
            <th class="right">Tahsilat</th>
            <th class="right">Yönlendiren</th>
            <th class="right">Noter</th>
            <th class="right">Toplam Kaz.</th>
            <th class="right">Net Kaz.</th>
            <th class="right">Onur</th>
            <th class="right">Avukat</th>
            <th class="right">Mahsup</th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($kayitlar as $k): $isUyumsuz = !empty($uyumsuz[$k['dosya_no']]); ?>
        <tr<?= $isUyumsuz ? ' class="uyumsuz"' : '' ?>>
            <td><?= date('d.m.y', strtotime($k['kapatma_tarihi'])) ?></td>
            <td class="bold"><?= htmlspecialchars($k['dosya_no']) ?><?= $isUyumsuz ? ' ⚠' : '' ?></td>
            <td><?= htmlspecialchars($k['dosya_turu']) ?></td>
            <td><?= htmlspecialchars(mb_substr($k['magdur_adi']??'-', 0, 22)) ?></td>
            <td><?= htmlspecialchars(mb_substr($k['sigorta_sirket']??'-', 0, 14)) ?></td>
            <td class="right"><?= $fmt($k['sigorta_tahsilat']) ?></td>
            <td class="right warning"><?= $fmt($k['yonlendiren_ucreti']) ?></td>
            <td class="right"><?= $fmt($k['noter_masrafi']) ?></td>
            <td class="right"><?= $fmt($k['toplam_kazanc']) ?></td>
            <td class="right bold"><?= $fmt($k['net_toplam_kazanc']) ?></td>
            <td class="right success bold"><?= $fmt($k['onur_payi']) ?></td>
            <td class="right" style="color:#7c3aed"><?= $fmt($k['avukat_payi']) ?></td>
            <td class="right warning"><?= $fmt($k['mahsup_uygulanan']) ?></td>
        </tr>
    <?php endforeach; ?>
        <tr class="totals-row">
            <td colspan="5">TOPLAM (<?= count($kayitlar) ?> dosya)</td>
            <td class="right"><?= $fmt($T['sigorta']) ?></td>
            <td class="right"><?= $fmt($T['yonlendiren']) ?></td>
            <td class="right"><?= $fmt($T['noter']) ?></td>
            <td class="right"><?= $fmt($T['toplam']) ?></td>
            <td class="right"><?= $fmt($T['net']) ?></td>
            <td class="right success"><?= $fmt($T['onur']) ?></td>
            <td class="right" style="color:#7c3aed"><?= $fmt($T['avukat']) ?></td>
            <td class="right warning"><?= $fmt($T['mahsup']) ?></td>
        </tr>
    </tbody>
</table>
<?php if (!empty($uyumsuz)): ?>
<div class="legend">
    <span class="bg-uyumsuz">⚠ Uyumsuz</span> = Madde 5.4 doğrulaması: yönlendiren ücreti kazançtan düşülmemiş gibi görünüyor — incelenmesi önerilir.
</div>
<?php endif; ?>
<?php endif; ?>

<!-- PAYDAŞ ÖZETİ -->
<?php if (!empty($paydasOzet)): ?>
<div class="section-title">YÖNLENDİREN PAYDAŞ ÖZETİ</div>
<table>
    <thead><tr><th>Paydaş</th><th class="right">Dosya Sayısı</th><th class="right">Toplam Yön. Ücreti</th></tr></thead>
    <tbody>
    <?php foreach ($paydasOzet as $p): ?>
        <tr>
            <td class="bold"><?= htmlspecialchars($p['ad']) ?></td>
            <td class="right"><?= $p['sayi'] ?></td>
            <td class="right warning"><?= $fmt($p['tutar']) ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php endif; ?>

<!-- AVUKAT ÖZETİ -->
<?php if (!empty($avukatOzet)): ?>
<div class="section-title">AVUKAT (İŞ ORTAĞI) ÖZETİ</div>
<table>
    <thead><tr><th>Avukat</th><th>Firma</th><th class="right">Dosya Sayısı</th><th class="right">Toplam Avukat Payı</th></tr></thead>
    <tbody>
    <?php foreach ($avukatOzet as $a): ?>
        <tr>
            <td class="bold"><?= htmlspecialchars($a['ad']) ?></td>
            <td class="muted"><?= htmlspecialchars($a['firma']) ?></td>
            <td class="right"><?= $a['sayi'] ?></td>
            <td class="right" style="color:#7c3aed"><?= $fmt($a['tutar']) ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php endif; ?>

<!-- DİPNOTLAR -->
<div style="margin-top:20px;padding:10px;background:#f9fafb;border-left:4px solid #6b7280;font-size:9px;color:#6b7280">
    <strong>Madde 5.4:</strong> Yönlendiren ücreti, paydaş/yönlendiren kuruma dosya başına ödenen ücrettir. Ücret kazançtan düşüldükten sonra %50 - %50 paylaşıma gidilir. Mahsup uygulanan tutar onur payından düşülür.
</div>

</body>
</html>
