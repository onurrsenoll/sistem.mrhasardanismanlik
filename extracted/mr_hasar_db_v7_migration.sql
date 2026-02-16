-- ═══════════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - V7 MİGRASYON
-- CRM: kaza_turu + pozisyon alanları
-- CRM Ekler tablosu (dosya/ses/fotoğraf)
-- Arama Logları tablosu (NetSIPP entegrasyonu)
-- ═══════════════════════════════════════════════════════════════

-- CRM: Kaza türü ve pozisyon alanları ekle
ALTER TABLE crm ADD COLUMN kaza_turu VARCHAR(30) DEFAULT NULL AFTER dosya_turu;
ALTER TABLE crm ADD COLUMN pozisyon VARCHAR(20) DEFAULT NULL AFTER kaza_turu;

-- CRM EKLER TABLOSU (ses, dosya, fotoğraf yüklemeleri)
CREATE TABLE IF NOT EXISTS crm_ekler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crm_id INT NOT NULL,
    tur VARCHAR(20) NOT NULL DEFAULT 'dosya' COMMENT 'dosya, ses, foto',
    dosya_adi VARCHAR(255) NOT NULL COMMENT 'Orijinal dosya adı',
    sunucu_adi VARCHAR(255) NOT NULL COMMENT 'UUID ile kaydedilen ad',
    dosya_yolu VARCHAR(500) NOT NULL COMMENT 'Sunucudaki tam yol',
    dosya_boyutu INT DEFAULT 0 COMMENT 'Byte cinsinden',
    mime_type VARCHAR(100) DEFAULT 'application/octet-stream',
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_crm (crm_id),
    INDEX idx_tur (tur),
    FOREIGN KEY (crm_id) REFERENCES crm(id) ON DELETE CASCADE,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ARAMA LOGLARI TABLOSU (NetSIPP entegrasyonu)
CREATE TABLE IF NOT EXISTS arama_loglari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arayan VARCHAR(30) NOT NULL COMMENT 'Arayan numara',
    arayan_adi VARCHAR(150) DEFAULT NULL COMMENT 'Arayan adı (NetSIPP veya CRM)',
    aranan VARCHAR(30) DEFAULT NULL COMMENT 'Aranan numara/dahili',
    arama_tarihi DATETIME DEFAULT NULL COMMENT 'Arama tarihi',
    netsipp_arama_id VARCHAR(100) DEFAULT NULL COMMENT 'NetSIPP arama ID',
    senaryo VARCHAR(100) DEFAULT NULL COMMENT 'NetSIPP senaryo',
    yon ENUM('gelen','giden') NOT NULL DEFAULT 'gelen',
    durum VARCHAR(30) NOT NULL DEFAULT 'calıyor' COMMENT 'calıyor, cevaplandi, mesgul, cevaplanmadi',
    sure INT DEFAULT 0 COMMENT 'Görüşme süresi (saniye)',
    ilgili_crm_id INT DEFAULT NULL,
    ilgili_dosya_id INT DEFAULT NULL,
    notlar TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arayan (arayan),
    INDEX idx_yon (yon),
    INDEX idx_durum (durum),
    INDEX idx_tarih (created_at),
    INDEX idx_crm (ilgili_crm_id),
    FOREIGN KEY (ilgili_crm_id) REFERENCES crm(id) ON DELETE SET NULL,
    FOREIGN KEY (ilgili_dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
