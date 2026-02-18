<?php
/**
 * GET /api/v1/evrak/diagnose.php?key=mrhasar2025
 * Evrak upload/download yollarını kontrol et
 * GÜVENLİK: Sadece doğru key parametresi ile erişilebilir
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Content-Type: application/json; charset=utf-8');

// Basit parola kontrolü (tarayıcıdan direkt erişim için)
$key = $_GET['key'] ?? '';
if ($key !== 'mrhasar2025') {
    // Key yoksa JWT auth dene
    try {
        $user = auth_required(['admin']);
    } catch (Exception $ex) {
        http_response_code(403);
        echo json_encode(['error' => 'Erisim icin ?key=mrhasar2025 ekleyin veya admin olarak giris yapin']);
        exit;
    }
}

$db = getDB();

// UPLOAD_DIR bilgisi
$uploadDir = UPLOAD_DIR;
$uploadDirExists = is_dir($uploadDir);
$uploadDirWritable = is_writable($uploadDir);
$documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? 'BILINMIYOR';

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
    try {
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
    } catch (Exception $ex) {
        $uploadIcerik[] = ['hata' => $ex->getMessage()];
    }
}

echo json_encode([
    'success' => true,
    'data' => [
        'upload_dir' => $uploadDir,
        'upload_dir_exists' => $uploadDirExists,
        'upload_dir_writable' => $uploadDirWritable,
        'document_root' => $documentRoot,
        'php_dir' => __DIR__,
        'toplam_evrak_db' => $toplamEvrak,
        'evrak_kontrol' => $kontrol,
        'upload_icerik' => $uploadIcerik,
    ]
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
