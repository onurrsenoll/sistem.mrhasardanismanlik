<?php
/**
 * POST /api/v1/whatsapp/toplu-gonder.php  — TOPLU / MANUEL GÖNDERİM
 *
 * Body:
 *  {
 *    "numaralar": "5321112233\n5324445566, 5327778899",   // çok satır / virgül / boşluk
 *    "tip": "sablon",                  // sablon | metin | medya
 *    "sablon": "duyuru", "dil": "tr", "parametreler": ["..."],   // tip=sablon
 *    "medya_header": {"tip":"image","link":"https://..."},        // tip=sablon (opsiyonel medya başlık)
 *    "mesaj": "...",                   // tip=metin/medya (caption)
 *    "medya": "https://...", "medya_tipi":"image|document|video", "dosya_adi":"x.pdf"  // tip=medya
 *  }
 *
 * NOT: WhatsApp kuralı — 24s dışındaki kişilere yalnız ONAYLI ŞABLON (tip=sablon) iletilir.
 *      Çok büyük listeleri arayüz PARÇA PARÇA (örn. 25'erli) göndermelidir (zaman aşımı için).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/whatsapp_helper.php';

setup_headers();
require_method('POST');
$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

/* Numara listesini ayrıştır (array veya çok satırlı/virgüllü metin) */
$ham = $body['numaralar'] ?? ($body['no'] ?? '');
$liste = is_array($ham) ? $ham : preg_split('/[\s,;]+/', (string)$ham);
$liste = array_values(array_unique(array_filter(array_map('trim', $liste))));
if (empty($liste)) json_error('NUMARA LİSTESİ BOŞ', 422);
if (count($liste) > 200) json_error('TEK İSTEKTE EN FAZLA 200 NUMARA — LİSTEYİ PARÇA PARÇA GÖNDERİN', 422);

@set_time_limit(120);
$tip = $body['tip'] ?? 'sablon';
$sonuclar = []; $basari = 0; $hata = 0;

foreach ($liste as $no) {
    if ($tip === 'metin') {
        $r = wa_gonder_metin($no, $body['mesaj'] ?? '', null, $user['id']);
    } elseif ($tip === 'medya') {
        $r = wa_gonder_medya($no, $body['medya_tipi'] ?? 'image', $body['medya'] ?? '',
                             $body['mesaj'] ?? null, $body['dosya_adi'] ?? null, null, $user['id']);
    } else { // sablon
        $r = wa_gonder_sablon($no, $body['sablon'] ?? '', $body['dil'] ?? 'tr',
                              $body['parametreler'] ?? [], $body['medya_header'] ?? null, null, $user['id']);
    }
    $ok = !empty($r['basarili']);
    $sonuclar[] = ['no' => $no, 'basarili' => $ok, 'mesaj' => $r['mesaj'] ?? ''];
    $ok ? $basari++ : $hata++;
}

log_action($user['id'], 'wa_toplu', "Toplu WhatsApp: " . count($liste) . " numara | $basari ok / $hata hata", 'whatsapp_loglari');
json_success(
    ['toplam' => count($liste), 'basarili' => $basari, 'hata' => $hata, 'sonuclar' => $sonuclar],
    "TOPLU GÖNDERİM TAMAMLANDI: $basari BAŞARILI / $hata HATA"
);
