<?php
/**
 * GET /api/v1/ortak/get.php?id=1
 * Ortak detayı — hareket özeti, dosya sayısı, kasa bilgisi dahil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Ortak ID gerekli', 422);

// Ortak bilgisi
$stmt = $db->prepare('SELECT * FROM ortaklar WHERE id = ?');
$stmt->execute([$id]);
$ortak = $stmt->fetch();

if (!$ortak) json_error('Ortak bulunamadı', 404);

// Hareket özeti
$stmt = $db->prepare("SELECT
    COALESCE(SUM(CASE WHEN tur = 'tahsilat' THEN tutar ELSE 0 END), 0) as toplam_tahsilat,
    COALESCE(SUM(CASE WHEN tur = 'odeme' THEN tutar ELSE 0 END), 0) as toplam_odeme,
    COALESCE(SUM(CASE WHEN tur = 'masraf' THEN tutar ELSE 0 END), 0) as toplam_masraf,
    COUNT(*) as toplam_hareket
    FROM ortak_hareketleri WHERE ortak_id = ?");
$stmt->execute([$id]);
$hareket = $stmt->fetch();
$ortak['toplam_tahsilat'] = (float)$hareket['toplam_tahsilat'];
$ortak['toplam_odeme'] = (float)$hareket['toplam_odeme'];
$ortak['toplam_masraf'] = (float)$hareket['toplam_masraf'];
$ortak['bakiye'] = $ortak['toplam_tahsilat'] - $ortak['toplam_odeme'] - $ortak['toplam_masraf'];
$ortak['toplam_hareket'] = (int)$hareket['toplam_hareket'];

// Dosya sayısı (hareketlerden distinct)
$stmt = $db->prepare('SELECT COUNT(DISTINCT dosya_id) as dosya_sayisi FROM ortak_hareketleri WHERE ortak_id = ? AND dosya_id IS NOT NULL');
$stmt->execute([$id]);
$ortak['dosya_sayisi'] = (int)$stmt->fetch()['dosya_sayisi'];

// Kasa bilgisi
if (!empty($ortak['kasa_id'])) {
    $stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ?');
    $stmt->execute([$ortak['kasa_id']]);
    $ortak['kasa'] = $stmt->fetch() ?: null;
} else {
    $ortak['kasa'] = null;
}

// Son hareketler
$stmt = $db->prepare('SELECT oh.*, d.dosya_no
    FROM ortak_hareketleri oh
    LEFT JOIN dosyalar d ON d.id = oh.dosya_id
    WHERE oh.ortak_id = ?
    ORDER BY oh.created_at DESC
    LIMIT 10');
$stmt->execute([$id]);
$ortak['son_hareketler'] = $stmt->fetchAll();

json_success($ortak);
