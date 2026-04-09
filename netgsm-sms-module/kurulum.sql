-- ═══════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - NetGSM SMS Modülü Veritabanı Kurulumu
-- Tarih: 2026-03-16
-- ═══════════════════════════════════════════════════════════

-- ─── SMS LOG TABLOSU ───
CREATE TABLE IF NOT EXISTS sms_loglari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telefon VARCHAR(30) NOT NULL COMMENT 'Alıcı telefon numarası',
    mesaj TEXT NOT NULL COMMENT 'SMS mesaj metni',
    dosya_id INT DEFAULT NULL COMMENT 'İlişkili dosya ID',
    kullanici_id INT DEFAULT NULL COMMENT 'Gönderen kullanıcı ID',
    durum ENUM('gonderildi','hata','pasif','beklemede') NOT NULL DEFAULT 'beklemede' COMMENT 'Gönderim durumu',
    sonuc_mesaj VARCHAR(500) DEFAULT NULL COMMENT 'NetGSM yanıt mesajı',
    bulk_id VARCHAR(50) DEFAULT NULL COMMENT 'NetGSM bulk ID (rapor sorgulamak için)',
    tip ENUM('tekil','toplu','otomatik','test') NOT NULL DEFAULT 'tekil' COMMENT 'SMS gönderim tipi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_telefon (telefon),
    INDEX idx_dosya (dosya_id),
    INDEX idx_kullanici (kullanici_id),
    INDEX idx_durum (durum),
    INDEX idx_bulk_id (bulk_id),
    INDEX idx_tarih (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─── GELEN SMS TABLOSU ───
CREATE TABLE IF NOT EXISTS gelen_smsler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(50) DEFAULT NULL COMMENT 'NetGSM messageId',
    gonderen VARCHAR(30) NOT NULL COMMENT 'Gönderenin telefon numarası',
    alici VARCHAR(30) DEFAULT NULL COMMENT 'Alıcı numara (subscriberNumber)',
    mesaj TEXT NOT NULL,
    mesaj_tarihi DATETIME DEFAULT NULL COMMENT 'NetGSM messageDateTime',
    crm_id INT DEFAULT NULL COMMENT 'CRM kaydı varsa ID',
    dosya_id INT DEFAULT NULL COMMENT 'İlişkili dosya varsa ID',
    gonderen_adi VARCHAR(100) DEFAULT NULL,
    okundu TINYINT(1) DEFAULT 0,
    islendi TINYINT(1) DEFAULT 0,
    notlar TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gonderen (gonderen),
    INDEX idx_crm (crm_id),
    INDEX idx_dosya (dosya_id),
    INDEX idx_okundu (okundu),
    INDEX idx_tarih (created_at),
    INDEX idx_message_id (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─── SMS AYARLARI (ayarlar tablosuna ekleme) ───
INSERT INTO ayarlar (anahtar, deger) VALUES
    ('sms_aktif', '0'),
    ('sms_kullanici', ''),
    ('sms_sifre', ''),
    ('sms_baslik', 'MR HASAR'),
    ('sms_webhook_api_key', 'mr_hasar_2026')
ON DUPLICATE KEY UPDATE anahtar = anahtar;

-- ─── SMS ŞABLONLARI TABLOSU ───
CREATE TABLE IF NOT EXISTS sms_sablonlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sablon_adi VARCHAR(100) NOT NULL COMMENT 'Şablon adı (ör: Durum Değişikliği)',
    sablon_metni TEXT NOT NULL COMMENT 'Şablon metni ({ad_soyad}, {dosya_no}, {asama} değişkenleri)',
    aktif TINYINT(1) DEFAULT 1,
    olusturan_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_aktif (aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─── VARSAYILAN SMS ŞABLONLARI ───
INSERT INTO sms_sablonlari (sablon_adi, sablon_metni) VALUES
    ('Durum Değişikliği', 'Sayin {ad_soyad}, {dosya_no} nolu dosyanizin guncellenmis durumu: {asama} - {firma_adi}'),
    ('Hoşgeldiniz', 'Sayin {ad_soyad}, {firma_adi} dosya takip sistemine hosgeldiniz. Dosya No: {dosya_no}'),
    ('Portal Erişim', 'Sayin {ad_soyad}, portal erisim bilgileriniz: {portal_url} Sifre: {sifre} - {firma_adi}'),
    ('Randevu Hatırlatma', 'Sayin {ad_soyad}, {tarih} tarihli randevunuzu hatirlatmak isteriz. Dosya No: {dosya_no} - {firma_adi}')
ON DUPLICATE KEY UPDATE sablon_adi = sablon_adi;
