<?php
/**
 * ARAMA LOG - TABLO KURULUMU & MİGRASYON
 * Tabloyu oluşturur veya eksik kolonları ekler.
 * Her endpoint başında require edilir.
 */

require_once __DIR__ . '/../../config/database.php';

function ensure_arama_loglari_table() {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $db = getDB();

        // Tablo var mı kontrol et
        $stmt = $db->query("SHOW TABLES LIKE 'arama_loglari'");
        if ($stmt->rowCount() === 0) {
            // Tablo yok - oluştur
            $db->exec("CREATE TABLE arama_loglari (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kullanici_id INT NOT NULL DEFAULT 0,
                yon ENUM('gelen','giden') DEFAULT 'gelen',
                arayan VARCHAR(50) DEFAULT NULL,
                aranan VARCHAR(50) DEFAULT NULL,
                numara VARCHAR(50) DEFAULT NULL,
                arayan_adi VARCHAR(150) DEFAULT NULL,
                musteri_adi VARCHAR(150) DEFAULT NULL,
                musteri_kaynak VARCHAR(30) DEFAULT NULL,
                musteri_kaynak_id INT DEFAULT NULL,
                crm_id INT DEFAULT NULL,
                durum VARCHAR(30) DEFAULT 'cevapsiz',
                arama_tarihi DATETIME DEFAULT NULL,
                baslangic_zamani DATETIME DEFAULT NULL,
                cevaplanma_zamani DATETIME DEFAULT NULL,
                bitis_zamani DATETIME DEFAULT NULL,
                sure INT DEFAULT 0,
                sure_saniye INT DEFAULT 0,
                kayit_dosya VARCHAR(255) DEFAULT NULL,
                kayit_boyut INT DEFAULT 0,
                notlar TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_kullanici (kullanici_id),
                INDEX idx_numara (numara),
                INDEX idx_arayan (arayan),
                INDEX idx_yon (yon),
                INDEX idx_durum (durum),
                INDEX idx_arama_tarihi (arama_tarihi),
                INDEX idx_baslangic (baslangic_zamani)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
            return;
        }

        // Tablo var - eksik kolonları ekle
        $cols = [];
        $stmt = $db->query("SHOW COLUMNS FROM arama_loglari");
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $cols[] = $row['Field'];
        }

        $migrations = [
            'arayan' => "ALTER TABLE arama_loglari ADD COLUMN arayan VARCHAR(50) DEFAULT NULL",
            'aranan' => "ALTER TABLE arama_loglari ADD COLUMN aranan VARCHAR(50) DEFAULT NULL",
            'numara' => "ALTER TABLE arama_loglari ADD COLUMN numara VARCHAR(50) DEFAULT NULL",
            'arayan_adi' => "ALTER TABLE arama_loglari ADD COLUMN arayan_adi VARCHAR(150) DEFAULT NULL",
            'musteri_adi' => "ALTER TABLE arama_loglari ADD COLUMN musteri_adi VARCHAR(150) DEFAULT NULL",
            'crm_id' => "ALTER TABLE arama_loglari ADD COLUMN crm_id INT DEFAULT NULL",
            'arama_tarihi' => "ALTER TABLE arama_loglari ADD COLUMN arama_tarihi DATETIME DEFAULT NULL",
            'baslangic_zamani' => "ALTER TABLE arama_loglari ADD COLUMN baslangic_zamani DATETIME DEFAULT NULL",
            'cevaplanma_zamani' => "ALTER TABLE arama_loglari ADD COLUMN cevaplanma_zamani DATETIME DEFAULT NULL",
            'bitis_zamani' => "ALTER TABLE arama_loglari ADD COLUMN bitis_zamani DATETIME DEFAULT NULL",
            'sure' => "ALTER TABLE arama_loglari ADD COLUMN sure INT DEFAULT 0",
            'sure_saniye' => "ALTER TABLE arama_loglari ADD COLUMN sure_saniye INT DEFAULT 0",
            'kayit_dosya' => "ALTER TABLE arama_loglari ADD COLUMN kayit_dosya VARCHAR(255) DEFAULT NULL",
            'kayit_boyut' => "ALTER TABLE arama_loglari ADD COLUMN kayit_boyut INT DEFAULT 0",
            'notlar' => "ALTER TABLE arama_loglari ADD COLUMN notlar TEXT DEFAULT NULL",
            'musteri_kaynak' => "ALTER TABLE arama_loglari ADD COLUMN musteri_kaynak VARCHAR(30) DEFAULT NULL",
            'musteri_kaynak_id' => "ALTER TABLE arama_loglari ADD COLUMN musteri_kaynak_id INT DEFAULT NULL",
            'kullanici_id' => "ALTER TABLE arama_loglari ADD COLUMN kullanici_id INT NOT NULL DEFAULT 0",
            'updated_at' => "ALTER TABLE arama_loglari ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        ];

        foreach ($migrations as $col => $sql) {
            if (!in_array($col, $cols)) {
                try { $db->exec($sql); } catch (Exception $e) { /* kolon zaten var */ }
            }
        }
    } catch (Exception $e) {
        // Sessiz geç - tablo yoksa ilk sorgu zaten hata verecek
    }
}

/**
 * Tablodaki mevcut kolonları döndürür
 */
function get_table_columns() {
    static $cols = null;
    if ($cols !== null) return $cols;
    try {
        $db = getDB();
        $stmt = $db->query("SHOW COLUMNS FROM arama_loglari");
        $cols = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $cols[] = $row['Field'];
        }
    } catch (Exception $e) {
        $cols = [];
    }
    return $cols;
}

/**
 * Tarih kolonu adını döndürür (uyumlu)
 */
function get_tarih_column() {
    $cols = get_table_columns();
    if (in_array('arama_tarihi', $cols)) return 'arama_tarihi';
    if (in_array('baslangic_zamani', $cols)) return 'baslangic_zamani';
    return 'created_at';
}

/**
 * Süre kolonu adını döndürür (uyumlu)
 */
function get_sure_column() {
    $cols = get_table_columns();
    if (in_array('sure', $cols)) return 'sure';
    if (in_array('sure_saniye', $cols)) return 'sure_saniye';
    return 'sure';
}

/**
 * Numara/arayan kolonu adını döndürür (uyumlu)
 */
function get_numara_column() {
    $cols = get_table_columns();
    if (in_array('arayan', $cols)) return 'arayan';
    if (in_array('numara', $cols)) return 'numara';
    return 'arayan';
}

/**
 * İsim kolonu adını döndürür (uyumlu)
 */
function get_isim_column() {
    $cols = get_table_columns();
    if (in_array('arayan_adi', $cols)) return 'arayan_adi';
    if (in_array('musteri_adi', $cols)) return 'musteri_adi';
    return 'arayan_adi';
}
