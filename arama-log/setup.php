<?php
/**
 * ARAMA LOG TABLOSU OLUŞTURMA / MİGRASYON
 * Bu dosya ilk çağrıda tabloyu otomatik oluşturur
 * Eski/eksik tablo varsa DROP edip yeniden oluşturur
 */

require_once __DIR__ . '/../../config/database.php';

function ensure_arama_log_table() {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $db = getDB();

        // Tablo var mi kontrol et
        $stmt = $db->query("SHOW TABLES LIKE 'arama_loglari'");
        $tabloVar = $stmt->rowCount() > 0;

        if ($tabloVar) {
            // Tablo var - gerekli kolonlar var mi kontrol et
            $kolonlar = [];
            $cols = $db->query("SHOW COLUMNS FROM arama_loglari")->fetchAll();
            foreach ($cols as $col) {
                $kolonlar[] = $col['Field'];
            }

            $gerekliKolonlar = ['numara', 'yon', 'durum', 'musteri_adi', 'musteri_kaynak',
                                'musteri_kaynak_id', 'baslangic_zamani', 'cevaplanma_zamani',
                                'bitis_zamani', 'sure_saniye', 'kayit_dosya', 'kayit_boyut', 'notlar'];

            $eksikKolonlar = array_diff($gerekliKolonlar, $kolonlar);

            if (empty($eksikKolonlar)) {
                // Tum kolonlar mevcut, sorun yok
                return;
            }

            // Eksik kolon var - eski/yanlis tablo, sil ve yeniden olustur
            error_log('[ARAMA-LOG] Eksik kolonlar tespit edildi: ' . implode(', ', $eksikKolonlar) . ' - Tablo yeniden olusturuluyor');
            $db->exec("DROP TABLE arama_loglari");
        }

        // Collation kontrolu - turkish yoksa unicode kullan
        $collation = 'utf8mb4_unicode_ci';
        try {
            $coll = $db->query("SHOW COLLATION WHERE Collation = 'utf8mb4_turkish_ci'")->fetchAll();
            if (!empty($coll)) $collation = 'utf8mb4_turkish_ci';
        } catch (\Exception $e) {}

        $db->exec("CREATE TABLE IF NOT EXISTS arama_loglari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kullanici_id INT NOT NULL,
            yon ENUM('gelen','giden') NOT NULL DEFAULT 'giden',
            numara VARCHAR(20) NOT NULL,
            musteri_adi VARCHAR(100) DEFAULT NULL,
            musteri_kaynak VARCHAR(20) DEFAULT NULL COMMENT 'CRM, YONLENDIRME',
            musteri_kaynak_id INT DEFAULT NULL,
            durum ENUM('cevaplandi','cevapsiz','reddedildi','mesgul','hata') NOT NULL DEFAULT 'cevapsiz',
            baslangic_zamani DATETIME NOT NULL,
            cevaplanma_zamani DATETIME DEFAULT NULL,
            bitis_zamani DATETIME DEFAULT NULL,
            sure_saniye INT DEFAULT 0,
            kayit_dosya VARCHAR(255) DEFAULT NULL COMMENT 'Gorusme kaydi dosya yolu',
            kayit_boyut INT DEFAULT 0 COMMENT 'Kayit dosya boyutu (byte)',
            notlar TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_kullanici (kullanici_id),
            INDEX idx_numara (numara),
            INDEX idx_yon (yon),
            INDEX idx_durum (durum),
            INDEX idx_baslangic (baslangic_zamani),
            INDEX idx_tarih_kullanici (baslangic_zamani, kullanici_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=$collation");

        error_log('[ARAMA-LOG] Tablo basariyla olusturuldu');

    } catch (\Exception $e) {
        error_log('[ARAMA-LOG] Tablo olusturma hatasi: ' . $e->getMessage());
    }
}
