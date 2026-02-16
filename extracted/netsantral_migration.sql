-- ═══════════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - NETSANTRAL ENTEGRASYONU
-- Veritabanı Migrasyon Dosyası
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- ═══════════════════════════════════════════
-- 1. NETSANTRAL AYARLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS netsantral_ayarlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    santral_no VARCHAR(20) NOT NULL COMMENT 'Santral numarası (ör: 03625026502)',
    kullanici_adi VARCHAR(50) NOT NULL COMMENT 'Giriş kullanıcı adı',
    sifre VARCHAR(255) NOT NULL COMMENT 'Şifrelenmiş API şifresi',
    api_key VARCHAR(100) DEFAULT NULL COMMENT 'API anahtarı',
    varsayilan_dahili VARCHAR(10) DEFAULT '102' COMMENT 'Varsayılan dahili numara',
    gelen_cagri_modu ENUM('dinamik_tts','sabit_dahili','kuyruk') NOT NULL DEFAULT 'dinamik_tts' COMMENT 'Gelen çağrı yönlendirme modu',
    webhook_aktif TINYINT(1) NOT NULL DEFAULT 1,
    netsipp_aktif TINYINT(1) NOT NULL DEFAULT 1,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    son_baglanti_durumu ENUM('basarili','basarisiz','bilinmiyor') DEFAULT 'bilinmiyor',
    son_baglanti_tarihi DATETIME DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 2. ARAMA KAYITLARI (Gelen/Giden Çağrılar)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS arama_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arama_id VARCHAR(100) DEFAULT NULL COMMENT 'NetGSM tarafından verilen benzersiz çağrı ID',
    yon ENUM('gelen','giden') NOT NULL DEFAULT 'gelen',
    arayan VARCHAR(30) NOT NULL COMMENT 'Arayan numara',
    aranan VARCHAR(30) NOT NULL COMMENT 'Aranan numara/dahili',
    dahili VARCHAR(10) DEFAULT NULL COMMENT 'İlgili dahili numara',
    durum ENUM('caliyor','cevaplandi','mesgul','cevaplanmadi','transfer','bilinmiyor') NOT NULL DEFAULT 'bilinmiyor',
    baslangic_zamani DATETIME DEFAULT NULL,
    cevap_zamani DATETIME DEFAULT NULL,
    bitis_zamani DATETIME DEFAULT NULL,
    sure INT DEFAULT 0 COMMENT 'Saniye cinsinden konuşma süresi',
    kaynak ENUM('webhook','netsipp','manuel','api') NOT NULL DEFAULT 'webhook',
    crm_id INT DEFAULT NULL COMMENT 'Eşleşen CRM kaydı',
    dosya_id INT DEFAULT NULL COMMENT 'Eşleşen dosya',
    kullanici_id INT DEFAULT NULL COMMENT 'Çağrıyı karşılayan kullanıcı',
    notlar TEXT DEFAULT NULL,
    ham_veri JSON DEFAULT NULL COMMENT 'Webhook/API ham verisi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arama_id (arama_id),
    INDEX idx_arayan (arayan),
    INDEX idx_aranan (aranan),
    INDEX idx_yon (yon),
    INDEX idx_durum (durum),
    INDEX idx_tarih (baslangic_zamani),
    INDEX idx_crm (crm_id),
    INDEX idx_dosya (dosya_id),
    FOREIGN KEY (crm_id) REFERENCES crm(id) ON DELETE SET NULL,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 3. DAHİLİ - KULLANICI EŞLEŞMESİ
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS netsantral_dahililer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dahili VARCHAR(10) NOT NULL COMMENT 'Dahili numara',
    kullanici_id INT NOT NULL,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_dahili (dahili),
    INDEX idx_kullanici (kullanici_id),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
