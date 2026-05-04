-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — v2.4 PERSONEL + PAYDAŞ MODÜLÜ MİGRASYONU
-- Tarih: 2026-05-03
-- ═══════════════════════════════════════════════════════════════
-- ALTIN KURAL: Hiçbir mevcut veri silinmez. Sadece eklemeler:
--   · 5 yeni tablo (kazanç modeli, prim kayıtları, evraklar, ödemeler)
--   · Sistem ayarına 1 yeni anahtar (varsayılan paydaş kasası)
-- Mevcut tablolar (personel, paydaslar, kasalar, ayarlar) korunur.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) PERSONEL_KAZANC_MODELLERI — esnek kazanç modeli yapısı
-- ─────────────────────────────────────────────────────────────
-- Her personelin BİR aktif kazanç modeli olur. Geçmiş modeller
-- saklanır (gecerlilik_baslangic/bitis ile). Model tipleri:
--   · sabit         → sadece sabit_maas
--   · sabit_prim    → sabit_maas + (prim_adk × ADK + prim_bh × BH)
--   · kademeli_saha → Sercan tipi (toplam dosya bazlı kademe)
--   · kademeli_ofis → ADK + BH ayrı kademeli + kota sistemi
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personel_kazanc_modelleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    model_tipi ENUM('sabit','sabit_prim','kademeli_saha','kademeli_ofis') NOT NULL DEFAULT 'sabit',

    -- Sabit ödemeler
    sabit_maas DECIMAL(12,2) NOT NULL DEFAULT 0,
    yemek_gunluk DECIMAL(8,2) DEFAULT 0,
    yemek_gun_sayisi INT DEFAULT 22,

    -- Basit prim modeli için
    prim_adk DECIMAL(10,2) DEFAULT 0,
    prim_bh DECIMAL(10,2) DEFAULT 0,

    -- Kademeli SAHA modeli (toplam dosya bazlı)
    -- JSON formatı: [{"min":0,"max":10,"birim":0},{"min":11,"max":15,"birim":2500},...]
    saha_kademe_json TEXT DEFAULT NULL,

    -- Kademeli OFİS modeli (ADK + BH ayrı, kota sistemi)
    -- JSON: {"adk_kota":5,"bh_kota":2,"adk_kademe":[...],"bh_kademe":[...]}
    ofis_kota_json TEXT DEFAULT NULL,

    -- Yıllık bonus tablosu (her iki tip için)
    -- JSON: [{"min":180,"max":199,"bonus":50000},...]
    yillik_bonus_json TEXT DEFAULT NULL,

    -- Geçerlilik
    gecerlilik_baslangic DATE NOT NULL,
    gecerlilik_bitis DATE DEFAULT NULL,            -- NULL = aktif
    aktif TINYINT(1) NOT NULL DEFAULT 1,

    notlar TEXT DEFAULT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_personel_aktif (personel_id, aktif),
    INDEX idx_gecerlilik (gecerlilik_baslangic, gecerlilik_bitis),
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─────────────────────────────────────────────────────────────
-- 2) PERSONEL_PRIM_KAYITLARI — dosya bazlı prim takibi
-- ─────────────────────────────────────────────────────────────
-- Dosya açıldığında (sorumlu personel için) otomatik kayıt.
-- Ay sonu hakediş hesaplamasında bu kayıtlar toplanır.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personel_prim_kayitlari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    dosya_id INT NOT NULL,
    dosya_no VARCHAR(20) DEFAULT NULL,
    dosya_turu VARCHAR(20) DEFAULT NULL,            -- ADK / BH
    donem VARCHAR(7) NOT NULL,                       -- YYYY-MM
    durum ENUM('bekliyor','sayildi','iptal','iptal_mahsup') NOT NULL DEFAULT 'bekliyor',
    -- bekliyor       → ay sonu hakedişe sayılacak
    -- sayildi        → hakediş hesaplandı, ödendi
    -- iptal          → dosya iptal oldu, sayılmaz
    -- iptal_mahsup   → önceki ayın hakedişinden mahsup edildi (sonradan iptal)

    hakedis_id INT DEFAULT NULL,                     -- bağlı hakediş kaydı (ödendiğinde)
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

-- ─────────────────────────────────────────────────────────────
-- 3) PERSONEL_ODEMELER — maaş + avans + diğer ödemeler
-- ─────────────────────────────────────────────────────────────
-- Personel kartından "Ödeme Yap" → bu tabloya kayıt + kasa düşer +
-- kasa_hareketleri'ne yansır + opsiyonel PDF dekont evrak'a bağlanır.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personel_odemeler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    odeme_turu ENUM('maas','prim','avans','ikramiye','mesai','diger') NOT NULL DEFAULT 'maas',
    tutar DECIMAL(12,2) NOT NULL,
    donem VARCHAR(7) DEFAULT NULL,                   -- YYYY-MM (varsa)
    odeme_tarihi DATE NOT NULL,
    kasa_id INT DEFAULT NULL,
    aciklama VARCHAR(500) DEFAULT NULL,
    hakedis_id INT DEFAULT NULL,                     -- bağlı hakediş kaydı (varsa)
    evrak_id INT DEFAULT NULL,                       -- dekont evrakı (varsa)

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_personel_donem (personel_id, donem),
    INDEX idx_odeme_tarihi (odeme_tarihi),
    INDEX idx_odeme_turu (odeme_turu),
    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─────────────────────────────────────────────────────────────
