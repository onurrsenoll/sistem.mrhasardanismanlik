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
        'sakatlik_aciklama', 'notlar', 'kapanma_tarihi', 'plaka', 'hak_mahrumiyet'];

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
            } elseif (in_array($field, ['kaza_tarihi', 'kapanma_tarihi'])) {
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
    $magdurAracFields = ['plaka','ruhsat_sahibi','tc_kimlik','marka','model','model_yili','belge_tescil_no','onarim_gun_suresi','gecmis_hasar'];
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

    json_success([
        'dosya_no' => $dosya['dosya_no'],
        'sms_gonderildi' => $smsGonderildi,
        'sms_sonuc' => $smsSonuc
    ], 'Dosya güncellendi');

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Güncelleme hatası: ' . $e->getMessage(), 500);
}
