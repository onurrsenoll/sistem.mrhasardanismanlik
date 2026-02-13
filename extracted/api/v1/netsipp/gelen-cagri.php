<?php
/**
 * GET /api/v1/netsipp/gelen-cagri.php
 * NetSIPP "Tarayıcımda Link Aç" webhook endpoint
 * NetSIPP bu URL'yi gelen çağrılarda açar
 *
 * BROWSER erişiminde: localStorage'a yazar ve pencereyi kapatır
 * API/FETCH erişiminde: JSON döner
 *
 * Query params: ?arayan=%arayan%&arayanadi=%arayanadi%&aramatarihi=%aramatarihi%&aramaid=%aramaid%&senaryo=%senaryo%
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS headers
header('Access-Control-Allow-Origin: *');

$db = getDB();

$arayan = clean($_GET['arayan'] ?? '');
$arayanAdi = clean($_GET['arayanadi'] ?? '');
$aramaTarihi = clean($_GET['aramatarihi'] ?? date('Y-m-d H:i:s'));
$aramaId = clean($_GET['aramaid'] ?? '');
$senaryo = clean($_GET['senaryo'] ?? '');
$aranan = clean($_GET['aranan'] ?? '');

if (empty($arayan)) {
    // Browser erişiminde bile hata yerine boş sayfa göster
    $isBrowser = !isset($_SERVER['HTTP_AUTHORIZATION']) &&
                 !isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
                 (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'text/html') !== false || empty($_SERVER['HTTP_ACCEPT']));
    if ($isBrowser) {
        header('Content-Type: text/html; charset=UTF-8');
        echo '<!DOCTYPE html><html><head><title>NETSIPP</title></head><body style="background:#0B1120;color:#f1f5f9;font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="text-align:center"><p>ARAYAN NUMARASI GEREKLİ</p></div></body></html>';
        exit;
    }
    header('Content-Type: application/json; charset=UTF-8');
    json_error('Arayan numarası gerekli', 422);
}

// Arama logu kaydet
$stmt = $db->prepare('INSERT INTO arama_loglari (arayan, arayan_adi, aranan, arama_tarihi, netsipp_arama_id, senaryo, yon, durum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $arayan,
    $arayanAdi,
    $aranan,
    $aramaTarihi,
    $aramaId,
    $senaryo,
    'gelen',
    'calıyor'
]);

$logId = (int)$db->lastInsertId();

// CRM'de bu numarayı ara
$stmt = $db->prepare('SELECT id, ad_soyad, telefon, il, dosya_turu, durum FROM crm WHERE telefon LIKE ? OR telefon2 LIKE ? LIMIT 1');
$cleanNum = '%' . preg_replace('/[^0-9]/', '', $arayan) . '%';
$stmt->execute([$cleanNum, $cleanNum]);
$crmKayit = $stmt->fetch();

// Yönlendirme tablosunda da ara
$stmt = $db->prepare('SELECT id, magdur_ad_soyad, magdur_telefon, magdur_il FROM yonlendirme WHERE magdur_telefon LIKE ? LIMIT 1');
$stmt->execute([$cleanNum]);
$yonlendirmeKayit = $stmt->fetch();

// Arayan adını belirle
$arayanAdiSonuc = $arayanAdi ?: ($crmKayit ? $crmKayit['ad_soyad'] : ($yonlendirmeKayit ? $yonlendirmeKayit['magdur_ad_soyad'] : ''));

// BROWSER ERİŞİMİ KONTROLÜ
// NetSIPP tarayıcıda bu URL'yi açtığında: localStorage'a yaz + otomatik kapat
$isBrowser = !isset($_SERVER['HTTP_AUTHORIZATION']) &&
             !isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
             (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'text/html') !== false || empty($_SERVER['HTTP_ACCEPT']));

if ($isBrowser) {
    header('Content-Type: text/html; charset=UTF-8');
    // JSON-safe escape
    $jsArayan = addslashes($arayan);
    $jsArayanAdi = addslashes($arayanAdiSonuc);
    $jsAranan = addslashes($aranan);
    $jsAramaTarihi = addslashes($aramaTarihi);
    $jsAramaId = addslashes($aramaId);
    $jsSenaryo = addslashes($senaryo);
    $crmInfo = $crmKayit ? addslashes($crmKayit['ad_soyad'] . ' (CRM KAYITLI)') : '';

    echo '<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>GELEN ÇAĞRI - ' . htmlspecialchars($arayan) . '</title>
<style>
body { font-family: Arial, sans-serif; background: #0B1120; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
.card { background: #111827; border: 1px solid #10b981; border-radius: 16px; padding: 32px; max-width: 400px; width: 100%; text-align: center; }
.icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(16,185,129,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; animation: ring 1.5s infinite; }
.icon svg { width: 32px; height: 32px; fill: none; stroke: #10b981; stroke-width: 2; }
h2 { margin: 0 0 8px; font-size: 18px; color: #10b981; }
.num { font-size: 28px; font-weight: 800; letter-spacing: 2px; margin: 12px 0; color: #10b981; }
.name { font-size: 14px; color: #94a3b8; margin-bottom: 16px; }
.info { font-size: 12px; color: #64748b; margin-top: 16px; }
.closing { font-size: 11px; color: #f59e0b; margin-top: 12px; animation: blink 1s infinite; }
@keyframes ring { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 50%{box-shadow:0 0 0 16px rgba(16,185,129,0)} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.5} }
</style>
</head>
<body>
<div class="card">
  <div class="icon">
    <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  </div>
  <h2>GELEN ÇAĞRI</h2>
  <div class="num" id="numara">' . htmlspecialchars($arayan) . '</div>
  <div class="name" id="isim">' . htmlspecialchars($arayanAdiSonuc ?: '') . '</div>
  <div class="info">ÇAĞRI ANA UYGULAMAYA YÖNLENDİRİLDİ</div>
  <div class="closing">BU PENCERE OTOMATİK KAPANACAK...</div>
</div>
<script>
try {
  var callData = {
    arayan: "' . $jsArayan . '",
    arayanAdi: "' . $jsArayanAdi . '",
    aranan: "' . $jsAranan . '",
    aramaTarihi: "' . $jsAramaTarihi . '",
    aramaId: "' . $jsAramaId . '",
    senaryo: "' . $jsSenaryo . '",
    yon: "gelen",
    timestamp: Date.now()
  };
  localStorage.setItem("mr_netsipp_gelen", JSON.stringify(callData));
} catch(e) {
  console.error("LocalStorage yazma hatası:", e);
}
// Pencereyi otomatik kapat (2 saniye sonra)
setTimeout(function() {
  try { window.close(); } catch(e) {}
  // window.close() çalışmazsa bilgi göster
  setTimeout(function() {
    var info = document.querySelector(".closing");
    if (info) info.textContent = "BU SEKMEYİ KAPATABİLİRSİNİZ";
  }, 500);
}, 2000);
</script>
</body>
</html>';
    exit;
}

// API/FETCH ERİŞİMİ - JSON YANIT
header('Content-Type: application/json; charset=UTF-8');
json_success([
    'log_id' => $logId,
    'arayan' => $arayan,
    'arayan_adi' => $arayanAdiSonuc,
    'arama_id' => $aramaId,
    'crm_kayit' => $crmKayit ?: null,
    'yonlendirme_kayit' => $yonlendirmeKayit ?: null
]);
