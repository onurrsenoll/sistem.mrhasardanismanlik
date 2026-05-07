-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — v2.5 PAYDAŞ TÜR + DOSYA KAYNAĞI MİGRASYONU
-- Tarih: 2026-05-07
-- ═══════════════════════════════════════════════════════════════
-- ALTIN KURAL: Hiçbir mevcut veri silinmez veya güncellenmez.
--   · paydaslar.tur kolonu VARCHAR(40)'a genişletilir (ENUM ise)
--     → 5 yeni tür değeri kabul edilir: servis, kaportaci, acente,
--       pasif_temsilci, diger (mevcut avukat / sigorta_acentesi korunur)
--   · dosyalar tablosuna DOKUNULMAZ (mevcut paydas_id, dosya_kaynagi,
--     sigorta_brans, talep_turu kolonları korunur — sadece UI değişir)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) paydaslar.tur — VARCHAR'a genişletme
-- ─────────────────────────────────────────────────────────────
-- ENUM ise yeni değerler eklemek için MODIFY gerekir.
-- VARCHAR ise bu komut zaten geçerli olur (yan etkisi yok).
-- Mevcut tüm değerler (avukat, sigorta_acentesi, vb.) korunur.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE paydaslar
    MODIFY COLUMN tur VARCHAR(40) NOT NULL DEFAULT 'sigorta_acentesi';

-- ─────────────────────────────────────────────────────────────
-- 2) Index — tur bazlı listeleme için (varsa atla)
-- ─────────────────────────────────────────────────────────────
-- IF NOT EXISTS bu MySQL sürümlerinde desteklenmediği için
-- error tolerant şekilde dener; başarısız olursa görmezden gelinir.
-- ─────────────────────────────────────────────────────────────
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'paydaslar'
      AND index_name = 'idx_paydaslar_tur'
);
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_paydaslar_tur ON paydaslar (tur)',
    'SELECT "idx_paydaslar_tur zaten var" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────
-- BİLGİ: Mevcut veri DOKUNULMAZ
-- ─────────────────────────────────────────────────────────────
-- Mevcut tur='sigorta_acentesi' kayıtları korunur. Kullanıcı
-- isterse paydaş kartından tek tek 'acente' olarak günceller.
-- Mevcut tur='avukat' kayıtları İŞ ORTAKLARI sayfasında görünür.
-- Yeni türler (servis, kaportaci, acente, pasif_temsilci, diger)
-- İŞ PAYDAŞLARI sayfasında listelenir.
-- ─────────────────────────────────────────────────────────────
