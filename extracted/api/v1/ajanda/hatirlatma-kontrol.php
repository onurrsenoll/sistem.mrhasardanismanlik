<?php
/**
 * GET /api/v1/ajanda/hatirlatma-kontrol.php
 * Tarihi yaklaşan / geçen görevler için bildirim oluşturur.
 *
 * Kurallar:
 *  - Görev tarihine 24 saatten az kalmışsa ve henüz hatırlatma bildirimi yollanmamışsa → bildirim
 *  - Görev tarihi geçtiyse ve iptal/tamamlandı değilse → "GECİKMİŞ" bildirim
 *  - Aynı görev için çift bildirim üretilmez (ajanda.hatirlatma_gonderildi flag'i).
 *
 * Dashboard her çağrılışında tetiklenir — cron'a gerek yok.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

try {
    // Hatırlatma flag sütunu yoksa ekle (idempotent)
    $db->exec("ALTER TABLE ajanda ADD COLUMN IF NOT EXISTS hatirlatma_gonderildi TINYINT(1) DEFAULT 0");
    $db->exec("ALTER TABLE ajanda ADD COLUMN IF NOT EXISTS gecikme_bildirildi TINYINT(1) DEFAULT 0");

    /* 1) YAKLAŞAN GÖREVLER (24 saat içinde, henüz bildirilmemiş) */
    $stmt = $db->prepare("SELECT id, kullanici_id, baslik, tarih, dosya_id FROM ajanda
        WHERE tarih BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
        AND COALESCE(hatirlatma_gonderildi, 0) = 0
        AND (durum IS NULL OR durum NOT IN ('tamamlandi','iptal'))");
    $stmt->execute();
    $yaklasan = $stmt->fetchAll();

    $bldIns = $db->prepare('INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu, ilgili_dosya_id) VALUES (?, ?, ?, ?, ?, 0, ?)');
    $flagUpd = $db->prepare('UPDATE ajanda SET hatirlatma_gonderildi = 1 WHERE id = ?');

    $yaklasanCount = 0;
    foreach ($yaklasan as $e) {
        try {
            $bldIns->execute([
                null,
                (int)$e['kullanici_id'],
                'GÖREV HATIRLATMASI',
                ($e['baslik'] ?? 'GÖREV') . ' — ' . ($e['tarih'] ?? ''),
                'ajanda',
                !empty($e['dosya_id']) ? (int)$e['dosya_id'] : null
            ]);
            $flagUpd->execute([(int)$e['id']]);
            $yaklasanCount++;
        } catch (\Exception $be) {}
    }

    /* 2) GECİKMİŞ GÖREVLER */
    $stmt = $db->prepare("SELECT id, kullanici_id, baslik, tarih, dosya_id FROM ajanda
        WHERE tarih < NOW()
        AND COALESCE(gecikme_bildirildi, 0) = 0
        AND (durum IS NULL OR durum NOT IN ('tamamlandi','iptal'))");
    $stmt->execute();
    $gecikmis = $stmt->fetchAll();

    $flagUpd2 = $db->prepare('UPDATE ajanda SET gecikme_bildirildi = 1 WHERE id = ?');
    $gecikmisCount = 0;
    foreach ($gecikmis as $e) {
        try {
            $bldIns->execute([
                null,
                (int)$e['kullanici_id'],
                'GECİKMİŞ GÖREV',
                ($e['baslik'] ?? 'GÖREV') . ' — SÜRESİ GEÇTİ (' . ($e['tarih'] ?? '') . ')',
                'uyari',
                !empty($e['dosya_id']) ? (int)$e['dosya_id'] : null
            ]);
            $flagUpd2->execute([(int)$e['id']]);
            $gecikmisCount++;
        } catch (\Exception $be) {}
    }

    json_success([
        'yaklasan' => $yaklasanCount,
        'gecikmis' => $gecikmisCount,
        'toplam_bildirim' => $yaklasanCount + $gecikmisCount
    ], 'Kontrol tamamlandı');
} catch (\Exception $e) {
    json_error('HATIRLATMA KONTROL HATASI: ' . $e->getMessage(), 500);
}
