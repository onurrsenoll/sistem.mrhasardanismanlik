<?php
/**
 * GET /api/v1/netsantral/ayarlar-getir.php
 * NetSantral ayarlarını getirir (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);
$db = getDB();

$stmt = $db->query('SELECT id, santral_no, kullanici_adi, api_key, varsayilan_dahili, gelen_cagri_modu, webhook_aktif, netsipp_aktif, aktif, son_baglanti_durumu, son_baglanti_tarihi FROM netsantral_ayarlar ORDER BY id DESC LIMIT 1');
$ayar = $stmt->fetch();

if (!$ayar) {
    json_success(null, 'Ayar bulunamadi');
}

// Dahili-kullanıcı eşleşmeleri
$stmt2 = $db->query('SELECT nd.id, nd.dahili, nd.kullanici_id, nd.aktif, u.ad_soyad FROM netsantral_dahililer nd LEFT JOIN users u ON u.id = nd.kullanici_id ORDER BY nd.dahili');
$dahililer = $stmt2->fetchAll();

$ayar['dahililer'] = $dahililer;

json_success($ayar);
