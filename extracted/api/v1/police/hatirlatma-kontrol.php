<?php
/**
 * GET /api/v1/police/hatirlatma-kontrol.php
 * Yenileme hatırlatması gönderilmesi gereken poliçeleri kontrol et ve bildirim oluştur
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

// Hatırlatma gönderilmesi gereken poliçeleri bul
$stmt = $db->query("SELECT id, police_no, musteri_adi, bitis_tarihi, hatirlatma_gun,
    DATEDIFF(bitis_tarihi, CURDATE()) as kalan_gun
    FROM policeler
    WHERE durum = 'aktif'
    AND hatirlatma_gonderildi = 0
    AND DATEDIFF(bitis_tarihi, CURDATE()) <= hatirlatma_gun
    AND bitis_tarihi >= CURDATE()");
$policeler = $stmt->fetchAll();

if (empty($policeler)) {
    json_success(['gonderilen' => 0], 'Hatırlatma gönderilecek poliçe bulunamadı');
}

// Admin ve muhasebe kullanıcılarını bul
$stmt = $db->query("SELECT id FROM users WHERE rol IN ('admin', 'muhasebe') AND aktif = 1");
$hedefKullanicilar = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

if (empty($hedefKullanicilar)) {
    json_error('Bildirim gönderilecek kullanıcı bulunamadı', 404);
}

$gonderilen = 0;

$db->beginTransaction();
try {
    $bildirimStmt = $db->prepare('INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu) VALUES (NULL, ?, ?, ?, \'uyari\', 0)');
    $guncelleStmt = $db->prepare('UPDATE policeler SET hatirlatma_gonderildi = 1 WHERE id = ?');

    foreach ($policeler as $police) {
        $baslik = 'POLİÇE YENİLEME HATIRLATMASI';
        $icerik = $police['police_no'] . ' numaralı poliçe - ' .
                  $police['musteri_adi'] . ' - Bitiş: ' . $police['bitis_tarihi'] .
                  ' (' . $police['kalan_gun'] . ' gün kaldı)';

        // Her hedef kullanıcı için bildirim oluştur
        foreach ($hedefKullanicilar as $kullaniciId) {
            $bildirimStmt->execute([
                $kullaniciId,
                $baslik,
                $icerik
            ]);
            $gonderilen++;
        }

        // Poliçeyi hatırlatma gönderildi olarak işaretle
        $guncelleStmt->execute([$police['id']]);
    }

    $db->commit();

    log_action($user['id'], 'police_hatirlatma', $gonderilen . ' adet poliçe yenileme hatırlatması gönderildi', 'policeler', null);

    json_success([
        'gonderilen' => $gonderilen,
        'police_sayisi' => count($policeler),
        'kullanici_sayisi' => count($hedefKullanicilar)
    ], $gonderilen . ' adet bildirim gönderildi');

} catch (Exception $e) {
    $db->rollBack();
    json_error('Hatırlatma hatası: ' . $e->getMessage(), 500);
}
