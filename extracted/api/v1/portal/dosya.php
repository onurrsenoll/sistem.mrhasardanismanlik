<?php
/**
 * GET /api/v1/portal/dosya.php
 * Müşterinin kendi dosya bilgilerini görüntülemesi
 * Header: Authorization: Portal {token}
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('GET');
ensure_portal_tables();

$erisim = portal_auth_required();
$db = getDB();

// Portal ayarlarını kontrol et (hangi bilgiler gösterilecek)
$portalAyarlar = [];
try {
    $stmtAyar = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'portal_%'");
    while ($row = $stmtAyar->fetch()) {
        $portalAyarlar[$row['anahtar']] = $row['deger'];
    }
} catch (\Exception $e) {}

$dosyaId = $erisim['dosya_id'];

// DOSYA BİLGİLERİ
$stmt = $db->prepare("SELECT dosya_no, dosya_turu, talep_turu, asama, sigorta_sirket, kaza_tarihi, kaza_il, acilis_tarihi, created_at FROM dosyalar WHERE id = ?");
$stmt->execute([$dosyaId]);
$dosya = $stmt->fetch();

if (!$dosya) {
    json_error('DOSYA BULUNAMADI', 404);
}

// MAĞDUR BİLGİLERİ (sınırlı)
$stmtM = $db->prepare("SELECT ad_soyad, il, ilce FROM magdurlar WHERE dosya_id = ?");
$stmtM->execute([$dosyaId]);
$magdur = $stmtM->fetch();

$sonuc = [
    'dosya' => [
        'dosya_no' => $dosya['dosya_no'],
        'dosya_turu' => $dosya['dosya_turu'],
        'talep_turu' => $dosya['talep_turu'],
        'asama' => $dosya['asama'],
        'sigorta_sirket' => $dosya['sigorta_sirket'],
        'kaza_tarihi' => $dosya['kaza_tarihi'],
        'kaza_il' => $dosya['kaza_il'],
        'acilis_tarihi' => $dosya['acilis_tarihi']
    ],
    'magdur' => $magdur ? [
        'ad_soyad' => $magdur['ad_soyad'],
        'il' => $magdur['il'],
        'ilce' => $magdur['ilce']
    ] : null
];

// EVRAKLAR (portal_evrak_goster ayarı aktifse)
if (empty($portalAyarlar['portal_evrak_goster']) || $portalAyarlar['portal_evrak_goster'] !== '0') {
    $stmtE = $db->prepare("SELECT id, evrak_turu, dosya_adi, mime_type, created_at FROM evraklar WHERE dosya_id = ? ORDER BY created_at DESC");
    $stmtE->execute([$dosyaId]);
    $sonuc['evraklar'] = $stmtE->fetchAll();
}

// DURUM GEÇMİŞİ (portal_gecmis_goster ayarı aktifse)
if (empty($portalAyarlar['portal_gecmis_goster']) || $portalAyarlar['portal_gecmis_goster'] !== '0') {
    $stmtLog = $db->prepare("SELECT islem, detay, created_at FROM log_kayitlari WHERE tablo_adi = 'dosyalar' AND kayit_id = ? AND islem LIKE '%guncelle%' ORDER BY created_at DESC LIMIT 20");
    $stmtLog->execute([$dosyaId]);
    $sonuc['gecmis'] = $stmtLog->fetchAll();
}

// MASRAFLAR (portal_masraf_goster ayarı aktifse)
if (!empty($portalAyarlar['portal_masraf_goster']) && $portalAyarlar['portal_masraf_goster'] === '1') {
    $stmtMas = $db->prepare("SELECT masraf_kalemi, tutar, islem_tarihi FROM masraflar WHERE dosya_id = ? ORDER BY islem_tarihi DESC");
    $stmtMas->execute([$dosyaId]);
    $sonuc['masraflar'] = $stmtMas->fetchAll();
}

// OKUNMAMIŞ MESAJ SAYISI
$stmtMesaj = $db->prepare("SELECT COUNT(*) as sayi FROM portal_mesajlar WHERE dosya_id = ? AND gonderen_tip = 'firma' AND okundu = 0");
$stmtMesaj->execute([$dosyaId]);
$sonuc['okunmamis_mesaj'] = (int)$stmtMesaj->fetch()['sayi'];

// FİRMA BİLGİSİ (karşılama için)
$sonuc['firma'] = [];
try {
    $stmtF = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar IN ('firma_adi','firma_telefon','firma_email','firma_adres','portal_karsilama')");
    while ($row = $stmtF->fetch()) {
        $sonuc['firma'][$row['anahtar']] = $row['deger'];
    }
} catch (\Exception $e) {}

portal_logla($erisim['id'], $dosyaId, 'dosya_goruntule', 'Dosya bilgileri görüntülendi');

json_success($sonuc);
