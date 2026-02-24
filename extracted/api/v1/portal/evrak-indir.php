<?php
/**
 * GET /api/v1/portal/evrak-indir.php?id=X
 * Portal kullanıcısı evrak indirme
 * Header: Authorization: Portal {token}
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('GET');
ensure_portal_tables();

$erisim = portal_auth_required();
$db = getDB();

$evrakId = (int)($_GET['id'] ?? 0);
if ($evrakId <= 0) {
    json_error('EVRAK ID GEREKLİ', 422);
}

// Portal ayar kontrolü
try {
    $stmtAyar = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'portal_evrak_indir' LIMIT 1");
    $ayar = $stmtAyar->fetch();
    if ($ayar && $ayar['deger'] === '0') {
        json_error('EVRAK İNDİRME YETKİSİ KAPATILMIŞ', 403);
    }
} catch (\Exception $e) {}

// Evrak bu dosyaya ait mi kontrol et
$stmt = $db->prepare("SELECT * FROM evraklar WHERE id = ? AND dosya_id = ?");
$stmt->execute([$evrakId, $erisim['dosya_id']]);
$evrak = $stmt->fetch();

if (!$evrak) {
    json_error('EVRAK BULUNAMADI VEYA ERİŞİM YETKİNİZ YOK', 404);
}

// KVKK log
portal_logla($erisim['id'], $erisim['dosya_id'], 'evrak_indir', 'Evrak indirildi: ' . $evrak['dosya_adi'] . ' (ID: ' . $evrakId . ')');

// Dosya yolunu belirle
$uploadDir = dirname(__DIR__, 3) . '/uploads/';
$filePath = $uploadDir . $evrak['dosya_yolu'];

if (!file_exists($filePath)) {
    // Alternatif yolları dene
    $altPath = $uploadDir . $evrak['sunucu_adi'];
    if (file_exists($altPath)) {
        $filePath = $altPath;
    } else {
        json_error('DOSYA SUNUCUDA BULUNAMADI', 404);
    }
}

// İndirme
$mode = $_GET['mode'] ?? 'download';
header('Content-Type: ' . ($evrak['mime_type'] ?: 'application/octet-stream'));
if ($mode === 'inline') {
    header('Content-Disposition: inline; filename="' . $evrak['dosya_adi'] . '"');
} else {
    header('Content-Disposition: attachment; filename="' . $evrak['dosya_adi'] . '"');
}
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: private, max-age=3600');

readfile($filePath);
exit;
