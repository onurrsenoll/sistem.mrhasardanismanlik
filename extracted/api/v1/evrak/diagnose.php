<?php
/**
 * GET /api/v1/evrak/diagnose.php
 * Evrak upload/download yollarını kontrol et (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);

$db = getDB();

// UPLOAD_DIR bilgisi
$uploadDir = UPLOAD_DIR;
$uploadDirExists = is_dir($uploadDir);
$uploadDirWritable = is_writable($uploadDir);
$documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? 'BİLİNMİYOR';

// Yüklü evrak sayısı
$stmt = $db->query('SELECT COUNT(*) as toplam FROM evraklar');
$toplamEvrak = $stmt->fetch()['toplam'];

// Dosya yolu kontrolü — ilk 10 evrakı kontrol et
$stmt = $db->query('SELECT id, dosya_adi, dosya_yolu, mime_type, dosya_boyutu FROM evraklar ORDER BY id DESC LIMIT 10');
$evraklar = $stmt->fetchAll();

$kontrol = [];
foreach ($evraklar as $e) {
    $primaryPath = $uploadDir . $e['dosya_yolu'];
    $altPath1 = $documentRoot . '/uploads/' . $e['dosya_yolu'];
    $altPath2 = dirname($documentRoot) . '/uploads/' . $e['dosya_yolu'];

    $kontrol[] = [
        'id' => $e['id'],
        'dosya_adi' => $e['dosya_adi'],
        'dosya_yolu' => $e['dosya_yolu'],
        'boyut_db' => $e['dosya_boyutu'],
        'primary_path' => $primaryPath,
        'primary_exists' => file_exists($primaryPath),
        'alt1_path' => $altPath1,
        'alt1_exists' => file_exists($altPath1),
        'alt2_path' => $altPath2,
        'alt2_exists' => file_exists($altPath2),
    ];
}

// uploads dizin içeriği
$uploadIcerik = [];
if ($uploadDirExists) {
    $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($uploadDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    $sayac = 0;
    foreach ($iter as $item) {
        if ($sayac++ > 50) break;
        $uploadIcerik[] = [
            'yol' => str_replace($uploadDir, '', $item->getPathname()),
            'tur' => $item->isDir() ? 'klasor' : 'dosya',
            'boyut' => $item->isFile() ? $item->getSize() : null,
        ];
    }
}

json_success([
    'upload_dir' => $uploadDir,
    'upload_dir_exists' => $uploadDirExists,
    'upload_dir_writable' => $uploadDirWritable,
    'document_root' => $documentRoot,
    'database_php_dir' => dirname(__DIR__, 3) . '/api/config/',
    'toplam_evrak_db' => $toplamEvrak,
    'evrak_kontrol' => $kontrol,
    'upload_icerik' => $uploadIcerik,
]);
