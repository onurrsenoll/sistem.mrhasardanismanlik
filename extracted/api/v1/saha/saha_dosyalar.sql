-- ═══════════════════════════════════════════
-- SAHA DOSYALARI TABLOSU (V2)
-- SAHA PERSONELİ DOSYA ONAY İŞ AKIŞI
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS saha_dosyalar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personel_id INT NOT NULL,
  durum ENUM('taslak','beklemede','onaylandi','reddedildi','dosyaya_donustu','suresi_doldu') DEFAULT 'taslak',

  -- Müşteri bilgileri
  musteri_adi VARCHAR(150) NOT NULL,
  musteri_telefon VARCHAR(20),
  musteri_tc VARCHAR(11),

  -- Hasar bilgileri
  hasar_tipi VARCHAR(50),
  hasar_tarihi DATE,
  hasar_yeri VARCHAR(200),
  hasar_aciklama TEXT,
  hasar_tutari DECIMAL(12,2) DEFAULT NULL,
  hasar_durumu ENUM('dosya_acik','dosya_kapali','onarim_devam') DEFAULT 'dosya_acik',
  gecmis_hasar ENUM('var','yok') DEFAULT 'yok',

  -- Dosya kaynağı
  dosya_kaynagi VARCHAR(50) DEFAULT '',

  -- Araç bilgileri (mağdur araç)
  arac_plaka VARCHAR(20),
  arac_marka VARCHAR(100),
  arac_model VARCHAR(100),
  arac_model_yili INT,
  arac_km INT,
  arac_ruhsat_sahibi VARCHAR(150),
  arac_kusur_durumu VARCHAR(100),
  arac_renk VARCHAR(50),
  arac_sasi_no VARCHAR(50),

  -- Karşı araç bilgileri
  karsi_plaka VARCHAR(20),
  karsi_sigorta VARCHAR(100),

  -- Onay bilgileri
  onaylayan_id INT,
  onay_tarihi DATETIME,
  onay_notu TEXT,
  red_nedeni TEXT,

  -- Dosyaya dönüşme (sigorta bilgileri dosyaya dönüştürme aşamasında girilir)
  dosya_id INT,
  dosyaya_donusme_tarihi DATETIME,
  sigorta_sirketi VARCHAR(100),
  police_no VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_personel (personel_id),
  INDEX idx_durum (durum),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- SAHA DOSYA GÖRSELLER/EVRAKLAR TABLOSU
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS saha_dosya_medya (
  id INT AUTO_INCREMENT PRIMARY KEY,
  saha_dosya_id INT NOT NULL,
  dosya_adi VARCHAR(255) NOT NULL,
  sunucu_adi VARCHAR(255) NOT NULL,
  dosya_yolu VARCHAR(500) NOT NULL,
  dosya_boyutu INT DEFAULT 0,
  mime_type VARCHAR(100),
  medya_turu ENUM('gorsel','pdf','diger') DEFAULT 'gorsel',
  aciklama VARCHAR(255),
  kullanici_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_saha_dosya (saha_dosya_id),
  FOREIGN KEY (saha_dosya_id) REFERENCES saha_dosyalar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
