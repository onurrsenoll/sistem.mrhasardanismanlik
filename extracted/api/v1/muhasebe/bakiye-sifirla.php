<?php
/**
 * POST /api/v1/muhasebe/bakiye-sifirla.php
 * TÜM KASA BAKİYELERİNİ SIFIRLA — SADECE ADMİN
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();

$db->beginTransaction();
try {
    // Mevcut bakiyeleri log'a yaz
    $stmt = $db->query('SELECT id, ad, bakiye FROM kasalar WHERE bakiye != 0');
    $kasalar = $stmt->fetchAll();

    foreach ($kasalar as $kasa) {
        // Sıfırlama hareketi oluştur
        $stmt2 = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, 0.00, ?, ?)');
        $tutar = -1 * (float)$kasa['bakiye']; // eksi yönde düzeltme
        $stmt2->execute([$kasa['id'], 'duzeltme', $tutar, 'BAKİYE SIFIRLAMA - ESKİ BAKİYE: ' . number_format($kasa['bakiye'], 2) . ' ₺', $user['id']]);
    }

    // Tüm bakiyeleri sıfırla
    $db->exec('UPDATE kasalar SET bakiye = 0.00');

    $db->commit();

    log_action($user['id'], 'bakiye_sifirla', 'TÜM KASA BAKİYELERİ SIFIRLANDI (' . count($kasalar) . ' KASA)', 'kasalar', null);

    json_success(['sifirlanan_kasa' => count($kasalar)], 'TÜM BAKİYELER BAŞARIYLA SIFIRLANDI');
} catch (Exception $e) {
    $db->rollBack();
    json_error('BAKİYE SIFIRLAMA HATASI: ' . $e->getMessage(), 500);
}
