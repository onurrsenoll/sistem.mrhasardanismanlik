-- ═══════════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - DOSYA TAKİP SİSTEMİ
-- Veritabanı Şeması v1.0
-- MariaDB 10.6+ / MySQL 8.0+
-- 
-- KURULUM: cPanel → phpMyAdmin → SQL sekmesi → Bu dosyayı yapıştır → Çalıştır
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_turkish_ci';

-- Veritabanı oluştur (cPanel'de zaten oluşturduysan bu satırı atla)
-- CREATE DATABASE IF NOT EXISTS mr_hasar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
-- USE mr_hasar_db;

-- ═══════════════════════════════════════════
-- 1. KULLANICILAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad_soyad VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    sifre_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin','avukat','uzman','personel','muhasebe','portal') NOT NULL DEFAULT 'personel',
    telefon VARCHAR(20) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    son_giris DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_aktif (aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 2. DOSYALAR (Ana Tablo)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dosyalar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_no VARCHAR(20) NOT NULL UNIQUE,
    dosya_turu ENUM('ADK','BH') NOT NULL,
    talep_turu VARCHAR(100) DEFAULT NULL,
    asama VARCHAR(50) NOT NULL DEFAULT 'Dosya Açık',
    hasar_no VARCHAR(30) DEFAULT NULL,
    sigorta_sirket VARCHAR(100) DEFAULT NULL,
    police_no VARCHAR(50) DEFAULT NULL,
    sigorta_turu VARCHAR(50) DEFAULT NULL,
    dosya_kaynagi VARCHAR(50) DEFAULT NULL,
    avukat_id INT DEFAULT NULL,
    sorumlu_id INT DEFAULT NULL,
    haklilik INT NOT NULL DEFAULT 100,
    komisyon_orani DECIMAL(5,2) DEFAULT 0.00,
    kaza_tarihi DATE DEFAULT NULL,
    kaza_il VARCHAR(50) DEFAULT NULL,
    kaza_ilce VARCHAR(50) DEFAULT NULL,
    plaka VARCHAR(15) DEFAULT NULL,
    -- BH özel alanlar
    pozisyon VARCHAR(20) DEFAULT NULL,
    kusur_durumu VARCHAR(20) DEFAULT NULL,
    sakatlik_aciklama TEXT DEFAULT NULL,
    -- Tarihler
    acilis_tarihi DATE DEFAULT NULL,
    kapanma_tarihi DATE DEFAULT NULL,
    notlar TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dosya_no (dosya_no),
    INDEX idx_dosya_turu (dosya_turu),
    INDEX idx_asama (asama),
    INDEX idx_avukat (avukat_id),
    INDEX idx_kaza_tarihi (kaza_tarihi),
    INDEX idx_created (created_at),
    FOREIGN KEY (avukat_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (sorumlu_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 3. MAĞDURLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS magdurlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    tc_kimlik VARCHAR(11) DEFAULT NULL,
    ad_soyad VARCHAR(100) NOT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    ilce VARCHAR(50) DEFAULT NULL,
    dogum_tarihi DATE DEFAULT NULL,
    cinsiyet ENUM('E','K') DEFAULT NULL,
    meslek VARCHAR(100) DEFAULT NULL,
    gelir_durumu VARCHAR(50) DEFAULT NULL,
    gelir_tutari DECIMAL(12,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_tc (tc_kimlik),
    INDEX idx_ad (ad_soyad),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 4. ARAÇLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS araclar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    taraf ENUM('magdur','karsi') NOT NULL,
    plaka VARCHAR(15) DEFAULT NULL,
    ruhsat_sahibi VARCHAR(100) DEFAULT NULL,
    tc_kimlik VARCHAR(11) DEFAULT NULL,
    marka VARCHAR(50) DEFAULT NULL,
    model VARCHAR(50) DEFAULT NULL,
    model_yili INT DEFAULT NULL,
    km INT DEFAULT NULL,
    kasko TINYINT(1) DEFAULT 0,
    kasko_sirket VARCHAR(100) DEFAULT NULL,
    kasko_police VARCHAR(50) DEFAULT NULL,
    trafik_sirket VARCHAR(100) DEFAULT NULL,
    trafik_police VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_plaka (plaka),
    INDEX idx_taraf (taraf),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 5. KASALAR / BANKA HESAPLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kasalar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad VARCHAR(100) NOT NULL,
    tip ENUM('Nakit','Banka') NOT NULL DEFAULT 'Nakit',
    banka_adi VARCHAR(100) DEFAULT NULL,
    hesap_no VARCHAR(50) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    bakiye DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 6. MASRAFLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS masraflar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    masraf_kalemi VARCHAR(100) NOT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    kasa_id INT NOT NULL,
    aciklama TEXT DEFAULT NULL,
    islem_tarihi DATE NOT NULL,
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_kasa (kasa_id),
    INDEX idx_tarih (islem_tarihi),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE RESTRICT,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 7. EVRAKLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS evraklar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    evrak_turu VARCHAR(100) DEFAULT NULL,
    dosya_adi VARCHAR(255) NOT NULL COMMENT 'Orijinal dosya adı',
    sunucu_adi VARCHAR(255) NOT NULL COMMENT 'UUID ile kaydedilen ad',
    dosya_yolu VARCHAR(500) NOT NULL COMMENT 'Sunucudaki tam yol',
    dosya_boyutu INT DEFAULT 0 COMMENT 'Byte cinsinden',
    mime_type VARCHAR(50) DEFAULT 'application/pdf',
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_tur (evrak_turu),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 8. KASA HAREKETLERİ
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kasa_hareketleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kasa_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    islem_turu ENUM('gelir','gider','masraf','komisyon','transfer','duzeltme') NOT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    bakiye_sonrasi DECIMAL(14,2) DEFAULT NULL COMMENT 'İşlem sonrası bakiye',
    aciklama VARCHAR(255) DEFAULT NULL,
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_kasa (kasa_id),
    INDEX idx_dosya (dosya_id),
    INDEX idx_turu (islem_turu),
    INDEX idx_tarih (created_at),
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE RESTRICT,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 9. CRM
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad_soyad VARCHAR(100) NOT NULL,
    tc_vergi_no VARCHAR(20) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    ilce VARCHAR(50) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    plaka VARCHAR(20) DEFAULT NULL,
    marka VARCHAR(50) DEFAULT NULL,
    model_adi VARCHAR(50) DEFAULT NULL,
    arac_yili SMALLINT DEFAULT NULL,
    arac_km INT DEFAULT NULL,
    olay_aciklama TEXT DEFAULT NULL,
    kaynak VARCHAR(50) DEFAULT NULL,
    dosya_turu VARCHAR(20) DEFAULT NULL,
    kaza_turu VARCHAR(30) DEFAULT NULL,
    kaza_tarihi DATE DEFAULT NULL,
    pozisyon VARCHAR(20) DEFAULT NULL,
    durum ENUM('Yeni','Takipte','Olumlu','Olumsuz') NOT NULL DEFAULT 'Yeni',
    oncelik VARCHAR(20) DEFAULT 'NORMAL',
    taslak TINYINT DEFAULT 0,
    not_text TEXT DEFAULT NULL,
    atanan_id INT DEFAULT NULL,
    son_iletisim DATE DEFAULT NULL,
    donusen_dosya_id INT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_durum (durum),
    INDEX idx_kaynak (kaynak),
    INDEX idx_atanan (atanan_id),
    INDEX idx_ad (ad_soyad),
    INDEX idx_plaka (plaka),
    INDEX idx_tc (tc_vergi_no),
    INDEX idx_taslak (taslak),
    FOREIGN KEY (atanan_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (donusen_dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- CRM TABLO GÜNCELLEMESİ (MEVCUT VERİTABANINDA ÇALIŞTIRIN)
-- ALTER TABLE crm ADD COLUMN adres TEXT DEFAULT NULL AFTER ilce;
-- ALTER TABLE crm ADD COLUMN tc_vergi_no VARCHAR(20) DEFAULT NULL AFTER ad_soyad;
-- ALTER TABLE crm ADD COLUMN plaka VARCHAR(20) DEFAULT NULL AFTER ilce;
-- ALTER TABLE crm ADD COLUMN marka VARCHAR(50) DEFAULT NULL AFTER plaka;
-- ALTER TABLE crm ADD COLUMN model_adi VARCHAR(50) DEFAULT NULL AFTER marka;
-- ALTER TABLE crm ADD COLUMN arac_yili SMALLINT DEFAULT NULL AFTER model_adi;
-- ALTER TABLE crm ADD COLUMN arac_km INT DEFAULT NULL AFTER arac_yili;
-- ALTER TABLE crm ADD COLUMN olay_aciklama TEXT DEFAULT NULL AFTER arac_km;
-- ALTER TABLE crm ADD COLUMN oncelik VARCHAR(20) DEFAULT 'NORMAL' AFTER durum;
-- ALTER TABLE crm ADD COLUMN taslak TINYINT DEFAULT 0 AFTER oncelik;
-- ALTER TABLE crm ADD COLUMN kaza_turu VARCHAR(30) DEFAULT NULL AFTER dosya_turu;
-- ALTER TABLE crm ADD COLUMN pozisyon VARCHAR(20) DEFAULT NULL AFTER kaza_turu;
-- ALTER TABLE crm ADD INDEX idx_plaka (plaka);
-- ALTER TABLE crm ADD INDEX idx_tc (tc_vergi_no);
-- ALTER TABLE crm ADD INDEX idx_taslak (taslak);

-- ═══════════════════════════════════════════
-- 10. CRM NOTLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crm_notlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crm_id INT NOT NULL,
    not_text TEXT NOT NULL,
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_crm (crm_id),
    FOREIGN KEY (crm_id) REFERENCES crm(id) ON DELETE CASCADE,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 11. HESAPLAMALAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hesaplamalar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT DEFAULT NULL,
    hesap_turu ENUM('ADK','BH') NOT NULL,
    giris_verileri JSON NOT NULL,
    sonuc_verileri JSON NOT NULL,
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_tur (hesap_turu),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 12. TANIMLAMALAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tanimlamalar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori VARCHAR(50) NOT NULL,
    deger VARCHAR(255) NOT NULL,
    sira INT NOT NULL DEFAULT 0,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_kategori (kategori),
    INDEX idx_aktif (aktif),
    UNIQUE KEY uk_kategori_deger (kategori, deger)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 13. BİLDİRİMLER / MESAJLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bildirimler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gonderen_id INT DEFAULT NULL,
    alici_id INT NOT NULL,
    baslik VARCHAR(200) NOT NULL,
    icerik TEXT DEFAULT NULL,
    okundu TINYINT(1) NOT NULL DEFAULT 0,
    tip ENUM('bildirim','mesaj','uyari','sistem') NOT NULL DEFAULT 'bildirim',
    ilgili_dosya_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alici (alici_id),
    INDEX idx_okundu (okundu),
    INDEX idx_tip (tip),
    FOREIGN KEY (gonderen_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (alici_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ilgili_dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 14. AJANDA / GÖREVLER
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ajanda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    baslik VARCHAR(200) NOT NULL,
    aciklama TEXT DEFAULT NULL,
    tarih DATETIME NOT NULL,
    bitis_tarihi DATETIME DEFAULT NULL,
    hatirlatma DATETIME DEFAULT NULL,
    tamamlandi TINYINT(1) NOT NULL DEFAULT 0,
    oncelik ENUM('dusuk','normal','yuksek','acil') NOT NULL DEFAULT 'normal',
    renk VARCHAR(7) DEFAULT '#2563eb',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kullanici (kullanici_id),
    INDEX idx_tarih (tarih),
    INDEX idx_tamamlandi (tamamlandi),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 15. LOG KAYITLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS log_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT DEFAULT NULL,
    islem VARCHAR(50) NOT NULL,
    tablo_adi VARCHAR(50) DEFAULT NULL,
    kayit_id INT DEFAULT NULL,
    eski_deger JSON DEFAULT NULL,
    yeni_deger JSON DEFAULT NULL,
    detay TEXT DEFAULT NULL,
    ip_adresi VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_kullanici (kullanici_id),
    INDEX idx_islem (islem),
    INDEX idx_tarih (created_at),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 16. OTURUMLAR (JWT Blacklist)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS oturumlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    ip_adresi VARCHAR(45) DEFAULT NULL,
    son_aktivite DATETIME DEFAULT CURRENT_TIMESTAMP,
    gecerli TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token_hash),
    INDEX idx_kullanici (kullanici_id),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 17. ORTAKLAR (İŞ ORTAKLARI - AVUKATLAR)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ortaklar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad_soyad VARCHAR(100) NOT NULL,
    firma VARCHAR(200) DEFAULT '',
    baro VARCHAR(100) DEFAULT '',
    sicil_no VARCHAR(50) DEFAULT '',
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    vergi_no VARCHAR(30) DEFAULT NULL,
    odeme_orani DECIMAL(5,2) DEFAULT 0.00,
    kasa_id INT DEFAULT NULL,
    notlar TEXT DEFAULT NULL,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ad (ad_soyad),
    INDEX idx_durum (durum),
    INDEX idx_il (il),
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 18. ORTAK HAREKETLERİ (FİNANSAL)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ortak_hareketleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ortak_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    tur VARCHAR(30) NOT NULL DEFAULT 'odeme',
    tutar DECIMAL(12,2) NOT NULL,
    tarih DATE DEFAULT NULL,
    aciklama VARCHAR(500) DEFAULT '',
    kasa_id INT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ortak (ortak_id),
    INDEX idx_dosya (dosya_id),
    INDEX idx_tur (tur),
    FOREIGN KEY (ortak_id) REFERENCES ortaklar(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 19. PAYDAŞLAR (İŞ PAYDAŞLARI)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS paydaslar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad VARCHAR(200) NOT NULL,
    tur VARCHAR(50) NOT NULL DEFAULT 'sigorta_acentesi',
    yetkili VARCHAR(100) DEFAULT '',
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    ilce VARCHAR(50) DEFAULT NULL,
    vergi_no VARCHAR(30) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    komisyon_orani DECIMAL(5,2) DEFAULT 0.00,
    notlar TEXT DEFAULT NULL,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ad (ad),
    INDEX idx_tur (tur),
    INDEX idx_durum (durum),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 20. PAYDAŞ KOMİSYONLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS paydas_komisyonlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paydas_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    durum ENUM('bekliyor','odendi') NOT NULL DEFAULT 'bekliyor',
    tarih DATE DEFAULT NULL,
    odeme_tarihi DATE DEFAULT NULL,
    kasa_id INT DEFAULT NULL,
    aciklama VARCHAR(500) DEFAULT '',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paydas (paydas_id),
    INDEX idx_dosya (dosya_id),
    INDEX idx_durum (durum),
    FOREIGN KEY (paydas_id) REFERENCES paydaslar(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 21. SERVİSLER
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS servisler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firma_adi VARCHAR(200) NOT NULL,
    yetkili_adi VARCHAR(100) DEFAULT '',
    telefon VARCHAR(20) DEFAULT NULL,
    telefon2 VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    ilce VARCHAR(50) DEFAULT NULL,
    vergi_no VARCHAR(30) DEFAULT NULL,
    hizmet_turleri JSON DEFAULT NULL,
    anlasma_kosullari TEXT DEFAULT NULL,
    komisyon_orani DECIMAL(5,2) DEFAULT 0.00,
    notlar TEXT DEFAULT NULL,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_firma (firma_adi),
    INDEX idx_durum (durum),
    INDEX idx_il (il),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 22. SERVİS İHBARLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS servis_ihbarlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servis_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    ihbar_turu VARCHAR(50) DEFAULT '',
    plaka VARCHAR(15) DEFAULT NULL,
    arac_bilgi VARCHAR(200) DEFAULT '',
    hasar_aciklama TEXT DEFAULT NULL,
    asistans_durumu VARCHAR(50) DEFAULT '',
    notlar TEXT DEFAULT NULL,
    durum ENUM('beklemede','devam_ediyor','tamamlandi','iptal') NOT NULL DEFAULT 'beklemede',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_servis (servis_id),
    INDEX idx_dosya (dosya_id),
    INDEX idx_durum (durum),
    FOREIGN KEY (servis_id) REFERENCES servisler(id) ON DELETE CASCADE,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════════════════════════
-- VARSAYILAN VERİLER
-- ═══════════════════════════════════════════════════════════════

-- Admin kullanıcı (şifre: MrHasar2025! → bcrypt hash)
INSERT INTO users (ad_soyad, email, sifre_hash, rol, telefon) VALUES
('Sistem Yöneticisi', 'admin@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '0500 000 0000');
-- NOT: Yukarıdaki hash "password" kelimesine aittir. İlk girişte şifre değiştirin!

-- Örnek kullanıcılar
INSERT INTO users (ad_soyad, email, sifre_hash, rol, telefon) VALUES
('Av. Mehmet Kaya', 'mehmet@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'avukat', '0532 111 2233'),
('Murat Bey', 'murat@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'uzman', '0533 222 3344'),
('Selin Hanım', 'selin@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'personel', '0534 333 4455'),
('Av. Ayşe Çelik', 'ayse@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'avukat', '0535 444 5566');

-- Kasalar
INSERT INTO kasalar (ad, tip, banka_adi, bakiye) VALUES
('Ana Kasa', 'Nakit', NULL, 125000.00),
('Ziraat Bankası', 'Banka', 'Ziraat Bankası', 340000.00),
('İş Bankası', 'Banka', 'İş Bankası', 215000.00),
('Avukat Kasa', 'Nakit', NULL, 45000.00);

-- Tanımlamalar: Sigorta Şirketleri
INSERT INTO tanimlamalar (kategori, deger, sira) VALUES
('sigorta_sirket', 'Axa Sigorta', 1),
('sigorta_sirket', 'Allianz Sigorta', 2),
('sigorta_sirket', 'Mapfre Sigorta', 3),
('sigorta_sirket', 'HDI Sigorta', 4),
('sigorta_sirket', 'Sompo Sigorta', 5),
('sigorta_sirket', 'Anadolu Sigorta', 6),
('sigorta_sirket', 'Ak Sigorta', 7),
('sigorta_sirket', 'Zurich Sigorta', 8),
('sigorta_sirket', 'Groupama Sigorta', 9),
('sigorta_sirket', 'Türk Nippon Sigorta', 10),
('sigorta_sirket', 'Halk Sigorta', 11),
('sigorta_sirket', 'Güneş Sigorta', 12),
('sigorta_sirket', 'Unico Sigorta', 13),
('sigorta_sirket', 'Quick Sigorta', 14),
('sigorta_sirket', 'Generali Sigorta', 15),
('sigorta_sirket', 'Doğa Sigorta', 16),
('sigorta_sirket', 'Magdeburger Sigorta', 17),
('sigorta_sirket', 'Bereket Sigorta', 18),
('sigorta_sirket', 'Ray Sigorta', 19),
('sigorta_sirket', 'Neova Sigorta', 20),
('sigorta_sirket', 'Eureko Sigorta', 21),
('sigorta_sirket', 'Koru Sigorta', 22);

-- Tanımlamalar: Masraf Kalemleri
INSERT INTO tanimlamalar (kategori, deger, sira) VALUES
('masraf_kalemi', 'Eksper Ücreti', 1),
('masraf_kalemi', 'Bilirkişi Ücreti', 2),
('masraf_kalemi', 'Mahkeme Harcı', 3),
('masraf_kalemi', 'Tebligat Gideri', 4),
('masraf_kalemi', 'Araç Çekici', 5),
('masraf_kalemi', 'Otopark Ücreti', 6),
('masraf_kalemi', 'Kargo/Posta', 7),
('masraf_kalemi', 'Vekaletname', 8),
('masraf_kalemi', 'Harç/Damga Vergisi', 9),
('masraf_kalemi', 'Dosya Masrafı', 10),
('masraf_kalemi', 'Yol Masrafı', 11),
('masraf_kalemi', 'Konaklama', 12),
('masraf_kalemi', 'Tercüman Ücreti', 13),
('masraf_kalemi', 'Rapor Ücreti', 14),
('masraf_kalemi', 'Diğer', 15);

-- Tanımlamalar: Evrak Türleri
INSERT INTO tanimlamalar (kategori, deger, sira) VALUES
('evrak_turu', 'Kaza Tespit Tutanağı', 1),
('evrak_turu', 'Trafik Kazası Raporu', 2),
('evrak_turu', 'Nüfus Cüzdanı Fotokopisi', 3),
('evrak_turu', 'Ehliyet Fotokopisi', 4),
('evrak_turu', 'Ruhsat Fotokopisi', 5),
('evrak_turu', 'Vekaletname', 6),
('evrak_turu', 'Hasar Fotoğrafları', 7),
('evrak_turu', 'Onarım Faturası', 8),
('evrak_turu', 'Ekspertiz Raporu', 9),
('evrak_turu', 'Sağlık Raporu', 10),
('evrak_turu', 'Maluliyet Raporu', 11),
('evrak_turu', 'Tedavi Evrakları', 12),
('evrak_turu', 'SGK Dökümü', 13),
('evrak_turu', 'Gelir Belgesi', 14),
('evrak_turu', 'IBAN Bilgisi', 15),
('evrak_turu', 'Sigorta Poliçesi', 16),
('evrak_turu', 'Diğer', 17);

-- Tanımlamalar: Dosya Aşamaları
INSERT INTO tanimlamalar (kategori, deger, sira) VALUES
('dosya_asama', 'Dosya Açık', 1),
('dosya_asama', 'Evrak Bekleniyor', 2),
('dosya_asama', 'Başvuru Hazırlanıyor', 3),
('dosya_asama', 'Sigorta Başvurusu', 4),
('dosya_asama', 'Tahkim Başvurusu', 5),
('dosya_asama', 'Dava Açıldı', 6),
('dosya_asama', 'Bilirkişi Aşaması', 7),
('dosya_asama', 'Karar Bekleniyor', 8),
('dosya_asama', 'Ödeme Bekleniyor', 9),
('dosya_asama', 'Ödeme Alındı', 10),
('dosya_asama', 'Dosya Kapandı', 11);

-- Tanımlamalar: CRM Kaynakları
INSERT INTO tanimlamalar (kategori, deger, sira) VALUES
('crm_kaynak', 'Telefon', 1),
('crm_kaynak', 'Web Formu', 2),
('crm_kaynak', 'Sosyal Medya', 3),
('crm_kaynak', 'Yönlendirme', 4),
('crm_kaynak', 'Servis/Kaportacı', 5),
('crm_kaynak', 'Acente', 6),
('crm_kaynak', 'Diğer', 7);

-- Tanımlamalar: Dosya Kaynakları
INSERT INTO tanimlamalar (kategori, deger, sira) VALUES
('dosya_kaynagi', 'Ofis CRM', 1),
('dosya_kaynagi', 'Yönlendiren (Servis, Kaportacı, Acente)', 2),
('dosya_kaynagi', 'Saha Personel', 3),
('dosya_kaynagi', 'Diğer', 4);

-- ═══════════════════════════════════════════
-- TRIGGER: Masraf eklendiğinde kasa bakiyesi düşür
-- ═══════════════════════════════════════════
DELIMITER //

CREATE TRIGGER trg_masraf_after_insert
AFTER INSERT ON masraflar
FOR EACH ROW
BEGIN
    -- Kasa bakiyesini düşür
    UPDATE kasalar SET bakiye = bakiye - NEW.tutar WHERE id = NEW.kasa_id;
    
    -- Kasa hareketine kaydet
    INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id)
    SELECT NEW.kasa_id, NEW.dosya_id, 'masraf', NEW.tutar, k.bakiye, 
           CONCAT('Masraf: ', NEW.masraf_kalemi), NEW.kullanici_id
    FROM kasalar k WHERE k.id = NEW.kasa_id;
END //

CREATE TRIGGER trg_masraf_after_delete
AFTER DELETE ON masraflar
FOR EACH ROW
BEGIN
    -- Kasa bakiyesini geri yükle
    UPDATE kasalar SET bakiye = bakiye + OLD.tutar WHERE id = OLD.kasa_id;
    
    -- Kasa hareketine iade kaydet
    INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id)
    SELECT OLD.kasa_id, OLD.dosya_id, 'duzeltme', OLD.tutar, k.bakiye,
           CONCAT('Masraf İade: ', OLD.masraf_kalemi), OLD.kullanici_id
    FROM kasalar k WHERE k.id = OLD.kasa_id;
END //

DELIMITER ;

-- ═══════════════════════════════════════════
-- VIEW: Dosya özet görünümü (sık kullanılan sorgu)
-- ═══════════════════════════════════════════
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

-- ═══════════════════════════════════════════
-- 23. ARAMA LOGLARI (NetSIPP/Netsantral)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS arama_loglari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arayan VARCHAR(30) DEFAULT NULL,
    arayan_adi VARCHAR(100) DEFAULT NULL,
    aranan VARCHAR(30) DEFAULT NULL,
    arama_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    netsipp_arama_id VARCHAR(50) DEFAULT NULL,
    senaryo VARCHAR(100) DEFAULT NULL,
    yon ENUM('gelen','giden') NOT NULL DEFAULT 'gelen',
    durum VARCHAR(30) DEFAULT 'calıyor',
    sure INT DEFAULT 0 COMMENT 'Arama süresi (saniye)',
    crm_id INT DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    notlar TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arayan (arayan),
    INDEX idx_aranan (aranan),
    INDEX idx_yon (yon),
    INDEX idx_durum (durum),
    INDEX idx_tarih (arama_tarihi),
    INDEX idx_crm (crm_id),
    FOREIGN KEY (crm_id) REFERENCES crm(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 23b. NETSANTRAL BEKLEYEN ÇAĞRILAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS netsantral_bekleyen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arayan_no VARCHAR(30) NOT NULL,
    aranan_no VARCHAR(30) DEFAULT NULL,
    santral_no VARCHAR(30) DEFAULT NULL,
    arama_id VARCHAR(50) DEFAULT NULL,
    tus_bilgisi VARCHAR(10) DEFAULT NULL,
    durum VARCHAR(20) DEFAULT 'bekliyor',
    arayan_adi VARCHAR(100) DEFAULT NULL,
    crm_id INT DEFAULT NULL,
    islendi TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_durum (durum),
    INDEX idx_islendi (islendi),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 24. YÖNLENDİRME (MAĞDUR YÖNLENDİRME TAKİBİ)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS yonlendirme (
    id INT AUTO_INCREMENT PRIMARY KEY,
    magdur_ad_soyad VARCHAR(100) NOT NULL,
    magdur_tc VARCHAR(20) DEFAULT NULL,
    magdur_telefon VARCHAR(20) DEFAULT NULL,
    magdur_telefon2 VARCHAR(20) DEFAULT NULL,
    magdur_il VARCHAR(50) DEFAULT NULL,
    magdur_ilce VARCHAR(50) DEFAULT NULL,
    plaka VARCHAR(20) DEFAULT NULL,
    kaza_tarihi DATE DEFAULT NULL,
    kaza_ili VARCHAR(50) DEFAULT NULL,
    dosya_turu VARCHAR(30) DEFAULT NULL,
    kaynak VARCHAR(100) DEFAULT NULL,
    kaynak_kisi VARCHAR(100) DEFAULT NULL,
    kaynak_telefon VARCHAR(20) DEFAULT NULL,
    durum ENUM('beklemede','arandı','olumlu','olumsuz','dosya_acildi') NOT NULL DEFAULT 'beklemede',
    oncelik VARCHAR(20) DEFAULT 'NORMAL',
    notlar TEXT DEFAULT NULL,
    atanan_id INT DEFAULT NULL,
    donusen_crm_id INT DEFAULT NULL,
    donusen_dosya_id INT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_magdur_ad (magdur_ad_soyad),
    INDEX idx_magdur_tel (magdur_telefon),
    INDEX idx_plaka (plaka),
    INDEX idx_durum (durum),
    INDEX idx_kaynak (kaynak),
    INDEX idx_atanan (atanan_id),
    FOREIGN KEY (atanan_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (donusen_crm_id) REFERENCES crm(id) ON DELETE SET NULL,
    FOREIGN KEY (donusen_dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 25. YÖNLENDİRME NOTLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS yonlendirme_notlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    yonlendirme_id INT NOT NULL,
    not_text TEXT NOT NULL,
    kullanici_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_yonlendirme (yonlendirme_id),
    FOREIGN KEY (yonlendirme_id) REFERENCES yonlendirme(id) ON DELETE CASCADE,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 26. KOMİSYONLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS komisyonlar (
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

-- ═══════════════════════════════════════════
-- 27. GELİRLER
-- ═══════════════════════════════════════════
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

-- ═══════════════════════════════════════════
-- 28. GİDERLER
-- ═══════════════════════════════════════════
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

-- ═══════════════════════════════════════════
-- 29. MESAJLAR
-- ═══════════════════════════════════════════
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

-- ═══════════════════════════════════════════
-- 30. ŞABLONLAR
-- ═══════════════════════════════════════════
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

-- ═══════════════════════════════════════════
-- 31. YETKİLER
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS yetkiler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    modul VARCHAR(50) NOT NULL,
    islem VARCHAR(50) NOT NULL,
    izin TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_yetki (kullanici_id, modul, islem),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 32. AYARLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ayarlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anahtar VARCHAR(100) NOT NULL UNIQUE,
    deger TEXT,
    tip ENUM('text','number','color','image','json') DEFAULT 'text',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 33. CRM EKLERİ
-- ═══════════════════════════════════════════
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

-- ═══════════════════════════════════════════
-- VARSAYILAN AYARLAR
-- ═══════════════════════════════════════════
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
('netsantral_santral_no', '3625026502', 'text'),
('netsantral_kullanici', '', 'text'),
('netsantral_dahili', '102', 'text'),
('netsantral_sifre', '', 'text'),
('netsantral_domain', 'sip6.netsantral.com', 'text'),
('netsantral_aktif', '1', 'text'),
('openai_api_key', '', 'text'),
('ai_api_key', '', 'text');

-- ═══════════════════════════════════════════
-- ADMIN YETKİLERİ (kullanici_id = 1)
-- ═══════════════════════════════════════════
INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin) VALUES
(1, 'dosya', 'goruntule', 1), (1, 'dosya', 'ekle', 1), (1, 'dosya', 'duzenle', 1), (1, 'dosya', 'sil', 1),
(1, 'masraf', 'goruntule', 1), (1, 'masraf', 'ekle', 1), (1, 'masraf', 'duzenle', 1), (1, 'masraf', 'sil', 1),
(1, 'evrak', 'goruntule', 1), (1, 'evrak', 'ekle', 1), (1, 'evrak', 'duzenle', 1), (1, 'evrak', 'sil', 1),
(1, 'crm', 'goruntule', 1), (1, 'crm', 'ekle', 1), (1, 'crm', 'duzenle', 1), (1, 'crm', 'sil', 1),
(1, 'muhasebe', 'goruntule', 1), (1, 'muhasebe', 'ekle', 1), (1, 'muhasebe', 'duzenle', 1), (1, 'muhasebe', 'sil', 1),
(1, 'ajanda', 'goruntule', 1), (1, 'ajanda', 'ekle', 1), (1, 'ajanda', 'duzenle', 1), (1, 'ajanda', 'sil', 1),
(1, 'bildirim', 'goruntule', 1), (1, 'bildirim', 'ekle', 1), (1, 'bildirim', 'duzenle', 1), (1, 'bildirim', 'sil', 1),
(1, 'sistem', 'goruntule', 1), (1, 'sistem', 'ekle', 1), (1, 'sistem', 'duzenle', 1), (1, 'sistem', 'sil', 1),
(1, 'hesaplamalar', 'goruntule', 1), (1, 'hesaplamalar', 'ekle', 1), (1, 'hesaplamalar', 'duzenle', 1), (1, 'hesaplamalar', 'sil', 1),
(1, 'tanimlamalar', 'goruntule', 1), (1, 'tanimlamalar', 'ekle', 1), (1, 'tanimlamalar', 'duzenle', 1), (1, 'tanimlamalar', 'sil', 1),
(1, 'ortaklar', 'goruntule', 1), (1, 'ortaklar', 'ekle', 1), (1, 'ortaklar', 'duzenle', 1), (1, 'ortaklar', 'sil', 1),
(1, 'servis', 'goruntule', 1), (1, 'servis', 'ekle', 1), (1, 'servis', 'duzenle', 1), (1, 'servis', 'sil', 1),
(1, 'mesajlar', 'goruntule', 1), (1, 'mesajlar', 'ekle', 1), (1, 'mesajlar', 'duzenle', 1), (1, 'mesajlar', 'sil', 1),
(1, 'netsantral', 'goruntule', 1), (1, 'netsantral', 'arama_yap', 1), (1, 'netsantral', 'transfer', 1), (1, 'netsantral', 'ayarlar', 1),
(1, 'netsipp', 'goruntule', 1), (1, 'netsipp', 'gelen_cagri', 1), (1, 'netsipp', 'giden_cagri', 1);

-- ═══════════════════════════════════════════
-- EK TANIMLAMALAR
-- ═══════════════════════════════════════════
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

-- ═══════════════════════════════════════════
-- TAMAMLANDI
-- ═══════════════════════════════════════════
-- Kurulum sonrası kontrol:
-- SELECT COUNT(*) FROM users;           → 5 kayıt olmalı
-- SELECT COUNT(*) FROM kasalar;         → 4 kayıt olmalı
-- SELECT COUNT(*) FROM tanimlamalar;    → ~100 kayıt olmalı
-- SHOW TRIGGERS;                        → 2 trigger olmalı
-- SHOW TABLES;                          → 34 tablo olmalı
