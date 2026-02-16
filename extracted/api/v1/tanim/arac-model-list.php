<?php
/**
 * GET /api/v1/tanim/arac-model-list.php?marka=BMW
 * Seçilen markaya ait model/paket listesi — arac_katalog.json'dan
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');
auth_required();

$marka = strtoupper(trim($_GET['marka'] ?? ''));
if (!$marka) {
    json_error('MARKA PARAMETRESİ GEREKLİ');
}

$jsonPath = __DIR__ . '/../../../data/arac_katalog.json';
if (!file_exists($jsonPath)) {
    json_error('ARAÇ KATALOG VERİSİ BULUNAMADI');
}

$data = json_decode(file_get_contents($jsonPath), true);
if (!$data) {
    json_error('ARAÇ KATALOG VERİSİ OKUNAMADI');
}

$modeller = $data[$marka] ?? [];

json_success(['marka' => $marka, 'modeller' => $modeller, 'toplam' => count($modeller)]);
