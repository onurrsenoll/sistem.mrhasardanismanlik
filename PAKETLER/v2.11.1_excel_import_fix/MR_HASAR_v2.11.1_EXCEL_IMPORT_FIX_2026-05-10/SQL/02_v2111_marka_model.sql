-- ═══════════════════════════════════════════════════════════════
-- MR HASAR v2.11.1 — POLİÇE EXCEL IMPORT FIX (MARKA + MODEL YILI)
-- 10.05.2026
-- ═══════════════════════════════════════════════════════════════
-- Bu migration sadece policeler tablosuna 2 yeni kolon ekler.
-- v2.11'in 01_v211_police_fix.sql migration'ı önceden uygulandıysa zaten
-- belge_seri, dogum_tarihi, sase_no, personel kolonları mevcut olmalı.
-- Tüm komutlar idempotent.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS marka VARCHAR(60) DEFAULT '';

ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS model_yili VARCHAR(8) DEFAULT '';

/* Eğer v2.11'in migration'ı henüz çalıştırılmadıysa, eksik kolonları da
 * burada garantiye al (idempotent — varsa atlar). */
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS belge_seri VARCHAR(50) DEFAULT '';
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS dogum_tarihi DATE DEFAULT NULL;
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS sase_no VARCHAR(50) DEFAULT '';
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS personel VARCHAR(120) DEFAULT '';
