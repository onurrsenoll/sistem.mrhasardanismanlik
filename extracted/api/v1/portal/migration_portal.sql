-- ═══════════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - MÜŞTERİ/MAĞDUR PORTAL SİSTEMİ
-- Veritabanı Migration
-- ═══════════════════════════════════════════════════════════════

-- 1. PORTAL ERİŞİM TABLOSU
-- Her dosya için müşteriye portal erişimi tanımlar
CREATE TABLE IF NOT EXISTS portal_erisim (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    erisim_kodu VARCHAR(64) NOT NULL UNIQUE COMMENT 'Benzersiz portal erişim kodu (UUID)',
    tc_kimlik VARCHAR(11) DEFAULT NULL COMMENT 'Mağdur TC Kimlik',
    telefon VARCHAR(15) DEFAULT NULL COMMENT 'Mağdur Telefon',
    ad_soyad VARCHAR(100) DEFAULT NULL COMMENT 'Mağdur Ad Soyad',
    sifre_hash VARCHAR(255) DEFAULT NULL COMMENT 'Opsiyonel şifre (bcrypt)',
    giris_yontemi ENUM('sms_otp','tc_telefon','link') DEFAULT 'sms_otp' COMMENT 'Giriş yöntemi',
    aktif TINYINT(1) DEFAULT 1,
    son_giris DATETIME DEFAULT NULL,
    giris_sayisi INT DEFAULT 0,
    bitis_tarihi DATE DEFAULT NULL COMMENT 'Erişim bitiş tarihi (NULL = süresiz)',
    olusturan_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_tc (tc_kimlik),
    INDEX idx_telefon (telefon),
    INDEX idx_erisim_kodu (erisim_kodu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 2. PORTAL OTP TABLOSU
-- SMS OTP doğrulama kodları
CREATE TABLE IF NOT EXISTS portal_otp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telefon VARCHAR(15) NOT NULL,
    otp_kod VARCHAR(6) NOT NULL,
    erisim_id INT DEFAULT NULL,
    kullanildi TINYINT(1) DEFAULT 0,
    deneme_sayisi INT DEFAULT 0,
    gecerlilik DATETIME NOT NULL COMMENT 'OTP son geçerlilik zamanı',
    ip_adresi VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_telefon_otp (telefon, otp_kod),
    INDEX idx_gecerlilik (gecerlilik)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 3. PORTAL MESAJ TABLOSU
-- Müşteri ile firma arasındaki mesajlaşma
CREATE TABLE IF NOT EXISTS portal_mesajlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    portal_erisim_id INT DEFAULT NULL,
    gonderen_tip ENUM('musteri','firma') NOT NULL DEFAULT 'musteri',
    gonderen_id INT DEFAULT NULL COMMENT 'Firma kullanıcı ID veya NULL',
    mesaj TEXT NOT NULL,
    okundu TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_erisim (portal_erisim_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 4. PORTAL LOG TABLOSU
-- Portal giriş ve işlem logları (KVKK uyumu)
CREATE TABLE IF NOT EXISTS portal_loglar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    portal_erisim_id INT DEFAULT NULL,
    dosya_id INT DEFAULT NULL,
    islem VARCHAR(50) NOT NULL COMMENT 'giris, cikis, evrak_goruntule, mesaj_gonder vb.',
    detay TEXT DEFAULT NULL,
    ip_adresi VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_erisim_log (portal_erisim_id),
    INDEX idx_tarih (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
