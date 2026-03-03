-- ═══════════════════════════════════════════════════════════════
-- MR HASAR SİSTEMİ - ÇİFT KASA KAYDI DÜZELTMESİ
-- TARİH: 2026-03-03
-- AÇIKLAMA: PHP + Trigger çakışmasından kaynaklanan çift kasa
--           hareketlerini tespit ve temizleme
-- ÖNEMLİ: Bu SQL mevcut verilerinizi SİLMEZ, sadece
--          tekrar eden kasa hareketlerini düzeltir.
-- ═══════════════════════════════════════════════════════════════

-- 1. ADIM: Çift kasa hareketlerini tespit et (önizleme)
-- Aşağıdaki sorgu çift kayıtları gösterir, silmez:
SELECT
    kh1.id as silinecek_id,
    kh1.kasa_id,
    kh1.islem_turu,
    kh1.tutar,
    kh1.aciklama,
    kh1.created_at
FROM kasa_hareketleri kh1
INNER JOIN kasa_hareketleri kh2 ON
    kh1.kasa_id = kh2.kasa_id
    AND kh1.islem_turu = kh2.islem_turu
    AND kh1.tutar = kh2.tutar
    AND kh1.kullanici_id = kh2.kullanici_id
    AND kh1.id > kh2.id
    AND ABS(TIMESTAMPDIFF(SECOND, kh1.created_at, kh2.created_at)) < 5
WHERE kh1.islem_turu IN ('gider', 'gelir');

-- 2. ADIM: Çift kasa hareketlerini sil (sadece tekrarları)
DELETE kh1 FROM kasa_hareketleri kh1
INNER JOIN kasa_hareketleri kh2 ON
    kh1.kasa_id = kh2.kasa_id
    AND kh1.islem_turu = kh2.islem_turu
    AND kh1.tutar = kh2.tutar
    AND kh1.kullanici_id = kh2.kullanici_id
    AND kh1.id > kh2.id
    AND ABS(TIMESTAMPDIFF(SECOND, kh1.created_at, kh2.created_at)) < 5
WHERE kh1.islem_turu IN ('gider', 'gelir');

-- 3. ADIM: Kasa bakiyelerini doğru hesapla
-- Her kasa için: başlangıç bakiyesi + gelirler - giderler - masraflar
-- Mevcut trigger bakiye değerlerini düzeltelim
UPDATE kasalar k SET bakiye = (
    SELECT COALESCE(
        (SELECT SUM(CASE
            WHEN kh.islem_turu IN ('gelir', 'duzeltme') THEN kh.tutar
            WHEN kh.islem_turu IN ('gider', 'masraf', 'komisyon') THEN -kh.tutar
            WHEN kh.islem_turu = 'transfer' THEN
                CASE WHEN kh.aciklama LIKE '%GİRİŞ%' OR kh.aciklama LIKE '%GELEN%' THEN kh.tutar ELSE -kh.tutar END
            ELSE 0
        END) FROM kasa_hareketleri kh WHERE kh.kasa_id = k.id),
    0)
);

-- 4. ADIM: Sonuç kontrolü
SELECT id, ad, bakiye, aktif FROM kasalar ORDER BY id;
SELECT COUNT(*) as toplam_hareket FROM kasa_hareketleri;
