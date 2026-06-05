<?php
/**
 * ════════════════════════════════════════════════════════════════════════
 *  MR HASAR DANIŞMANLIK — WHATSAPP HELPER  (BAĞIMSIZ MODÜL)
 *  Meta WhatsApp Cloud API entegrasyonu — SMS modülünden tamamen ayrı.
 *
 *  KURULUM: Bu dosya sunucuda  api/config/whatsapp_helper.php  olarak durur.
 *  Kullanım:
 *      require_once __DIR__ . '/whatsapp_helper.php';
 *      $r = wa_gonder_sablon('5321234567', 'dosya_acilis', 'tr', ['Ali Veli','2026-0123']);
 *      // $r = ['basarili'=>bool, 'mesaj'=>'...', 'kod'=>'...', 'wamid'=>'...']
 *
 *  Ayarlar (ayarlar tablosunda wa_* anahtarları):
 *      wa_aktif, wa_access_token, wa_phone_number_id, wa_waba_id,
 *      wa_business_id, wa_api_version (öntanımlı v21.0)
 *
 *  WhatsApp kuralı: Müşteri son 24 saatte yazmadıysa SERBEST METİN gönderilemez,
 *  ONAYLI ŞABLON gerekir. wa_gonder_sablon() bunu sağlar (resmî/ücretli yol).
 * ════════════════════════════════════════════════════════════════════════
 */

require_once __DIR__ . '/database.php';

/* ─── AYARLARI OKU (ayarlar tablosundan wa_*) ─── */
function wa_ayarlari_oku($db = null) {
    if (!$db) $db = getDB();
    $ayarlar = [
        'wa_aktif' => '0', 'wa_access_token' => '', 'wa_phone_number_id' => '',
        'wa_waba_id' => '', 'wa_business_id' => '', 'wa_api_version' => 'v21.0'
    ];
    try {
        $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'wa_%'");
        while ($row = $stmt->fetch()) { $ayarlar[$row['anahtar']] = $row['deger']; }
    } catch (\Exception $e) {}
    if (empty($ayarlar['wa_api_version'])) $ayarlar['wa_api_version'] = 'v21.0';
    return $ayarlar;
}

/* ─── TELEFON → E.164 (905XXXXXXXXX) ─── */
function wa_no_normalize($tel) {
    $tel = preg_replace('/[\s\-\(\)\+]/', '', (string)$tel);
    if ($tel === '') return '';
    if (strpos($tel, '00') === 0) $tel = substr($tel, 2);      // 0090... → 90...
    if (strlen($tel) === 11 && $tel[0] === '0') $tel = '9' . $tel; // 05XX... → 905XX...
    if (strlen($tel) === 10 && $tel[0] === '5') $tel = '90' . $tel; // 5XX... → 905XX...
    if (strlen($tel) === 12 && strpos($tel, '90') === 0) return $tel; // yurt içi
    if (strlen($tel) >= 11 && strlen($tel) <= 15) return $tel;        // yurt dışı (ülke kodlu)
    return '';
}

/* ─── LOG TABLOSU (kendiliğinden oluşur) ─── */
function wa_log_tablo_olustur($db) {
    static $ok = false;
    if ($ok) return;
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS whatsapp_loglari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            telefon VARCHAR(20) NOT NULL,
            tip VARCHAR(20) DEFAULT 'sablon' COMMENT 'metin|sablon|medya',
            icerik TEXT,
            sablon_adi VARCHAR(120) DEFAULT NULL,
            dosya_id INT DEFAULT NULL,
            kullanici_id INT DEFAULT NULL,
            durum VARCHAR(20) DEFAULT 'gonderildi' COMMENT 'gonderildi|hata|pasif',
            wamid VARCHAR(160) DEFAULT NULL,
            sonuc_mesaj VARCHAR(500) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tel (telefon), INDEX idx_dosya (dosya_id),
            INDEX idx_durum (durum), INDEX idx_tarih (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
        $ok = true;
    } catch (\Exception $e) {}
}

