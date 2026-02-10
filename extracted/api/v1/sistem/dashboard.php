<?php
/**
 * GET /api/v1/sistem/dashboard.php
 * Genel dashboard istatistikleri
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

// Dosya istatistikleri
$stmt = $db->query('SELECT COUNT(*) as toplam FROM dosyalar');
$dosyaToplam = (int)$stmt->fetch()['toplam'];

$stmt = $db->query("SELECT COUNT(*) as c FROM dosyalar WHERE asama != 'Dosya Kapandı'");
$dosyaAcik = (int)$stmt->fetch()['c'];

$stmt = $db->query("SELECT dosya_turu, COUNT(*) as adet FROM dosyalar GROUP BY dosya_turu");
$dosyaTurDagilim = $stmt->fetchAll();

$stmt = $db->query("SELECT asama, COUNT(*) as adet FROM dosyalar GROUP BY asama ORDER BY adet DESC");
$asamaDagilim = $stmt->fetchAll();

// CRM istatistikleri
$stmt = $db->query('SELECT COUNT(*) as toplam FROM crm');
$crmToplam = (int)$stmt->fetch()['toplam'];

$stmt = $db->query("SELECT durum, COUNT(*) as adet FROM crm GROUP BY durum");
$crmDurumDagilim = $stmt->fetchAll();

// Mali istatistikler
$stmt = $db->query('SELECT SUM(bakiye) as toplam FROM kasalar WHERE aktif = 1');
$toplamBakiye = (float)$stmt->fetch()['toplam'];

$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM masraflar WHERE islem_tarihi >= ?");
$stmt->execute([date('Y-m-01')]);
$aylikMasraf = (float)$stmt->fetch()['toplam'];

// Son aktiviteler
$stmt = $db->query("SELECT l.islem, l.detay, l.created_at, u.ad_soyad as kullanici_adi
    FROM log_kayitlari l
    LEFT JOIN users u ON u.id = l.kullanici_id
    ORDER BY l.id DESC LIMIT 10");
$sonAktiviteler = $stmt->fetchAll();

// Bu ay açılan dosyalar
$stmt = $db->prepare("SELECT COUNT(*) as c FROM dosyalar WHERE acilis_tarihi >= ?");
$stmt->execute([date('Y-m-01')]);
$buAyDosya = (int)$stmt->fetch()['c'];

// Kullanıcı bazlı bildirim sayısı
$stmt = $db->prepare('SELECT COUNT(*) as c FROM bildirimler WHERE alici_id = ? AND okundu = 0');
$stmt->execute([$user['id']]);
$okunmamisBildirim = (int)$stmt->fetch()['c'];

// Kullanıcı görev sayısı
$stmt = $db->prepare('SELECT COUNT(*) as c FROM ajanda WHERE kullanici_id = ? AND tamamlandi = 0');
$stmt->execute([$user['id']]);
$bekleyenGorev = (int)$stmt->fetch()['c'];

json_success([
    'dosya' => [
        'toplam' => $dosyaToplam,
        'acik' => $dosyaAcik,
        'bu_ay' => $buAyDosya,
        'tur_dagilim' => $dosyaTurDagilim,
        'asama_dagilim' => $asamaDagilim
    ],
    'crm' => [
        'toplam' => $crmToplam,
        'durum_dagilim' => $crmDurumDagilim
    ],
    'mali' => [
        'toplam_bakiye' => $toplamBakiye,
        'aylik_masraf' => $aylikMasraf
    ],
    'kullanici' => [
        'okunmamis_bildirim' => $okunmamisBildirim,
        'bekleyen_gorev' => $bekleyenGorev
    ],
    'son_aktiviteler' => $sonAktiviteler
]);
