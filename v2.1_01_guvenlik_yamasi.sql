-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — v2.1 GÜVENLİK & VERİ KORUMA MİGRASYONU
-- Tarih: 2026-04-29
-- ═══════════════════════════════════════════════════════════════
-- ALTIN KURAL: Hiçbir veri silinmez. Yalnızca eklemeler ve FK güvenlik
-- güncellemeleri yapılır. Mevcut tüm modüller (mail, sms, saha, portal,
-- ortak, paydas, personel, police vb.) korunur.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) DOSYALAR — SOFT DELETE KOLONLARI
-- ─────────────────────────────────────────────────────────────
ALTER TABLE dosyalar
    ADD COLUMN IF NOT EXISTS silindi TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS silinme_tarihi DATETIME NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS silen_kullanici_id INT NULL DEFAULT NULL;

-- Index (varsa atla)
SET @x := (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dosyalar' AND INDEX_NAME = 'idx_dosyalar_silindi');
SET @sql := IF(@x = 0, 'ALTER TABLE dosyalar ADD INDEX idx_dosyalar_silindi (silindi)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────
-- 2) FOREIGN KEY GÜVENLİĞİ — CASCADE → RESTRICT
-- ─────────────────────────────────────────────────────────────
-- Yanlışlıkla DELETE çalıştırılsa bile mağdur/araç/evrak/masraf
-- kayıtları korunur. Soft-delete normal akışta DELETE'i devre dışı
-- bırakıyor; bu sadece son güvenlik şeridi.
-- ─────────────────────────────────────────────────────────────

-- magdurlar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magdurlar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE magdurlar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE magdurlar
    ADD CONSTRAINT fk_magdurlar_dosya_v21
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- araclar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'araclar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE araclar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE araclar
    ADD CONSTRAINT fk_araclar_dosya_v21
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- masraflar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'masraflar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE masraflar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE masraflar
    ADD CONSTRAINT fk_masraflar_dosya_v21
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- evraklar
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evraklar'
      AND REFERENCED_TABLE_NAME = 'dosyalar' LIMIT 1);
SET @sql := IF(@fk_name IS NULL, 'SELECT 1', CONCAT('ALTER TABLE evraklar DROP FOREIGN KEY ', @fk_name));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
ALTER TABLE evraklar
    ADD CONSTRAINT fk_evraklar_dosya_v21
    FOREIGN KEY (dosya_id) REFERENCES dosyalar(id) ON DELETE RESTRICT;

-- ─────────────────────────────────────────────────────────────
-- 3) OTURUMLAR TABLOSU — logout blacklist için (yoksa ekle)
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
-- 4) REFRESH TOKEN TABLOSU
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

-- ═══════════════════════════════════════════════════════════════
-- BİTTİ. Hiçbir veri silinmez. Mevcut yapı korunur, sadece eklemeler.
-- ═══════════════════════════════════════════════════════════════
