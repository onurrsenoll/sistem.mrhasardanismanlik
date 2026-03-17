<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

echo "1. BASLIYOR\n";

require_once __DIR__ . '/config/helpers.php';
echo "2. HELPERS OK\n";

require_once __DIR__ . '/config/auth.php';
echo "3. AUTH OK\n";

require_once __DIR__ . '/config/sms_helper.php';
echo "4. SMS HELPER OK\n";

require_once __DIR__ . '/config/mail_helper.php';
echo "5. MAIL HELPER OK\n";

setup_headers();
echo "6. HEADERS OK\n";

$db = getDB();
echo "7. DB BAGLANTI OK\n";

$count = $db->query("SELECT COUNT(*) FROM dosyalar")->fetchColumn();
echo "8. DOSYALAR: $count kayit\n";

echo "TAMAM - TUM DOSYALAR SORUNSUZ\n";
