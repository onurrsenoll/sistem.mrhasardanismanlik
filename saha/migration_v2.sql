-- ═══════════════════════════════════════════════════════════
-- SAHA DOSYALARI V2 MİGRASYON
-- Mevcut veritabanını güncellemek için bu SQL'i çalıştırın
-- ═══════════════════════════════════════════════════════════

-- 1. Eski FK constraint'leri kaldır (hata veren kısım)
SET FOREIGN_KEY_CHECKS = 0;

-- Eski tabloyu tamamen sil (henüz veri yoksa)
DROP TABLE IF EXISTS saha_dosya_medya;
DROP TABLE IF EXISTS saha_dosyalar;

-- 2. Yeni saha_dosyalar tablosu
CREATE TABLE saha_dosyalar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personel_id INT NOT NULL,
  durum ENUM('taslak','beklemede','onaylandi','reddedildi','dosyaya_donustu','suresi_doldu') DEFAULT 'taslak',

  -- Müşteri bilgileri
  musteri_adi VARCHAR(150) NOT NULL,
  musteri_telefon VARCHAR(20) DEFAULT NULL,
  musteri_tc VARCHAR(11) DEFAULT NULL,

  -- Hasar bilgileri
  hasar_tipi VARCHAR(50) DEFAULT NULL,
  hasar_tarihi DATE DEFAULT NULL,
  hasar_yeri VARCHAR(200) DEFAULT NULL,
  hasar_aciklama TEXT,
  hasar_tutari DECIMAL(12,2) DEFAULT NULL,
  hasar_durumu ENUM('dosya_acik','dosya_kapali','onarim_devam') DEFAULT 'dosya_acik',
  gecmis_hasar ENUM('var','yok') DEFAULT 'yok',

  -- Dosya kaynağı
  dosya_kaynagi VARCHAR(50) DEFAULT '',

  -- Araç bilgileri (mağdur araç)
  arac_plaka VARCHAR(20) DEFAULT NULL,
  arac_marka VARCHAR(100) DEFAULT NULL,
  arac_model VARCHAR(100) DEFAULT NULL,
  arac_model_yili INT DEFAULT NULL,
  arac_km INT DEFAULT NULL,
  arac_ruhsat_sahibi VARCHAR(150) DEFAULT NULL,
  arac_kusur_durumu VARCHAR(100) DEFAULT NULL,
  arac_renk VARCHAR(50) DEFAULT NULL,
  arac_sasi_no VARCHAR(50) DEFAULT NULL,

  -- Karşı araç bilgileri
  karsi_plaka VARCHAR(20) DEFAULT NULL,
  karsi_sigorta VARCHAR(100) DEFAULT NULL,

  -- Onay bilgileri
  onaylayan_id INT DEFAULT NULL,
  onay_tarihi DATETIME DEFAULT NULL,
  onay_notu TEXT,
  red_nedeni TEXT,

  -- Dosyaya dönüşme (sigorta bilgileri bu aşamada girilir)
  dosya_id INT DEFAULT NULL,
  dosyaya_donusme_tarihi DATETIME DEFAULT NULL,
  sigorta_sirketi VARCHAR(100) DEFAULT NULL,
  police_no VARCHAR(50) DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_saha_personel (personel_id),
  INDEX idx_saha_durum (durum),
  INDEX idx_saha_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 3. Saha dosya medya (görsel/PDF) tablosu
CREATE TABLE saha_dosya_medya (
  id INT AUTO_INCREMENT PRIMARY KEY,
  saha_dosya_id INT NOT NULL,
  dosya_adi VARCHAR(255) NOT NULL,
  sunucu_adi VARCHAR(255) NOT NULL,
  dosya_yolu VARCHAR(500) NOT NULL,
  dosya_boyutu INT DEFAULT 0,
  mime_type VARCHAR(100) DEFAULT NULL,
  medya_turu ENUM('gorsel','pdf','diger') DEFAULT 'gorsel',
  aciklama VARCHAR(255) DEFAULT NULL,
  kullanici_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_saha_dosya (saha_dosya_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

SET FOREIGN_KEY_CHECKS = 1;
