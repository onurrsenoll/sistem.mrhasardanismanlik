-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — v3.0 KAPSAMLI MİGRASYON
-- Tarih: 2026-05-04
-- ═══════════════════════════════════════════════════════════════
-- ALTIN KURAL: Hiçbir mevcut veri silinmez. Sadece eklemeler:
--   · 1 yeni tablo (dosya_kapanis_kayitlari)
--   · 5 yeni kolon (dosyalar.eksper_paydas_id, magdurlar.gelir_durumu, vb.)
--   · 4 yeni ayar (asgari ücret yıllık değerler)
-- Mevcut akışlar etkilenmez.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) DOSYA_KAPANIS_KAYITLARI — Madde 5.4 entegre kapanış tablosu
-- ─────────────────────────────────────────────────────────────
-- Excel hesap tablosunun birebir karşılığı, kalıcı snapshot.
-- Her dosya kapatıldığında BİR kayıt oluşturulur.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dosya_kapanis_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dosya_id INT NOT NULL,
    kapatma_tarihi DATE NOT NULL,
    kapatan_kullanici_id INT NOT NULL,

    -- Excel'in birebir karşılığı (TL)
    sigorta_tahsilat       DECIMAL(12,2) NOT NULL DEFAULT 0,
    sozlesme_orani         DECIMAL(5,2)  NOT NULL DEFAULT 20.00,
    sozlesme_tutar         DECIMAL(12,2) NOT NULL DEFAULT 0,
    noter_masrafi          DECIMAL(12,2) NOT NULL DEFAULT 0,
    vekalet_masrafi        DECIMAL(12,2) NOT NULL DEFAULT 0,
    muvekkile_havale       DECIMAL(12,2) NOT NULL DEFAULT 0,
    yonlendiren_ucreti     DECIMAL(12,2) NOT NULL DEFAULT 0,
    yonlendiren_kaynak     VARCHAR(150)  DEFAULT NULL,
    yonlendiren_paydas_id  INT DEFAULT NULL,
    net_vekalet_ucreti     DECIMAL(12,2) NOT NULL DEFAULT 0,
    faiz                   DECIMAL(12,2) NOT NULL DEFAULT 0,
    stopaj                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    kdv_orani              DECIMAL(5,2)  NOT NULL DEFAULT 20.00,
    kdv_tutar              DECIMAL(12,2) NOT NULL DEFAULT 0,
    azil_masrafi           DECIMAL(12,2) NOT NULL DEFAULT 0,
    diger_giderler         DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Hesaplananlar
    toplam_kazanc          DECIMAL(12,2) NOT NULL DEFAULT 0,
    dosya_masraflari       DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_toplam_kazanc      DECIMAL(12,2) NOT NULL DEFAULT 0,
    yari_pay_yuzde         DECIMAL(5,2)  NOT NULL DEFAULT 50.00,
    onur_payi              DECIMAL(12,2) NOT NULL DEFAULT 0,
    avukat_payi            DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Mahsup ve ödeme akışı
    dosya_basi_odenen      DECIMAL(12,2) NOT NULL DEFAULT 0,
    dosya_sonunda_odenen   DECIMAL(12,2) NOT NULL DEFAULT 0,
    mahsup_edilecek        DECIMAL(12,2) NOT NULL DEFAULT 0,
    mahsup_uygulanan       DECIMAL(12,2) NOT NULL DEFAULT 0,
    mahsup_durumu          ENUM('beklemede','tamamlandi','iptal') DEFAULT 'beklemede',
    mahsup_kaynak_dosya_id INT DEFAULT NULL,

    -- Zarar mahsubu (madde 5.4 — net negatifse)
    zarar_var              TINYINT(1) NOT NULL DEFAULT 0,
    zarar_tutari           DECIMAL(12,2) NOT NULL DEFAULT 0,
    zarar_paylasim         ENUM('tek_taraflı','yari_yariya','ozel') DEFAULT 'yari_yariya',

    -- Notlar
    not_metni              TEXT DEFAULT NULL,

    -- İlişkiler
    avukat_ortak_id        INT DEFAULT NULL,
    kasa_id                INT DEFAULT NULL,         -- gelir kaydedilen kasa
    gelir_id               INT DEFAULT NULL,         -- gelirler tablosundaki kayıt
    hesap_tablosu_evrak_id INT DEFAULT NULL,         -- evraklar tablosundaki PDF/HTML

    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_dosya_kapanis (dosya_id),
    INDEX idx_kapatma_tarihi (kapatma_tarihi),
    INDEX idx_avukat_ortak (avukat_ortak_id),
    INDEX idx_yonlendiren_paydas (yonlendiren_paydas_id),
    INDEX idx_mahsup_kaynak (mahsup_kaynak_dosya_id),
    INDEX idx_mahsup_durumu (mahsup_durumu),

    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT,
    FOREIGN KEY (kapatan_kullanici_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─────────────────────────────────────────────────────────────
-- 2) DOSYALAR — eksper paydaş kolonu (geri uyumlu)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE dosyalar
    ADD COLUMN IF NOT EXISTS eksper_paydas_id INT DEFAULT NULL;

-- Index
SET @x := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dosyalar' AND INDEX_NAME = 'idx_dosya_eksper_paydas');
SET @sql := IF(@x = 0, 'ALTER TABLE dosyalar ADD INDEX idx_dosya_eksper_paydas (eksper_paydas_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────
-- 3) MAGDURLAR — gelir durumu enum güncelleme
-- ─────────────────────────────────────────────────────────────
ALTER TABLE magdurlar
    ADD COLUMN IF NOT EXISTS gelir_durumu_tipi ENUM('asgari','asgari_uzeri','beyan_yok') DEFAULT 'asgari';

-- ─────────────────────────────────────────────────────────────
-- 4) AYARLAR — yıllık asgari ücret + Madde 5.4 ayarları
-- ─────────────────────────────────────────────────────────────
INSERT INTO ayarlar (anahtar, deger)
SELECT 'asgari_ucret_2026', '28075.50'
WHERE NOT EXISTS (SELECT 1 FROM ayarlar WHERE anahtar = 'asgari_ucret_2026');

INSERT INTO ayarlar (anahtar, deger)
SELECT 'asgari_ucret_2025', '22104.67'
WHERE NOT EXISTS (SELECT 1 FROM ayarlar WHERE anahtar = 'asgari_ucret_2025');

INSERT INTO ayarlar (anahtar, deger)
SELECT 'kapanis_madde54_aktif', '1'
WHERE NOT EXISTS (SELECT 1 FROM ayarlar WHERE anahtar = 'kapanis_madde54_aktif');

INSERT INTO ayarlar (anahtar, deger)
SELECT 'kapanis_kdv_orani', '20'
WHERE NOT EXISTS (SELECT 1 FROM ayarlar WHERE anahtar = 'kapanis_kdv_orani');

INSERT INTO ayarlar (anahtar, deger)
SELECT 'kapanis_sozlesme_orani', '20'
WHERE NOT EXISTS (SELECT 1 FROM ayarlar WHERE anahtar = 'kapanis_sozlesme_orani');

-- ═══════════════════════════════════════════════════════════════
-- BİTTİ. Tüm migrasyonlar additive — mevcut veri etkilenmedi.
-- ═══════════════════════════════════════════════════════════════