function wa_logla($db, $telefon, $tip, $icerik, $dosyaId, $kullaniciId, $durum, $sonuc, $wamid = null, $sablon = null) {
    try {
        wa_log_tablo_olustur($db);
        $stmt = $db->prepare("INSERT INTO whatsapp_loglari
            (telefon, tip, icerik, sablon_adi, dosya_id, kullanici_id, durum, wamid, sonuc_mesaj)
            VALUES (?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $telefon, $tip, mb_substr((string)$icerik, 0, 2000), $sablon,
            $dosyaId, $kullaniciId, $durum, $wamid, mb_substr((string)$sonuc, 0, 500)
        ]);
    } catch (\Exception $e) {}
}

/* ─── DÜŞÜK SEVİYE: Meta Graph API'ye gönder ─── */
function wa_api_gonder($ayarlar, $payload) {
    $ver   = $ayarlar['wa_api_version'] ?: 'v21.0';
    $phone = $ayarlar['wa_phone_number_id'] ?? '';
    $token = $ayarlar['wa_access_token'] ?? '';
    if (empty($phone) || empty($token)) {
        return ['basarili' => false, 'kod' => 'AYAR_EKSIK',
                'mesaj' => 'WHATSAPP AYARLARI EKSİK (token / phone id) — WHATSAPP AYARLARINI KONTROL EDİN'];
    }
    $url = "https://graph.facebook.com/{$ver}/{$phone}/messages";
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE)
    ]);
    $resp = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['basarili' => false, 'kod' => 'CURL_' . $errno, 'mesaj' => 'BAĞLANTI HATASI: ' . $err];
    }
    $data = json_decode($resp, true);
    if ($http >= 200 && $http < 300 && !empty($data['messages'][0]['id'])) {
        return ['basarili' => true, 'kod' => '00', 'mesaj' => 'GÖNDERİLDİ',
                'wamid' => $data['messages'][0]['id']];
    }
    $hata = $data['error']['message'] ?? ('HTTP ' . $http);
    $hkod = $data['error']['code'] ?? $http;
    return ['basarili' => false, 'kod' => (string)$hkod, 'mesaj' => 'WHATSAPP HATASI: ' . $hata];
}

/* ─── ŞABLON MESAJI (işletme-başlatımlı, resmî/ücretli yol) ───
 *  $bodyParams : gövdedeki {{1}},{{2}}... için sıralı metin dizisi
 *  $headerMedya: ['tip'=>'image|document|video', 'link'=>'https://...'] (opsiyonel)
 */
function wa_gonder_sablon($no, $sablonAdi, $dilKodu = 'tr', $bodyParams = [], $headerMedya = null, $dosyaId = null, $kullaniciId = null) {
    $db = getDB();
    $ayarlar = wa_ayarlari_oku($db);
    if (($ayarlar['wa_aktif'] ?? '0') !== '1') {
        $s = ['basarili' => false, 'kod' => 'PASIF', 'mesaj' => 'WHATSAPP MODÜLÜ AKTİF DEĞİL'];
        wa_logla($db, $no, 'sablon', $sablonAdi, $dosyaId, $kullaniciId, 'pasif', $s['mesaj'], null, $sablonAdi);
        return $s;
    }
    $tel = wa_no_normalize($no);
    if ($tel === '') {
        $s = ['basarili' => false, 'kod' => 'GECERSIZ_NO', 'mesaj' => 'GEÇERSİZ NUMARA: ' . $no];
        wa_logla($db, $no, 'sablon', $sablonAdi, $dosyaId, $kullaniciId, 'hata', $s['mesaj'], null, $sablonAdi);
        return $s;
    }
    $components = [];
    if ($headerMedya && !empty($headerMedya['link'])) {
        $tip = $headerMedya['tip'] ?? 'image';
        $components[] = ['type' => 'header', 'parameters' => [[ 'type' => $tip, $tip => ['link' => $headerMedya['link']] ]]];
    }
    if (!empty($bodyParams)) {
        $params = [];
        foreach ($bodyParams as $p) { $params[] = ['type' => 'text', 'text' => (string)$p]; }
        $components[] = ['type' => 'body', 'parameters' => $params];
    }
    $tpl = ['name' => $sablonAdi, 'language' => ['code' => $dilKodu]];
    if (!empty($components)) $tpl['components'] = $components;
    $payload = ['messaging_product' => 'whatsapp', 'to' => $tel, 'type' => 'template', 'template' => $tpl];

    $r = wa_api_gonder($ayarlar, $payload);
    wa_logla($db, $tel, 'sablon', $sablonAdi . ' [' . implode(' | ', $bodyParams) . ']',
             $dosyaId, $kullaniciId, $r['basarili'] ? 'gonderildi' : 'hata', $r['mesaj'], $r['wamid'] ?? null, $sablonAdi);
    return $r;
}

