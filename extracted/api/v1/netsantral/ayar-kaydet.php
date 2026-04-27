<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST', 'PUT');

$user = auth_required();
$data = get_json_body();

$sifreliAlanlar = array('sip_sifre', 'netgsm_api_sifre');
$izinliAnahtarlar = array(
    'wss_url', 'sip_domain', 'sip_dahili', 'sip_sifre',
    'outbound_proxy', 'santral_no', 'netgsm_api_kullanici', 'netgsm_api_sifre',
    'auto_register', 'ringtone_volume', 'speaker_volume', 'mic_volume'
);

$kayit_sayisi = 0;
$hatali = array();

try {
    foreach ($data as $anahtar => $deger) {
        if (!in_array($anahtar, $izinliAnahtarlar)) continue;

        $sifrele = in_array($anahtar, $sifreliAlanlar);

        // Şifre alanı: '••••••••' geliyorsa kullanıcı şifreyi değiştirmemiş — atla
        if ($sifrele && $deger === '••••••••') continue;

        $ok = netsantral_setting_set($anahtar, $deger, $sifrele, $user['id']);
        if ($ok) {
            $kayit_sayisi++;
        } else {
            $hatali[] = $anahtar;
        }
    }

    log_action($user['id'], 'netsantral-ayar-kaydet', 'Netsantral ayarlari guncellendi (' . $kayit_sayisi . ' alan)', 'netsantral_ayarlari', null);

    json_success(array(
        'kaydedilen' => $kayit_sayisi,
        'hatali' => $hatali
    ), $kayit_sayisi . ' ayar kaydedildi');
} catch (Exception $e) {
    json_error('Kaydetme hatasi: ' . $e->getMessage(), 500);
}
