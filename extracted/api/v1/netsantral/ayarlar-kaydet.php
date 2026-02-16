<?php
/**
 * POST /api/v1/netsantral/ayarlar-kaydet.php
 * NetSantral ayarlarını kaydeder (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();
$data = get_json_body();

require_fields($data, ['santral_no', 'kullanici_adi']);

$santral_no = clean($data['santral_no']);
$kullanici_adi = clean($data['kullanici_adi']);
$sifre = isset($data['sifre']) ? $data['sifre'] : '';
$api_key = clean($data['api_key'] ?? '');
$varsayilan_dahili = clean($data['varsayilan_dahili'] ?? '102');
$gelen_cagri_modu = clean($data['gelen_cagri_modu'] ?? 'dinamik_tts');
$webhook_aktif = isset($data['webhook_aktif']) ? (int)$data['webhook_aktif'] : 1;
$netsipp_aktif = isset($data['netsipp_aktif']) ? (int)$data['netsipp_aktif'] : 1;

// Mevcut ayar var mı kontrol et
$stmt = $db->query('SELECT id, sifre FROM netsantral_ayarlar ORDER BY id DESC LIMIT 1');
$mevcut = $stmt->fetch();

if ($mevcut) {
    // Güncelle
    $sifre_val = $sifre !== '' ? $sifre : $mevcut['sifre'];
    $stmt = $db->prepare('UPDATE netsantral_ayarlar SET santral_no = ?, kullanici_adi = ?, sifre = ?, api_key = ?, varsayilan_dahili = ?, gelen_cagri_modu = ?, webhook_aktif = ?, netsipp_aktif = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$santral_no, $kullanici_adi, $sifre_val, $api_key, $varsayilan_dahili, $gelen_cagri_modu, $webhook_aktif, $netsipp_aktif, $mevcut['id']]);
    $ayar_id = $mevcut['id'];
} else {
    // Yeni ekle
    if ($sifre === '') {
        json_error('İlk kurulumda şifre zorunludur', 422);
    }
    $stmt = $db->prepare('INSERT INTO netsantral_ayarlar (santral_no, kullanici_adi, sifre, api_key, varsayilan_dahili, gelen_cagri_modu, webhook_aktif, netsipp_aktif, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$santral_no, $kullanici_adi, $sifre, $api_key, $varsayilan_dahili, $gelen_cagri_modu, $webhook_aktif, $netsipp_aktif, $user['id']]);
    $ayar_id = $db->lastInsertId();
}

// Dahili eşleşmelerini kaydet
if (isset($data['dahililer']) && is_array($data['dahililer'])) {
    // Mevcut dahilileri temizle
    $db->exec('DELETE FROM netsantral_dahililer');

    $stmt = $db->prepare('INSERT INTO netsantral_dahililer (dahili, kullanici_id, aktif) VALUES (?, ?, 1)');
    foreach ($data['dahililer'] as $d) {
        if (!empty($d['dahili']) && !empty($d['kullanici_id'])) {
            $stmt->execute([clean($d['dahili']), (int)$d['kullanici_id']]);
        }
    }
}

log_action($user['id'], 'NETSANTRAL_AYAR_GUNCELLE', 'NetSantral ayarları güncellendi', 'netsantral_ayarlar', $ayar_id);

json_success(['id' => $ayar_id], 'Ayarlar başarıyla kaydedildi');
