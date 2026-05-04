<?php
/**
 * GET /api/v1/muhasebe/aysonu-list.php
 * Tüm kayıtlı AY SONU raporlarını listeler.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman']);
$db = getDB();

try {
    $stmt = $db->query("SELECT r.id, r.donem, r.baslik, r.durum, r.ortak_id,
                              r.bolum1_alacak, r.bolum2_net, r.final_bakiye,
                              r.olusturma_tarihi, r.guncelleme_tarihi,
                              u.ad_soyad as olusturan_adi,
                              o.ad_soyad as ortak_adi
                       FROM aylik_mutabakat_raporlari r
                       LEFT JOIN users u ON u.id = r.olusturan_id
                       LEFT JOIN ortaklar o ON o.id = r.ortak_id
                       ORDER BY r.donem DESC, r.id DESC");
    json_success(['items' => $stmt->fetchAll()]);
} catch (\Exception $e) {
    json_success(['items' => []]);
}
