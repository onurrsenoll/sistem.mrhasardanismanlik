<?php
/**
 * POST /api/v1/muhasebe/muhasebe-sifirla.php
 * Muhasebe verilerini sıfırla (Admin only)
 * Dosya masraflarına, dosyalara, personele DOKUNMAZ
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required(['admin']);
$db = getDB();

$body = get_json_body();
$onay = clean($body['onay'] ?? '');

if ($onay !== 'MUHASEBE_SIFIRLA_ONAYLI') {
    json_error('Onay kodu hatali. Bu islem geri alinamaz.', 400);
}

$db->beginTransaction();
try {
    // Kasa hareketlerini temizle
    $db->exec("DELETE FROM kasa_hareketleri");

    // Gelir kayitlarini temizle
    $db->exec("DELETE FROM gelirler");

    // Gider kayitlarini temizle
    $db->exec("DELETE FROM giderler");

    // Komisyonlari temizle (paydas_komisyonlari DOKUNULMAZ - dosya masraflarına bagli)
    $db->exec("DELETE FROM komisyonlar");

    // Kasa bakiyelerini sifirla
    $db->exec("UPDATE kasalar SET bakiye = 0");

    $db->commit();

    log_action($user['id'], 'muhasebe_sifirla', 'Muhasebe verileri sifirlandi (gelir/gider/kasa/komisyon)', 'sistem', 0);

    json_success(null, 'Muhasebe verileri basariyla sifirlandi');
} catch (\Exception $e) {
    $db->rollBack();
    json_error('Sifirlama hatasi: ' . $e->getMessage(), 500);
}
