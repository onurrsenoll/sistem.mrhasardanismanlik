<?php
/**
 * POST /api/v1/netsantral/arama-log.php
 * NETSANTRAL ARAMA LOG YÖNETİMİ
 *
 * İŞLEMLER:
 * - action=create  → YENİ ARAMA LOGU OLUŞTUR (giden/gelen)
 * - action=update  → MEVCUT LOGU GÜNCELLE (durum, süre, notlar)
 * - action=hangup  → ÇAĞRI SONLANDIR (durum=sonlandi, süre kaydet)
 *
 * Body: { action, log_id?, arayan?, aranan?, arayan_adi?, yon?, durum?, sure?, notlar?, crm_id? }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);
$body = get_json_body();
$action = $body['action'] ?? '';

if (empty($action)) {
    json_error('AKSİYON BELİRTİLMEDİ', 422);
}

$db = getDB();

// TABLO KONTROLÜ
try {
    $db->exec("CREATE TABLE IF NOT EXISTS arama_loglari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        arayan VARCHAR(30) DEFAULT NULL,
        arayan_adi VARCHAR(100) DEFAULT NULL,
        aranan VARCHAR(30) DEFAULT NULL,
        arama_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
        netsipp_arama_id VARCHAR(50) DEFAULT NULL,
        senaryo VARCHAR(100) DEFAULT NULL,
        yon ENUM('gelen','giden') NOT NULL DEFAULT 'gelen',
        durum VARCHAR(30) DEFAULT 'calıyor',
        sure INT DEFAULT 0,
        crm_id INT DEFAULT NULL,
        kullanici_id INT DEFAULT NULL,
        notlar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_arayan (arayan),
        INDEX idx_aranan (aranan),
        INDEX idx_yon (yon),
        INDEX idx_durum (durum),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

switch ($action) {
    case 'create':
        // ═══ YENİ ARAMA LOGU OLUŞTUR ═══
        $arayan = clean($body['arayan'] ?? '');
        $aranan = clean($body['aranan'] ?? '');
        $arayanAdi = clean($body['arayan_adi'] ?? '');
        $yon = in_array($body['yon'] ?? '', ['gelen', 'giden']) ? $body['yon'] : 'giden';
        $durum = clean($body['durum'] ?? 'araniyor');
        $crmId = intval($body['crm_id'] ?? 0) ?: null;
        $aramaId = clean($body['arama_id'] ?? '');

        if (empty($arayan) && empty($aranan)) {
            json_error('ARAYAN VEYA ARANAN NUMARASI GEREKLİ', 422);
        }

        // CRM'DE NUMARA ARA (aranan numara ile)
        if (!$crmId) {
            $searchNum = $yon === 'giden' ? $aranan : $arayan;
            $rawNum = preg_replace('/[^0-9]/', '', $searchNum);
            $searchLast10 = strlen($rawNum) > 10 ? substr($rawNum, -10) : $rawNum;
            if ($searchLast10) {
                $searchPattern = '%' . $searchLast10 . '%';
                try {
                    $stmt = $db->prepare('SELECT id FROM crm WHERE telefon LIKE ? OR telefon2 LIKE ? ORDER BY id DESC LIMIT 1');
                    $stmt->execute([$searchPattern, $searchPattern]);
                    $crm = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($crm) $crmId = (int)$crm['id'];
                } catch (Exception $e) {}
            }
        }

        try {
            $stmt = $db->prepare('INSERT INTO arama_loglari (arayan, arayan_adi, aranan, arama_tarihi, netsipp_arama_id, senaryo, yon, durum, crm_id, kullanici_id) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $arayan,
                $arayanAdi,
                $aranan,
                $aramaId,
                'netsantral_crm',
                $yon,
                $durum,
                $crmId,
                $user['id']
            ]);
            $logId = (int)$db->lastInsertId();

            json_success([
                'log_id' => $logId,
                'arayan' => $arayan,
                'aranan' => $aranan,
                'yon' => $yon,
                'durum' => $durum
            ]);
        } catch (Exception $e) {
            json_error('LOG KAYDI OLUŞTURULAMADI: ' . $e->getMessage(), 500);
        }
        break;

    case 'update':
        // ═══ MEVCUT LOGU GÜNCELLE ═══
        $logId = intval($body['log_id'] ?? 0);
        if (!$logId) {
            json_error('LOG ID GEREKLİ', 422);
        }

        $updates = [];
        $params = [];

        if (isset($body['durum'])) {
            $updates[] = 'durum = ?';
            $params[] = clean($body['durum']);
        }
        if (isset($body['sure'])) {
            $updates[] = 'sure = ?';
            $params[] = intval($body['sure']);
        }
        if (isset($body['notlar'])) {
            $updates[] = 'notlar = ?';
            $params[] = clean($body['notlar']);
        }
        if (isset($body['arayan_adi'])) {
            $updates[] = 'arayan_adi = ?';
            $params[] = clean($body['arayan_adi']);
        }

        if (empty($updates)) {
            json_error('GÜNCELLENECEK ALAN YOK', 422);
        }

        $params[] = $logId;
        try {
            $db->prepare('UPDATE arama_loglari SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
            json_success(['log_id' => $logId, 'guncellendi' => true]);
        } catch (Exception $e) {
            json_error('LOG GÜNCELLENEMEDİ: ' . $e->getMessage(), 500);
        }
        break;

    case 'hangup':
        // ═══ ÇAĞRI SONLANDIR ═══
        $logId = intval($body['log_id'] ?? 0);
        $sure = intval($body['sure'] ?? 0);
        $notlar = clean($body['notlar'] ?? '');

        if (!$logId) {
            // LOG ID YOKSA EN SON AKTİF ÇAĞRIYI BUL
            try {
                $stmt = $db->prepare("SELECT id FROM arama_loglari WHERE kullanici_id = ? AND durum IN ('araniyor', 'gorusmede', 'calıyor', 'baglandi') ORDER BY id DESC LIMIT 1");
                $stmt->execute([$user['id']]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row) $logId = (int)$row['id'];
            } catch (Exception $e) {}
        }

        if ($logId) {
            try {
                $params = ['sonlandi', $sure, $logId];
                $sql = 'UPDATE arama_loglari SET durum = ?, sure = ? WHERE id = ?';
                if ($notlar) {
                    $sql = 'UPDATE arama_loglari SET durum = ?, sure = ?, notlar = CONCAT(IFNULL(notlar,""), ?) WHERE id = ?';
                    $params = ['sonlandi', $sure, "\n" . $notlar, $logId];
                }
                $db->prepare($sql)->execute($params);
                json_success(['log_id' => $logId, 'durum' => 'sonlandi', 'sure' => $sure]);
            } catch (Exception $e) {
                json_error('LOG GÜNCELLENEMEDİ: ' . $e->getMessage(), 500);
            }
        } else {
            json_success(['log_id' => 0, 'durum' => 'sonlandi', 'mesaj' => 'AKTİF LOG BULUNAMADI']);
        }
        break;

    default:
        json_error('GEÇERSİZ AKSİYON: ' . $action, 422);
}
