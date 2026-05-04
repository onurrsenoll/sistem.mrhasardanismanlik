-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — AY SONU RAPORU SNAPSHOT TABLOSU
-- v2.1 GÜVENLİK temiz baz üzerine — additive (mevcut veri etkilenmez)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS aylik_mutabakat_raporlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donem VARCHAR(7) NOT NULL,                    -- YYYY-MM
    baslik VARCHAR(150) NOT NULL,                 -- "NİSAN 2026 AY SONU RAPORU"
    durum ENUM('taslak','kesin') NOT NULL DEFAULT 'taslak',
    ortak_id INT DEFAULT NULL,                    -- avukat/ortak (varsa)

    -- Snapshot — rapor anındaki tüm hesaplar
    bolum1_dosya_sayisi  INT NOT NULL DEFAULT 0,
    bolum1_toplam_masraf DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum1_devir         DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum1_odemeler      DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum1_alacak        DECIMAL(14,2) NOT NULL DEFAULT 0,

    bolum2_kapanan_sayisi INT NOT NULL DEFAULT 0,
    bolum2_toplam_kazanc  DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum2_mahsup         DECIMAL(14,2) NOT NULL DEFAULT 0,
    bolum2_net            DECIMAL(14,2) NOT NULL DEFAULT 0,

    final_bakiye DECIMAL(14,2) NOT NULL DEFAULT 0,

    -- JSON snapshot (rapor anının donmuş hali)
    rapor_data LONGTEXT DEFAULT NULL,

    -- Kullanıcı notları
    not_metni TEXT DEFAULT NULL,

    -- İlişkiler
    olusturan_id INT NOT NULL,
    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_donem_ortak (donem, ortak_id),
    INDEX idx_durum (durum),
    INDEX idx_olusturan (olusturan_id),
    INDEX idx_donem (donem),

    FOREIGN KEY (olusturan_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Yetki kayıtları (admin'lere otomatik)
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'aysonu-kaydet', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'aysonu-kaydet');

INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'aysonu-duzenle', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'aysonu-duzenle');

INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'aysonu-sil', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (SELECT 1 FROM yetkiler y WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'aysonu-sil');
