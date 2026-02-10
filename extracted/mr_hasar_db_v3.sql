-- ============================================
-- MR HASAR DANIŞMANLIK - VERİTABANI GÖÇ V3
-- YETKİ SİSTEMİ VE AYARLAR
-- ============================================

-- YETKILER TABLE
CREATE TABLE IF NOT EXISTS yetkiler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT NOT NULL,
    modul VARCHAR(50) NOT NULL,
    islem VARCHAR(50) NOT NULL,
    izin TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_yetki (kullanici_id, modul, islem),
    FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- AYARLAR TABLE
CREATE TABLE IF NOT EXISTS ayarlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anahtar VARCHAR(100) NOT NULL UNIQUE,
    deger TEXT,
    tip ENUM('text','number','color','image','json') DEFAULT 'text',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- DEFAULT AYARLAR
INSERT IGNORE INTO ayarlar (anahtar, deger, tip) VALUES
('firma_adi', 'MR HASAR DANIŞMANLIK', 'text'),
('slogan', 'HER ZAMAN FARK EDER', 'text'),
('logo_url', '', 'image'),
('firma_telefon', '', 'text'),
('firma_email', '', 'text'),
('firma_adres', '', 'text'),
('firma_il', '', 'text'),
('vergi_no', '', 'text'),
('vergi_dairesi', '', 'text'),
('baslik_font_boyut', '20', 'number'),
('baslik_renk', '#2563eb', 'color'),
('slogan_renk', '#94a3b8', 'color'),
('slogan_font_boyut', '10', 'number');

-- DEFAULT ADMIN YETKİLERİ (kullanici_id = 1 admin olarak varsayılır)
-- TÜM MODÜLLER VE İŞLEMLER İÇİN TAM YETKİ
INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin) VALUES
-- DOSYA MODÜLÜİ
(1, 'dosya', 'goruntule', 1),
(1, 'dosya', 'ekle', 1),
(1, 'dosya', 'duzenle', 1),
(1, 'dosya', 'sil', 1),
-- MASRAF MODÜLÜ
(1, 'masraf', 'goruntule', 1),
(1, 'masraf', 'ekle', 1),
(1, 'masraf', 'duzenle', 1),
(1, 'masraf', 'sil', 1),
-- EVRAK MODÜLÜ
(1, 'evrak', 'goruntule', 1),
(1, 'evrak', 'ekle', 1),
(1, 'evrak', 'duzenle', 1),
(1, 'evrak', 'sil', 1),
-- CRM MODÜLÜ
(1, 'crm', 'goruntule', 1),
(1, 'crm', 'ekle', 1),
(1, 'crm', 'duzenle', 1),
(1, 'crm', 'sil', 1),
-- MUHASEBE MODÜLÜ
(1, 'muhasebe', 'goruntule', 1),
(1, 'muhasebe', 'ekle', 1),
(1, 'muhasebe', 'duzenle', 1),
(1, 'muhasebe', 'sil', 1),
-- AJANDA MODÜLÜ
(1, 'ajanda', 'goruntule', 1),
(1, 'ajanda', 'ekle', 1),
(1, 'ajanda', 'duzenle', 1),
(1, 'ajanda', 'sil', 1),
-- BILDIRIM MODÜLÜ
(1, 'bildirim', 'goruntule', 1),
(1, 'bildirim', 'ekle', 1),
(1, 'bildirim', 'duzenle', 1),
(1, 'bildirim', 'sil', 1),
-- SISTEM MODÜLÜ
(1, 'sistem', 'goruntule', 1),
(1, 'sistem', 'ekle', 1),
(1, 'sistem', 'duzenle', 1),
(1, 'sistem', 'sil', 1),
-- HESAP MODÜLÜ
(1, 'hesap', 'goruntule', 1),
(1, 'hesap', 'ekle', 1),
(1, 'hesap', 'duzenle', 1),
(1, 'hesap', 'sil', 1),
-- RAPOR MODÜLÜ
(1, 'rapor', 'goruntule', 1),
(1, 'rapor', 'ekle', 1),
(1, 'rapor', 'duzenle', 1),
(1, 'rapor', 'sil', 1);
