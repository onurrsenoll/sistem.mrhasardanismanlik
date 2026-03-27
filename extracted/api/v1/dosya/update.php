<?php
/**
 * PUT /api/v1/dosya/update.php
 * Dosya güncelle (aşama, bilgi, mağdur, araç)
 * Body: { "id": 1, "asama": "Dava Açıldı", "sigorta_sirket": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();

// DDL Migration: araç ek sütunları
try {
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS belge_tescil_no VARCHAR(50) DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS onarim_gun_suresi INT DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS gecmis_hasar ENUM('var','yok') DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS surucu_ad VARCHAR(100) DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS surucu_tc_kimlik VARCHAR(11) DEFAULT NULL");
    $db->exec("ALTER TABLE araclar ADD COLUMN IF NOT EXISTS ruhsat_sahibi_surucu ENUM('ayni','farkli') DEFAULT NULL");
} catch (\Exception $e) {}
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM dosyalar WHERE id = ?');
$stmt->execute([$id]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);

try {
    $db->beginTransaction();

    // Frontend alias'ları backend alanlarına map et
    if (!isset($body['dosya_kaynagi']) && isset($body['dosya_kaynak'])) {
        $body['dosya_kaynagi'] = $body['dosya_kaynak'];
    }
    if (!isset($body['komisyon_orani']) && isset($body['komisyon'])) {
        $body['komisyon_orani'] = $body['komisyon'];
    }

    // Dosya güncelle
    $dosyaFields = ['asama', 'dosya_turu', 'talep_turu', 'sigorta_sirket', 'police_no', 'sigorta_turu',
        'dosya_kaynagi', 'avukat_id', 'ortak_id', 'sorumlu_id', 'paydas_id', 'haklilik', 'komisyon_orani',
        'kaza_tarihi', 'kaza_il', 'kaza_ilce', 'pozisyon', 'kusur_durumu', 'hasar_no',
        'sakatlik_aciklama', 'notlar', 'kapanma_tarihi', 'plaka', 'hak_mahrumiyet',
        'acilis_tarihi', 'sorumlu_sigorta', 'surucu_ad', 'surucu_ehliyet', 'surucu_kusur'];

    $sets = [];
    $params = [];

    foreach ($dosyaFields as $field) {
        if (array_key_exists($field, $body)) {
            $sets[] = "$field = ?";
            if (in_array($field, ['avukat_id', 'ortak_id', 'sorumlu_id', 'paydas_id'])) {
                $params[] = !empty($body[$field]) ? (int)$body[$field] : null;
            } elseif (in_array($field, ['haklilik', 'hak_mahrumiyet'])) {
                $params[] = (int)$body[$field];
            } elseif (in_array($field, ['komisyon_orani'])) {
                $params[] = (float)$body[$field];
            } elseif (in_array($field, ['kaza_tarihi', 'kapanma_tarihi', 'acilis_tarihi'])) {
                $params[] = !empty($body[$field]) ? $body[$field] : null;
            } else {
                $params[] = clean($body[$field]);
            }
        }
    }

    if (!empty($sets)) {
        $params[] = $id;
        $stmt = $db->prepare('UPDATE dosyalar SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);
    }

    // Mağdur güncelle
    $magdurFields = ['tc_kimlik', 'ad_soyad', 'telefon', 'telefon2', 'email', 'iban', 'adres',
        'il', 'ilce', 'dogum_tarihi', 'cinsiyet', 'meslek', 'gelir_durumu', 'gelir_tutari'];

    $mSets = [];
    $mParams = [];
    $hasMagdurData = false;

    foreach ($magdurFields as $field) {
        $key = "magdur_$field";
        if (array_key_exists($key, $body)) {
            $hasMagdurData = true;
            $mSets[] = "$field = ?";
            if ($field === 'gelir_tutari') {
                $mParams[] = !empty($body[$key]) ? (float)$body[$key] : null;
            } elseif ($field === 'dogum_tarihi') {
                $mParams[] = !empty($body[$key]) ? $body[$key] : null;
            } elseif ($field === 'cinsiyet') {
                $mParams[] = !empty($body[$key]) ? $body[$key] : null;
            } else {
                $mParams[] = clean($body[$key]);
            }
        }
    }

    if ($hasMagdurData && !empty($mSets)) {
        $mParams[] = $id;
        $stmt = $db->prepare('UPDATE magdurlar SET ' . implode(', ', $mSets) . ' WHERE dosya_id = ?');
        $stmt->execute($mParams);
    }

    // ═══ ARAÇ BİLGİLERİ GÜNCELLE ═══
    // Mağdur araç güncelle
    $magdurAracFields = ['plaka','ruhsat_sahibi','tc_kimlik','marka','model','model_yili','belge_tescil_no','onarim_gun_suresi','gecmis_hasar','kasko'];
    $maPrefix = 'ma_';
    $maSets = [];
    $maParams = [];
    $hasMagdurArac = false;

    foreach ($magdurAracFields as $field) {
        $key = $maPrefix . $field;
        if (array_key_exists($key, $body)) {
            $hasMagdurArac = true;
            $maSets[] = "$field = ?";
            if (in_array($field, ['model_yili', 'onarim_gun_suresi'])) {
                $maParams[] = !empty($body[$key]) ? (int)$body[$key] : null;
            } else {
                $maParams[] = clean($body[$key]);
            }
        }
    }

    if ($hasMagdurArac && !empty($maSets)) {
        // Önce mevcut kayıt var mı kontrol et
        $stmtCheck = $db->prepare('SELECT id FROM araclar WHERE dosya_id = ? AND taraf = ?');
        $stmtCheck->execute([$id, 'magdur']);
        $mevcutArac = $stmtCheck->fetch();

        if ($mevcutArac) {
            $maParams[] = $id;
            $maParams[] = 'magdur';
            $stmt = $db->prepare('UPDATE araclar SET ' . implode(', ', $maSets) . ' WHERE dosya_id = ? AND taraf = ?');
            $stmt->execute($maParams);
        } else {
            // Yeni kayıt oluştur
            $insertFields = [];
            $insertValues = [];
            $insertParams = [];
            foreach ($magdurAracFields as $field) {
                $key = $maPrefix . $field;
                if (array_key_exists($key, $body)) {
                    $insertFields[] = $field;
                    $insertValues[] = '?';
                    if (in_array($field, ['model_yili', 'onarim_gun_suresi'])) {
                        $insertParams[] = !empty($body[$key]) ? (int)$body[$key] : null;
                    } else {
                        $insertParams[] = clean($body[$key]);
                    }
                }
            }
            $insertFields[] = 'dosya_id';
            $insertValues[] = '?';
            $insertParams[] = $id;
            $insertFields[] = 'taraf';
            $insertValues[] = '?';
            $insertParams[] = 'magdur';
            $stmt = $db->prepare('INSERT INTO araclar (' . implode(', ', $insertFields) . ') VALUES (' . implode(', ', $insertValues) . ')');
            $stmt->execute($insertParams);
        }
    }

    // Karşı araç güncelle
    $karsiAracFields = ['plaka','ruhsat_sahibi','tc_kimlik','marka','model','model_yili','belge_tescil_no','trafik_sirket','trafik_police','kasko','ruhsat_sahibi_surucu','surucu_ad','surucu_tc_kimlik'];
    $kaPrefix = 'ka_';
    $kaSets = [];
    $kaParams = [];
    $hasKarsiArac = false;

    foreach ($karsiAracFields as $field) {
        $key = $kaPrefix . $field;
        if (array_key_exists($key, $body)) {
            $hasKarsiArac = true;
            $kaSets[] = "$field = ?";
            if (in_array($field, ['model_yili'])) {
                $kaParams[] = !empty($body[$key]) ? (int)$body[$key] : null;
            } elseif ($field === 'kasko') {
                $kaParams[] = !empty($body[$key]) ? 1 : 0;
            } else {
                $kaParams[] = clean($body[$key]);
            }
        }
    }

    if ($hasKarsiArac && !empty($kaSets)) {
        $stmtCheck = $db->prepare('SELECT id FROM araclar WHERE dosya_id = ? AND taraf = ?');
        $stmtCheck->execute([$id, 'karsi']);
        $mevcutKarsi = $stmtCheck->fetch();

        if ($mevcutKarsi) {
            $kaParams[] = $id;
            $kaParams[] = 'karsi';
            $stmt = $db->prepare('UPDATE araclar SET ' . implode(', ', $kaSets) . ' WHERE dosya_id = ? AND taraf = ?');
            $stmt->execute($kaParams);
        } else {
            $insertFields = [];
            $insertValues = [];
            $insertParams = [];
            foreach ($karsiAracFields as $field) {
                $key = $kaPrefix . $field;
                if (array_key_exists($key, $body)) {
                    $insertFields[] = $field;
                    $insertValues[] = '?';
                    if (in_array($field, ['model_yili'])) {
                        $insertParams[] = !empty($body[$key]) ? (int)$body[$key] : null;
                    } elseif ($field === 'kasko') {
                        $insertParams[] = !empty($body[$key]) ? 1 : 0;
                    } else {
                        $insertParams[] = clean($body[$key]);
                    }
                }
            }
            $insertFields[] = 'dosya_id';
            $insertValues[] = '?';
            $insertParams[] = $id;
            $insertFields[] = 'taraf';
            $insertValues[] = '?';
            $insertParams[] = 'karsi';
            $stmt = $db->prepare('INSERT INTO araclar (' . implode(', ', $insertFields) . ') VALUES (' . implode(', ', $insertValues) . ')');
            $stmt->execute($insertParams);
        }
    }

    // ═══ AŞAMA DEĞİŞTİĞİNDE PORTAL SÜREÇ KAYDI ═══
    if (array_key_exists('asama', $body) && $body['asama'] !== $dosya['asama']) {
        try {
            require_once __DIR__ . '/../portal/migration.php';
            ensure_portal_tables();
            $stmtSurec = $db->prepare("INSERT INTO dosya_surecler (dosya_id, baslik, detay, islem_tipi, created_at) VALUES (?, ?, ?, 'asama_degisikligi', NOW())");
            $stmtSurec->execute([
                $id,
                'AŞAMA DEĞİŞTİRİLDİ: ' . $body['asama'],
                'Önceki Aşama: ' . $dosya['asama'] . ' → Yeni Aşama: ' . $body['asama']
            ]);
        } catch (\Exception $e) {}
    }

    $db->commit();

    log_action($user['id'], 'dosya_guncelle', "Dosya güncellendi: {$dosya['dosya_no']}", 'dosyalar', $id);

    // ═══ AŞAMA DEĞİŞTİĞİNDE OTOMATİK SMS GÖNDER ═══
    $smsGonderildi = false;
    $smsSonuc = null;
    if (array_key_exists('asama', $body) && $body['asama'] !== $dosya['asama']) {
        try {
            $smsSonuc = sms_durum_degisikligi_evrakli($id, $dosya['asama'], $body['asama'], $user['id']);
            $smsGonderildi = ($smsSonuc && !empty($smsSonuc['basarili']));
        } catch (Exception $e) {
            // SMS hatası dosya güncellemeyi engellemez
        }
    }

    // ═══ AVUKAT (İŞ ORTAĞI) DEĞİŞTİĞİNDE SMS BİLDİRİMİ ═══
    $avukatSmsBilgi = null;
    if (array_key_exists('ortak_id', $body) && (int)($body['ortak_id'] ?? 0) !== (int)($dosya['ortak_id'] ?? 0) && !empty($body['ortak_id'])) {
        try {
            $yeniOrtakId = (int)$body['ortak_id'];
            $stmtAv = $db->prepare("SELECT id, ad_soyad, telefon, firma FROM ortaklar WHERE id = ? AND durum = 'aktif'");
            $stmtAv->execute([$yeniOrtakId]);
            $avukat = $stmtAv->fetch();

            if ($avukat && !empty($avukat['telefon'])) {
                $firmaAdiAv = 'MR HASAR DANISMANLIK';
                try {
                    $stmtFav = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'firma_adi' LIMIT 1");
                    $favRow = $stmtFav->fetch();
                    if ($favRow && !empty($favRow['deger'])) $firmaAdiAv = $favRow['deger'];
                } catch (\Exception $e) {}

                // Müşteri adını çek
                $stmtMag = $db->prepare("SELECT ad_soyad FROM magdurlar WHERE dosya_id = ? LIMIT 1");
                $stmtMag->execute([$id]);
                $mag = $stmtMag->fetch();
                $musteriAdi = $mag ? $mag['ad_soyad'] : '-';

                $dosyaTuruKisa = $dosya['dosya_turu'] ?? '';
                $dosyaTuruTam = $dosyaTuruKisa === 'ADK' ? 'Arac Deger Kaybi' : ($dosyaTuruKisa === 'BH' ? 'Bedeni Hasar' : $dosyaTuruKisa);
                $sigortaSirket = $dosya['sigorta_sirket'] ?? '-';
                $mevcutAsama = $body['asama'] ?? $dosya['asama'] ?? 'Dosya Acik';

                $avTelNorm = sms_telefon_normalize($avukat['telefon']);
                $avukatMesaj = "Sayin {$avukat['ad_soyad']}, tarafiniza yeni bir dosya atanmistir. Dosya No: {$dosya['dosya_no']} | Tur: {$dosyaTuruTam} | Musteri: {$musteriAdi} | Sigorta: {$sigortaSirket} | Asama: {$mevcutAsama} - {$firmaAdiAv}";

                $avukatSms = sms_gonder($avTelNorm ?: $avukat['telefon'], $avukatMesaj, $id, $user['id']);

                $avukatSmsBilgi = [
                    'avukat_adi' => $avukat['ad_soyad'],
                    'sms_gonderildi' => $avukatSms['basarili'] ?? false
                ];
            }
        } catch (\Exception $e) {
            // Avukat SMS hatası güncellemeyi engellemez
        }
    }

    $guncMesaj = 'Dosya güncellendi';
    if (!empty($avukatSmsBilgi['sms_gonderildi'])) {
        $guncMesaj .= ' | AVUKATA SMS BİLDİRİMİ GÖNDERİLDİ (' . $avukatSmsBilgi['avukat_adi'] . ')';
    }

    json_success([
        'dosya_no' => $dosya['dosya_no'],
        'sms_gonderildi' => $smsGonderildi,
        'sms_sonuc' => $smsSonuc,
        'avukat_sms' => $avukatSmsBilgi
    ], $guncMesaj);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Güncelleme hatası: ' . $e->getMessage(), 500);
}
