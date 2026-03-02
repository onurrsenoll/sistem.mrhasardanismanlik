-- ═══════════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - DOSYA TAKİP SİSTEMİ
-- BİRLEŞİK VERİTABANI ŞEMASI (TÜM TABLOLAR)
-- Tarih: 2026-02-16
-- MariaDB 10.6+ / MySQL 8.0+
--
-- KURULUM:
-- 1. cPanel → phpMyAdmin → Veritabanı oluştur (mr_hasar_db)
-- 2. SQL sekmesi → Bu dosyanın TAMAMINI yapıştır → Çalıştır
-- 3. "Dış anahtar denetlemesini etkinleştir" kutucuğundaki TİKİ KALDIRIN
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_turkish_ci';
SET FOREIGN_KEY_CHECKS = 0;

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
    dosya_turu ENUM('ADK','BH','MDK') NOT NULL,
    talep_turu VARCHAR(100) DEFAULT NULL,
    asama VARCHAR(50) NOT NULL DEFAULT 'Dosya Açık',
    hasar_no VARCHAR(30) DEFAULT NULL,
    sigorta_sirket VARCHAR(100) DEFAULT NULL,
    police_no VARCHAR(50) DEFAULT NULL,
    sigorta_turu VARCHAR(50) DEFAULT NULL,
    dosya_kaynagi VARCHAR(50) DEFAULT NULL,
    avukat_id INT DEFAULT NULL,
    ortak_id INT DEFAULT NULL,
    sorumlu_id INT DEFAULT NULL,
    paydas_id INT DEFAULT NULL,
    haklilik INT NOT NULL DEFAULT 100,
    komisyon_orani DECIMAL(5,2) DEFAULT 0.00,
    hak_mahrumiyet TINYINT(1) NOT NULL DEFAULT 0,
    kaza_tarihi DATE DEFAULT NULL,
    kaza_il VARCHAR(50) DEFAULT NULL,
    kaza_ilce VARCHAR(50) DEFAULT NULL,
    plaka VARCHAR(15) DEFAULT NULL,
    -- BH özel alanlar
    pozisyon VARCHAR(20) DEFAULT NULL,
    kusur_durumu VARCHAR(20) DEFAULT NULL,
    sakatlik_aciklama TEXT DEFAULT NULL,
    -- BH sürücü ve sigorta alanları
    sorumlu_sigorta VARCHAR(255) DEFAULT NULL,
    surucu_ad VARCHAR(255) DEFAULT NULL,
    surucu_ehliyet VARCHAR(100) DEFAULT NULL,
    surucu_kusur INT DEFAULT NULL,
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
    INDEX idx_ortak (ortak_id),
    INDEX idx_paydas (paydas_id),
    INDEX idx_sorumlu (sorumlu_id),
    INDEX idx_kaza_tarihi (kaza_tarihi),
    INDEX idx_created (created_at),
    FOREIGN KEY (avukat_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (ortak_id) REFERENCES ortaklar(id) ON DELETE SET NULL,
    FOREIGN KEY (sorumlu_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (paydas_id) REFERENCES paydaslar(id) ON DELETE SET NULL,
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
    ortak_kasa_tipi VARCHAR(20) DEFAULT NULL COMMENT 'ortak = iş ortağı paylaşımlı kasa',
    ortak_ids TEXT DEFAULT NULL COMMENT 'virgülle ayrılmış ortak idleri (ör: 1,2)',
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
    kasa_id INT DEFAULT NULL,
    aciklama TEXT DEFAULT NULL,
    islem_tarihi DATE NOT NULL,
    kullanici_id INT NOT NULL,
    odeme_durumu VARCHAR(20) DEFAULT 'odendi',
    paydas_komisyon_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_kasa (kasa_id),
    INDEX idx_tarih (islem_tarihi),
    INDEX idx_odeme_durumu (odeme_durumu),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
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
-- 9. CRM (POTANSİYEL MÜŞTERİLER)
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
-- 11. CRM EKLERİ (DOSYA/SES/FOTOĞRAF)
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
-- 12. HESAPLAMALAR
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
-- 13. TANIMLAMALAR
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
-- 14. BİLDİRİMLER
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bildirimler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gonderen_id INT DEFAULT NULL,
    alici_id INT NOT NULL,
    baslik VARCHAR(200) NOT NULL,
    icerik TEXT DEFAULT NULL,
    okundu TINYINT(1) NOT NULL DEFAULT 0,
    tip ENUM('bildirim','mesaj','uyari','sistem','sms','bilgi') NOT NULL DEFAULT 'bildirim',
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
-- 15. AJANDA / GÖREVLER
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
-- 16. LOG KAYITLARI
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
-- 17. OTURUMLAR (JWT Blacklist)
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
-- 18. ORTAKLAR (İŞ ORTAKLARI - AVUKATLAR)
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
-- 19. ORTAK HAREKETLERİ (FİNANSAL)
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
-- 20. PAYDAŞLAR (İŞ PAYDAŞLARI)
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
    prim_adk DECIMAL(10,2) NOT NULL DEFAULT 0,
    prim_bh DECIMAL(10,2) NOT NULL DEFAULT 0,
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
-- 21. PAYDAŞ KOMİSYONLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS paydas_komisyonlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paydas_id INT NOT NULL,
    dosya_id INT DEFAULT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    durum ENUM('bekliyor','odendi','iptal') NOT NULL DEFAULT 'bekliyor',
    tarih DATE DEFAULT NULL,
    odeme_tarihi DATE DEFAULT NULL,
    kasa_id INT DEFAULT NULL,
    aciklama VARCHAR(500) DEFAULT '',
    created_by INT DEFAULT NULL,
    masraf_id INT DEFAULT NULL,
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
-- 22. SERVİSLER
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
-- 23. SERVİS İHBARLARI
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

-- ═══════════════════════════════════════════
-- 24. KOMİSYONLAR
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
-- 25. GELİRLER
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
-- 26. GİDERLER
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
-- 27. MESAJLAR
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
-- 28. ŞABLONLAR
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
-- 29. YETKİLER
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
-- 30. AYARLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ayarlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anahtar VARCHAR(100) NOT NULL UNIQUE,
    deger TEXT,
    tip ENUM('text','number','color','image','json') DEFAULT 'text',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 31. ARAMA LOGLARI (NETSANTRAL/NETSIPP)
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
-- 32A. SMS LOGLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sms_loglari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telefon VARCHAR(30) NOT NULL,
    mesaj TEXT NOT NULL,
    dosya_id INT DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'bekliyor' COMMENT 'gonderildi, hata, pasif, bekliyor',
    sonuc_mesaj VARCHAR(500) DEFAULT NULL,
    bulk_id VARCHAR(100) DEFAULT NULL COMMENT 'NetGSM bulk ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_durum (durum),
    INDEX idx_telefon (telefon),
    INDEX idx_tarih (created_at),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL,
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 32. GELEN SMSLER (İNTERAKTİF SMS WEBHOOK)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gelen_smsler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(50) DEFAULT NULL COMMENT 'NetGSM messageId',
    gonderen VARCHAR(30) NOT NULL COMMENT 'Gonderenin telefon numarasi',
    alici VARCHAR(30) DEFAULT NULL COMMENT 'Alici numara (subscriberNumber)',
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
    INDEX idx_okundu (okundu),
    INDEX idx_tarih (created_at),
    INDEX idx_message_id (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 33. NETSANTRAL BEKLEYEN ÇAĞRILAR
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
-- 33. YÖNLENDİRME (MAĞDUR YÖNLENDİRME TAKİBİ)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS yonlendirme (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sira_no INT DEFAULT NULL,
    yonlendiren VARCHAR(100) DEFAULT NULL,
    yonlendirme_tarihi DATE DEFAULT NULL,
    kaza_turu VARCHAR(50) DEFAULT NULL,
    magdur_ad_soyad VARCHAR(150) DEFAULT NULL,
    magdur_telefon VARCHAR(20) DEFAULT NULL,
    magdur_il VARCHAR(50) DEFAULT NULL,
    magdur_ilce VARCHAR(50) DEFAULT NULL,
    magdur_tc VARCHAR(15) DEFAULT NULL,
    gorusme_tarihi DATETIME DEFAULT NULL,
    durum ENUM('Belirsiz','Alindi','Olumsuz') DEFAULT 'Belirsiz',
    alinmama_nedeni VARCHAR(200) DEFAULT NULL,
    son_durum VARCHAR(200) DEFAULT NULL,
    sonraki_arama DATETIME DEFAULT NULL,
    atanan_id INT DEFAULT NULL,
    donusen_crm_id INT DEFAULT NULL,
    donusen_dosya_id INT DEFAULT NULL,
    batch_id VARCHAR(50) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_durum (durum),
    INDEX idx_yonlendiren (yonlendiren),
    INDEX idx_magdur_telefon (magdur_telefon),
    INDEX idx_batch_id (batch_id),
    INDEX idx_atanan (atanan_id),
    INDEX idx_sonraki_arama (sonraki_arama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 34. YÖNLENDİRME NOTLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS yonlendirme_notlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    yonlendirme_id INT NOT NULL,
    not_text TEXT NOT NULL,
    gorusme_durumu VARCHAR(50) DEFAULT NULL,
    alinmama_nedeni VARCHAR(200) DEFAULT NULL,
    ekleyen_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_yonlendirme (yonlendirme_id),
    FOREIGN KEY (yonlendirme_id) REFERENCES yonlendirme(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;


-- ═══════════════════════════════════════════════════════════════
-- TRIGGER'LAR
-- ═══════════════════════════════════════════════════════════════

DELIMITER //

-- Masraf eklendiğinde kasa bakiyesi düşür (kasa_id NULL ise işlem yapma)
CREATE TRIGGER trg_masraf_after_insert
AFTER INSERT ON masraflar
FOR EACH ROW
BEGIN
    IF NEW.kasa_id IS NOT NULL THEN
        UPDATE kasalar SET bakiye = bakiye - NEW.tutar WHERE id = NEW.kasa_id;
        INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id)
        SELECT NEW.kasa_id, NEW.dosya_id, 'masraf', NEW.tutar, k.bakiye,
               CONCAT('Masraf: ', NEW.masraf_kalemi), NEW.kullanici_id
        FROM kasalar k WHERE k.id = NEW.kasa_id;
    END IF;
END //

-- Masraf silindiğinde kasa bakiyesi geri yükle (kasa_id NULL ise işlem yapma)
CREATE TRIGGER trg_masraf_after_delete
AFTER DELETE ON masraflar
FOR EACH ROW
BEGIN
    IF OLD.kasa_id IS NOT NULL THEN
        UPDATE kasalar SET bakiye = bakiye + OLD.tutar WHERE id = OLD.kasa_id;
        INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id)
        SELECT OLD.kasa_id, OLD.dosya_id, 'duzeltme', OLD.tutar, k.bakiye,
               CONCAT('Masraf İade: ', OLD.masraf_kalemi), OLD.kullanici_id
        FROM kasalar k WHERE k.id = OLD.kasa_id;
    END IF;
END //

-- Gelir eklendiğinde kasa bakiyesi artır
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

-- Gider eklendiğinde kasa bakiyesi düşür
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


-- ═══════════════════════════════════════════════════════════════
-- VIEW: DOSYA ÖZET GÖRÜNÜMÜ
-- ═══════════════════════════════════════════════════════════════
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
    d.ortak_id,
    m.tc_kimlik,
    m.ad_soyad AS magdur_adi,
    m.telefon AS magdur_tel,
    COALESCE(d.plaka, a.plaka) AS plaka,
    a.marka,
    a.model,
    COALESCE(o.ad_soyad, av.ad_soyad) AS avukat_adi,
    o.odeme_orani AS avukat_odeme_orani,
    s.ad_soyad AS sorumlu_adi,
    (SELECT COUNT(*) FROM masraflar ms WHERE ms.dosya_id = d.id) AS masraf_sayisi,
    (SELECT COALESCE(SUM(ms.tutar), 0) FROM masraflar ms WHERE ms.dosya_id = d.id) AS toplam_masraf,
    (SELECT COUNT(*) FROM evraklar ev WHERE ev.dosya_id = d.id) AS evrak_sayisi,
    d.created_at
FROM dosyalar d
LEFT JOIN magdurlar m ON m.dosya_id = d.id
LEFT JOIN araclar a ON a.dosya_id = d.id AND a.taraf = 'magdur'
LEFT JOIN users av ON av.id = d.avukat_id
LEFT JOIN ortaklar o ON o.id = d.ortak_id
LEFT JOIN users s ON s.id = d.sorumlu_id;


-- ═══════════════════════════════════════════════════════════════
-- PERSONEL TABLOSU
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS personel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ad_soyad VARCHAR(100) NOT NULL,
    tc_kimlik VARCHAR(11) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    departman VARCHAR(100) DEFAULT NULL,
    pozisyon VARCHAR(100) DEFAULT NULL,
    maas DECIMAL(12,2) DEFAULT 0.00,
    prim_orani DECIMAL(12,2) DEFAULT 0.00,
    prim_adk DECIMAL(10,2) NOT NULL DEFAULT 0,
    prim_bh DECIMAL(10,2) NOT NULL DEFAULT 0,
    sgk_no VARCHAR(50) DEFAULT NULL,
    iban VARCHAR(34) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    il VARCHAR(50) DEFAULT NULL,
    ise_baslama DATE DEFAULT NULL,
    isten_ayrilma DATE DEFAULT NULL,
    durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
    user_id INT DEFAULT NULL,
    notlar TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_durum (durum),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════════════════════════
-- PERSONEL HAKEDİŞ TABLOSU
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS personel_hakedis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    donem VARCHAR(7) NOT NULL,
    calisan_gun INT DEFAULT 0,
    dosya_sayisi INT DEFAULT 0,
    prim_tutar DECIMAL(12,2) DEFAULT 0.00,
    ek_prim DECIMAL(12,2) DEFAULT 0.00,
    kesinti DECIMAL(12,2) DEFAULT 0.00,
    maas_tutar DECIMAL(12,2) DEFAULT 0.00,
    toplam_hakedis DECIMAL(12,2) DEFAULT 0.00,
    odeme_durumu ENUM('bekliyor','odendi') DEFAULT 'bekliyor',
    odeme_tarihi DATE DEFAULT NULL,
    notlar TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_personel_donem (personel_id, donem),
    INDEX idx_donem (donem),
    INDEX idx_odeme_durumu (odeme_durumu),
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;


-- ═══════════════════════════════════════════
-- 35. POLİÇELER (SİGORTA POLİÇE TAKİBİ)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS policeler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    police_no VARCHAR(50) NOT NULL,
    yenileme_no VARCHAR(50) DEFAULT NULL,
    sigorta_sirketi VARCHAR(100) NOT NULL,
    brans VARCHAR(100) NOT NULL,
    police_turu ENUM('yeni','yenileme','zeyil') NOT NULL DEFAULT 'yeni',
    musteri_adi VARCHAR(150) NOT NULL,
    musteri_tc VARCHAR(11) DEFAULT NULL,
    musteri_telefon VARCHAR(20) DEFAULT NULL,
    musteri_email VARCHAR(100) DEFAULT NULL,
    plaka VARCHAR(20) DEFAULT NULL,
    tanzim_tarihi DATE NOT NULL,
    baslangic_tarihi DATE NOT NULL,
    bitis_tarihi DATE NOT NULL,
    brut_prim DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_prim DECIMAL(12,2) NOT NULL DEFAULT 0,
    komisyon_orani DECIMAL(5,2) NOT NULL DEFAULT 0,
    komisyon_tutari DECIMAL(12,2) NOT NULL DEFAULT 0,
    tahsilat_durumu ENUM('beklemede','kismen_tahsil','tahsil_edildi') NOT NULL DEFAULT 'beklemede',
    tahsil_edilen DECIMAL(12,2) NOT NULL DEFAULT 0,
    durum ENUM('aktif','suresi_doldu','iptal','yenilendi') NOT NULL DEFAULT 'aktif',
    hatirlatma_gun INT NOT NULL DEFAULT 30,
    hatirlatma_gonderildi TINYINT(1) NOT NULL DEFAULT 0,
    notlar TEXT DEFAULT NULL,
    olusturan_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_police_no (police_no),
    INDEX idx_bitis (bitis_tarihi),
    INDEX idx_durum (durum),
    INDEX idx_tahsilat (tahsilat_durumu),
    INDEX idx_sirket (sigorta_sirketi),
    INDEX idx_musteri (musteri_adi),
    INDEX idx_brans (brans),
    FOREIGN KEY (olusturan_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 36. POLİÇE TAHSİLATLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS police_tahsilatlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    police_id INT NOT NULL,
    tutar DECIMAL(12,2) NOT NULL,
    tahsilat_tarihi DATE NOT NULL,
    odeme_sekli ENUM('nakit','havale','kredi_karti','cek','diger') NOT NULL DEFAULT 'nakit',
    aciklama VARCHAR(500) DEFAULT NULL,
    kasa_id INT DEFAULT NULL,
    kazanc_kaydedildi TINYINT(1) NOT NULL DEFAULT 0,
    olusturan_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_police (police_id),
    INDEX idx_tarih (tahsilat_tarihi),
    INDEX idx_kasa (kasa_id),
    FOREIGN KEY (police_id) REFERENCES policeler(id) ON DELETE CASCADE,
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id) ON DELETE SET NULL,
    FOREIGN KEY (olusturan_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;


-- ═══════════════════════════════════════════════════════════════
-- VARSAYILAN VERİLER
-- ═══════════════════════════════════════════════════════════════

-- Admin kullanıcı (şifre: password → İlk girişte değiştirin!)
-- NOT: INSERT IGNORE kullanıyoruz - mevcut kullanıcılar ASLA silinmez/değişmez!
INSERT IGNORE INTO users (ad_soyad, email, sifre_hash, rol, telefon) VALUES
('Sistem Yöneticisi', 'admin@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '0500 000 0000');

-- Örnek kullanıcılar
INSERT IGNORE INTO users (ad_soyad, email, sifre_hash, rol, telefon) VALUES
('Av. Mehmet Kaya', 'mehmet@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'avukat', '0532 111 2233'),
('Murat Bey', 'murat@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'uzman', '0533 222 3344'),
('Selin Hanım', 'selin@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'personel', '0534 333 4455'),
('Av. Ayşe Çelik', 'ayse@mrhasar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'avukat', '0535 444 5566');

-- Kasalar
-- NOT: INSERT IGNORE - mevcut kasa kayıtları ve bakiyeleri KORUNUR!
INSERT IGNORE INTO kasalar (ad, tip, banka_adi, bakiye) VALUES
('Ana Kasa', 'Nakit', NULL, 0.00),
('Ziraat Bankası', 'Banka', 'Ziraat Bankası', 0.00),
('İş Bankası', 'Banka', 'İş Bankası', 0.00),
('Avukat Kasa', 'Nakit', NULL, 0.00);

-- Tanımlamalar: Sigorta Şirketleri
-- NOT: INSERT IGNORE - mevcut tanımlamalar KORUNUR!
INSERT IGNORE INTO tanimlamalar (kategori, deger, sira) VALUES
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
INSERT IGNORE INTO tanimlamalar (kategori, deger, sira) VALUES
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
INSERT IGNORE INTO tanimlamalar (kategori, deger, sira) VALUES
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
INSERT IGNORE INTO tanimlamalar (kategori, deger, sira) VALUES
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
INSERT IGNORE INTO tanimlamalar (kategori, deger, sira) VALUES
('crm_kaynak', 'Telefon', 1),
('crm_kaynak', 'Web Formu', 2),
('crm_kaynak', 'Sosyal Medya', 3),
('crm_kaynak', 'Yönlendirme', 4),
('crm_kaynak', 'Servis/Kaportacı', 5),
('crm_kaynak', 'Acente', 6),
('crm_kaynak', 'Diğer', 7);

-- Tanımlamalar: Dosya Kaynakları
INSERT IGNORE INTO tanimlamalar (kategori, deger, sira) VALUES
('dosya_kaynagi', 'Ofis CRM', 1),
('dosya_kaynagi', 'Yönlendiren (Servis, Kaportacı, Acente)', 2),
('dosya_kaynagi', 'Saha Personel', 3),
('dosya_kaynagi', 'Diğer', 4);

-- Tanımlamalar: Gelir/Gider/Komisyon/Hizmet/Şablon
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
('sablon_kategori', 'DİĞER', 6),
('police_brans', 'KASKO', 1),
('police_brans', 'TRAFİK', 2),
('police_brans', 'DASK', 3),
('police_brans', 'KONUT', 4),
('police_brans', 'İŞYERİ', 5),
('police_brans', 'SAĞLIK', 6),
('police_brans', 'HAYAT', 7),
('police_brans', 'YANGIN', 8),
('police_brans', 'NAKLİYAT', 9),
('police_brans', 'MÜHENDİSLİK', 10),
('police_brans', 'SORUMLULUK', 11),
('police_brans', 'FERDİ KAZA', 12),
('police_brans', 'DİĞER', 13),
('gelir_turu', 'POLİÇE KOMİSYON', 7);

-- Varsayılan Ayarlar
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
('netsantral_santral_no', '08503625026502', 'text'),
('netsantral_kullanici', '5550984254', 'text'),
('netsantral_dahili', '100', 'text'),
('netsantral_sifre', '', 'text'),
('netsantral_domain', 'sip6.netsantral.com', 'text'),
('netsantral_aktif', '1', 'text'),
('netsantral_yonlendirme_modu', 'dynamic', 'text'),
('netsantral_api_key', 'mr_hasar_2026', 'text'),
('openai_api_key', '', 'text'),
('ai_api_key', '', 'text'),
('sms_aktif', '0', 'text'),
('sms_kullanici', '5550984254', 'text'),
('sms_sifre', '', 'text'),
('sms_baslik', 'MR HASAR', 'text'),
('sms_webhook_api_key', 'mr_hasar_2026', 'text'),
('site_url', '', 'text');

-- Admin Yetkileri (kullanici_id = 1)
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
(1, 'netsipp', 'goruntule', 1), (1, 'netsipp', 'gelen_cagri', 1), (1, 'netsipp', 'giden_cagri', 1),
(1, 'hesap', 'goruntule', 1), (1, 'hesap', 'ekle', 1), (1, 'hesap', 'duzenle', 1), (1, 'hesap', 'sil', 1),
(1, 'rapor', 'goruntule', 1), (1, 'rapor', 'ekle', 1), (1, 'rapor', 'duzenle', 1), (1, 'rapor', 'sil', 1),
(1, 'sms', 'goruntule', 1), (1, 'sms', 'gonder', 1), (1, 'sms', 'ayarlar', 1);

-- ═══════════════════════════════════════════
-- 37. SAHA DOSYALARI (V2)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS saha_dosyalar (
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

-- ═══════════════════════════════════════════
-- 38. SAHA DOSYA MEDYA (GÖRSEL/PDF)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS saha_dosya_medya (
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

-- ═══════════════════════════════════════════
-- 39. DOSYA SÜREÇLERİ (ZAMAN ÇİZELGESİ)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dosya_surecler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    baslik VARCHAR(200) NOT NULL,
    detay TEXT DEFAULT NULL,
    islem_tipi VARCHAR(50) DEFAULT 'sistem',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 40. PORTAL ERİŞİM
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS portal_erisim (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    erisim_kodu VARCHAR(100) NOT NULL UNIQUE,
    tc_kimlik VARCHAR(11) DEFAULT NULL,
    telefon VARCHAR(20) DEFAULT NULL,
    ad_soyad VARCHAR(100) DEFAULT NULL,
    giris_yontemi ENUM('sms_otp','sifre','tc_telefon') DEFAULT 'sms_otp',
    sifre_hash VARCHAR(255) DEFAULT NULL,
    aktif TINYINT(1) DEFAULT 1,
    son_giris DATETIME DEFAULT NULL,
    olusturan_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    INDEX idx_tc (tc_kimlik),
    INDEX idx_telefon (telefon),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE,
    FOREIGN KEY (olusturan_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 41. PORTAL OTP
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS portal_otp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    portal_erisim_id INT NOT NULL,
    otp_kodu VARCHAR(10) NOT NULL,
    kullanildi TINYINT(1) DEFAULT 0,
    son_kullanim DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portal_erisim_id) REFERENCES portal_erisim(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 42. PORTAL MESAJLAR
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS portal_mesajlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    portal_erisim_id INT DEFAULT NULL,
    gonderen ENUM('musteri','ofis') NOT NULL,
    mesaj TEXT NOT NULL,
    okundu TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dosya (dosya_id),
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE CASCADE,
    FOREIGN KEY (portal_erisim_id) REFERENCES portal_erisim(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 43. PORTAL LOGLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS portal_loglar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    portal_erisim_id INT DEFAULT NULL,
    dosya_id INT DEFAULT NULL,
    islem VARCHAR(100) NOT NULL,
    detay TEXT DEFAULT NULL,
    ip_adresi VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portal_erisim_id) REFERENCES portal_erisim(id) ON DELETE SET NULL,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ═══════════════════════════════════════════
-- 44. KONUM KAYITLARI
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS konum_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    enlem DECIMAL(10,7) NOT NULL,
    boylam DECIMAL(10,7) NOT NULL,
    dogruluk DECIMAL(10,2) DEFAULT NULL,
    adres TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_kullanici (kullanici_id),
    INDEX idx_created (created_at),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════════
-- MEVCUT VERİTABANI UPGRADE (ortak_id ekleme)
-- Eğer veritabanı zaten kuruluysa bu komutları çalıştırın:
-- ═══════════════════════════════════════════════════════════════
-- ALTER TABLE dosyalar ADD COLUMN ortak_id INT DEFAULT NULL AFTER avukat_id;
-- ALTER TABLE dosyalar ADD INDEX idx_ortak (ortak_id);
-- ALTER TABLE dosyalar ADD FOREIGN KEY (ortak_id) REFERENCES ortaklar(id) ON DELETE SET NULL;
-- Ardından VIEW'ı güncellemek için yukarıdaki CREATE OR REPLACE VIEW v_dosya_ozet ... sorgusunu çalıştırın.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- KURULUM TAMAMLANDI!
-- ═══════════════════════════════════════════════════════════════
-- Kontrol komutları:
-- SHOW TABLES;                          → 44 tablo olmalı
-- SELECT COUNT(*) FROM users;           → 5 kayıt
-- SELECT COUNT(*) FROM kasalar;         → 4 kayıt
-- SELECT COUNT(*) FROM tanimlamalar;    → ~100 kayıt
-- SELECT COUNT(*) FROM ayarlar;         → ~22 kayıt
-- SELECT COUNT(*) FROM yetkiler;        → ~68 kayıt
-- SHOW TRIGGERS;                        → 4 trigger
-- ═══════════════════════════════════════════════════════════════
