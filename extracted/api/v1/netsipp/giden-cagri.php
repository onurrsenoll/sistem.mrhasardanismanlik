<?php
/**
 * GET|POST /api/v1/netsipp/giden-cagri.php
 * NetSIPP "Tarayıcımda Link Aç" veya CRM'den giden arama webhook endpoint
 * Giden çağrı bilgisini loglar ve CRM eşleşmesi yapar
 *
 * Query params (GET): ?arayan=%arayan%&arayanadi=%arayanadi%&aramatarihi=%aramatarihi%&aramaid=%aramaid%&senaryo=%senaryo%&aranan=%aranan%
 * Body (POST): { arayan, aranan_adi, yon }
 */

require_once __DIR__ . '/../../config/helpers.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = getDB();

// GET VEYA POST'TAN VERİLERİ AL
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $arayan = clean($input['arayan'] ?? '');
    $arayanAdi = clean($input['arayan_adi'] ?? $input['arayanadi'] ?? '');
    $aranan = clean($input['aranan'] ?? '');
    $arananAdi = clean($input['aranan_adi'] ?? '');
    $aramaTarihi = clean($input['aramatarihi'] ?? date('Y-m-d H:i:s'));
    $aramaId = clean($input['aramaid'] ?? '');
    $senaryo = clean($input['senaryo'] ?? '');
} else {
    $arayan = clean($_GET['arayan'] ?? '');
    $arayanAdi = clean($_GET['arayanadi'] ?? '');
    $aranan = clean($_GET['aranan'] ?? '');
    $arananAdi = clean($_GET['arananadi'] ?? '');
    $aramaTarihi = clean($_GET['aramatarihi'] ?? date('Y-m-d H:i:s'));
    $aramaId = clean($_GET['aramaid'] ?? '');
    $senaryo = clean($_GET['senaryo'] ?? '');
}

if (empty($arayan) && empty($aranan)) {
    json_error('Arayan veya aranan numarası gerekli', 422);
}

// ARAMA LOGU KAYDET (tablo yoksa hata vermesin)
$logId = 0;
try {
    $stmt = $db->prepare('INSERT INTO arama_loglari (arayan, arayan_adi, aranan, arama_tarihi, netsipp_arama_id, senaryo, yon, durum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $arayan,
        $arayanAdi,
        $aranan,
        $aramaTarihi,
        $aramaId,
        $senaryo,
        'giden',
        'calıyor'
    ]);
    $logId = (int)$db->lastInsertId();
} catch (Exception $e) {
    // Tablo yoksa sessizce devam et
}

// CRM'DE ARANAN NUMARAYI ARA
$crmKayit = null;
$yonlendirmeKayit = null;
$searchNum = $aranan ?: $arayan;
try {
    $stmt = $db->prepare('SELECT id, ad_soyad, telefon, il, dosya_turu, durum FROM crm WHERE telefon LIKE ? OR telefon2 LIKE ? LIMIT 1');
    $cleanNum = '%' . preg_replace('/[^0-9]/', '', $searchNum) . '%';
    $stmt->execute([$cleanNum, $cleanNum]);
    $crmKayit = $stmt->fetch();
} catch (Exception $e) {}

// YÖNLENDİRME TABLOSUNDA DA ARA
try {
    $stmt = $db->prepare('SELECT id, magdur_ad_soyad, magdur_telefon, magdur_il FROM yonlendirme WHERE magdur_telefon LIKE ? LIMIT 1');
    $stmt->execute([$cleanNum]);
    $yonlendirmeKayit = $stmt->fetch();
} catch (Exception $e) {}

json_success([
    'log_id' => $logId,
    'arayan' => $arayan,
    'aranan' => $aranan,
    'arayan_adi' => $arayanAdi,
    'arama_id' => $aramaId,
    'yon' => 'giden',
    'crm_kayit' => $crmKayit ?: null,
    'yonlendirme_kayit' => $yonlendirmeKayit ?: null
]);
