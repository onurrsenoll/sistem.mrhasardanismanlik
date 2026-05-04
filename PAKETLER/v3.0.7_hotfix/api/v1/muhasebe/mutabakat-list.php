<?php
/**
 * GET /api/v1/muhasebe/mutabakat-list.php
 * Tüm kayıtlı raporları listele (en yeni ilk)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman']);
$db = getDB();

try {
    $stmt = $db->query("SELECT r.id, r.donem, r.baslik, r.durum,
                              r.dosya_toplam, r.bolum1_net, r.bolum2_net, r.bolum3_net, r.final_bakiye,
                              r.olusturma_tarihi, r.guncelleme_tarihi,
                              u.ad_soyad as olusturan_adi
                       FROM aylik_mutabakat_raporlari r
                       LEFT JOIN users u ON u.id = r.olusturan_id
                       ORDER BY r.donem DESC, r.id DESC");
    json_success(['items' => $stmt->fetchAll()]);
} catch (\Exception $e) {
    // Tablo yoksa boş dön
    json_success(['items' => []]);
}
