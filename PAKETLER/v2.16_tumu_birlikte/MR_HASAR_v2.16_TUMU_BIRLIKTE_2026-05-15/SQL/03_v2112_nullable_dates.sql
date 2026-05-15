-- ═══════════════════════════════════════════════════════════════
-- MR HASAR v2.11.2 — EKSİK BİLGİ KABUL (NULLABLE TARİH KOLONLARI)
-- 10.05.2026
-- ═══════════════════════════════════════════════════════════════
-- Yenileme Excel'i yüklenirken bazı satırlarda YENİLEME TARİHİ boş olabilir;
-- kullanıcı önce kayıtları yüklesin, sonra "DÜZENLE" ile tamamlasın istiyor.
-- Bu nedenle policeler tablosundaki tarih kolonları NULL kabul edecek şekilde
-- güncellenir. NOT NULL constraint'i varsa NULLable yapılır, default'u NULL olur.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE policeler
    MODIFY COLUMN bitis_tarihi DATE NULL DEFAULT NULL;

ALTER TABLE policeler
    MODIFY COLUMN baslangic_tarihi DATE NULL DEFAULT NULL;

ALTER TABLE policeler
    MODIFY COLUMN tanzim_tarihi DATE NULL DEFAULT NULL;

/* dogum_tarihi zaten NULLable; sadece garanti */
ALTER TABLE policeler
    MODIFY COLUMN dogum_tarihi DATE NULL DEFAULT NULL;
