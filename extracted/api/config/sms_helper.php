<?php
/**
 * MR HASAR DANIŞMANLIK - SMS HELPER
 * NetGSM SMS API Entegrasyonu
 *
 * Kullanım:
 *   require_once __DIR__ . '/sms_helper.php';
 *   $sonuc = sms_gonder('05XX1234567', 'Mesaj metni');
 *   // $sonuc = ['basarili' => true/false, 'mesaj' => '...', 'kod' => '...']
 */

require_once __DIR__ . '/database.php';

/**
 * NetGSM SMS API üzerinden SMS gönder
 * @param string $telefon  Alıcı telefon (05XX format)
 * @param string $mesaj    SMS mesaj metni
 * @param int|null $dosyaId İlgili dosya ID (log için)
 * @param int|null $kullaniciId İşlemi yapan kullanıcı
 * @return array ['basarili' => bool, 'mesaj' => string, 'kod' => string]
 */
function sms_gonder($telefon, $mesaj, $dosyaId = null, $kullaniciId = null) {
    $db = getDB();

    // SMS AYARLARINI OKU
    $ayarlar = sms_ayarlari_oku($db);

    // SMS AKTİF Mİ KONTROL
    if (empty($ayarlar['sms_aktif']) || $ayarlar['sms_aktif'] !== '1') {
        $sonuc = ['basarili' => false, 'mesaj' => 'SMS SİSTEMİ AKTİF DEĞİL', 'kod' => 'PASIF'];
        sms_logla($db, $telefon, $mesaj, $dosyaId, $kullaniciId, 'pasif', $sonuc['mesaj']);
        return $sonuc;
    }

    // ZORUNLU ALAN KONTROL
    if (empty($ayarlar['sms_kullanici']) || empty($ayarlar['sms_sifre']) || empty($ayarlar['sms_baslik'])) {
        $sonuc = ['basarili' => false, 'mesaj' => 'SMS AYARLARI EKSİK - SİSTEM > SMS AYARLARI BÖLÜMÜNÜ KONTROL EDİN', 'kod' => 'AYAR_EKSIK'];
        sms_logla($db, $telefon, $mesaj, $dosyaId, $kullaniciId, 'hata', $sonuc['mesaj']);
        return $sonuc;
    }

    // TELEFON NUMARASI NORMALİZE
    $tel = sms_telefon_normalize($telefon);
    if (empty($tel)) {
        $sonuc = ['basarili' => false, 'mesaj' => 'GEÇERSİZ TELEFON NUMARASI: ' . $telefon, 'kod' => 'GECERSIZ_TEL'];
        sms_logla($db, $telefon, $mesaj, $dosyaId, $kullaniciId, 'hata', $sonuc['mesaj']);
        return $sonuc;
    }

    // NETGSM SMS API İSTEĞİ
    $apiUrl = 'https://api.netgsm.com.tr/sms/send/get';
    $params = [
        'usercode'  => $ayarlar['sms_kullanici'],
        'password'  => $ayarlar['sms_sifre'],
        'gsmno'     => $tel,
        'message'   => $mesaj,
        'msgheader' => $ayarlar['sms_baslik'],
        'dil'       => '0' // Türkçe karakter desteği
    ];

    $fullUrl = $apiUrl . '?' . http_build_query($params);

    // cURL İLE GÖNDER
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $fullUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
        CURLOPT_HTTPHEADER     => [
            'User-Agent: MR-Hasar-CRM/1.0',
            'Accept: text/plain'
        ]
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // CURL HATASI
    if ($curlError) {
        $sonuc = ['basarili' => false, 'mesaj' => 'BAĞLANTI HATASI: ' . $curlError, 'kod' => 'CURL_' . $curlErrno];
        sms_logla($db, $tel, $mesaj, $dosyaId, $kullaniciId, 'hata', $sonuc['mesaj']);
        return $sonuc;
    }

    // NETGSM YANIT KODLARI
    $rawResponse = trim($response);
    $parts = explode(' ', $rawResponse, 2);
    $kod = $parts[0] ?? '';

    $netgsmKodlari = [
        '00' => 'SMS BAŞARIYLA GÖNDERİLDİ',
        '01' => 'SMS BAŞARIYLA GÖNDERİLDİ',
        '02' => 'SMS BAŞARIYLA GÖNDERİLDİ',
        '20' => 'MESAJ METNİ BULUNAMADI',
        '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
        '40' => 'MESAJ BAŞLIĞI (SENDER) TANIMLI DEĞİL',
        '50' => 'ABONE ÜYELİK SONLANMIŞ',
        '51' => 'SMS GÖNDERİM KISITLAMASI',
        '60' => 'HATA OLUŞTU - TEKRAR DENEYİN',
        '70' => 'GEÇERSİZ PARAMETRE',
        '80' => 'SORGU LİMİTİ AŞILDI',
        '85' => 'MÜKERRER GÖNDERİM',
        '100' => 'SİSTEM HATASI',
        '101' => 'SİSTEMDE KAYITLI DEĞİL'
    ];

    // BAŞARILI MI?
    if (in_array($kod, ['00', '01', '02'])) {
        $bulkId = $parts[1] ?? '';
        $sonuc = ['basarili' => true, 'mesaj' => 'SMS GÖNDERİLDİ', 'kod' => $kod, 'bulk_id' => $bulkId];
        sms_logla($db, $tel, $mesaj, $dosyaId, $kullaniciId, 'gonderildi', $sonuc['mesaj'], $bulkId);
    } else {
        $hataMesaj = $netgsmKodlari[$kod] ?? ('NETGSM HATA KODU: ' . $kod);
        $sonuc = ['basarili' => false, 'mesaj' => $hataMesaj, 'kod' => $kod];
        sms_logla($db, $tel, $mesaj, $dosyaId, $kullaniciId, 'hata', $hataMesaj);
    }

    return $sonuc;
}

