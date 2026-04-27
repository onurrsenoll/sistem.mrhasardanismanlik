<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
ensure_netsantral_table();

try {
    $db = getDB();
    $stmt = $db->query("SELECT anahtar, deger, sifrelenmis, updated_at FROM netsantral_ayarlari");
    $rows = $stmt->fetchAll();

    $result = array();
    $sifreliAlanlar = array('sip_sifre', 'netgsm_api_sifre');
    $sifreGor = $user['rol'] === 'admin' || (isset($user['yetkiler']['netsantral_netsantral-sifre-gor']) && $user['yetkiler']['netsantral_netsantral-sifre-gor'] === 1);

    foreach ($rows as $r) {
        $deger = $r['deger'];
        if ($r['sifrelenmis']) {
            if ($sifreGor) {
                $deger = aes_decrypt($r['deger']);
            } else {
                $deger = $deger ? '••••••••' : '';
            }
        }
        $result[$r['anahtar']] = array(
            'deger' => $deger,
            'sifrelenmis' => (int)$r['sifrelenmis'],
            'updated_at' => $r['updated_at']
        );
    }

    json_success($result);
} catch (Exception $e) {
    json_error('Ayarlar okunamadi: ' . $e->getMessage(), 500);
}
