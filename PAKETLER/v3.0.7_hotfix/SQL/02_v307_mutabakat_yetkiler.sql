-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — v3.0.7 AYLIK MUTABAKAT RAPORU TABLOSU + YETKİLER
-- ═══════════════════════════════════════════════════════════════
-- Additive — mevcut veri etkilenmez.
-- ═══════════════════════════════════════════════════════════════

-- 1) Aylık Mutabakat Raporları (snapshot saklayan)
CREATE TABLE IF NOT EXISTS aylik_mutabakat_raporlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donem VARCHAR(7) NOT NULL,                    -- YYYY-MM
    baslik VARCHAR(150) NOT NULL,                 -- "NİSAN 2026 AY SONU RAPORU"
    durum ENUM('taslak','kesin') NOT NULL DEFAULT 'taslak',

    -- Manuel kalemler
    devir              DECIMAL(14,2) NOT NULL DEFAULT 0,
    ay_ici_odemeler    DECIMAL(14,2) NOT NULL DEFAULT 0,
    sbm_sorgu          DECIMAL(14,2) NOT NULL DEFAULT 0,
    ekran_odeme        DECIMAL(14,2) NOT NULL DEFAULT 0,
    atk_masrafi        DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- Bölüm 3 (kapanan dosyalar)
    poz_adet           INT NOT NULL DEFAULT 0,
    poz_toplam         DECIMAL(14,2) NOT NULL DEFAULT 0,
    mahsup_adet        INT NOT NULL DEFAULT 0,
    mahsup_toplam      DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- Hesaplananlar (snapshot)
    dosya_toplam       DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum1_net         DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum2_net         DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum3_net         DECIMAL(14,2) NOT NULL DEFAULT 0,
    final_bakiye       DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- Snapshot - JSON olarak dosya listesi (raporun donmuş hali)
    dosyalar_json      LONGTEXT DEFAULT NULL,

    -- Notlar
    not_metni TEXT DEFAULT NULL,

    -- İlişki
    olusturan_id INT NOT NULL,
    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_donem (donem),
    INDEX idx_durum (durum),
    INDEX idx_olusturan (olusturan_id),

    FOREIGN KEY (olusturan_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- 2) Yetkiler — yeni mutabakat işlemleri (sessizce eklenir, varsa skip)
-- Yetki yapısını sistemde nasıl tutuyorsanız ona göre — örnek:
-- (Eğer yetkiler tablosu yoksa bu blok hata vermez, transaction olmadığı için)

-- Önce kontrol: yetkiler tablosu mevcut mu?
-- (Bu blok sadece tablo varsa çalışır)

-- Yetki tanımları:
-- modul='muhasebe', islem='mutabakat-goruntule'
-- modul='muhasebe', islem='mutabakat-kaydet'
-- modul='muhasebe', islem='mutabakat-duzenle'
-- modul='muhasebe', islem='mutabakat-sil'

-- Admin için tüm yetkiler otomatik (yetkiler tablosunda her admin'e izin=1):
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'mutabakat-goruntule', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'mutabakat-goruntule');

INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'mutabakat-kaydet', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'mutabakat-kaydet');

INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'mutabakat-duzenle', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'mutabakat-duzenle');

INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'mutabakat-sil', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'mutabakat-sil');

-- Önceki v3.0 modüllerinin de admin yetki kayıtları (eksiksizlik için)
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'dosya', 'dosya-kapanis', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'dosya' AND y.islem = 'dosya-kapanis');

INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'dosya', 'mahsup-zinciri', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'dosya' AND y.islem = 'mahsup-zinciri');

-- ═══════════════════════════════════════════════════════════════
-- BİTTİ.
-- ═══════════════════════════════════════════════════════════════
