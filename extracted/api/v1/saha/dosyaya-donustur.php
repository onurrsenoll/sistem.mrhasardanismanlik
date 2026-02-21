<?php
/**
 * POST /api/v1/saha/dosyaya-donustur.php
 * ONAYLANMIŞ SAHA DOSYASINI GERÇEK DOSYAYA DÖNÜŞTÜR (SADECE ADMİN)
 * Sigorta şirketi ve poliçe numarası BU aşamada alınır
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();

if (empty($body['id'])) json_error('ID GEREKLİ', 400);
if (empty($body['sigorta_sirketi'])) json_error('SİGORTA ŞİRKETİ GEREKLİ', 400);
if (empty($body['police_no'])) json_error('POLİÇE NUMARASI GEREKLİ', 400);

$id = (int)$body['id'];
$sigorta_sirketi = clean($body['sigorta_sirketi']);
$police_no = clean($body['police_no']);

$db = getDB();

// Mevcut kaydı al
$stmt = $db->prepare("SELECT * FROM saha_dosyalar WHERE id = ?");
$stmt->execute([$id]);
$kayit = $stmt->fetch();

if (!$kayit) json_error('KAYIT BULUNAMADI', 404);

if ($kayit['durum'] !== 'onaylandi') {
    json_error('SADECE ONAYLANMIŞ KAYITLAR DOSYAYA DÖNÜŞTÜRÜLEBİLİR', 400);
}

try {
    $db->beginTransaction();

    // 1. Dosya No üret
    $dosyaNo = generate_dosya_no($db);

    // 2. Hasar tipine göre dosya türünü belirle
    $hasarTipi = $kayit['hasar_tipi'] ?? '';
    $dosyaTuru = 'ADK'; // Varsayılan
    if (in_array($hasarTipi, ['DASK', 'YANGIN', 'SU BASKIN', 'HIRSIZLIK'])) {
        $dosyaTuru = 'BH';
    }

    // 3. Dosyalar tablosuna ekle
    $stmt = $db->prepare("INSERT INTO dosyalar
        (dosya_no, dosya_turu, asama, sigorta_sirket, police_no, kaza_tarihi,
         plaka, notlar, sorumlu_id, created_by, acilis_tarihi)
        VALUES (?, ?, 'Dosya Açık', ?, ?, ?, ?, ?, ?, ?, CURDATE())");

    $stmt->execute([
        $dosyaNo,
        $dosyaTuru,
        $sigorta_sirketi,
        $police_no,
        $kayit['hasar_tarihi'],
        clean($kayit['arac_plaka'] ?? ''),
        'SAHA DOSYASINDAN DÖNÜŞTÜRÜLDÜ. MÜŞTERİ: ' . $kayit['musteri_adi'] .
            ($kayit['musteri_telefon'] ? ' TEL: ' . $kayit['musteri_telefon'] : '') .
            ($kayit['hasar_aciklama'] ? ' AÇIKLAMA: ' . $kayit['hasar_aciklama'] : ''),
        $kayit['personel_id'],
        $user['id']
    ]);

    $dosyaId = (int)$db->lastInsertId();

    // 4. Mağdur kaydı oluştur
    $stmt = $db->prepare("INSERT INTO magdurlar (dosya_id, ad_soyad, telefon, tc_kimlik) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $dosyaId,
        clean($kayit['musteri_adi']),
        clean($kayit['musteri_telefon'] ?? ''),
        clean($kayit['musteri_tc'] ?? '')
    ]);

    // 5. Karşı araç varsa araç kaydı oluştur
    if (!empty($kayit['karsi_plaka'])) {
        $stmt = $db->prepare("INSERT INTO araclar (dosya_id, taraf, plaka, trafik_sirket) VALUES (?, 'karsi', ?, ?)");
        $stmt->execute([
            $dosyaId,
            clean($kayit['karsi_plaka']),
            clean($kayit['karsi_sigorta'] ?? '')
        ]);
    }

    // 6. Saha medyalarını evraklara kopyala
    $stmtMediaList = $db->prepare("SELECT * FROM saha_dosya_medya WHERE saha_dosya_id = ?");
    $stmtMediaList->execute([$id]);
    $medyalar = $stmtMediaList->fetchAll();

    foreach ($medyalar as $medya) {
        $stmtEvrak = $db->prepare("INSERT INTO evraklar
            (dosya_id, evrak_turu, dosya_adi, sunucu_adi, dosya_yolu, dosya_boyutu, mime_type, kullanici_id)
            VALUES (?, 'Saha Belgesi', ?, ?, ?, ?, ?, ?)");
        $stmtEvrak->execute([
            $dosyaId,
            $medya['dosya_adi'],
            $medya['sunucu_adi'],
            $medya['dosya_yolu'],
            $medya['dosya_boyutu'] ?? 0,
            $medya['mime_type'] ?? 'application/octet-stream',
            $user['id']
        ]);
    }

    // 7. Saha dosyasını güncelle - Sigorta bilgilerini kaydet
    $stmt = $db->prepare("UPDATE saha_dosyalar
        SET durum = 'dosyaya_donustu',
            dosya_id = ?,
            dosyaya_donusme_tarihi = NOW(),
            sigorta_sirketi = ?,
            police_no = ?
        WHERE id = ?");
    $stmt->execute([$dosyaId, $sigorta_sirketi, $police_no, $id]);

    $db->commit();

    // 8. Personele bildirim gönder
    $icerik = $kayit['musteri_adi'] . ' SAHA DOSYASI, ' . $dosyaNo . ' NUMARALI DOSYAYA DÖNÜŞTÜRÜLDÜ.';
    $stmt2 = $db->prepare("INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu, ilgili_dosya_id) VALUES (?, ?, ?, ?, 'bilgi', 0, ?)");
    $stmt2->execute([
        $user['id'],
        $kayit['personel_id'],
        'SAHA DOSYA → DOSYAYA DÖNÜŞTÜRÜLDÜ',
        $icerik,
        $dosyaId
    ]);

    log_action($user['id'], 'saha_donustur', "Saha dosya dosyaya dönüştürüldü: " . $kayit['musteri_adi'] . " → " . $dosyaNo, 'saha_dosyalar', $id);

    json_success([
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosyaNo
    ], 'SAHA DOSYASI BAŞARIYLA DOSYAYA DÖNÜŞTÜRÜLDÜ');

} catch (\Exception $e) {
    $db->rollBack();
    json_error('DÖNÜŞTÜRME HATASI: ' . $e->getMessage(), 500);
}
