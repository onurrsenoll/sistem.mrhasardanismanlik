-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — GÜVENLİK & VERİ KORUMA MİGRASYONU
-- Tarih: 2026-04-28
-- ═══════════════════════════════════════════════════════════════
-- ⚠️  YALNIZCA EKLEME / DEĞİŞTİRME — HİÇBİR VERİ SİLİNMEZ.
-- Sıra önemli: Önce kolonları eklemek, sonra FK'leri güncellemek,
-- sonra refresh_tokens tablosunu yaratmak.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) DOSYALAR — SOFT DELETE KOLONLARI (ADDITIVE)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE dosyalar
    ADD COLUMN IF NOT EXISTS silindi TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS silinme_tarihi DATETIME NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS silen_kullanici_id INT NULL DEFAULT NULL;

ALTER TABLE dosyalar ADD INDEX IF NOT EXISTS idx_dosyalar_silindi (silindi);

-- ─────────────────────────────────────────────────────────────
-- 2) FOREIGN KEY GÜVENLİĞİ — CASCADE → RESTRICT
-- ─────────────────────────────────────────────────────────────
-- Bir dosya yanlışlıkla DELETE edilse bile mağdur/araç/evrak/masraf
-- kayıtları korunur. (Soft-delete uygulandığı için DELETE artık
-- normal akışta hiç çalışmayacak — bu sadece son güvenlik şeridi.)
-- ─────────────────────────────────────────────────────────────

-- magdurlar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magdurlar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE magdurlar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE magdurlar
    ADD CONSTRAINT fk_magdurlar_dosya
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- araclar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'araclar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE araclar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE araclar
    ADD CONSTRAINT fk_araclar_dosya
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- masraflar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'masraflar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE masraflar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE masraflar
    ADD CONSTRAINT fk_masraflar_dosya
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- evraklar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evraklar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE evraklar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE evraklar
    ADD CONSTRAINT fk_evraklar_dosya
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- ─────────────────────────────────────────────────────────────
-- 3) REFRESH TOKEN TABLOSU (YENİ — ADDITIVE)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    ip_adresi VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME DEFAULT NULL,
    gecerli TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_refresh_token (token_hash),
    INDEX idx_refresh_user (kullanici_id),
    INDEX idx_refresh_valid (gecerli, expires_at),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─────────────────────────────────────────────────────────────
-- 4) OTURUMLAR — eski şemada var ama bazı kurulumlarda eksik olabilir
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5) DOSYA ÖZET VIEW — silindi kolonunu yansıt (varsa güncelle)
-- ─────────────────────────────────────────────────────────────
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
    d.silindi,
    d.silinme_tarihi,
    m.tc_kimlik,
    m.ad_soyad AS magdur_adi,
    m.telefon AS magdur_tel,
    a.plaka,
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

-- ═══════════════════════════════════════════════════════════════
-- BİTTİ. Hiçbir veri silinmez. Mevcut yapı korunur, sadece eklemeler.
-- ═══════════════════════════════════════════════════════════════
