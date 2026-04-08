<?php
/**
 * POST /api/v1/yonlendirme/import.php
 * Toplu yönlendirme kaydı aktarımı (Excel/CSV'den)
 * Body: { "kayitlar": [...], "batch_id": "uuid" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['kayitlar', 'batch_id']);

if (!is_array($body['kayitlar']) || empty($body['kayitlar'])) {
    json_error('Kayıt listesi boş veya geçersiz', 422);
}

$db = getDB();
$batchId = clean($body['batch_id']);

// DDL: Eksik kolonları ekle
try {
    $db->exec("ALTER TABLE yonlendirme ADD COLUMN IF NOT EXISTS dosya_turu VARCHAR(10) DEFAULT 'ADK'");
    $db->exec("ALTER TABLE yonlendirme ADD COLUMN IF NOT EXISTS plaka VARCHAR(20) DEFAULT NULL");
    $db->exec("ALTER TABLE yonlendirme ADD COLUMN IF NOT EXISTS sigorta_sirket VARCHAR(100) DEFAULT NULL");
    $db->exec("ALTER TABLE yonlendirme ADD COLUMN IF NOT EXISTS kusur_durumu VARCHAR(20) DEFAULT NULL");
    $db->exec("ALTER TABLE yonlendirme ADD COLUMN IF NOT EXISTS maluliyet VARCHAR(200) DEFAULT NULL");
    $db->exec("ALTER TABLE yonlendirme ADD COLUMN IF NOT EXISTS kaza_pozisyonu VARCHAR(20) DEFAULT NULL");
    $db->exec("ALTER TABLE yonlendirme ADD COLUMN IF NOT EXISTS guncel_durum VARCHAR(20) DEFAULT NULL");
} catch (\Exception $e) {}

// Sıra no başlangıcını al
$stmt = $db->prepare("SELECT COALESCE(MAX(sira_no), 0) as max_sira FROM yonlendirme");
$stmt->execute();
$siraNo = (int)$stmt->fetch()['max_sira'];

$imported = 0;
$errors = [];

$stmt = $db->prepare('INSERT INTO yonlendirme (sira_no, yonlendiren, yonlendirme_tarihi, kaza_turu, magdur_ad_soyad, magdur_telefon, magdur_il, magdur_ilce, magdur_tc, durum, batch_id, created_by, dosya_turu, plaka, sigorta_sirket, kusur_durumu, maluliyet, kaza_pozisyonu, guncel_durum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

$db->beginTransaction();

try {
    foreach ($body['kayitlar'] as $index => $kayit) {
        $adSoyad = clean($kayit['magdur_ad_soyad'] ?? '');
        if ($adSoyad === '') {
            $errors[] = "Satır " . ($index + 1) . ": Ad soyad boş";
            continue;
        }

        $siraNo++;

        $stmt->execute([
            $siraNo,
            clean($kayit['yonlendiren'] ?? ''),
            !empty($kayit['yonlendirme_tarihi']) ? $kayit['yonlendirme_tarihi'] : date('Y-m-d'),
            clean($kayit['kaza_turu'] ?? ''),
            $adSoyad,
            clean($kayit['magdur_telefon'] ?? ''),
            clean($kayit['magdur_il'] ?? ''),
            clean($kayit['magdur_ilce'] ?? ''),
            clean($kayit['magdur_tc'] ?? ''),
            'Belirsiz',
            $batchId,
            $user['id'],
            clean($kayit['dosya_turu'] ?? 'ADK'),
            clean($kayit['plaka'] ?? ''),
            clean($kayit['sigorta_sirket'] ?? ''),
            clean($kayit['kusur_durumu'] ?? ''),
            clean($kayit['maluliyet'] ?? ''),
            clean($kayit['kaza_pozisyonu'] ?? ''),
            clean($kayit['guncel_durum'] ?? '')
        ]);

        $imported++;
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    json_error('İçe aktarma hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'yonlendirme_import', "Toplu aktarım: $imported kayıt (batch: $batchId)", 'yonlendirme', null);

json_success([
    'imported' => $imported,
    'errors' => $errors,
    'batch_id' => $batchId
], "$imported kayıt başarıyla aktarıldı", 201);
