<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

echo "=== LOGIN DEBUG ===\n\n";

echo "1. PHP VERSION: " . PHP_VERSION . "\n";

echo "2. DATABASE.PHP: ";
try {
    require_once __DIR__ . '/config/database.php';
    echo "OK\n";
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
    die("DATABASE YUKLENEMEDI!");
}

echo "3. AUTH.PHP: ";
try {
    require_once __DIR__ . '/config/auth.php';
    echo "OK\n";
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
    die("AUTH YUKLENEMEDI!");
}

echo "4. HELPERS.PHP: ";
try {
    require_once __DIR__ . '/config/helpers.php';
    echo "OK\n";
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
    die("HELPERS YUKLENEMEDI!");
}

echo "5. DB BAGLANTI: ";
try {
    $db = getDB();
    echo "OK\n";
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
    die("DB BAGLANTI HATASI!");
}

echo "6. ENSURE_2FA: ";
try {
    ensure_2fa_columns();
    echo "OK\n";
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
}

echo "7. USERS TABLOSU: ";
try {
    $count = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    echo "$count kullanici\n";
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
}

echo "8. ADMIN KULLANICI: ";
try {
    $stmt = $db->prepare("SELECT id, email, rol, aktif FROM users WHERE email = ?");
    $stmt->execute(['admin@mrhasar.com']);
    $u = $stmt->fetch();
    if ($u) {
        echo "ID={$u['id']} ROL={$u['rol']} AKTIF={$u['aktif']}\n";
    } else {
        echo "BULUNAMADI\n";
    }
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
}

echo "9. SMS_HELPER: ";
try {
    require_once __DIR__ . '/config/sms_helper.php';
    echo "OK\n";
} catch (Throwable $e) {
    echo "HATA: " . $e->getMessage() . "\n";
}

echo "10. MAIL_HELPER: ";
if (file_exists(__DIR__ . '/config/mail_helper.php')) {
    echo "DOSYA VAR - ";
    try {
        require_once __DIR__ . '/config/mail_helper.php';
        echo "OK\n";
    } catch (Throwable $e) {
        echo "HATA: " . $e->getMessage() . "\n";
    }
} else {
    echo "DOSYA YOK (silinmis)\n";
}

echo "\n=== TAMAMLANDI ===\n";
