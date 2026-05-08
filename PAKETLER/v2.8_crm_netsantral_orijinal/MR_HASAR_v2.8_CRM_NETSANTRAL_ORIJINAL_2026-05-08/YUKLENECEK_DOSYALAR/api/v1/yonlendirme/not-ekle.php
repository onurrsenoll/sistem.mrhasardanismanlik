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
ensure_yonlendirme_columns();
$yonlendirmeId = (int)$body['yonlendirme_id'];

// Yönlendirme kaydı var mı
$stmt = $db->prepare('SELECT id, magdur_ad_soyad FROM yonlendirme WHERE id = ?');
$stmt->execute([$yonlendirmeId]);
$kayit = $stmt->fetch();
if (!$kayit) json_error('Yönlendirme kaydı bulunamadı', 404);

/* ═══ KAVRAMSAL AYRIM ═══
 * - "gorusme_durumu"  → GORUSME_SONUCLARI listesinden (OLUMLU/RED/ULAŞILAMADI vs.)
 *                       Not kaydına ve ana kaydın son_gorusme_sonucu alanına gider.
 * - "durum"           → SADECE Belirsiz/Alindi/Olumsuz (üç ana durum) — ayrı parametre olarak gelir.
 *                       Eskiden gorusme_durumu bunun yerine yazılıyordu; bu temizlendi.
 * - "son_durum"       → Artık not metni değil, son görüşme sonucunun etiketi + küçük özet.
 * - "durum_snapshot"  → O anki pill butonlarının JSON hali (o görüşmede beyan edilen durumlar).
 */
$gorusmeSonucu = clean($body['gorusme_durumu'] ?? '');
$alinmamaNedeni = clean($body['alinmama_nedeni'] ?? '');
$anaDurum = clean($body['durum'] ?? ''); // Sadece Belirsiz/Alindi/Olumsuz
$durumSnapshot = isset($body['durum_snapshot']) ? $body['durum_snapshot'] : null;
if (is_array($durumSnapshot) || is_object($durumSnapshot)) {
    $durumSnapshot = json_encode($durumSnapshot, JSON_UNESCAPED_UNICODE);
} elseif ($durumSnapshot !== null) {
    $durumSnapshot = (string)$durumSnapshot;
}

$db->beginTransaction();

try {
    // Not ekle (snapshot'lı)
    $stmt = $db->prepare('INSERT INTO yonlendirme_notlar (yonlendirme_id, not_text, gorusme_durumu, alinmama_nedeni, ekleyen_id, durum_snapshot) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $yonlendirmeId,
        clean($body['not_text']),
        $gorusmeSonucu,
        $alinmamaNedeni,
        $user['id'],
        $durumSnapshot
    ]);
    $notId = (int)$db->lastInsertId();

    // Ana kaydı güncelle — mantıklı format
    $updates = ['gorusme_tarihi = NOW()'];
    $updateParams = [];

    // Durum sadece ana değerlerden biriyse güncellenir
    if ($anaDurum !== '' && in_array($anaDurum, ['Belirsiz', 'Alindi', 'Olumsuz'], true)) {
        $updates[] = 'durum = ?';
        $updateParams[] = $anaDurum;
    }

    if ($gorusmeSonucu !== '') {
        $updates[] = 'son_gorusme_sonucu = ?';
        $updateParams[] = $gorusmeSonucu;
    }

    if ($alinmamaNedeni !== '') {
        $updates[] = 'alinmama_nedeni = ?';
        $updateParams[] = $alinmamaNedeni;
    }

    // son_durum: "SONUÇ – NOT ÖZETİ" (liste ekranında tutarlı görünsün)
    $notMetni = clean($body['not_text']);
    $ozet = mb_substr($notMetni, 0, 180, 'UTF-8');
    $sonDurum = $gorusmeSonucu !== '' ? ($gorusmeSonucu . ' — ' . $ozet) : $ozet;
    $sonDurum = mb_substr($sonDurum, 0, 255, 'UTF-8');
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
