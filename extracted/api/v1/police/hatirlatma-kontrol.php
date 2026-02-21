<?php
/**
 * GET /api/v1/police/hatirlatma-kontrol.php
 * İki aşamalı yenileme hatırlatması:
 *   1. Aşama: Bitiş tarihine 20 gün kala (hatirlatma_gonderildi = 0 → 1)
 *   2. Aşama: Bitiş tarihine 15 gün kala (hatirlatma_gonderildi = 1 → 2) - EN ÖNEMLİ
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

// Admin ve muhasebe kullanıcılarını bul
$stmt = $db->query("SELECT id FROM users WHERE rol IN ('admin', 'muhasebe') AND aktif = 1");
$hedefKullanicilar = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

if (empty($hedefKullanicilar)) {
    json_error('Bildirim gönderilecek kullanıcı bulunamadı', 404);
}

$gonderilen1 = 0; // 20 gün hatırlatmaları
$gonderilen2 = 0; // 15 gün hatırlatmaları

$db->beginTransaction();
try {
    $bildirimStmt = $db->prepare('INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu) VALUES (NULL, ?, ?, ?, \'uyari\', 0)');
    $guncelleStmt = $db->prepare('UPDATE policeler SET hatirlatma_gonderildi = ? WHERE id = ?');

    // 1. AŞAMA: 20 gün kala hatırlatma (henüz hiç gönderilmemiş)
    $stmt = $db->query("SELECT id, police_no, musteri_adi, musteri_telefon, sigorta_sirketi, brans, bitis_tarihi,
        DATEDIFF(bitis_tarihi, CURDATE()) as kalan_gun
        FROM policeler
        WHERE durum = 'aktif'
        AND hatirlatma_gonderildi = 0
        AND DATEDIFF(bitis_tarihi, CURDATE()) <= 20
        AND bitis_tarihi >= CURDATE()
        ORDER BY bitis_tarihi ASC");
    $policeler20 = $stmt->fetchAll();

    foreach ($policeler20 as $police) {
        $baslik = '1. HATIRLATMA - POLİÇE YENİLEME (20 GÜN)';
        $icerik = $police['police_no'] . ' NUMARALI POLİÇE - ' .
                  $police['musteri_adi'] . ' - ' .
                  $police['sigorta_sirketi'] . ' / ' . $police['brans'] .
                  ' - BİTİŞ: ' . $police['bitis_tarihi'] .
                  ' (' . $police['kalan_gun'] . ' GÜN KALDI)';

        foreach ($hedefKullanicilar as $kullaniciId) {
            $bildirimStmt->execute([$kullaniciId, $baslik, $icerik]);
            $gonderilen1++;
        }

        $guncelleStmt->execute([1, $police['id']]);
    }

    // 2. AŞAMA: 15 gün kala hatırlatma (1. aşama gönderilmiş, 2. henüz gönderilmemiş) - EN ÖNEMLİ
    $stmt = $db->query("SELECT id, police_no, musteri_adi, musteri_telefon, sigorta_sirketi, brans, bitis_tarihi,
        DATEDIFF(bitis_tarihi, CURDATE()) as kalan_gun
        FROM policeler
        WHERE durum = 'aktif'
        AND hatirlatma_gonderildi = 1
        AND DATEDIFF(bitis_tarihi, CURDATE()) <= 15
        AND bitis_tarihi >= CURDATE()
        ORDER BY bitis_tarihi ASC");
    $policeler15 = $stmt->fetchAll();

    foreach ($policeler15 as $police) {
        $baslik = '2. HATIRLATMA - POLİÇE YENİLEME (15 GÜN) - ACİL!';
        $icerik = '⚠ ACİL YENİLEME GEREKİYOR! ' .
                  $police['police_no'] . ' NUMARALI POLİÇE - ' .
                  $police['musteri_adi'] . ' - ' .
                  $police['sigorta_sirketi'] . ' / ' . $police['brans'] .
                  ' - BİTİŞ: ' . $police['bitis_tarihi'] .
                  ' (' . $police['kalan_gun'] . ' GÜN KALDI)' .
                  ' - SİGORTA ŞİRKETİ TEKLİF EKRANLARI AÇIK!';

        foreach ($hedefKullanicilar as $kullaniciId) {
            $bildirimStmt->execute([$kullaniciId, $baslik, $icerik]);
            $gonderilen2++;
        }

        $guncelleStmt->execute([2, $police['id']]);
    }

    $db->commit();

    $toplamGonderilen = $gonderilen1 + $gonderilen2;

    if ($toplamGonderilen > 0) {
        log_action($user['id'], 'police_hatirlatma',
            "Hatırlatma gönderildi: 20 gün={$gonderilen1}, 15 gün={$gonderilen2}",
            'policeler', null);
    }

    json_success([
        'gonderilen' => $toplamGonderilen,
        'hatirlatma_20gun' => $gonderilen1,
        'hatirlatma_15gun' => $gonderilen2,
        'police_sayisi_20' => count($policeler20),
        'police_sayisi_15' => count($policeler15),
        'kullanici_sayisi' => count($hedefKullanicilar)
    ], $toplamGonderilen > 0
        ? "Hatırlatma gönderildi: 20 gün={$gonderilen1}, 15 gün(ACİL)={$gonderilen2}"
        : 'Hatırlatma gönderilecek poliçe bulunamadı');

} catch (Exception $e) {
    $db->rollBack();
    json_error('Hatırlatma hatası: ' . $e->getMessage(), 500);
}
