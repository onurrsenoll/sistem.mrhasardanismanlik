-- ============================================================
-- MR HASAR DANIŞMANLIK - VERİTABANI V4 MİGRASYON
-- ============================================================
-- ÖNEMLİ: phpMyAdmin'de çalıştırırken:
-- 1. "Dış anahtar denetlemesini etkinleştir" kutucuğundaki TİKİ KALDIRIN
-- 2. Bu SQL'in TAMAMINI seçip "Git" butonuna tıklayın
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- ADIM 1: BAĞIMLI TABLOLARI SİL (FK bağımlılık sırası)
-- ============================================================
DROP TABLE IF EXISTS komisyonlar;
DROP TABLE IF EXISTS ortak_hareketleri;
DROP TABLE IF EXISTS paydas_komisyonlari;
DROP TABLE IF EXISTS servis_ihbarlari;
DROP TABLE IF EXISTS ortaklar;
DROP TABLE IF EXISTS paydaslar;
DROP TABLE IF EXISTS servisler;

-- ============================================================
-- ADIM 2: TABLOLARI DOĞRU SÜTUN ADLARIYLA YENİDEN OLUŞTUR
-- ============================================================

-- ORTAKLAR (İŞ ORTAKLARI)
CREATE TABLE ortaklar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad_soyad VARCHAR(100) NOT NULL,
    firma VARCHAR(200) DEFAULT NULL,
    baro VARCHAR(50) DEFAULT NULL,
    sicil_no VARCHAR(30) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    vergi_no VARCHAR(20) DEFAULT NULL,
    odeme_orani DECIMAL(5,2) DEFAULT 0.00,
    kasa_id INT DEFAULT NULL,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    notlar TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_durum (durum),
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ORTAK HAREKETLERİ
CREATE TABLE ortak_hareketleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ortak_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    tur ENUM('odeme','tahsilat','masraf','duzeltme') NOT NULL DEFAULT 'odeme',
    tutar DECIMAL(12,2) NOT NULL,
    aciklama VARCHAR(255) DEFAULT NULL,
    tarih DATE DEFAULT NULL,
    kasa_id INT DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ortak (ortak_id),
    INDEX idx_dosya (dosya_id),
    FOREIGN KEY (ortak_id) REFERENCES ortaklar(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- PAYDAŞLAR
CREATE TABLE paydaslar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad VARCHAR(200) NOT NULL,
    tur VARCHAR(50) NOT NULL DEFAULT 'diger',
    yetkili VARCHAR(100) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    ilce VARCHAR(50) DEFAULT NULL,
    vergi_no VARCHAR(20) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    komisyon_orani DECIMAL(5,2) DEFAULT 0.00,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    notlar TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tur (tur),
    INDEX idx_durum (durum),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- PAYDAŞ KOMİSYONLARI
CREATE TABLE paydas_komisyonlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paydas_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    durum ENUM('bekliyor','odendi','iptal') NOT NULL DEFAULT 'bekliyor',
    odeme_tarihi DATE DEFAULT NULL,
    kasa_id INT DEFAULT NULL,
    aciklama VARCHAR(255) DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paydas (paydas_id),
    INDEX idx_dosya (dosya_id),
    INDEX idx_durum (durum),
    FOREIGN KEY (paydas_id) REFERENCES paydaslar(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- SERVİSLER
CREATE TABLE servisler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firma_adi VARCHAR(200) NOT NULL,
    yetkili_adi VARCHAR(100) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    ilce VARCHAR(50) DEFAULT NULL,
    vergi_no VARCHAR(20) DEFAULT NULL,
    hizmet_turleri JSON DEFAULT NULL,
    anlasma_kosullari TEXT DEFAULT NULL,
    komisyon_orani DECIMAL(5,2) DEFAULT 0.00,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    notlar TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_durum (durum),
    INDEX idx_il (il),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- SERVİS İHBARLARI
CREATE TABLE servis_ihbarlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servis_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    ihbar_turu VARCHAR(50) DEFAULT NULL,
    plaka VARCHAR(15) DEFAULT NULL,
    arac_bilgi VARCHAR(200) DEFAULT NULL,
    hasar_aciklama TEXT DEFAULT NULL,
    durum ENUM('yeni','islemde','tamamlandi','iptal') NOT NULL DEFAULT 'yeni',
    asistans_durumu VARCHAR(50) DEFAULT NULL,
    notlar TEXT DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_servis (servis_id),
    INDEX idx_dosya (dosya_id),
    INDEX idx_durum (durum),
    FOREIGN KEY (servis_id) REFERENCES servisler(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- KOMİSYONLAR
CREATE TABLE komisyonlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT DEFAULT NULL,
    ortak_id INT DEFAULT NULL,
    paydas_id INT DEFAULT NULL,
    personel_id INT DEFAULT NULL,
    komisyon_turu VARCHAR(50) NOT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    oran DECIMAL(5,2) DEFAULT NULL,
    odendi TINYINT(1) NOT NULL DEFAULT 0,
    odeme_tarihi DATE DEFAULT NULL,
    kasa_id INT DEFAULT NULL,
    aciklama VARCHAR(255) DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_ortak (ortak_id),
    INDEX idx_paydas (paydas_id),
    INDEX idx_turu (komisyon_turu),
    INDEX idx_odendi (odendi),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (ortak_id) REFERENCES ortaklar(id) ON DELETE SET NULL,
    FOREIGN KEY (paydas_id) REFERENCES paydaslar(id) ON DELETE SET NULL,
    FOREIGN KEY (personel_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ============================================================
-- ADIM 3: EKSİK TABLOLAR (gelirler, giderler, mesajlar, sablonlar)
-- Bu tablolar v2'de doğru oluşturulduysa zaten vardır
-- ============================================================
CREATE TABLE IF NOT EXISTS gelirler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT DEFAULT NULL,
    gelir_turu VARCHAR(50) NOT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    kasa_id INT NOT NULL,
    aciklama TEXT DEFAULT NULL,
    fatura_no VARCHAR(50) DEFAULT NULL,
    fatura_tarihi DATE DEFAULT NULL,
    tahsilat_durumu ENUM('beklemede','tahsil_edildi','iptal') NOT NULL DEFAULT 'beklemede',
    tahsilat_tarihi DATE DEFAULT NULL,
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_turu (gelir_turu),
    INDEX idx_tahsilat (tahsilat_durumu),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE RESTRICT,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS giderler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT DEFAULT NULL,
    gider_turu VARCHAR(50) NOT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    kasa_id INT NOT NULL,
    aciklama TEXT DEFAULT NULL,
    belge_no VARCHAR(50) DEFAULT NULL,
    islem_tarihi DATE NOT NULL,
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_turu (gider_turu),
    INDEX idx_tarih (islem_tarihi),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE RESTRICT,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS mesajlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gonderen_id INT NOT NULL,
    alici_id INT NOT NULL,
    konu VARCHAR(200) NOT NULL,
    icerik TEXT NOT NULL,
    okundu TINYINT(1) NOT NULL DEFAULT 0,
    okunma_tarihi DATETIME DEFAULT NULL,
    dosya_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gonderen (gonderen_id),
    INDEX idx_alici (alici_id),
    INDEX idx_okundu (okundu),
    FOREIGN KEY (gonderen_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (alici_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS sablonlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad VARCHAR(200) NOT NULL,
    kategori VARCHAR(50) DEFAULT NULL,
    icerik LONGTEXT NOT NULL,
    degiskenler JSON DEFAULT NULL,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    kullanici_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kategori (kategori),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ============================================================
-- ADIM 4: YETKİLER VE AYARLAR (v3'ten)
-- ============================================================
CREATE TABLE IF NOT EXISTS yetkiler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    modul VARCHAR(50) NOT NULL,
    islem VARCHAR(50) NOT NULL,
    izin TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_yetki (kullanici_id, modul, islem),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS ayarlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anahtar VARCHAR(100) NOT NULL UNIQUE,
    deger TEXT,
    tip ENUM('text','number','color','image','json') DEFAULT 'text',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- VARSAYILAN AYARLAR
INSERT IGNORE INTO ayarlar (anahtar, deger, tip) VALUES
('firma_adi', 'MR HASAR DANIŞMANLIK', 'text'),
('slogan', 'HER ZAMAN FARK EDER', 'text'),
('logo_url', '', 'image'),
('firma_telefon', '', 'text'),
('firma_email', '', 'text'),
('firma_adres', '', 'text'),
('firma_il', '', 'text'),
('vergi_no', '', 'text'),
('vergi_dairesi', '', 'text'),
('baslik_font_boyut', '20', 'number'),
('baslik_renk', '#2563eb', 'color'),
('slogan_renk', '#94a3b8', 'color'),
('slogan_font_boyut', '10', 'number'),
('openai_api_key', '', 'text'),
('ai_api_key', 'AIzaSyAMq-aAlg4hWd7mSQubrAciwry55KzjBO8', 'text');

-- ADMIN YETKİLERİ (kullanici_id = 1)
INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin) VALUES
(1, 'dosya', 'goruntule', 1), (1, 'dosya', 'ekle', 1), (1, 'dosya', 'duzenle', 1), (1, 'dosya', 'sil', 1),
(1, 'masraf', 'goruntule', 1), (1, 'masraf', 'ekle', 1), (1, 'masraf', 'duzenle', 1), (1, 'masraf', 'sil', 1),
(1, 'evrak', 'goruntule', 1), (1, 'evrak', 'ekle', 1), (1, 'evrak', 'duzenle', 1), (1, 'evrak', 'sil', 1),
(1, 'crm', 'goruntule', 1), (1, 'crm', 'ekle', 1), (1, 'crm', 'duzenle', 1), (1, 'crm', 'sil', 1),
(1, 'muhasebe', 'goruntule', 1), (1, 'muhasebe', 'ekle', 1), (1, 'muhasebe', 'duzenle', 1), (1, 'muhasebe', 'sil', 1),
(1, 'ajanda', 'goruntule', 1), (1, 'ajanda', 'ekle', 1), (1, 'ajanda', 'duzenle', 1), (1, 'ajanda', 'sil', 1),
(1, 'bildirim', 'goruntule', 1), (1, 'bildirim', 'ekle', 1), (1, 'bildirim', 'duzenle', 1), (1, 'bildirim', 'sil', 1),
(1, 'sistem', 'goruntule', 1), (1, 'sistem', 'ekle', 1), (1, 'sistem', 'duzenle', 1), (1, 'sistem', 'sil', 1),
(1, 'hesap', 'goruntule', 1), (1, 'hesap', 'ekle', 1), (1, 'hesap', 'duzenle', 1), (1, 'hesap', 'sil', 1),
(1, 'rapor', 'goruntule', 1), (1, 'rapor', 'ekle', 1), (1, 'rapor', 'duzenle', 1), (1, 'rapor', 'sil', 1);

-- ============================================================
-- ADIM 5: YENİ TANIMLAMALAR
-- ============================================================
INSERT IGNORE INTO tanimlamalar (kategori, deger, sira) VALUES
('gelir_turu', 'TAHKİM TAZMİNATI', 1),
('gelir_turu', 'MAHKEME TAZMİNATI', 2),
('gelir_turu', 'SİGORTA ÖDEMESİ', 3),
('gelir_turu', 'ANLAŞMA BEDELİ', 4),
('gelir_turu', 'DANIŞMANLIK ÜCRETİ', 5),
('gelir_turu', 'DİĞER GELİR', 6),
('gider_turu', 'OFİS KİRASI', 1),
('gider_turu', 'PERSONEL MAAŞI', 2),
('gider_turu', 'ARAÇ GİDERİ', 3),
('gider_turu', 'İLETİŞİM GİDERİ', 4),
('gider_turu', 'VERGİ / SGK', 5),
('gider_turu', 'DİĞER GİDER', 6),
('komisyon_turu', 'ORTAK PAY', 1),
('komisyon_turu', 'PAYDAŞ KOMİSYON', 2),
('komisyon_turu', 'PERSONEL PRİM', 3),
('hizmet_turu', 'KAPORTACI', 1),
('hizmet_turu', 'OTO BOYA', 2),
('hizmet_turu', 'OTO CAM', 3),
('hizmet_turu', 'OTO ELEKTRİK', 4),
('hizmet_turu', 'ÇEKİCİ', 5),
('hizmet_turu', 'EKSPERTİZ', 6),
('hizmet_turu', 'DİĞER', 7),
('sablon_kategori', 'SÖZLEŞME', 1),
('sablon_kategori', 'DİLEKÇE', 2),
('sablon_kategori', 'VEKALETNAME', 3),
('sablon_kategori', 'İHTARNAME', 4),
('sablon_kategori', 'TUTANAK', 5),
('sablon_kategori', 'DİĞER', 6);

-- ============================================================
-- ADIM 6: MAGDURLAR TABLOSUNA EMAİL SÜTUNU EKLE
-- ============================================================
ALTER TABLE magdurlar ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT NULL AFTER telefon2;

-- ============================================================
-- ADIM 7: DOSYALAR TABLOSUNA PLAKA SÜTUNU EKLE
-- ============================================================
ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS plaka VARCHAR(15) DEFAULT NULL AFTER kaza_ilce;

-- ============================================================
-- ADIM 8: V_DOSYA_OZET VIEW GÜNCELLE (plaka COALESCE)
-- ============================================================
CREATE OR REPLACE VIEW v_dosya_ozet AS
SELECT
    d.id,
    d.dosya_no,
    d.dosya_turu,
    d.talep_turu,
    d.asama,
    d.hasar_no,
    d.sigorta_sirket,
    d.haklilik,
    d.kaza_tarihi,
    d.acilis_tarihi,
    d.kapanma_tarihi,
    d.dosya_kaynagi,
    m.tc_kimlik,
    m.ad_soyad AS magdur_adi,
    m.telefon AS magdur_tel,
    COALESCE(d.plaka, a.plaka) AS plaka,
    a.marka,
    a.model,
    av.ad_soyad AS avukat_adi,
    s.ad_soyad AS sorumlu_adi,
    (SELECT COUNT(*) FROM masraflar ms WHERE ms.dosya_id = d.id) AS masraf_sayisi,
    (SELECT COALESCE(SUM(ms.tutar), 0) FROM masraflar ms WHERE ms.dosya_id = d.id) AS toplam_masraf,
    (SELECT COUNT(*) FROM evraklar ev WHERE ev.dosya_id = d.id) AS evrak_sayisi,
    d.created_at
FROM dosyalar d
LEFT JOIN magdurlar m ON m.dosya_id = d.id
LEFT JOIN araclar a ON a.dosya_id = d.id AND a.taraf = 'magdur'
LEFT JOIN users av ON av.id = d.avukat_id
LEFT JOIN users s ON s.id = d.sorumlu_id;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- MİGRASYON TAMAMLANDI!
-- 7 tablo yeniden oluşturuldu (doğru sütun adlarıyla)
-- 4 tablo kontrol edildi (yoksa oluşturuldu)
-- Yetkiler ve ayarlar eklendi
-- magdurlar tablosuna email sütunu eklendi
-- dosyalar tablosuna plaka sütunu eklendi
-- v_dosya_ozet view güncellendi (COALESCE plaka)
-- ============================================================
