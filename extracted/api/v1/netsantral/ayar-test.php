<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$data = get_json_body();

$wssUrl = isset($data['wss_url']) ? trim($data['wss_url']) : '';
$sipDomain = isset($data['sip_domain']) ? trim($data['sip_domain']) : '';
$dahili = isset($data['sip_dahili']) ? trim($data['sip_dahili']) : '';

// '••••••••' gelirse DB'den şifreyi yükle (test sırasında ekrandan girilmeyebilir)
$sipSifre = isset($data['sip_sifre']) ? $data['sip_sifre'] : '';
if ($sipSifre === '' || $sipSifre === '••••••••') {
    $sipSifre = netsantral_setting_get('sip_sifre');
}

$result = array(
    'wss_test' => null,
    'sip_test' => null,
    'errors' => array()
);

// 1) WSS URL erişilebilirlik testi (TCP socket ile)
if ($wssUrl) {
    $parsed = parse_url($wssUrl);
    $host = isset($parsed['host']) ? $parsed['host'] : '';
    $port = isset($parsed['port']) ? $parsed['port'] : (($parsed['scheme'] ?? '') === 'wss' ? 443 : 80);
    if ($host) {
        $errno = 0; $errstr = '';
        $fp = @stream_socket_client(($parsed['scheme'] === 'wss' ? 'ssl://' : 'tcp://') . $host . ':' . $port, $errno, $errstr, 5);
        if ($fp) {
            $result['wss_test'] = array('ok' => true, 'message' => 'WSS sunucuya TCP baglantisi basarili');
            fclose($fp);
        } else {
            $result['wss_test'] = array('ok' => false, 'message' => "WSS baglanti hatasi: [{$errno}] {$errstr}");
            $result['errors'][] = 'WSS hata';
        }
    } else {
        $result['wss_test'] = array('ok' => false, 'message' => 'WSS URL hatali format');
        $result['errors'][] = 'WSS format';
    }
} else {
    $result['wss_test'] = array('ok' => false, 'message' => 'WSS URL girilmedi');
}

// 2) SIP domain erişilebilirlik (PING benzeri DNS resolve)
if ($sipDomain) {
    $sipHost = preg_replace('/:\d+$/', '', $sipDomain);
    $ip = gethostbyname($sipHost);
    if ($ip && $ip !== $sipHost) {
        $result['sip_test'] = array('ok' => true, 'message' => "SIP domain cozuldu: {$sipHost} -> {$ip}", 'dahili' => $dahili);
    } else {
        $result['sip_test'] = array('ok' => false, 'message' => "SIP domain DNS cozumlenmedi: {$sipHost}");
        $result['errors'][] = 'SIP DNS';
    }
} else {
    $result['sip_test'] = array('ok' => false, 'message' => 'SIP domain girilmedi');
}

// SIP gerçek REGISTER testi tarayıcıda JsSIP üzerinden yapılır — burada sadece bağlantı seviyesi
$result['sifre_var'] = $sipSifre !== '' ? true : false;

json_success($result, count($result['errors']) === 0 ? 'Test basarili' : 'Bazi testler basarisiz');
