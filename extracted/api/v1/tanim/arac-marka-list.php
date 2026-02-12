<?php
/**
 * GET /api/v1/tanim/arac-marka-list.php
 * Araç marka listesi — arac_katalog.json'dan
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');
auth_required();

$jsonPath = __DIR__ . '/../../../data/arac_katalog.json';
if (!file_exists($jsonPath)) {
    json_error('ARAÇ KATALOG VERİSİ BULUNAMADI');
}

$data = json_decode(file_get_contents($jsonPath), true);
if (!$data) {
    json_error('ARAÇ KATALOG VERİSİ OKUNAMADI');
}

$markalar = array_keys($data);
sort($markalar);

json_success(['markalar' => $markalar, 'toplam' => count($markalar)]);
