<?php
/**
 * ════════════════════════════════════════════════════════════════════════
 *  DOSYA → WHATSAPP OLAY KANCASI  (GENİŞLETİLEBİLİR)
 *
 *  Sistemin kendi _dosya_prim_hook.php deseniyle aynı mantık.
 *  dosya/create.php (ve update.php) SONUNA tek satırla çağrılır:
 *
 *      try {
 *          require_once __DIR__ . '/_dosya_whatsapp_hook.php';
 *          if (function_exists('wa_dosya_acildi')) wa_dosya_acildi($db, (int)$dosyaId, $user['id'] ?? null);
 *      } catch (\Throwable $e) { error_log('[wa create hook] '.$e->getMessage()); }
 *
 *  → try/catch korumalı; WhatsApp hata verse bile DOSYA AÇILIŞI ASLA BOZULMAZ.
 *  → Yeni olay eklemek = bu dosyaya yeni fonksiyon (create.php'ye tekrar dokunmadan).
 *
 *  AYARLAR (ayarlar tablosu):
 *    wa_aktif, wa_dosya_acilis_aktif, wa_sablon_dosya_acilis, wa_sablon_dil,
 *    wa_durum_degisim_aktif, wa_sablon_durum_degisim
 * ════════════════════════════════════════════════════════════════════════
 */

if (!function_exists('wa_hook_helper')) {
    function wa_hook_helper() {
        require_once __DIR__ . '/../../config/whatsapp_helper.php'; // api/config/whatsapp_helper.php
    }
}

/* Dosya + müşteri bilgisini topla (tablolar arası dayanıklı) */
if (!function_exists('wa_dosya_bilgi_getir')) {
    function wa_dosya_bilgi_getir(PDO $db, int $dosyaId): ?array {
        $d = null;
        try {
            $st = $db->prepare("SELECT dosya_no,
                    COALESCE(magdur_ad,'')       AS ad,
                    COALESCE(magdur_telefon,'')  AS tel,
                    COALESCE(asama,'')           AS asama
                FROM dosyalar WHERE id = ? LIMIT 1");
            $st->execute([$dosyaId]);
            $d = $st->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            try {
                $st = $db->prepare("SELECT dosya_no FROM dosyalar WHERE id = ? LIMIT 1");
                $st->execute([$dosyaId]);
                $d = $st->fetch(PDO::FETCH_ASSOC);
                if ($d) { $d['ad'] = ''; $d['tel'] = ''; $d['asama'] = ''; }
            } catch (\Throwable $e2) { $d = null; }
        }
        if (!$d) return null;
        if (empty($d['tel']) || empty($d['ad'])) {
            try {
                $st = $db->prepare("SELECT COALESCE(ad_soyad,'') ad, COALESCE(telefon,'') tel
                                    FROM magdurlar WHERE dosya_id = ? ORDER BY id ASC LIMIT 1");
                $st->execute([$dosyaId]);
                $m = $st->fetch(PDO::FETCH_ASSOC);
                if ($m) {
                    if (empty($d['ad'])) $d['ad'] = $m['ad'];
                    if (empty($d['tel'])) $d['tel'] = $m['tel'];
                }
            } catch (\Throwable $e) {}
        }
        return $d;
    }
}

/* ─── OLAY 1: DOSYA AÇILDI ─── */
if (!function_exists('wa_dosya_acildi')) {
    function wa_dosya_acildi(PDO $db, int $dosyaId, $kullaniciId = null): array {
        $res = ['gonderildi' => false];
        if ($dosyaId <= 0) return $res;
        wa_hook_helper();
        $ay = wa_ayarlari_oku($db);
        if (($ay['wa_aktif'] ?? '0') !== '1') return $res;             // modül kapalı
        if (($ay['wa_dosya_acilis_aktif'] ?? '0') !== '1') return $res; // bu olay kapalı
        $sablon = trim($ay['wa_sablon_dosya_acilis'] ?? '');
        $dil    = trim($ay['wa_sablon_dil'] ?? 'tr') ?: 'tr';
        if ($sablon === '') return $res;                                // şablon tanımsız
        $d = wa_dosya_bilgi_getir($db, $dosyaId);
        if (!$d || empty($d['tel'])) return $res;                       // numara yok
        $ad = ($d['ad'] !== '' ? $d['ad'] : 'SAYIN MÜŞTERİMİZ');
        // Onaylı şablon gövdesi: {{1}}=ad-soyad, {{2}}=dosya_no
        $r = wa_gonder_sablon($d['tel'], $sablon, $dil, [$ad, $d['dosya_no']], null, $dosyaId, $kullaniciId);
        $res['gonderildi'] = !empty($r['basarili']);
        $res['sonuc'] = $r;
        return $res;
    }
}

/* ─── OLAY 2: DOSYA DURUMU/AŞAMASI DEĞİŞTİ (opsiyonel) ─── */
if (!function_exists('wa_dosya_durum_degisti')) {
    function wa_dosya_durum_degisti(PDO $db, int $dosyaId, $yeniDurum = '', $kullaniciId = null): array {
        $res = ['gonderildi' => false];
        if ($dosyaId <= 0) return $res;
        wa_hook_helper();
        $ay = wa_ayarlari_oku($db);
        if (($ay['wa_aktif'] ?? '0') !== '1') return $res;
        if (($ay['wa_durum_degisim_aktif'] ?? '0') !== '1') return $res;
        $sablon = trim($ay['wa_sablon_durum_degisim'] ?? '');
        $dil    = trim($ay['wa_sablon_dil'] ?? 'tr') ?: 'tr';
        if ($sablon === '') return $res;
        $d = wa_dosya_bilgi_getir($db, $dosyaId);
        if (!$d || empty($d['tel'])) return $res;
        $ad = ($d['ad'] !== '' ? $d['ad'] : 'SAYIN MÜŞTERİMİZ');
        $durum = ($yeniDurum !== '' ? $yeniDurum : ($d['asama'] ?? ''));
        // {{1}}=ad, {{2}}=dosya_no, {{3}}=yeni durum
        $r = wa_gonder_sablon($d['tel'], $sablon, $dil, [$ad, $d['dosya_no'], $durum], null, $dosyaId, $kullaniciId);
        $res['gonderildi'] = !empty($r['basarili']);
        $res['sonuc'] = $r;
        return $res;
    }
}

/* ─── İLERİDE: yeni olaylar buraya eklenir (evrak yüklendi, ödeme alındı, hatırlatma…) ─── */