/* ─── SERBEST METİN (yalnız 24 saatlik oturum içinde geçerli) ─── */
function wa_gonder_metin($no, $metin, $dosyaId = null, $kullaniciId = null) {
    $db = getDB();
    $ayarlar = wa_ayarlari_oku($db);
    if (($ayarlar['wa_aktif'] ?? '0') !== '1') {
        return ['basarili' => false, 'kod' => 'PASIF', 'mesaj' => 'WHATSAPP MODÜLÜ AKTİF DEĞİL'];
    }
    $tel = wa_no_normalize($no);
    if ($tel === '') {
        $s = ['basarili' => false, 'kod' => 'GECERSIZ_NO', 'mesaj' => 'GEÇERSİZ NUMARA: ' . $no];
        wa_logla($db, $no, 'metin', $metin, $dosyaId, $kullaniciId, 'hata', $s['mesaj']);
        return $s;
    }
    $payload = ['messaging_product' => 'whatsapp', 'to' => $tel, 'type' => 'text',
                'text' => ['preview_url' => true, 'body' => (string)$metin]];
    $r = wa_api_gonder($ayarlar, $payload);
    wa_logla($db, $tel, 'metin', $metin, $dosyaId, $kullaniciId,
             $r['basarili'] ? 'gonderildi' : 'hata', $r['mesaj'], $r['wamid'] ?? null);
    return $r;
}

/* ─── MEDYA (yalnız 24 saatlik oturum içinde; link ile) ─── */
function wa_gonder_medya($no, $medyaTipi, $link, $caption = null, $dosyaAdi = null, $dosyaId = null, $kullaniciId = null) {
    $db = getDB();
    $ayarlar = wa_ayarlari_oku($db);
    if (($ayarlar['wa_aktif'] ?? '0') !== '1') {
        return ['basarili' => false, 'kod' => 'PASIF', 'mesaj' => 'WHATSAPP MODÜLÜ AKTİF DEĞİL'];
    }
    $tel = wa_no_normalize($no);
    if ($tel === '') return ['basarili' => false, 'kod' => 'GECERSIZ_NO', 'mesaj' => 'GEÇERSİZ NUMARA: ' . $no];
    $medyaTipi = in_array($medyaTipi, ['image','document','video','audio']) ? $medyaTipi : 'document';
    $obj = ['link' => $link];
    if ($caption && in_array($medyaTipi, ['image','document','video'])) $obj['caption'] = $caption;
    if ($medyaTipi === 'document' && $dosyaAdi) $obj['filename'] = $dosyaAdi;
    $payload = ['messaging_product' => 'whatsapp', 'to' => $tel, 'type' => $medyaTipi, $medyaTipi => $obj];
    $r = wa_api_gonder($ayarlar, $payload);
    wa_logla($db, $tel, 'medya', $medyaTipi . ': ' . $link, $dosyaId, $kullaniciId,
             $r['basarili'] ? 'gonderildi' : 'hata', $r['mesaj'], $r['wamid'] ?? null);
    return $r;
}
