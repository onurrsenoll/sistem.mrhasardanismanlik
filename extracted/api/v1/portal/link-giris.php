<?php
/**
 * POST /api/v1/portal/link-giris.php
 * Doğrudan link ile portal girişi (SMS ile gönderilen link)
 * Body: { erisim_kodu: "uuid-string" }
 * VEYA
 * GET /api/v1/portal/link-giris.php?kod=uuid-string
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/migration.php';

setup_headers();
ensure_portal_tables();

$db = getDB();
$erisimKodu = '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $erisimKodu = clean($_GET['kod'] ?? '');
} else {
    $body = get_json_body();
    $erisimKodu = clean($body['erisim_kodu'] ?? '');
}

if (empty($erisimKodu)) {
    json_error('ERİŞİM KODU GEREKLİ', 422);
}

// Erişim kodunu bul
$stmt = $db->prepare("SELECT pe.*, d.dosya_no, d.dosya_turu, d.asama, m.ad_soyad as magdur_adi FROM portal_erisim pe LEFT JOIN dosyalar d ON d.id = pe.dosya_id LEFT JOIN magdurlar m ON m.dosya_id = pe.dosya_id WHERE pe.erisim_kodu = ? AND pe.aktif = 1 AND (pe.bitis_tarihi IS NULL OR pe.bitis_tarihi >= CURDATE())");
$stmt->execute([$erisimKodu]);
$erisim = $stmt->fetch();

if (!$erisim) {
    json_error('GEÇERSİZ VEYA SÜRESİ DOLMUŞ ERİŞİM LİNKİ', 403);
}

// Giriş bilgilerini güncelle
$db->prepare("UPDATE portal_erisim SET son_giris = NOW(), giris_sayisi = giris_sayisi + 1 WHERE id = ?")->execute([$erisim['id']]);

// Portal token oluştur
$token = portal_token_olustur($erisim['id'], $erisim['dosya_id']);

// KVKK log
portal_logla($erisim['id'], $erisim['dosya_id'], 'giris', 'Link ile portal girişi yapıldı');

json_success([
    'token' => $token,
    'erisim' => [
        'id' => (int)$erisim['id'],
        'dosya_id' => (int)$erisim['dosya_id'],
        'dosya_no' => $erisim['dosya_no'],
        'dosya_turu' => $erisim['dosya_turu'],
        'asama' => $erisim['asama'],
        'ad_soyad' => $erisim['magdur_adi'] ?: $erisim['ad_soyad'],
        'giris_yontemi' => $erisim['giris_yontemi']
    ]
], 'PORTAL GİRİŞİ BAŞARILI');