/**
 * Dosya durum değişikliği SMS'i gönder (EVRAK LİNKLİ)
 * Eğer dosyada yüklü evrak varsa, en son yüklenen evrakın indirme linki SMS'e eklenir
 *
 * @param int $dosyaId
 * @param string $eskiAsama
 * @param string $yeniAsama
 * @param int|null $kullaniciId
 * @return array|null Gönderim sonucu veya null (telefon yoksa)
 */
function sms_durum_degisikligi_evrakli($dosyaId, $eskiAsama, $yeniAsama, $kullaniciId = null) {
    $db = getDB();

    // DOSYA + MAĞDUR BİLGİLERİNİ ÇEK
    $stmt = $db->prepare("
        SELECT d.dosya_no, d.dosya_turu, m.ad_soyad, m.telefon, m.telefon2
        FROM dosyalar d
        LEFT JOIN magdurlar m ON m.dosya_id = d.id
        WHERE d.id = ?
    ");
    $stmt->execute([$dosyaId]);
    $bilgi = $stmt->fetch();

    if (!$bilgi || empty($bilgi['telefon'])) {
        return null;
    }

    // SMS AYARLARINI KONTROL ET
    $ayarlar = sms_ayarlari_oku($db);
    if (empty($ayarlar['sms_aktif']) || $ayarlar['sms_aktif'] !== '1') {
        return null;
    }

    // FİRMA ADI
    $firmaAdi = 'MR HASAR DANISMANLIK';
    try {
        $stmtFirma = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'firma_adi' LIMIT 1");
        $firmaRow = $stmtFirma->fetch();
        if ($firmaRow && !empty($firmaRow['deger'])) {
            $firmaAdi = $firmaRow['deger'];
        }
    } catch (Exception $e) {}

    // SİTE URL
    $siteUrl = '';
    try {
        $stmtUrl = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'site_url' LIMIT 1");
        $urlRow = $stmtUrl->fetch();
        if ($urlRow && !empty($urlRow['deger'])) {
            $siteUrl = rtrim($urlRow['deger'], '/');
        }
    } catch (Exception $e) {}
    // Fallback: sunucu URL'sini kullan
    if (empty($siteUrl)) {
        $protokol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'sistem.mrhasardanismanlik.com';
        $siteUrl = $protokol . '://' . $host;
    }

    $musteriAdi = $bilgi['ad_soyad'] ?: 'SAYIN MUSTERIMIZ';
    $dosyaNo = $bilgi['dosya_no'];

    // DOSYAYA AİT EVRAKLARI ÇEK (EN SON YÜKLENEN)
    $evrakLink = '';
    try {
        $stmtEvrak = $db->prepare("
            SELECT id, evrak_turu, dosya_adi
            FROM evraklar
            WHERE dosya_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        ");
        $stmtEvrak->execute([$dosyaId]);
        $sonEvrak = $stmtEvrak->fetch();

        if ($sonEvrak) {
            $evrakLink = $siteUrl . '/api/v1/evrak/download.php?id=' . $sonEvrak['id'] . '&token=' . sms_evrak_token($sonEvrak['id']);
        }
    } catch (Exception $e) {}

    // SMS METNİ OLUŞTUR
    $mesaj = "Sayin {$musteriAdi}, {$dosyaNo} nolu dosyanizin guncellenmis durumu: {$yeniAsama}";

    // EVRAK LİNKİ EKLE
    if (!empty($evrakLink)) {
        $mesaj .= " Ilgili evrak: {$evrakLink}";
    }

    $mesaj .= " - {$firmaAdi}";

    // SMS GÖNDER
    $sonuc = sms_gonder($bilgi['telefon'], $mesaj, $dosyaId, $kullaniciId);

    return $sonuc;
}

/**
 * Basit durum değişikliği SMS'i (evrak linksiz)
 */
function sms_durum_degisikligi($dosyaId, $eskiAsama, $yeniAsama, $kullaniciId = null) {
    return sms_durum_degisikligi_evrakli($dosyaId, $eskiAsama, $yeniAsama, $kullaniciId);
}

/**
 * Evrak indirme için geçici token oluştur (SMS ile gönderilecek)
 * Token 7 gün geçerli
 */
function sms_evrak_token($evrakId) {
    $payload = $evrakId . '|' . (time() + 604800) . '|sms'; // 7 gün
    return base64_encode(hash_hmac('sha256', $payload, JWT_SECRET, true) . '|' . $payload);
}

/**
 * SMS evrak token doğrulama
 */
function sms_evrak_token_dogrula($token, $evrakId) {
    try {
        $decoded = base64_decode($token);
        if (!$decoded) return false;
        $parts = explode('|', $decoded, 2);
        if (count($parts) < 2) return false;
        $hash = $parts[0];
        $payload = $parts[1];
        $expectedHash = hash_hmac('sha256', $payload, JWT_SECRET, true);
        if (!hash_equals($expectedHash, $hash)) return false;
        $payloadParts = explode('|', $payload);
        if (count($payloadParts) < 3) return false;
        if ((int)$payloadParts[0] !== (int)$evrakId) return false;
        if ((int)$payloadParts[1] < time()) return false;
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Telefon numarasını normalize et (905XX formatına çevir)
 */
function sms_telefon_normalize($tel) {
    // Boşluk, tire, parantez temizle
    $tel = preg_replace('/[\s\-\(\)\+]/', '', $tel);

    if (empty($tel)) return '';

    // 05XX -> 905XX
    if (substr($tel, 0, 1) === '0' && strlen($tel) === 11) {
        $tel = '9' . $tel;
    }
    // 5XX -> 905XX
    if (substr($tel, 0, 1) === '5' && strlen($tel) === 10) {
        $tel = '90' . $tel;
    }
    // +90 -> 90
    if (substr($tel, 0, 2) === '90' && strlen($tel) === 12) {
        // Zaten doğru format
    }

    // 12 hane ve 90 ile başlamalı
    if (strlen($tel) === 12 && substr($tel, 0, 2) === '90') {
        return $tel;
    }

    return '';
}

/**
 * SMS ayarlarını oku
 */
function sms_ayarlari_oku($db = null) {
    if (!$db) $db = getDB();
    $ayarlar = [];
    try {
        $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'sms_%'");
        while ($row = $stmt->fetch()) {
            $ayarlar[$row['anahtar']] = $row['deger'];
        }
    } catch (Exception $e) {}
    return $ayarlar;
}

/**
 * SMS log kaydı oluştur (tablo yoksa otomatik oluşturur)
 */
function sms_logla($db, $telefon, $mesaj, $dosyaId, $kullaniciId, $durum, $sonucMesaj, $bulkId = null) {
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS sms_loglari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            telefon VARCHAR(30) NOT NULL,
            mesaj TEXT NOT NULL,
            dosya_id INT DEFAULT NULL,
            kullanici_id INT DEFAULT NULL,
            durum VARCHAR(20) NOT NULL DEFAULT 'bekliyor',
            sonuc_mesaj VARCHAR(500) DEFAULT NULL,
            bulk_id VARCHAR(100) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_dosya (dosya_id),
            INDEX idx_durum (durum),
            INDEX idx_telefon (telefon),
            INDEX idx_tarih (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $stmt = $db->prepare("
            INSERT INTO sms_loglari (telefon, mesaj, dosya_id, kullanici_id, durum, sonuc_mesaj, bulk_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $telefon,
            mb_substr($mesaj, 0, 1000),
            $dosyaId,
            $kullaniciId,
            $durum,
            mb_substr($sonucMesaj, 0, 500),
            $bulkId
        ]);
    } catch (Exception $e) {
        error_log('SMS_LOG_HATASI: ' . $e->getMessage());
    }
}