-- 4) PERSONEL_EVRAKLARI — sözleşme + dekont + diğer
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personel_evraklari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    personel_id INT NOT NULL,
    odeme_id INT DEFAULT NULL,                       -- bağlı ödeme (dekont için)
    evrak_turu VARCHAR(80) NOT NULL,                 -- sozlesme, maas_dekontu, avans_dekontu, vb.
    evrak_etiketi VARCHAR(150) DEFAULT NULL,         -- "Mart 2026 Maaş Dekontu" gibi
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

-- ─────────────────────────────────────────────────────────────
-- 5) PAYDAS_EVRAKLARI — paydaş için sözleşme + dekont + diğer
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paydas_evraklari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paydas_id INT NOT NULL,
    komisyon_id INT DEFAULT NULL,                    -- bağlı komisyon (varsa)
    evrak_turu VARCHAR(80) NOT NULL,                 -- sozlesme, dekont, vb.
    evrak_etiketi VARCHAR(150) DEFAULT NULL,
    dosya_adi VARCHAR(255) NOT NULL,
    sunucu_adi VARCHAR(255) NOT NULL,
    dosya_yolu VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) DEFAULT NULL,
    dosya_boyutu INT NOT NULL DEFAULT 0,
    yukleyen_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_paydas (paydas_id),
    INDEX idx_evrak_turu (evrak_turu),
    INDEX idx_komisyon (komisyon_id),
    FOREIGN KEY (paydas_id) REFERENCES paydaslar(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- ─────────────────────────────────────────────────────────────
-- 5b) PAYDAS_KOMISYONLARI — evrak_id kolonu ekleme (varsa atla)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE paydas_komisyonlari
    ADD COLUMN IF NOT EXISTS evrak_id INT DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────
-- 6) AYARLAR — varsayılan paydaş ödeme kasası anahtarı
-- ─────────────────────────────────────────────────────────────
-- Dosya açılırken paydaş seçilirse bu kasadan otomatik düşülür.
-- Boş veya 0 ise kasa hareketi yazılmaz (sembolik ödendi).
-- Kasa adı "MR ANA KASA" → admin sistem ayarlarından kasa_id'yi tanımlar.
-- ─────────────────────────────────────────────────────────────
INSERT INTO ayarlar (anahtar, deger, aciklama)
SELECT 'varsayilan_paydas_kasa_id', '', 'Dosya açılırken paydaş otomatik ödemesinin yapılacağı kasa ID (boş = kasa hareketi yazma)'
WHERE NOT EXISTS (SELECT 1 FROM ayarlar WHERE anahtar = 'varsayilan_paydas_kasa_id');

-- ─────────────────────────────────────────────────────────────
-- 7) ÖRNEK ŞABLON — Sercan tipi kademeli saha modeli
-- ─────────────────────────────────────────────────────────────
-- Frontend şablonlardan birini seçince bu yapı kullanılır.
-- Bu sadece referans — gerçek personel modelleri admin tarafından
-- frontend'den oluşturulacak.
-- ─────────────────────────────────────────────────────────────
-- Sercan SAHA modeli örneği (JSON):
-- saha_kademe_json:
-- [
--   {"min":0,  "max":10, "birim":0,    "etiket":"Hedef Altı"},
--   {"min":11, "max":15, "birim":2500, "etiket":"Kademe 1"},
--   {"min":16, "max":20, "birim":3500, "etiket":"Kademe 2"},
--   {"min":21, "max":999,"birim":5000, "etiket":"Kademe 3"}
-- ]
-- yillik_bonus_json:
-- [
--   {"min":180,"max":199,"bonus":50000, "etiket":"Bronz"},
--   {"min":200,"max":219,"bonus":75000, "etiket":"Gümüş"},
--   {"min":220,"max":9999,"bonus":100000,"etiket":"Altın"}
-- ]

-- Ofis Çağrı Uzmanı OFİS modeli örneği (JSON):
-- ofis_kota_json:
-- {
--   "adk_kota":5, "bh_kota":2,
--   "adk_kademe":[
--     {"min":0,  "max":4,  "birim":0,    "etiket":"Hedef Altı"},
--     {"min":5,  "max":7,  "birim":1500, "etiket":"Kademe 1"},
--     {"min":8,  "max":10, "birim":1750, "etiket":"Kademe 2"},
--     {"min":11, "max":14, "birim":2000, "etiket":"Kademe 3"},
--     {"min":15, "max":999,"birim":2500, "etiket":"Kademe 4"}
--   ],
--   "bh_kademe":[
--     {"min":0,"max":1, "birim":0,   "etiket":"Hedef Altı"},
--     {"min":2,"max":3, "birim":2500,"etiket":"Kademe 1"},
--     {"min":4,"max":5, "birim":3000,"etiket":"Kademe 2"},
--     {"min":6,"max":7, "birim":3500,"etiket":"Kademe 3"},
--     {"min":8,"max":99,"birim":4500,"etiket":"Kademe 4"}
--   ]
-- }

-- ═══════════════════════════════════════════════════════════════
-- BİTTİ. Hiçbir mevcut veri etkilenmedi. Tüm yeni eklemeler.
-- ═══════════════════════════════════════════════════════════════
