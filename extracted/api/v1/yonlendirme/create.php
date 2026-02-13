<?php
/**
 * POST /api/v1/yonlendirme/create.php
 * Yeni yönlendirme kaydı oluştur
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['magdur_ad_soyad']);

$db = getDB();

// Sıra no otomatik ata
$stmt = $db->prepare("SELECT COALESCE(MAX(sira_no), 0) + 1 as next_sira FROM yonlendirme");
$stmt->execute();
$nextSira = (int)$stmt->fetch()['next_sira'];

$stmt = $db->prepare('INSERT INTO yonlendirme (sira_no, yonlendiren, yonlendirme_tarihi, kaza_turu, magdur_ad_soyad, magdur_telefon, magdur_il, magdur_ilce, magdur_tc, gorusme_tarihi, durum, alinmama_nedeni, son_durum, sonraki_arama, atanan_id, batch_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    !empty($body['sira_no']) ? (int)$body['sira_no'] : $nextSira,
    clean($body['yonlendiren'] ?? ''),
    !empty($body['yonlendirme_tarihi']) ? $body['yonlendirme_tarihi'] : date('Y-m-d'),
    clean($body['kaza_turu'] ?? ''),
    clean($body['magdur_ad_soyad']),
    clean($body['magdur_telefon'] ?? ''),
    clean($body['magdur_il'] ?? ''),
    clean($body['magdur_ilce'] ?? ''),
    clean($body['magdur_tc'] ?? ''),
    !empty($body['gorusme_tarihi']) ? $body['gorusme_tarihi'] : null,
    $body['durum'] ?? 'Belirsiz',
    clean($body['alinmama_nedeni'] ?? ''),
    clean($body['son_durum'] ?? ''),
    !empty($body['sonraki_arama']) ? $body['sonraki_arama'] : null,
    !empty($body['atanan_id']) ? (int)$body['atanan_id'] : null,
    clean($body['batch_id'] ?? ''),
    $user['id']
]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'yonlendirme_ekle', "Yönlendirme kaydı: " . clean($body['magdur_ad_soyad']), 'yonlendirme', $id);

json_success(['id' => $id], 'Yönlendirme kaydı oluşturuldu', 201);
