<?php
/**
 * POST /api/v1/yonlendirme/not-ekle.php
 * Yönlendirme kaydına not ekle ve durumu güncelle
 * Body: { "yonlendirme_id": 1, "not_text": "...", "gorusme_durumu": "Alindi", "alinmama_nedeni": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['yonlendirme_id', 'not_text']);

$db = getDB();
$yonlendirmeId = (int)$body['yonlendirme_id'];

// Yönlendirme kaydı var mı
$stmt = $db->prepare('SELECT id, magdur_ad_soyad FROM yonlendirme WHERE id = ?');
$stmt->execute([$yonlendirmeId]);
$kayit = $stmt->fetch();
if (!$kayit) json_error('Yönlendirme kaydı bulunamadı', 404);

$gorusmeDurumu = clean($body['gorusme_durumu'] ?? '');
$alinmamaNedeni = clean($body['alinmama_nedeni'] ?? '');

$db->beginTransaction();

try {
    // Not ekle
    $stmt = $db->prepare('INSERT INTO yonlendirme_notlar (yonlendirme_id, not_text, gorusme_durumu, alinmama_nedeni, ekleyen_id) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        $yonlendirmeId,
        clean($body['not_text']),
        $gorusmeDurumu,
        $alinmamaNedeni,
        $user['id']
    ]);
    $notId = (int)$db->lastInsertId();

    // Ana kaydı güncelle
    $updates = ['gorusme_tarihi = NOW()'];
    $updateParams = [];

    if ($gorusmeDurumu !== '') {
        $updates[] = 'durum = ?';
        $updateParams[] = $gorusmeDurumu;
    }

    if ($alinmamaNedeni !== '') {
        $updates[] = 'alinmama_nedeni = ?';
        $updateParams[] = $alinmamaNedeni;
    }

    // Son durumu not metninin ilk 255 karakteri olarak ayarla
    $sonDurum = mb_substr(clean($body['not_text']), 0, 255, 'UTF-8');
    $updates[] = 'son_durum = ?';
    $updateParams[] = $sonDurum;

    $updateParams[] = $yonlendirmeId;
    $stmt = $db->prepare('UPDATE yonlendirme SET ' . implode(', ', $updates) . ' WHERE id = ?');
    $stmt->execute($updateParams);

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    json_error('Not ekleme hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'yonlendirme_not_ekle', "Yönlendirme not eklendi: {$kayit['magdur_ad_soyad']}", 'yonlendirme_notlar', $notId);

json_success(['not_id' => $notId], 'Not eklendi', 201);
