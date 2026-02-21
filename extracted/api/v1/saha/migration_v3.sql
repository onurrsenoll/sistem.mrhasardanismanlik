-- ═══════════════════════════════════════════════════════════
-- SAHA DOSYALARI V3 MİGRASYON
-- hasar_tutari kolonu + suresi_doldu durumu ekleme
-- ═══════════════════════════════════════════════════════════

-- 1. hasar_tutari kolonu ekle (live DB'de yoksa)
ALTER TABLE saha_dosyalar ADD COLUMN hasar_tutari DECIMAL(12,2) DEFAULT NULL AFTER hasar_aciklama;

-- 2. suresi_doldu durumu ekle (3 gün geçen onaylı dosyalar için)
ALTER TABLE saha_dosyalar MODIFY COLUMN durum ENUM('taslak','beklemede','onaylandi','reddedildi','dosyaya_donustu','suresi_doldu') DEFAULT 'taslak';

-- NOT: Bu migration'ı çalıştırdıktan sonra sistem otomatik olarak
-- 3 gün geçmiş onaylanan kayıtları 'suresi_doldu' olarak işaretleyecektir.
