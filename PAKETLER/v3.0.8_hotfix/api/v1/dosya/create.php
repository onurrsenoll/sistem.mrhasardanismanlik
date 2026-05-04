<?php
/**
 * POST /api/v1/dosya/create.php
 * Yeni dosya oluştur (mağdur + araç bilgileriyle birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
// v3.0 — VALİDASYON YARDIMCILARI
@require_once __DIR__ . '/../../config/_validasyon_helpers.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ad_soyad', 'dosya_turu']);

// ═══ v3.0 VALİDASYON — TC, Plaka, IBAN, Telefon, Komisyon, Kaza Tarihi ═══
if (function_exists('mr_validate_dosya_body')) {
    $valHata = mr_validate_dosya_body($body);
    if ($valHata) {
        json_error($valHata, 422);
    }
}

$db = getDB();
ensure_prim_columns();

// ═══ v3.0 ADDITIVE MİGRASYON — eksper paydaş + gelir durumu tipi ═══
try {
    $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS eksper_paydas_id INT DEFAULT NULL");
} catch (\Exception $e) {}
try {
    $db->exec("ALTER TABLE magdurlar ADD COLUMN IF NOT EXISTS gelir_durumu_tipi ENUM('asgari','asgari_uzeri','beyan_yok') DEFAULT 'asgari'");
} catch (\Exception $e) {}
try {
    $db->exec("ALTER TABLE magdurlar ADD COLUMN IF NOT EXISTS gelir_tutari DECIMAL(12,2) DEFAULT NULL");
} catch (\Exception $e) {}

// Frontend 'dosya_kaynak' gönderir, backend 'dosya_kaynagi' bekler
if (!isset($body['dosya_kaynagi']) && isset($body['dosya_kaynak'])) {
    $body['dosya_kaynagi'] = $body['dosya_kaynak'];
}
// Frontend 'komisyon' gönderir, backend 'komisyon_orani' bekler
if (!isset($body['komisyon_orani']) && isset($body['komisyon'])) {
    $body['komisyon_orani'] = $body['komisyon'];
}
// Frontend 'il/ilce' gönderir, backend 'kaza_il/kaza_ilce' bekler
if (!isset($body['kaza_il']) && isset($body['il'])) {
    $body['kaza_il'] = $body['il'];
}
if (!isset($body['kaza_ilce']) && isset($body['ilce'])) {
    $body['kaza_ilce'] = $body['ilce'];
}

// ═══ DDL MİGRASYONLARI — TRANSACTION ÖNCESİ ═══
// ALTER TABLE / CREATE TABLE ifadeleri MariaDB'de implicit commit yapar.
// Transaction bütünlüğünü korumak için tüm DDL işlemleri transaction öncesi çalıştırılır.
try {
    // BH ek sütunları
    $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS sorumlu_sigorta VARCHAR(255) DEFAULT NULL");
    $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS sakatlik_aciklama TEXT DEFAULT NULL");
    $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS surucu_ad VARCHAR(255) DEFAULT NULL");
    $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS surucu_ehliyet VARCHAR(100) DEFAULT NULL");
    $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS surucu_kusur INT DEFAULT NULL");
} catch (\Exception $e) {}

try {
    // Araç ek sütunları (mağdur + karşı araç detayları)
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS belge_tescil_no VARCHAR(50) DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS onarim_gun_suresi INT DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS gecmis_hasar ENUM('var','yok') DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS surucu_ad VARCHAR(100) DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS surucu_tc_kimlik VARCHAR(11) DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS ruhsat_sahibi_surucu ENUM('ayni','farkli') DEFAULT NULL");
} catch (\Exception $e) {}

try {
    // masraflar ek sütunları
    $db->exec("ALTER TABLE masraflar ADD COLUMN IF NOT EXISTS odeme_durumu VARCHAR(20) DEFAULT 'odendi'");
    $db->exec("ALTER TABLE masraflar ADD COLUMN IF NOT EXISTS paydas_komisyon_id INT DEFAULT NULL");
    // kasa_id NULL olabilmeli — ödenmemiş masraflar kasasız kaydedilir
    $db->exec("ALTER TABLE masraflar MODIFY COLUMN kasa_id INT DEFAULT NULL");
} catch (\Exception $e) {}

try {
    // paydas_komisyonlari ek sütunları
    $db->exec("ALTER TABLE paydas_komisyonlari ADD COLUMN IF NOT EXISTS masraf_id INT DEFAULT NULL");
} catch (\Exception $e) {}

// Portal tabloları
try {
    require_once __DIR__ . '/../portal/migration.php';
    ensure_portal_tables();
} catch (\Exception $e) {}

// ═══ ANA İŞLEM — TRANSACTION İÇİNDE ═══
try {
    $db->beginTransaction();

    // 1. Dosya No üret
    $dosyaNo = generate_dosya_no($db);

    // ═══ SORUMLU ID ÇÖZÜMLEME ═══
    // Frontend personel tablosu ID'si gönderir, FK users tablosuna bağlı.
    // Personel ID'sini users tablosundaki user_id'ye çevir.
    $sorumluIdRaw = !empty($body['sorumlu_id']) ? (int)$body['sorumlu_id'] : null;
    $sorumluIdFinal = $user['id']; // varsayılan: giriş yapan kullanıcı

    if ($sorumluIdRaw) {
        // Önce users tablosunda doğrudan var mı kontrol et
        $stmtUCheck = $db->prepare('SELECT id FROM users WHERE id = ?');
        $stmtUCheck->execute([$sorumluIdRaw]);
        if ($stmtUCheck->fetch()) {
            $sorumluIdFinal = $sorumluIdRaw;
        } else {
            // Personel tablosundan user_id'yi al
            $stmtPCheck = $db->prepare('SELECT user_id FROM personel WHERE id = ?');
            $stmtPCheck->execute([$sorumluIdRaw]);
            $persRow = $stmtPCheck->fetch();
            if ($persRow && !empty($persRow['user_id'])) {
                $sorumluIdFinal = (int)$persRow['user_id'];
            }
            // user_id yoksa varsayılan (giriş yapan kullanıcı) kullanılır
        }
    }

    // 2. Dosya kaydı (v3.0.8: sigorta_brans, sorumlu_sigorta, eksper_firma, onarim_servisi tüm türler için INSERT'e eklendi)
    $stmt = $db->prepare('INSERT INTO dosyalar (dosya_no, dosya_turu, talep_turu, asama,
        sigorta_sirket, police_no, sigorta_turu, sigorta_brans, sorumlu_sigorta,
        eksper_firma, eksper_paydas_id, onarim_servisi,
        dosya_kaynagi, avukat_id, ortak_id, sorumlu_id, paydas_id,
        haklilik, komisyon_orani, kaza_tarihi, kaza_il, kaza_ilce, hasar_no, hak_mahrumiyet,
        acilis_tarihi, notlar, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)');

    // HASAR NO: KULLANICININ MANUEL GİRDİĞİ DEĞER KULLANILIR (SİSTEM OTOMATİK ATAMAZ)
    $hasar_no = clean($body['hasar_no'] ?? '');

    $stmt->execute([
        $dosyaNo,
        clean($body['dosya_turu']),
        clean($body['talep_turu'] ?? ''),
        'Dosya Açık',
        clean($body['sigorta_sirket'] ?? ''),
        clean($body['police_no'] ?? ''),
        clean($body['sigorta_turu'] ?? ''),
        clean($body['sigorta_brans'] ?? ''),
        clean($body['sorumlu_sigorta'] ?? ''),
        clean($body['eksper_firma'] ?? ''),
        !empty($body['eksper_paydas_id']) ? (int)$body['eksper_paydas_id'] : null,
        clean($body['onarim_servisi'] ?? ''),
        clean($body['dosya_kaynagi'] ?? ''),
        !empty($body['avukat_id']) ? (int)$body['avukat_id'] : null,
        !empty($body['ortak_id']) ? (int)$body['ortak_id'] : null,
        $sorumluIdFinal,
        !empty($body['paydas_id']) ? (int)$body['paydas_id'] : null,
        (int)($body['haklilik'] ?? 100),
        (float)($body['komisyon_orani'] ?? 0),
        !empty($body['kaza_tarihi']) ? $body['kaza_tarihi'] : null,
        clean($body['kaza_il'] ?? ''),
        clean($body['kaza_ilce'] ?? ''),
        $hasar_no,
        (int)($body['hak_mahrumiyet'] ?? 0),
        clean($body['notlar'] ?? ''),
        $user['id']
    ]);

    $dosyaId = (int)$db->lastInsertId();

    // 3. Mağdur kaydı (v3.0: gelir_durumu_tipi + gelir_tutari — asgari ücret default)
    $gelirTipi = !empty($body['gelir_durumu_tipi']) ? clean($body['gelir_durumu_tipi']) : 'asgari';
    if (!in_array($gelirTipi, ['asgari', 'asgari_uzeri', 'beyan_yok'], true)) {
        $gelirTipi = 'asgari';
    }
    $gelirTutari = null;
    if ($gelirTipi === 'asgari') {
        $gelirTutari = function_exists('mr_get_asgari_ucret') ? mr_get_asgari_ucret() : 28075.50;
    } elseif ($gelirTipi === 'asgari_uzeri') {
        $gelirTutari = !empty($body['gelir_tutari']) ? (float)$body['gelir_tutari'] : null;
    }

    $stmt = $db->prepare('INSERT INTO magdurlar (dosya_id, tc_kimlik, ad_soyad, telefon, telefon2, email, iban, adres, il, ilce, dogum_tarihi, cinsiyet, meslek, gelir_durumu, gelir_durumu_tipi, gelir_tutari) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $dosyaId,
        clean($body['tc_kimlik'] ?? ''),
        clean($body['ad_soyad']),
        clean($body['telefon'] ?? ''),
        !empty($body['telefon2']) ? clean($body['telefon2']) : null,
        !empty($body['email']) ? clean($body['email']) : null,
        clean($body['iban'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['ilce'] ?? ''),
        !empty($body['dogum_tarihi']) ? $body['dogum_tarihi'] : null,
        !empty($body['cinsiyet']) ? $body['cinsiyet'] : null,
        clean($body['meslek'] ?? ''),
        clean($body['gelir_durumu'] ?? ''),
        $gelirTipi,
        $gelirTutari
    ]);

    // 4. Araç kayıtları (ADK veya MDK ise)
    if ($body['dosya_turu'] === 'ADK' || $body['dosya_turu'] === 'MDK') {
        // Mağdur aracı
        if (!empty($body['ma_plaka'])) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, ruhsat_sahibi, tc_kimlik, marka, model, model_yili, kasko, kasko_sirket, kasko_police, belge_tescil_no, onarim_gun_suresi, gecmis_hasar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'magdur',
                format_plaka($body['ma_plaka']),
                clean($body['ma_ruhsat'] ?? ''),
                clean($body['ma_tc'] ?? ''),
                clean($body['ma_marka'] ?? ''),
                clean($body['ma_model'] ?? ''),
                !empty($body['ma_yil']) ? (int)$body['ma_yil'] : null,
                !empty($body['ma_kasko']) ? 1 : 0,
                clean($body['ma_kasko_sirket'] ?? ''),
                clean($body['ma_kasko_police'] ?? ''),
                clean($body['ma_belge_tescil'] ?? ''),
                !empty($body['ma_onarim_gun']) ? (int)$body['ma_onarim_gun'] : null,
                !empty($body['ma_gecmis_hasar']) ? clean($body['ma_gecmis_hasar']) : null
            ]);
        }

        // Karşı araç (v3.0.8: kasko_sirket, kasko_police eklendi)
        if (!empty($body['ka_plaka'])) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, ruhsat_sahibi, tc_kimlik, marka, model, model_yili, trafik_sirket, trafik_police, belge_tescil_no, kasko, kasko_sirket, kasko_police, ruhsat_sahibi_surucu, surucu_ad, surucu_tc_kimlik) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'karsi',
                format_plaka($body['ka_plaka']),
                clean($body['ka_ruhsat'] ?? ''),
                clean($body['ka_tc'] ?? ''),
                clean($body['ka_marka'] ?? ''),
                clean($body['ka_model'] ?? ''),
                !empty($body['ka_yil']) ? (int)$body['ka_yil'] : null,
                clean($body['ka_trafik'] ?? ''),
                clean($body['ka_trafik_police'] ?? ''),
                clean($body['ka_belge_tescil'] ?? ''),
                !empty($body['ka_kasko']) ? 1 : 0,
                clean($body['ka_kasko_sirket'] ?? ''),
                clean($body['ka_kasko_police'] ?? ''),
                !empty($body['ka_ruhsat_surucu']) ? clean($body['ka_ruhsat_surucu']) : null,
                clean($body['ka_surucu_ad'] ?? ''),
                clean($body['ka_surucu_tc'] ?? '')
            ]);
        }
    }

    // 4b. BH ek alanları (sürücü, araç, sorumlu sigorta, sakatlık)
    if ($body['dosya_turu'] === 'BH') {
        // v3.0.8: sorumlu_sigorta zaten INSERT'te girildi; burada sadece BH özel alanlar
        $stmtBH = $db->prepare('UPDATE dosyalar SET sakatlik_aciklama=?, surucu_ad=?, surucu_ehliyet=?, surucu_kusur=? WHERE id=?');
        $stmtBH->execute([
            clean($body['sakatlik_aciklama'] ?? ''),
            clean($body['surucu_ad'] ?? ''),
            clean($body['surucu_ehliyet'] ?? ''),
            !empty($body['surucu_kusur']) ? (int)$body['surucu_kusur'] : null,
            $dosyaId
        ]);

        // BH aracı
        if (!empty($body['bh_arac_plaka'])) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, marka, model_yili) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'magdur',
                format_plaka($body['bh_arac_plaka']),
                clean($body['bh_arac_marka'] ?? ''),
                !empty($body['bh_arac_yil']) ? (int)$body['bh_arac_yil'] : null
            ]);
        }
    }

    // ═══ 5. OTOMATİK PRİM İŞLEMLERİ ═══
    $dosyaTuru = clean($body['dosya_turu']);
    $primField = ($dosyaTuru === 'BH') ? 'prim_bh' : 'prim_adk';
    $otoPrimBilgi = [];

    // 5a. PERSONEL (SORUMLU) PRİMİ — SADECE HAKEDİŞ İÇİN SAYILIR, MASRAF YAZILMAZ
    // Personel primi aylık hak ediş hesaplamasında otomatik olarak
    // dosya_sayisi × prim_adk/prim_bh şeklinde hesaplanır.
    $sorumluId = !empty($body['sorumlu_id']) ? (int)$body['sorumlu_id'] : null;
    if ($sorumluId) {
        $stmtP = $db->prepare('SELECT id, ad_soyad, prim_adk, prim_bh FROM personel WHERE user_id = ? OR id = ?');
        $stmtP->execute([$sorumluId, $sorumluId]);
        $sorumluPersonel = $stmtP->fetch();
        if (!$sorumluPersonel) {
            $stmtP2 = $db->prepare('SELECT id, ad_soyad, prim_adk, prim_bh FROM personel WHERE user_id = ?');
            $stmtP2->execute([$sorumluId]);
            $sorumluPersonel = $stmtP2->fetch();
        }
        if ($sorumluPersonel) {
            $primTutar = (float)($sorumluPersonel[$primField] ?? 0);
            if ($primTutar > 0) {
                $otoPrimBilgi['personel_prim'] = $primTutar;
                $otoPrimBilgi['personel_adi'] = $sorumluPersonel['ad_soyad'];
                $otoPrimBilgi['personel_bilgi'] = 'HAKEDİŞE YAZILACAK (AYLIK HESAPLAMA)';
            }
        }
    }

    // 5b. PAYDAŞ (YÖNLENDİREN) PRİMİ — MASRAF + CARİ OTOMATİK (ÖDENMEDİ)
    $paydasId = !empty($body['paydas_id']) ? (int)$body['paydas_id'] : null;
    if ($paydasId) {
        $stmtPd = $db->prepare('SELECT id, ad, prim_adk, prim_bh FROM paydaslar WHERE id = ?');
        $stmtPd->execute([$paydasId]);
        $paydas = $stmtPd->fetch();
        if ($paydas) {
            $primTutarP = (float)($paydas[$primField] ?? 0);
            if ($primTutarP > 0) {
                // MASRAF OLARAK DOSYAYA EKLE — ÖDENMEDİ DURUMUNDA (KASADAN DÜŞMEZ)
                $stmtMasraf2 = $db->prepare('INSERT INTO masraflar (dosya_id, masraf_kalemi, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id, odeme_durumu) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?)');
                $stmtMasraf2->execute([
                    $dosyaId,
                    'YÖNLENDİREN ÜCRETİ',
                    $primTutarP,
                    null, // kasa_id null — henüz ödenmedi
                    'PAYDAŞ PRİMİ: ' . $paydas['ad'] . ' (' . $dosyaTuru . ' - OTOMATİK)',
                    $user['id'],
                    'odenmedi'
                ]);
                $masrafId = (int)$db->lastInsertId();

                // KOMİSYON OLARAK PAYDAŞ CARİSİNE İŞLE (BEKLİYOR)
                $stmtKom = $db->prepare('INSERT INTO paydas_komisyonlari (paydas_id, tutar, dosya_id, durum, tarih, aciklama, created_by, masraf_id) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?)');
                $stmtKom->execute([
                    $paydasId,
                    $primTutarP,
                    $dosyaId,
                    'bekliyor',
                    'OTOMATİK DOSYA PRİMİ: ' . $dosyaNo . ' (' . $dosyaTuru . ')',
                    $user['id'],
                    $masrafId
                ]);
                $komisyonId = (int)$db->lastInsertId();

                // MASRAFA KOMİSYON ID'Sİ YAZILIR (ÇİFT YÖNLÜ BAĞLANTI)
                $db->prepare('UPDATE masraflar SET paydas_komisyon_id = ? WHERE id = ?')->execute([$komisyonId, $masrafId]);

                // MUHASEBE KOMİSYON TABLOSUNA DA PARALEL KAYIT (PAYDAŞ CARİSİ ENTEGRASYONU)
                try {
                    $stmtMuhKom = $db->prepare('INSERT INTO komisyonlar (dosya_id, paydas_id, komisyon_turu, tutar, odendi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, 0, ?, ?)');
                    $stmtMuhKom->execute([
                        $dosyaId,
                        $paydasId,
                        'paydas_prim',
                        $primTutarP,
                        'PAYDAŞ PRİMİ: ' . $paydas['ad'] . ' - DOSYA: ' . $dosyaNo . ' (' . $dosyaTuru . ')',
                        $user['id']
                    ]);
                } catch (\Exception $e) {}

                $otoPrimBilgi['paydas_prim'] = $primTutarP;
                $otoPrimBilgi['paydas_adi'] = $paydas['ad'];
                $otoPrimBilgi['masraf_id'] = $masrafId;
                $otoPrimBilgi['komisyon_id'] = $komisyonId;
                $otoPrimBilgi['durum'] = 'ÖDENMEDİ';
            }
        }
    }

    // ═══ 5c. DOSYA KAYNAĞI BAZLI ÜCRETLENDİRME — DOSYA TÜRÜNE VE KAYNAĞINA GÖRE OTOMATİK MASRAF ═══
    // Dosya kaynağına göre ücret anahtarını belirle (Ofis CRM veya Yönlendiren)
    // NOT: Paydaş primi (5b) zaten YÖNLENDİREN ÜCRETİ masrafı eklediyse tekrar eklenmez
    $dosyaKaynagi = clean($body['dosya_kaynagi'] ?? '');
    $kaynakUcretPrefix = 'yonlendiren_ucret_'; // varsayılan
    $kaynakMasrafKalemi = 'YÖNLENDİREN ÜCRETİ';
    $kaynakAciklama = 'DOSYA BAŞI YÖNLENDİREN ÜCRETİ';

    if (mb_stripos($dosyaKaynagi, 'OFİS') !== false || mb_stripos($dosyaKaynagi, 'CRM') !== false) {
        $kaynakUcretPrefix = 'ofis_crm_ucret_';
        $kaynakMasrafKalemi = 'OFİS CRM ÜCRETİ';
        $kaynakAciklama = 'DOSYA BAŞI OFİS CRM ÜCRETİ';
    }

    // Paydaş primi (5b) zaten yönlendiren ücreti masrafı eklediyse, bu bölümde tekrar eklenmesini engelle
    $yonlendirenZatenEklendi = !empty($otoPrimBilgi['paydas_prim']) && $kaynakMasrafKalemi === 'YÖNLENDİREN ÜCRETİ';

    if (!$yonlendirenZatenEklendi) {
        $ucretAnahtari = $kaynakUcretPrefix . strtolower($dosyaTuru);
        $kaynakUcret = 0;
        try {
            $stmtYU = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = ? AND deger != '' AND deger != '0'");
            $stmtYU->execute([$ucretAnahtari]);
            $yuRow = $stmtYU->fetch();
            if ($yuRow) {
                $kaynakUcret = (float)$yuRow['deger'];
            }
        } catch (\Exception $e) {}

        if ($kaynakUcret > 0) {
            $stmtYUM = $db->prepare('INSERT INTO masraflar (dosya_id, masraf_kalemi, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id, odeme_durumu) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?)');
            $stmtYUM->execute([
                $dosyaId,
                $kaynakMasrafKalemi,
                $kaynakUcret,
                null,
                'OTOMATİK - ' . $dosyaTuru . ' ' . $kaynakAciklama,
                $user['id'],
                'odenmedi'
            ]);
            $otoPrimBilgi['yonlendiren_ucret'] = $kaynakUcret;
            $otoPrimBilgi['yonlendiren_tur'] = $dosyaTuru;
            $otoPrimBilgi['kaynak_tipi'] = $kaynakMasrafKalemi;
        }
    }

    // ═══ 5d. NOTER VEKALET MASRAFI ═══
    $noterVekalet = !empty($body['noter_vekalet']) ? (float)$body['noter_vekalet'] : 0;
    if ($noterVekalet > 0) {
        $stmtNV = $db->prepare('INSERT INTO masraflar (dosya_id, masraf_kalemi, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id, odeme_durumu) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?)');
        $stmtNV->execute([
            $dosyaId,
            'NOTER VEKALET MASRAFI',
            $noterVekalet,
            null,
            'DOSYA ACILIS - NOTER VEKALET UCRETI',
            $user['id'],
            'odenmedi'
        ]);
        $otoPrimBilgi['noter_vekalet'] = $noterVekalet;
    }

    // ═══ DOSYA SÜRECİ: İLK KAYIT ═══
    try {
        $stmtSurec = $db->prepare("INSERT INTO dosya_surecler (dosya_id, baslik, detay, islem_tipi, created_at) VALUES (?, ?, ?, 'sistem', NOW())");
        $stmtSurec->execute([$dosyaId, 'DOSYA SİSTEMDE AÇILDI', 'Dosya No: ' . $dosyaNo . ' | Dosya Türü: ' . clean($body['dosya_turu']) . ' | Aşama: Dosya Açık']);
    } catch (\Exception $e) {}

    $db->commit();

    log_action($user['id'], 'dosya_olustur', "Dosya oluşturuldu: $dosyaNo", 'dosyalar', $dosyaId);

    // ═══ 6. OTOMATİK PORTAL ERİŞİMİ OLUŞTUR ═══
    $portalBilgi = null;
    try {
        // Portal ayarı aktif mi kontrol et
        $portalAktif = false;
        $portalOtomatik = false;
        $portalGirisYontemi = 'sms_otp';
        try {
            $stmtPA = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar IN ('portal_aktif','portal_otomatik_olustur','portal_giris_yontemi')");
            while ($pa = $stmtPA->fetch()) {
                if ($pa['anahtar'] === 'portal_aktif' && $pa['deger'] === '1') $portalAktif = true;
                if ($pa['anahtar'] === 'portal_otomatik_olustur' && $pa['deger'] === '1') $portalOtomatik = true;
                if ($pa['anahtar'] === 'portal_giris_yontemi') $portalGirisYontemi = $pa['deger'];
            }
        } catch (\Exception $e) {}

        $musteriTelefon = clean($body['telefon'] ?? '');

        if ($portalAktif && $portalOtomatik && !empty($musteriTelefon)) {
            // Telefon normalize
            require_once __DIR__ . '/../../config/sms_helper.php';
            $telNorm = sms_telefon_normalize($musteriTelefon);

            // Benzersiz erişim kodu
            $erisimKodu = generate_uuid();

            $stmtPortal = $db->prepare("INSERT INTO portal_erisim (dosya_id, erisim_kodu, tc_kimlik, telefon, ad_soyad, giris_yontemi, olusturan_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmtPortal->execute([
                $dosyaId,
                $erisimKodu,
                clean($body['tc_kimlik'] ?? ''),
                $telNorm ?: $musteriTelefon,
                clean($body['ad_soyad']),
                $portalGirisYontemi,
                $user['id']
            ]);

            $portalErisimId = (int)$db->lastInsertId();

            // SMS ile bilgilendir
            $siteUrl = '';
            try {
                $stmtUrl = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'site_url' LIMIT 1");
                $urlRow = $stmtUrl->fetch();
                if ($urlRow && !empty($urlRow['deger'])) $siteUrl = rtrim($urlRow['deger'], '/');
            } catch (\Exception $e) {}
            if (empty($siteUrl)) {
                $protokol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'sistem.mrhasardanismanlik.com';
                $siteUrl = $protokol . '://' . $host;
            }

            $firmaAdi = 'MR HASAR DANISMANLIK';
            try {
                $stmtFirma2 = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'firma_adi' LIMIT 1");
                $fRow = $stmtFirma2->fetch();
                if ($fRow && !empty($fRow['deger'])) $firmaAdi = $fRow['deger'];
            } catch (\Exception $e) {}

            $portalLoginLink = $siteUrl . '/portal.html';
            $smsMesaj = "Sayin " . clean($body['ad_soyad']) . ", {$dosyaNo} nolu dosyaniz olusturulmustur. Giris icin: {$portalLoginLink} adresinden TC Kimlik ve telefonunuzla giris yapabilirsiniz. - {$firmaAdi}";

            $portalSms = sms_gonder($telNorm ?: $musteriTelefon, $smsMesaj, $dosyaId, $user['id']);

            $portalBilgi = [
                'erisim_id' => $portalErisimId,
                'erisim_kodu' => $erisimKodu,
                'sms_gonderildi' => $portalSms['basarili'] ?? false
            ];

            // Log
            try {
                $stmtPLog = $db->prepare("INSERT INTO portal_loglar (portal_erisim_id, dosya_id, islem, detay, ip_adresi) VALUES (?, ?, 'erisim_olusturuldu', ?, ?)");
                $stmtPLog->execute([$portalErisimId, $dosyaId, 'Dosya açılışında otomatik portal erişimi oluşturuldu', $_SERVER['REMOTE_ADDR'] ?? null]);
            } catch (\Exception $e) {}
        }
    } catch (\Exception $e) {
        // Portal hatası dosya oluşturmayı engellemez
    }

    // ═══ 7. AVUKATA (İŞ ORTAĞI) SMS BİLDİRİMİ ═══
    $avukatSmsBilgi = null;
    try {
        $ortakId = !empty($body['ortak_id']) ? (int)$body['ortak_id'] : null;
        if ($ortakId) {
            $stmtAv = $db->prepare("SELECT id, ad_soyad, telefon, firma FROM ortaklar WHERE id = ? AND durum = 'aktif'");
            $stmtAv->execute([$ortakId]);
            $avukat = $stmtAv->fetch();

            if ($avukat && !empty($avukat['telefon'])) {
                require_once __DIR__ . '/../../config/sms_helper.php';

                $firmaAdiAv = 'MR HASAR DANISMANLIK';
                try {
                    $stmtFav = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'firma_adi' LIMIT 1");
                    $favRow = $stmtFav->fetch();
                    if ($favRow && !empty($favRow['deger'])) $firmaAdiAv = $favRow['deger'];
                } catch (\Exception $e) {}

                $musteriAdi = clean($body['ad_soyad']);
                $dosyaTuruTam = $dosyaTuru === 'ADK' ? 'Arac Deger Kaybi' : ($dosyaTuru === 'BH' ? 'Bedeni Hasar' : $dosyaTuru);
                $sigortaSirket = clean($body['sigorta_sirket'] ?? '-');

                $avTelNorm = sms_telefon_normalize($avukat['telefon']);
                $avukatMesaj = "Sayin {$avukat['ad_soyad']}, tarafiniza yeni bir dosya atanmistir. Dosya No: {$dosyaNo} | Tur: {$dosyaTuruTam} | Musteri: {$musteriAdi} | Sigorta: {$sigortaSirket} | Asama: Dosya Acik - {$firmaAdiAv}";

                $avukatSms = sms_gonder($avTelNorm ?: $avukat['telefon'], $avukatMesaj, $dosyaId, $user['id']);

                $avukatSmsBilgi = [
                    'avukat_adi' => $avukat['ad_soyad'],
                    'sms_gonderildi' => $avukatSms['basarili'] ?? false
                ];
            }
        }
    } catch (\Exception $e) {
        // Avukat SMS hatası dosya oluşturmayı engellemez
    }

    $mesaj = 'Dosya başarıyla oluşturuldu';
    if (!empty($otoPrimBilgi['personel_prim'])) {
        $mesaj .= ' | PERSONEL PRİMİ: ₺' . number_format($otoPrimBilgi['personel_prim'], 2, ',', '.') . ' HAKEDİŞE YAZILDI';
    }
    if (!empty($otoPrimBilgi['paydas_prim'])) {
        $mesaj .= ' | PAYDAŞ PRİMİ: ₺' . number_format($otoPrimBilgi['paydas_prim'], 2, ',', '.') . ' OTOMATİK EKLENDİ (ÖDENMEDİ)';
    }
    if (!empty($otoPrimBilgi['yonlendiren_ucret'])) {
        $ucretLabel = $otoPrimBilgi['kaynak_tipi'] ?? 'YÖNLENDİREN ÜCRETİ';
        $mesaj .= ' | ' . $ucretLabel . ': ₺' . number_format($otoPrimBilgi['yonlendiren_ucret'], 2, ',', '.') . ' MASRAFA EKLENDİ';
    }
    if ($portalBilgi) {
        $mesaj .= ' | PORTAL ERİŞİMİ OTOMATİK OLUŞTURULDU';
    }
    if (!empty($avukatSmsBilgi['sms_gonderildi'])) {
        $mesaj .= ' | AVUKATA SMS BİLDİRİMİ GÖNDERİLDİ (' . $avukatSmsBilgi['avukat_adi'] . ')';
    }

    /* ════════════════════════════════════════════════════════════════
       v2.1.2 SİSTEM-İÇİ BİLDİRİM — DOSYA AÇILIŞINDA
       Atanan kişilere "size yeni dosya atandı" bildirimi gönderilir.
       Kapsanan alıcılar:
         - avukat_id (users.id, rol=avukat)         → direkt user
         - ortak_id (ortaklar.id)                   → email ile users hesabı
         - sorumlu_id (users.id, uzman/personel)    → direkt user
       Hatalar ana akışı kesmez — try/catch + log.
       ════════════════════════════════════════════════════════════════ */
    try {
        $bildirimAliciIds = array();

        // Müşteri (mağdur) adını çek — bildirim mesajına eklemek için
        $musteriAdi = '-';
        try {
            $stmtMag = $db->prepare("SELECT ad_soyad FROM magdurlar WHERE dosya_id = ? LIMIT 1");
            $stmtMag->execute([$dosyaId]);
            $magRow = $stmtMag->fetch();
            if ($magRow && !empty($magRow['ad_soyad'])) $musteriAdi = $magRow['ad_soyad'];
        } catch (\Exception $e) {}

        $dosyaTuruKisa = $body['dosya_turu'] ?? '';
        $dosyaTuruTam = $dosyaTuruKisa === 'ADK' ? 'Araç Değer Kaybı' : ($dosyaTuruKisa === 'BH' ? 'Bedeni Hasar' : ($dosyaTuruKisa ?: 'Dosya'));
        $sigortaSirket = clean($body['sigorta_sirket'] ?? '-');

        $bildirimBaslik = 'TARAFINIZA YENİ DOSYA ATANDI';
        $bildirimIcerikGenel = 'Dosya No: ' . $dosyaNo
            . ' | Tür: ' . $dosyaTuruTam
            . ' | Müşteri: ' . $musteriAdi
            . ' | Sigorta: ' . $sigortaSirket;

        // 1) AVUKAT (users.id direkt)
        if (!empty($body['avukat_id'])) {
            $avId = (int)$body['avukat_id'];
            if ($avId !== (int)$user['id'] && bildirim_alici_gecerli($avId)) {
                bildirim_olustur($avId, $bildirimBaslik, 'Sayın avukatımız, tarafınıza bir dosya atanmıştır. ' . $bildirimIcerikGenel, 'bilgi', $dosyaId, $user['id']);
                $bildirimAliciIds[] = $avId;
            }
        }

        // 2) ORTAK (ortaklar.id → email üzerinden users hesabı)
        if (!empty($body['ortak_id'])) {
            $ortakUserId = ortak_user_id_bul((int)$body['ortak_id']);
            if ($ortakUserId && $ortakUserId !== (int)$user['id'] && !in_array($ortakUserId, $bildirimAliciIds, true)) {
                bildirim_olustur($ortakUserId, $bildirimBaslik, 'Sayın iş ortağımız, tarafınıza bir dosya atanmıştır. ' . $bildirimIcerikGenel, 'bilgi', $dosyaId, $user['id']);
                $bildirimAliciIds[] = $ortakUserId;
            }
        }

        // 3) SORUMLU (users.id direkt — uzman/personel)
        if (!empty($body['sorumlu_id'])) {
            $sorId = (int)$body['sorumlu_id'];
            if ($sorId !== (int)$user['id'] && !in_array($sorId, $bildirimAliciIds, true) && bildirim_alici_gecerli($sorId)) {
                bildirim_olustur($sorId, 'YENİ DOSYA SORUMLULUĞU', 'Bir dosyanın sorumluluğu tarafınıza atanmıştır. ' . $bildirimIcerikGenel, 'bilgi', $dosyaId, $user['id']);
                $bildirimAliciIds[] = $sorId;
            }
        }

        if (!empty($bildirimAliciIds)) {
            $mesaj .= ' | SİSTEM BİLDİRİMİ GÖNDERİLDİ (' . count($bildirimAliciIds) . ' KİŞİ)';
        }
    } catch (\Exception $bildirimErr) {
        // Bildirim hatası ana akışı kesmez
        error_log('[mr_hasar] dosya/create.php bildirim hatası: ' . $bildirimErr->getMessage());
    }

    json_success([
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosyaNo,
        'hasar_no' => $hasar_no,
        'oto_prim' => $otoPrimBilgi,
        'portal' => $portalBilgi,
        'avukat_sms' => $avukatSmsBilgi
    ], $mesaj, 201);

} catch (\Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    json_error('Dosya oluşturulurken hata: ' . $e->getMessage(), 500);
}
