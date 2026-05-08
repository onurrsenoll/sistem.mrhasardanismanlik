<?php
/**
 * PUT /api/v1/arama-log/update.php
 * Arama logunu guncelle (durum, sure, not, kayit dosyasi)
 * Body: { "id": 1, "durum": "cevaplandi", "sure_saniye": 120, "notlar": "...", "kayit_dosya": "..." }
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('PUT');

$user = auth_required();
$body = get_json_body();

ensure_arama_log_table();

require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

// Log sahibi mi kontrol et
$stmt = $db->prepare('SELECT * FROM arama_loglari WHERE id = ?');
$stmt->execute([$id]);
$log = $stmt->fetch();

if (!$log) json_error('Arama logu bulunamadi', 404);
if ($user['rol'] !== 'admin' && $log['kullanici_id'] != $user['id']) {
    json_error('Bu loga erisim yetkiniz yok', 403);
}

$updates = [];
$params = [];

if (isset($body['durum']) && in_array($body['durum'], ['cevaplandi', 'cevapsiz', 'reddedildi', 'mesgul', 'hata'])) {
    $updates[] = 'durum = ?';
    $params[] = $body['durum'];
}
if (isset($body['sure_saniye'])) {
    $updates[] = 'sure_saniye = ?';
    $params[] = (int)$body['sure_saniye'];
}
if (isset($body['cevaplanma_zamani'])) {
    $updates[] = 'cevaplanma_zamani = ?';
    $params[] = $body['cevaplanma_zamani'];
}
if (isset($body['bitis_zamani'])) {
    $updates[] = 'bitis_zamani = ?';
    $params[] = $body['bitis_zamani'];
}
/* CANLI NOT modu: gorusme surerken yazilir, live_not alanina gider.
   FINAL NOT modu: gorusme bittikten sonra yazilir, notlar alanina gider + crm_notlari'ya kopyalanir. */
$canliNot = isset($body['canli']) && $body['canli'];
$notDegeri = isset($body['notlar']) ? clean($body['notlar']) : null;
if (isset($body['not_text'])) $notDegeri = clean($body['not_text']);

if ($notDegeri !== null) {
    if ($canliNot) {
        // live_not + not_sync_durumu kolonlarini idempotent ekle
        try {
            $db->exec("ALTER TABLE arama_loglari ADD COLUMN IF NOT EXISTS live_not TEXT DEFAULT NULL");
            $db->exec("ALTER TABLE arama_loglari ADD COLUMN IF NOT EXISTS not_sync_durumu VARCHAR(20) DEFAULT NULL");
        } catch (Exception $e) {}
        $updates[] = 'live_not = ?';
        $params[] = $notDegeri;
        $updates[] = "not_sync_durumu = 'canli'";
    } else {
        $updates[] = 'notlar = ?';
        $params[] = $notDegeri;
        $updates[] = "live_not = NULL";
        $updates[] = "not_sync_durumu = 'kaydedildi'";
    }
}
if (isset($body['kayit_dosya'])) {
    $updates[] = 'kayit_dosya = ?';
    $params[] = clean($body['kayit_dosya']);
}
if (isset($body['kayit_boyut'])) {
    $updates[] = 'kayit_boyut = ?';
    $params[] = (int)$body['kayit_boyut'];
}
if (isset($body['musteri_adi'])) {
    $updates[] = 'musteri_adi = ?';
    $params[] = clean($body['musteri_adi']);
}
/* Bütünleşme: arama logunu CRM ve/veya yönlendirme kaydına bağla */
if (isset($body['crm_id'])) {
    $updates[] = 'crm_id = ?';
    $params[] = !empty($body['crm_id']) ? (int)$body['crm_id'] : null;
}
if (isset($body['yonlendirme_id'])) {
    $updates[] = 'yonlendirme_id = ?';
    $params[] = !empty($body['yonlendirme_id']) ? (int)$body['yonlendirme_id'] : null;
}

if (empty($updates)) {
    json_error('Guncellenecek alan bulunamadi', 422);
}

$params[] = $id;
$stmt = $db->prepare('UPDATE arama_loglari SET ' . implode(', ', $updates) . ' WHERE id = ?');
$stmt->execute($params);

/* FINAL NOT (canli=false) ve crm_id varsa crm_notlari'ya da kopyala — kisi kartinda gorunsun */
$crm_not_id = null;
if (!$canliNot && $notDegeri !== null && $notDegeri !== '') {
    $crm_id = isset($body['crm_id']) ? (int)$body['crm_id'] : (int)($log['crm_id'] ?? 0);
    if ($crm_id > 0) {
        try {
            $db->exec("CREATE TABLE IF NOT EXISTS crm_notlari (
                id INT AUTO_INCREMENT PRIMARY KEY,
                crm_id INT NOT NULL,
                not_text TEXT NOT NULL,
                gorusme_sonucu VARCHAR(100) DEFAULT NULL,
                kullanici_id INT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_crm (crm_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
            $sonuc = isset($body['gorusme_sonucu']) ? clean($body['gorusme_sonucu']) : null;
            $stmtN = $db->prepare("INSERT INTO crm_notlari (crm_id, not_text, gorusme_sonucu, kullanici_id) VALUES (?, ?, ?, ?)");
            $stmtN->execute([$crm_id, $notDegeri, $sonuc, $user['id']]);
            $crm_not_id = $db->lastInsertId();
            // arama_loglari.crm_not_id ile bag kur
            try {
                $db->exec("ALTER TABLE arama_loglari ADD COLUMN IF NOT EXISTS crm_not_id INT DEFAULT NULL");
                $db->prepare("UPDATE arama_loglari SET crm_not_id = ? WHERE id = ?")->execute([$crm_not_id, $id]);
            } catch (Exception $e) {}
        } catch (Exception $e) { /* sessiz */ }
    }
}

json_success(['id' => $id, 'crm_not_id' => $crm_not_id, 'canli' => $canliNot], 'Arama logu guncellendi');
