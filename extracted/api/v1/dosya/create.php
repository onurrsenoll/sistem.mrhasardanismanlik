<?php
/**
 * POST /api/v1/dosya/create.php
 * Yeni dosya oluştur (mağdur + araç bilgileriyle birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ad_soyad', 'dosya_turu']);

$db = getDB();
ensure_prim_columns();

// Frontend 'dosya_kaynak' gönderir, backend 'dosya_kaynagi' bekler
if (!isset($body['dosya_kaynagi']) && isset($body['dosya_kaynak'])) {
    $body['dosya_kaynagi'] = $body['dosya_kaynak'];
}
// Frontend 'komisyon' gönderir, backend 'komisyon_orani' bekler
if (!isset($body['komisyon_orani']) && isset($body['komisyon'])) {
    $body['komisyon_orani'] = $body['komisyon'];
}

try {
    $db->beginTransaction();

    // 1. Dosya No üret
    $dosyaNo = generate_dosya_no($db);

    // 2. Dosya kaydı
    $stmt = $db->prepare('INSERT INTO dosyalar (dosya_no, dosya_turu, talep_turu, asama, sigorta_sirket, police_no, sigorta_turu, dosya_kaynagi, avukat_id, ortak_id, sorumlu_id, paydas_id, haklilik, komisyon_orani, kaza_tarihi, kaza_il, kaza_ilce, hasar_no, acilis_tarihi, notlar, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)');

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
        clean($body['dosya_kaynagi'] ?? ''),
        !empty($body['avukat_id']) ? (int)$body['avukat_id'] : null,
        !empty($body['ortak_id']) ? (int)$body['ortak_id'] : null,
        !empty($body['sorumlu_id']) ? (int)$body['sorumlu_id'] : $user['id'],
        !empty($body['paydas_id']) ? (int)$body['paydas_id'] : null,
        (int)($body['haklilik'] ?? 100),
        (float)($body['komisyon_orani'] ?? 0),
        !empty($body['kaza_tarihi']) ? $body['kaza_tarihi'] : null,
        clean($body['kaza_il'] ?? ''),
        clean($body['kaza_ilce'] ?? ''),
        $hasar_no,
        clean($body['notlar'] ?? ''),
        $user['id']
    ]);
    
    $dosyaId = (int)$db->lastInsertId();
    
    // 3. Mağdur kaydı
    $stmt = $db->prepare('INSERT INTO magdurlar (dosya_id, tc_kimlik, ad_soyad, telefon, telefon2, email, iban, adres, il, ilce, dogum_tarihi, cinsiyet, meslek, gelir_durumu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $dosyaId,
        clean($body['tc_kimlik'] ?? ''),
        clean($body['ad_soyad']),
        clean($body['telefon'] ?? ''),
        clean($body['telefon2'] ?? ''),
        clean($body['email'] ?? ''),
        clean($body['iban'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['ilce'] ?? ''),
        !empty($body['dogum_tarihi']) ? $body['dogum_tarihi'] : null,
        !empty($body['cinsiyet']) ? $body['cinsiyet'] : null,
        clean($body['meslek'] ?? ''),
        clean($body['gelir_durumu'] ?? '')
    ]);
    
    // 4. Araç kayıtları (ADK ise)
    if ($body['dosya_turu'] === 'ADK') {
        // Mağdur aracı
        if (!empty($body['ma_plaka'])) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, marka, model, model_yili, kasko, kasko_sirket, kasko_police) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'magdur',
                format_plaka($body['ma_plaka']),
                clean($body['ma_marka'] ?? ''),
                clean($body['ma_model'] ?? ''),
                !empty($body['ma_yil']) ? (int)$body['ma_yil'] : null,
                !empty($body['ma_kasko']) ? 1 : 0,
                clean($body['ma_kasko_sirket'] ?? ''),
                clean($body['ma_kasko_police'] ?? '')
            ]);
        }
        
        // Karşı araç
        if (!empty($body['ka_plaka'])) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, ruhsat_sahibi, tc_kimlik, marka, model, model_yili, trafik_sirket, trafik_police) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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
                clean($body['ka_trafik_police'] ?? '')
            ]);
        }
    }
    
    // ═══ 5. OTOMATİK PRİM İŞLEMLERİ ═══
    $dosyaTuru = clean($body['dosya_turu']);
    $primField = ($dosyaTuru === 'BH') ? 'prim_bh' : 'prim_adk';
    $otoPrimBilgi = [];

    // 5a. PERSONEL (SORUMLU) PRİMİ - OFİS CRM veya SAHA PERSONEL kaynağında
    $sorumluId = !empty($body['sorumlu_id']) ? (int)$body['sorumlu_id'] : null;
    if ($sorumluId) {
        $stmtP = $db->prepare('SELECT id, ad_soyad, prim_adk, prim_bh, user_id FROM personel WHERE user_id = ? OR id = ?');
        $stmtP->execute([$sorumluId, $sorumluId]);
        $sorumluPersonel = $stmtP->fetch();
        if (!$sorumluPersonel) {
            // user_id ile dene
            $stmtP2 = $db->prepare('SELECT id, ad_soyad, prim_adk, prim_bh, user_id FROM personel WHERE user_id = ?');
            $stmtP2->execute([$sorumluId]);
            $sorumluPersonel = $stmtP2->fetch();
        }
        if ($sorumluPersonel) {
            $primTutar = (float)($sorumluPersonel[$primField] ?? 0);
            if ($primTutar > 0) {
                // Varsayılan kasa (id=1)
                $kasaId = 1;
                // Kasa bakiye kontrolü
                $stmtKasa = $db->prepare('SELECT id, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
                $stmtKasa->execute([$kasaId]);
                $kasa = $stmtKasa->fetch();
                if ($kasa && $kasa['bakiye'] >= $primTutar) {
                    // MASRAF OLARAK DOSYAYA EKLE
                    $stmtMasraf = $db->prepare('INSERT INTO masraflar (dosya_id, masraf_kalemi, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)');
                    $stmtMasraf->execute([
                        $dosyaId,
                        'DOSYA PRİM ÖDEMESİ',
                        $primTutar,
                        $kasaId,
                        'PERSONEL PRİMİ: ' . $sorumluPersonel['ad_soyad'] . ' (' . $dosyaTuru . ' - OTOMATİK)',
                        $user['id']
                    ]);
                    $otoPrimBilgi['personel_prim'] = $primTutar;
                    $otoPrimBilgi['personel_adi'] = $sorumluPersonel['ad_soyad'];
                }
            }
        }
    }

    // 5b. PAYDAŞ (YÖNLENDİREN) PRİMİ
    $paydasId = !empty($body['paydas_id']) ? (int)$body['paydas_id'] : null;
    if ($paydasId) {
        $stmtPd = $db->prepare('SELECT id, ad, prim_adk, prim_bh FROM paydaslar WHERE id = ?');
        $stmtPd->execute([$paydasId]);
        $paydas = $stmtPd->fetch();
        if ($paydas) {
            $primTutarP = (float)($paydas[$primField] ?? 0);
            if ($primTutarP > 0) {
                $kasaId = 1;
                $stmtKasa2 = $db->prepare('SELECT id, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
                $stmtKasa2->execute([$kasaId]);
                $kasa2 = $stmtKasa2->fetch();
                if ($kasa2 && $kasa2['bakiye'] >= $primTutarP) {
                    // MASRAF OLARAK DOSYAYA EKLE
                    $stmtMasraf2 = $db->prepare('INSERT INTO masraflar (dosya_id, masraf_kalemi, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)');
                    $stmtMasraf2->execute([
                        $dosyaId,
                        'YÖNLENDİREN ÜCRETİ',
                        $primTutarP,
                        $kasaId,
                        'PAYDAŞ PRİMİ: ' . $paydas['ad'] . ' (' . $dosyaTuru . ' - OTOMATİK)',
                        $user['id']
                    ]);
                    // KOMİSYON OLARAK PAYDAŞ HESABINA İŞLE
                    $stmtKom = $db->prepare('INSERT INTO paydas_komisyonlar (paydas_id, tutar, dosya_id, durum, tarih, aciklama, created_by) VALUES (?, ?, ?, ?, CURDATE(), ?, ?)');
                    $stmtKom->execute([
                        $paydasId,
                        $primTutarP,
                        $dosyaId,
                        'bekliyor',
                        'OTOMATİK DOSYA PRİMİ: ' . $dosyaNo . ' (' . $dosyaTuru . ')',
                        $user['id']
                    ]);
                    $otoPrimBilgi['paydas_prim'] = $primTutarP;
                    $otoPrimBilgi['paydas_adi'] = $paydas['ad'];
                }
            }
        }
    }

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
            // Portal migration
            require_once __DIR__ . '/../portal/migration.php';
            ensure_portal_tables();

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

            if ($portalGirisYontemi === 'link') {
                $portalLink = $siteUrl . '/portal.html#kod=' . $erisimKodu;
                $smsMesaj = "Sayin " . clean($body['ad_soyad']) . ", {$dosyaNo} nolu dosyaniz olusturulmustur. Portal erisiminiz: {$portalLink} - {$firmaAdi}";
            } else {
                $smsMesaj = "Sayin " . clean($body['ad_soyad']) . ", {$dosyaNo} nolu dosyaniz olusturulmustur. Dosyanizi takip etmek icin: {$siteUrl}/portal.html adresinden telefonunuzla giris yapabilirsiniz. - {$firmaAdi}";
            }

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

    $mesaj = 'Dosya başarıyla oluşturuldu';
    if (!empty($otoPrimBilgi['personel_prim'])) {
        $mesaj .= ' | PERSONEL PRİMİ: ₺' . number_format($otoPrimBilgi['personel_prim'], 2, ',', '.') . ' OTOMATİK EKLENDİ';
    }
    if (!empty($otoPrimBilgi['paydas_prim'])) {
        $mesaj .= ' | PAYDAŞ PRİMİ: ₺' . number_format($otoPrimBilgi['paydas_prim'], 2, ',', '.') . ' OTOMATİK EKLENDİ';
    }
    if ($portalBilgi) {
        $mesaj .= ' | PORTAL ERİŞİMİ OTOMATİK OLUŞTURULDU';
    }

    json_success([
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosyaNo,
        'hasar_no' => $hasar_no,
        'oto_prim' => $otoPrimBilgi,
        'portal' => $portalBilgi
    ], $mesaj, 201);
    
} catch (\Exception $e) {
    $db->rollBack();
    json_error('Dosya oluşturulurken hata: ' . $e->getMessage(), 500);
}
