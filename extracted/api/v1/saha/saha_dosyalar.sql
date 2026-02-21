-- ═══════════════════════════════════════════
-- SAHA DOSYALARI TABLOSU
-- SAHA PERSONELİ DOSYA ONAY İŞ AKIŞI
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS saha_dosyalar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  personel_id INT NOT NULL,
  durum ENUM('beklemede','onaylandi','reddedildi','dosyaya_donustu') DEFAULT 'beklemede',

  -- Müşteri/hasar bilgileri
  musteri_adi VARCHAR(150) NOT NULL,
  musteri_telefon VARCHAR(20),
  musteri_tc VARCHAR(11),
  hasar_tipi VARCHAR(50),
  hasar_tarihi DATE,
  hasar_yeri VARCHAR(200),
  hasar_aciklama TEXT,

  -- Sigorta bilgileri
  sigorta_sirketi VARCHAR(100),
  police_no VARCHAR(50),
  plaka VARCHAR(20),
  karsi_plaka VARCHAR(20),
  karsi_sigorta VARCHAR(100),

  -- Onay bilgileri
  onaylayan_id INT,
  onay_tarihi DATETIME,
  onay_notu TEXT,
  red_nedeni TEXT,

  -- Dosyaya dönüşme
  dosya_id INT,
  dosyaya_donusme_tarihi DATETIME,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_personel (personel_id),
  INDEX idx_durum (durum),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
