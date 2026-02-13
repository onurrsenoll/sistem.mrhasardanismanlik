<?php
/**
 * GET /api/v1/netsipp/gelen-cagri.php
 * NetSIPP "Tarayıcımda Link Aç" webhook endpoint
 * NetSIPP bu URL'yi gelen çağrılarda açar
 *
 * Query params: ?arayan=%arayan%&arayanadi=%arayanadi%&aramatarihi=%aramatarihi%&aramaid=%aramaid%&senaryo=%senaryo%
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

$db = getDB();

$arayan = clean($_GET['arayan'] ?? '');
$arayanAdi = clean($_GET['arayanadi'] ?? '');
$aramaTarihi = clean($_GET['aramatarihi'] ?? date('Y-m-d H:i:s'));
$aramaId = clean($_GET['aramaid'] ?? '');
$senaryo = clean($_GET['senaryo'] ?? '');
$aranan = clean($_GET['aranan'] ?? '');

if (empty($arayan)) {
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

json_success([
    'log_id' => $logId,
    'arayan' => $arayan,
    'arayan_adi' => $arayanAdi ?: ($crmKayit ? $crmKayit['ad_soyad'] : ($yonlendirmeKayit ? $yonlendirmeKayit['magdur_ad_soyad'] : '')),
    'arama_id' => $aramaId,
    'crm_kayit' => $crmKayit ?: null,
    'yonlendirme_kayit' => $yonlendirmeKayit ?: null
]);
