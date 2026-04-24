-- ════════════════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK — YETKİ MATRİSİ GENİŞLETMESİ
-- TARİH : 2026-04-24
-- AMAÇ  : Arama Listesi (crm-arama) ve Çağrı Merkezi (cagri_merkezi)
--         yetkilerinin sisteme tanıtılması.
--
-- GÜVENLİK NOTU:
--   - Bu script HİÇBİR VERİ SİLMEZ, HİÇBİR ALANI UPDATE ETMEZ.
--   - Sadece INSERT IGNORE kullanır (mevcut kayıtlar dokunulmaz).
--   - Admin kullanıcılar has_yetki() içinde bypass olduğu için yetki
--     matrisinde kayıt olmasa bile her şeye erişir — bu script
--     admin kullanıcılara da kayıt eklemez (gereksiz).
--
-- NASIL ÇALIŞTIRILIR:
--   Seçenek A: Bu dosyayı phpMyAdmin > SQL bölümüne yapıştırıp Çalıştır.
--   Seçenek B: Admin paneli > Yetki Yönetimi > (migrate.php endpoint'i
--              UI'ya bağlanırsa) butona bas.
--   Seçenek C: Terminal:
--              mysql -u USER -p DB_ADI < yetki_ekle_20260424.sql
--
-- GERİ DÖNÜŞ (opsiyonel):
--   Bu script geri dönüş gerektirmez. Mevcut izinleri silmez.
--   Eğer yeni eklenen satırları temizlemek istersen (önerilmez):
--     DELETE FROM yetkiler WHERE modul='cagri_merkezi';
--     DELETE FROM yetkiler WHERE modul='crm' AND islem IN (
--       'crm-arama-ekle','crm-arama-duzenle','crm-arama-sil',
--       'crm-arama-excel','crm-arama-toplu-islem','saha-tumunu-gor'
--     );
-- ════════════════════════════════════════════════════════════════════

-- Tablo güvencesi (varsa yok sayılır)
CREATE TABLE IF NOT EXISTS yetkiler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    modul VARCHAR(50) NOT NULL,
    islem VARCHAR(50) NOT NULL,
    izin TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_yetki (kullanici_id, modul, islem),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Admin olmayan aktif kullanıcılara yeni izin satırları ekle (izin=0).
-- INSERT IGNORE ile mevcut satırlar dokunulmaz.
INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'crm', 'crm-arama', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'crm', 'crm-arama-ekle', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'crm', 'crm-arama-duzenle', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'crm', 'crm-arama-sil', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'crm', 'crm-arama-excel', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'crm', 'crm-arama-toplu-islem', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'crm', 'saha-tumunu-gor', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'cagri_merkezi', 'widget-goruntule', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'cagri_merkezi', 'cagri-yap', 0 FROM users u WHERE u.aktif=1 AND u.rol<>'admin';

-- Kontrol sorguları (opsiyonel — bilgi amaçlı)
-- SELECT COUNT(*) as toplam_yetki FROM yetkiler;
-- SELECT modul, islem, COUNT(*) as kisi_sayisi FROM yetkiler WHERE izin=1 GROUP BY modul, islem;
