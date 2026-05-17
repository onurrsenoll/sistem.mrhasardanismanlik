-- ═══════════════════════════════════════════════════════════════
-- MR HASAR v2.24 — KADEMELİ PRİM + CARİ ENTEGRASYON + ÖZLÜK EVRAKI
-- Tarih: 2026-05-17
-- ALTIN KURAL: Mevcut veriler korunur. Sadece eklemeler/idempotent.
-- v2.4'te tanımlı tablolar (personel_kazanc_modelleri,
-- personel_prim_kayitlari, personel_odemeler, personel_evraklari)
-- sağlama altına alınır + eksik kolonlar eklenir.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1) PERSONEL_KAZANC_MODELLERI ───
CREATE TABLE IF NOT EXISTS personel_kazanc_modelleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    model_tipi ENUM('sabit','sabit_prim','kademeli_saha','kademeli_ofis') NOT NULL DEFAULT 'sabit',
    sabit_maas DECIMAL(12,2) NOT NULL DEFAULT 0,
    yemek_gunluk DECIMAL(8,2) DEFAULT 0,
    yemek_gun_sayisi INT DEFAULT 22,
    prim_adk DECIMAL(10,2) DEFAULT 0,
    prim_bh DECIMAL(10,2) DEFAULT 0,
    saha_kademe_json TEXT DEFAULT NULL,
    ofis_kota_json TEXT DEFAULT NULL,
    yillik_bonus_json TEXT DEFAULT NULL,
    gecerlilik_baslangic DATE NOT NULL,
    gecerlilik_bitis DATE DEFAULT NULL,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    notlar TEXT DEFAULT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_personel_aktif (personel_id, aktif),
    INDEX idx_gecerlilik (gecerlilik_baslangic, gecerlilik_bitis),
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─── 2) PERSONEL_PRIM_KAYITLARI ───
CREATE TABLE IF NOT EXISTS personel_prim_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    dosya_id INT NOT NULL,
    dosya_no VARCHAR(20) DEFAULT NULL,
    dosya_turu VARCHAR(20) DEFAULT NULL,
    donem VARCHAR(7) NOT NULL,
    durum ENUM('bekliyor','sayildi','iptal','iptal_mahsup') NOT NULL DEFAULT 'bekliyor',
    hakedis_id INT DEFAULT NULL,
    iptal_tarihi DATETIME DEFAULT NULL,
    iptal_nedeni VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_personel_dosya (personel_id, dosya_id),
    INDEX idx_donem_durum (personel_id, donem, durum),
    INDEX idx_dosya (dosya_id),
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT,
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─── 3) PERSONEL_ODEMELER ───
CREATE TABLE IF NOT EXISTS personel_odemeler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    odeme_turu ENUM('maas','prim','avans','ikramiye','mesai','diger') NOT NULL DEFAULT 'maas',
    tutar DECIMAL(12,2) NOT NULL,
    donem VARCHAR(7) DEFAULT NULL,
    odeme_tarihi DATE NOT NULL,
    kasa_id INT DEFAULT NULL,
    aciklama VARCHAR(500) DEFAULT NULL,
    hakedis_id INT DEFAULT NULL,
    evrak_id INT DEFAULT NULL,
    kasa_hareket_id INT DEFAULT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_personel_donem (personel_id, donem),
    INDEX idx_odeme_tarihi (odeme_tarihi),
    INDEX idx_odeme_turu (odeme_turu),
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- v2.24: personel_odemeler'e kasa_hareket_id eklendi (var olan kurulumlarda eksik olabilir)
ALTER TABLE personel_odemeler ADD COLUMN IF NOT EXISTS kasa_hareket_id INT DEFAULT NULL;

-- ─── 4) PERSONEL_EVRAKLARI ───
CREATE TABLE IF NOT EXISTS personel_evraklari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    odeme_id INT DEFAULT NULL,
    evrak_turu VARCHAR(80) NOT NULL,
    evrak_etiketi VARCHAR(150) DEFAULT NULL,
    dosya_adi VARCHAR(255) NOT NULL,
    sunucu_adi VARCHAR(255) NOT NULL,
    dosya_yolu VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) DEFAULT NULL,
    dosya_boyutu INT NOT NULL DEFAULT 0,
    yukleyen_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_personel (personel_id),
    INDEX idx_evrak_turu (evrak_turu),
    INDEX idx_odeme (odeme_id),
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─── 5) BACKFILL: mevcut personel için varsayılan kazanç modeli ───
-- Eski "sabit_prim" sisteminden gelenlere uyum: personel.maas/prim_adk/prim_bh
-- değerlerini sabit_prim modeline kopyala. Sadece modeli olmayanlara.
INSERT INTO personel_kazanc_modelleri
  (personel_id, model_tipi, sabit_maas, prim_adk, prim_bh, gecerlilik_baslangic, aktif, notlar)
SELECT p.id, 'sabit_prim', IFNULL(p.maas,0), IFNULL(p.prim_adk,0), IFNULL(p.prim_bh,0),
       IFNULL(p.ise_baslama, CURDATE()), 1,
       'v2.24 BACKFILL: eski personel kolonlarından otomatik üretildi'
FROM personel p
LEFT JOIN personel_kazanc_modelleri m ON m.personel_id = p.id AND m.aktif = 1
WHERE m.id IS NULL;

-- ─── 6) BACKFILL: aktif (acik) dosyalar için prim kayıtları üret ───
-- v2.24 öncesi açılmış dosyalar için sorumlu_id varsa prim_kayitlari'na ekle.
-- ON DUPLICATE KEY → çoğul çalıştırılırsa zarar vermez.
INSERT IGNORE INTO personel_prim_kayitlari
  (personel_id, dosya_id, dosya_no, dosya_turu, donem, durum)
SELECT pe.id, d.id, d.dosya_no, d.dosya_turu, DATE_FORMAT(IFNULL(d.acilis_tarihi, d.created_at), '%Y-%m'),
       CASE WHEN LOWER(IFNULL(d.asama,'')) IN ('iptal','iptal_edildi','kapali_iptal')
            THEN 'iptal' ELSE 'bekliyor' END
FROM dosyalar d
INNER JOIN personel pe ON pe.user_id = d.sorumlu_id
WHERE d.sorumlu_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- BİTTİ. Tüm migrasyon idempotent; tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════
