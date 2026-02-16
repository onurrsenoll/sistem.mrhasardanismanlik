<?php
/**
 * GET /api/v1/servis/rapor.php
 * Servis raporu — genel istatistikler
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

// Toplam servis sayısı
$stmt = $db->query('SELECT COUNT(*) as total FROM servisler');
$toplamServis = (int)$stmt->fetch()['total'];

// Aktif servis sayısı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM servisler WHERE durum = ?");
$stmt->execute(['aktif']);
$aktifServis = (int)$stmt->fetch()['total'];

// Pasif servis sayısı
$pasifServis = $toplamServis - $aktifServis;

// İhbar istatistikleri (duruma göre)
$stmt = $db->query("SELECT durum, COUNT(*) as adet FROM servis_ihbarlari GROUP BY durum ORDER BY adet DESC");
$ihbarDurum = $stmt->fetchAll();

// Toplam ihbar sayısı
$stmt = $db->query('SELECT COUNT(*) as total FROM servis_ihbarlari');
$toplamIhbar = (int)$stmt->fetch()['total'];

// Servis bazlı ihbar sayıları (en aktif servisler)
$stmt = $db->query("SELECT s.id, s.firma_adi, COUNT(si.id) as ihbar_sayisi
    FROM servisler s
    LEFT JOIN servis_ihbarlari si ON si.servis_id = s.id
    GROUP BY s.id, s.firma_adi
    ORDER BY ihbar_sayisi DESC
    LIMIT 20");
$servisIhbar = $stmt->fetchAll();

json_success([
    'toplam_servis' => $toplamServis,
    'aktif_servis' => $aktifServis,
    'pasif_servis' => $pasifServis,
    'toplam_ihbar' => $toplamIhbar,
    'ihbar_durum_dagilimi' => $ihbarDurum,
    'servis_ihbar_sayilari' => $servisIhbar
]);
