-- ============================================================
-- MR HASAR DANISMANLIK - VERITABANI V2 MIGRASYON
-- Bu dosya mevcut sema (mr_hasar_db.sql) yuklendikten SONRA
-- calistirilmalidir. Yeni tablolar, triggerlar ve tanimlamalar
-- ekler. Mevcut tablolara dokunmaz.
-- ============================================================

SET NAMES utf8mb4;

-- 1. SERVİSLER
CREATE TABLE IF NOT EXISTS servisler (
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

-- 2. SERVİS İHBARLARI
CREATE TABLE IF NOT EXISTS servis_ihbarlari (
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

-- 3. ORTAKLAR (İŞ ORTAKLARI - AVUKATLAR)
CREATE TABLE IF NOT EXISTS ortaklar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad_soyad VARCHAR(100) NOT NULL,
    unvan VARCHAR(50) DEFAULT NULL,
    baro VARCHAR(50) DEFAULT NULL,
    sicil_no VARCHAR(30) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    vergi_no VARCHAR(20) DEFAULT NULL,
    pay_orani DECIMAL(5,2) DEFAULT 0.00,
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

-- 4. ORTAK HAREKETLERİ
CREATE TABLE IF NOT EXISTS ortak_hareketleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ortak_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    islem_turu ENUM('pay','odeme','duzeltme') NOT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    aciklama VARCHAR(255) DEFAULT NULL,
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

-- 5. PAYDAŞLAR
CREATE TABLE IF NOT EXISTS paydaslar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firma_adi VARCHAR(200) NOT NULL,
    tip ENUM('yonlendiren','kaportaci','acente','diger') NOT NULL DEFAULT 'diger',
    yetkili_adi VARCHAR(100) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    komisyon_orani DECIMAL(5,2) DEFAULT 0.00,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    notlar TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tip (tip),
    INDEX idx_durum (durum),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 6. PAYDAŞ KOMİSYONLARI
CREATE TABLE IF NOT EXISTS paydas_komisyonlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paydas_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    odendi TINYINT(1) NOT NULL DEFAULT 0,
    odeme_tarihi DATE DEFAULT NULL,
    kasa_id INT DEFAULT NULL,
    aciklama VARCHAR(255) DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paydas (paydas_id),
    INDEX idx_dosya (dosya_id),
    FOREIGN KEY (paydas_id) REFERENCES paydaslar(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 7. GELİRLER
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

-- 8. GİDERLER
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

-- 9. KOMİSYONLAR
CREATE TABLE IF NOT EXISTS komisyonlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT DEFAULT NULL,
    ortak_id INT DEFAULT NULL,
    paydas_id INT DEFAULT NULL,
    personel_id INT DEFAULT NULL,
    komisyon_turu ENUM('ortak_pay','paydas_komisyon','personel_prim') NOT NULL,
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

-- 10. MESAJLAR
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

-- 11. ŞABLONLAR (MATBU EVRAK)
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

-- TRIGGER: Gelir eklendiğinde kasa bakiyesi artır
DELIMITER //
CREATE TRIGGER trg_gelir_after_insert
AFTER INSERT ON gelirler
FOR EACH ROW
BEGIN
    IF NEW.tahsilat_durumu = 'tahsil_edildi' THEN
        UPDATE kasalar SET bakiye = bakiye + NEW.tutar WHERE id = NEW.kasa_id;
        INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id)
        SELECT NEW.kasa_id, NEW.dosya_id, 'gelir', NEW.tutar, k.bakiye, CONCAT('GELİR: ', NEW.gelir_turu), NEW.kullanici_id
        FROM kasalar k WHERE k.id = NEW.kasa_id;
    END IF;
END //

-- TRIGGER: Gider eklendiğinde kasa bakiyesi düşür
CREATE TRIGGER trg_gider_after_insert
AFTER INSERT ON giderler
FOR EACH ROW
BEGIN
    UPDATE kasalar SET bakiye = bakiye - NEW.tutar WHERE id = NEW.kasa_id;
    INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id)
    SELECT NEW.kasa_id, NEW.dosya_id, 'gider', NEW.tutar, k.bakiye, CONCAT('GİDER: ', NEW.gider_turu), NEW.kullanici_id
    FROM kasalar k WHERE k.id = NEW.kasa_id;
END //
DELIMITER ;

-- Yeni tanımlamalar
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
