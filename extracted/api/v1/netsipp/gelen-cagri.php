<?php
/**
 * GET/POST /api/v1/netsipp/gelen-cagri.php
 * Netsipp+ masaüstü uygulamasından gelen çağrı bildirimi
 *
 * Netsipp+ parametreleri:
 *   %caller% → arayan
 *   %called% → aranan
 *   %callid% → aramaid
 *
 * URL: https://sistem.mrhasardanismanlik.com/api/v1/netsipp/gelen-cagri.php?arayan=%caller%&aranan=%called%&aramaid=%callid%
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

// OPTIONS isteği
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = getDB();

// NetSantral ayarlarını kontrol et
$stmt = $db->query('SELECT * FROM netsantral_ayarlar WHERE aktif = 1 AND netsipp_aktif = 1 ORDER BY id DESC LIMIT 1');
$ayar = $stmt->fetch();

if (!$ayar) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Netsipp entegrasyonu deaktif']);
    exit;
}

// Parametreleri hem GET hem POST'tan al
$arayan = clean($_REQUEST['arayan'] ?? $_REQUEST['caller'] ?? '');
$aranan = clean($_REQUEST['aranan'] ?? $_REQUEST['called'] ?? '');
$arama_id = clean($_REQUEST['aramaid'] ?? $_REQUEST['callid'] ?? '');

if ($arayan === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Arayan numara gerekli']);
    exit;
}

if ($arama_id === '') {
    $arama_id = 'netsipp_' . uniqid();
}

// Mevcut kayıt var mı kontrol et
$stmt = $db->prepare('SELECT id FROM arama_kayitlari WHERE arama_id = ?');
$stmt->execute([$arama_id]);
$mevcut = $stmt->fetch();

if ($mevcut) {
    // Zaten kayıt var, güncelle
    echo json_encode(['success' => true, 'message' => 'Kayıt zaten mevcut', 'id' => $mevcut['id']]);
    exit;
}

// Arayan numara ile CRM eşleştir
$crm_id = null;
$crm_bilgi = null;
$tel = preg_replace('/[^0-9]/', '', $arayan);
if (strlen($tel) >= 10) {
    $tel10 = substr($tel, -10);
    $stmt = $db->prepare("SELECT id, ad_soyad, telefon, durum, kaynak FROM crm WHERE REPLACE(REPLACE(REPLACE(telefon, ' ', ''), '-', ''), '+', '') LIKE ? OR REPLACE(REPLACE(REPLACE(telefon2, ' ', ''), '-', ''), '+', '') LIKE ? ORDER BY id DESC LIMIT 1");
    $stmt->execute(["%$tel10", "%$tel10"]);
    $crmKayit = $stmt->fetch();
    if ($crmKayit) {
        $crm_id = $crmKayit['id'];
        $crm_bilgi = $crmKayit;
    }
}

// Arayan numara ile dosya eşleştir (mağdur telefonu)
$dosya_id = null;
$dosya_bilgi = null;
if (strlen($tel) >= 10) {
    $tel10 = substr($tel, -10);
    $stmt = $db->prepare("SELECT m.dosya_id, d.dosya_no, m.ad_soyad FROM magdurlar m JOIN dosyalar d ON d.id = m.dosya_id WHERE REPLACE(REPLACE(REPLACE(m.telefon, ' ', ''), '-', ''), '+', '') LIKE ? OR REPLACE(REPLACE(REPLACE(m.telefon2, ' ', ''), '-', ''), '+', '') LIKE ? ORDER BY m.id DESC LIMIT 1");
    $stmt->execute(["%$tel10", "%$tel10"]);
    $dosyaKayit = $stmt->fetch();
    if ($dosyaKayit) {
        $dosya_id = $dosyaKayit['dosya_id'];
        $dosya_bilgi = $dosyaKayit;
    }
}

// Arama kaydını oluştur
$stmt = $db->prepare('INSERT INTO arama_kayitlari (arama_id, yon, arayan, aranan, durum, baslangic_zamani, kaynak, crm_id, dosya_id, ham_veri) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)');
$stmt->execute([
    $arama_id,
    'gelen',
    $arayan,
    $aranan,
    'caliyor',
    'netsipp',
    $crm_id,
    $dosya_id,
    json_encode(['arayan' => $arayan, 'aranan' => $aranan, 'aramaid' => $arama_id])
]);

$kayit_id = $db->lastInsertId();

// Yanıt: eşleşen bilgiler dahil
$sonuc = [
    'id' => $kayit_id,
    'arama_id' => $arama_id,
    'arayan' => $arayan,
    'aranan' => $aranan
];

if ($crm_bilgi) {
    $sonuc['crm'] = $crm_bilgi;
}
if ($dosya_bilgi) {
    $sonuc['dosya'] = $dosya_bilgi;
}

echo json_encode(['success' => true, 'message' => 'Çağrı kaydedildi', 'data' => $sonuc]);
