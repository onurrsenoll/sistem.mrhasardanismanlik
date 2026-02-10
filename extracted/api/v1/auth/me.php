<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';

$user = auth_required();

try {
    $db = getDB();

    // Dosya sayilari
    $stmt = $db->query('SELECT COUNT(*) as total FROM dosyalar');
    $dosyaTotal = $stmt->fetch()['total'];

    $stmt = $db->query("SELECT COUNT(*) as c FROM dosyalar WHERE asama != 'Dosya Kapandı'");
    $dosyaOpen = $stmt->fetch()['c'];

    // Bildirim sayisi
    $stmt = $db->prepare('SELECT COUNT(*) as c FROM bildirimler WHERE kullanici_id = ? AND okundu = 0');
    $stmt->execute(array($user['id']));
    $row = $stmt->fetch();
    $bildirimSayisi = $row ? $row['c'] : 0;

    // Gorev sayisi (ajanda tablosundan)
    $stmt = $db->prepare("SELECT COUNT(*) as c FROM ajanda WHERE kullanici_id = ? AND tamamlandi = 0");
    $stmt->execute(array($user['id']));
    $row2 = $stmt->fetch();
    $gorevSayisi = $row2 ? $row2['c'] : 0;

    echo json_encode(array(
        'success' => true,
        'data' => array(
            'user' => $user,
            'stats' => array(
                'dosya_total' => (int)$dosyaTotal,
                'dosya_open' => (int)$dosyaOpen,
                'bildirim' => (int)$bildirimSayisi,
                'gorev' => (int)$gorevSayisi
            )
        )
    ));

} catch (Exception $e) {
    echo json_encode(array(
        'success' => true,
        'data' => array(
            'user' => $user,
            'stats' => array('dosya_total' => 0, 'dosya_open' => 0, 'bildirim' => 0, 'gorev' => 0)
        )
    ));
}
?>
