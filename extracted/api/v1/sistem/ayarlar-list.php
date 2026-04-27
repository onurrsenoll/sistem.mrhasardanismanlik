<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$db = getDB();

// Try auth but don't require
$user = null;
try {
    $user = auth_required();
} catch (Exception $e) {}

try {
    $stmt = $db->query('SELECT anahtar, deger, tip FROM ayarlar ORDER BY id');
    $items = $stmt->fetchAll();

    // Sifreli olarak saklanan ve maskelenmesi gereken anahtarlar
    $sifreliAnahtarlar = ['netsantral_sip_sifre', 'netsantral_api_sifre', 'netsantral_netgsm_api_sifre'];
    $sifreGor = $user && ($user['rol'] === 'admin' ||
        (isset($user['yetkiler']['netsantral_netsantral-sifre-gor']) && $user['yetkiler']['netsantral_netsantral-sifre-gor'] === 1));

    // Convert to key-value object
    $result = [];
    foreach ($items as $item) {
        $anahtar = $item['anahtar'];
        $deger = $item['deger'];

        // Sifreli netsantral alanlari icin: yetkili kullanici decrypt'i goresun, digerleri mask gorsun
        if (in_array($anahtar, $sifreliAnahtarlar) && !empty($deger)) {
            if ($sifreGor) {
                $deger = aes_decrypt($deger);
            } else {
                $deger = '••••••••';
            }
        }

        $result[$anahtar] = $deger;
    }

    json_success($result);
} catch (Exception $e) {
    // Tablo yoksa boş döndür
    json_success([]);
}
