<?php
/**
 * POST /api/v1/arama-log/create.php
 * Yeni arama kaydı oluşturur
 * Body: numara|arayan, yon, durum, aranan, arayan_adi, sure, notlar, crm_id
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('POST');

$user = auth_required();
$db = getDB();

// Tablo migration
ensure_arama_loglari_table();

$data = get_json_body();
$cols = get_table_columns();

// Numara zorunlu
$numara = trim($data['numara'] ?? $data['arayan'] ?? '');
if ($numara === '') {
    json_error('Numara alanı zorunludur', 422);
}

$yon = $data['yon'] ?? 'giden';
$durum = $data['durum'] ?? 'cevapsiz';
$aranan = $data['aranan'] ?? null;
$arayan_adi = $data['arayan_adi'] ?? $data['musteri_adi'] ?? null;
$sure = (int)($data['sure'] ?? $data['sure_saniye'] ?? 0);
$notlar = $data['notlar'] ?? null;
$crm_id = $data['crm_id'] ?? $data['musteri_kaynak_id'] ?? null;
$now = date('Y-m-d H:i:s');

// INSERT - mevcut kolonlara göre
$insertCols = ['kullanici_id', 'yon', 'durum'];
$insertVals = [$user['id'], $yon, $durum];
$placeholders = ['?', '?', '?'];

// Numara kolonları
if (in_array('arayan', $cols)) {
    $insertCols[] = 'arayan'; $insertVals[] = $numara; $placeholders[] = '?';
}
if (in_array('numara', $cols)) {
    $insertCols[] = 'numara'; $insertVals[] = $numara; $placeholders[] = '?';
}

// Aranan
if (in_array('aranan', $cols) && $aranan) {
    $insertCols[] = 'aranan'; $insertVals[] = $aranan; $placeholders[] = '?';
}

// İsim
if (in_array('arayan_adi', $cols) && $arayan_adi) {
    $insertCols[] = 'arayan_adi'; $insertVals[] = $arayan_adi; $placeholders[] = '?';
}
if (in_array('musteri_adi', $cols) && $arayan_adi) {
    $insertCols[] = 'musteri_adi'; $insertVals[] = $arayan_adi; $placeholders[] = '?';
}

// Tarih
if (in_array('arama_tarihi', $cols)) {
    $insertCols[] = 'arama_tarihi'; $insertVals[] = $now; $placeholders[] = '?';
}
if (in_array('baslangic_zamani', $cols)) {
    $insertCols[] = 'baslangic_zamani'; $insertVals[] = $data['baslangic_zamani'] ?? $now; $placeholders[] = '?';
}

// Süre
if (in_array('sure', $cols)) {
    $insertCols[] = 'sure'; $insertVals[] = $sure; $placeholders[] = '?';
}
if (in_array('sure_saniye', $cols)) {
    $insertCols[] = 'sure_saniye'; $insertVals[] = $sure; $placeholders[] = '?';
}

// CRM bağlantı
if (in_array('crm_id', $cols) && $crm_id) {
    $insertCols[] = 'crm_id'; $insertVals[] = (int)$crm_id; $placeholders[] = '?';
}
if (in_array('musteri_kaynak_id', $cols) && $crm_id) {
    $insertCols[] = 'musteri_kaynak_id'; $insertVals[] = (int)$crm_id; $placeholders[] = '?';
    if (in_array('musteri_kaynak', $cols)) {
        $insertCols[] = 'musteri_kaynak'; $insertVals[] = 'CRM'; $placeholders[] = '?';
    }
}

// Notlar
if (in_array('notlar', $cols) && $notlar) {
    $insertCols[] = 'notlar'; $insertVals[] = $notlar; $placeholders[] = '?';
}

try {
    $sql = "INSERT INTO arama_loglari (" . implode(',', $insertCols) . ") VALUES (" . implode(',', $placeholders) . ")";
    $stmt = $db->prepare($sql);
    $stmt->execute($insertVals);
    $id = $db->lastInsertId();

    json_success(['id' => (int)$id], 'Arama kaydı oluşturuldu', 201);
} catch (Exception $e) {
    json_error('Kayıt oluşturulamadı: ' . $e->getMessage(), 500);
}
