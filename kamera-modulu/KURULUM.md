# 📹 MR HASAR — KAMERA İZLEME MODÜLÜ (Kurulum Kılavuzu)

**Amaç:** Sistemin içinden, sağ-alttaki **KAMERALAR** butonuyla, 4 kamerayı **seçmeli** ve **gerçek zamanlı** izlemek.
**Cihaz:** Hikvision DS-7104HGHI-K1 (DVR, 4 kanal).
**Bağımsızdır:** Netsantral / CRM / Arama / SMS / mevcut dosya akışına **dokunmaz**.

---

## 🧩 Sistem 3 parçadan oluşur

1. **Panel parçası** → `kameralar.js` (sisteme yüklenir). *(Hazır.)*
2. **Köprü** → ofis bilgisayarında **go2rtc** (kameraları tarayıcıya uygun, gerçek zamanlı hâle getirir).
3. **Güvenli tünel** → ofis bilgisayarında **cloudflared** (Cloudflare Tunnel) — HTTPS + güvenlik, port açmadan.

> Sistem HTTPS olduğu için köprü adresi de **https://** olmalı. Cloudflare Tunnel bunu otomatik verir.

---

## ✅ Önceden hazır olması gerekenler (sende mevcut)
- Ofiste, DVR ile **aynı ağa kablolu, sürekli açık bir bilgisayar** (Windows) ✓
- **Statik IP** ✓
- DVR'da **ISAPI açık**, **akış şifreleme kapalı** ✓ (ekran görüntülerinden doğrulandı)
- **Cloudflare'da yönetilen bir alan adı** (örn. `mrhasardanismanlik.com`) — *bunu doğrula*

## ✍️ Senden gereken bilgiler
- **DVR yerel IP** (DVR menüsü → Ağ → Temel Yapılandırma → IPv4 Adresi, örn. `192.168.1.64`)
- **DVR kullanıcı adı + şifre** → ⚠️ **yalnız `go2rtc.yaml` dosyasına** (ofis bilgisayarında) gir, sohbete/buluta yazma.
- (varsa) DVR RTSP portu farklıysa (varsayılan **554**).

---

## 1️⃣ ADIM — Panel parçası (cPanel)
1. `kamera-modulu/panel/kameralar.js` dosyasını sunucuda **`js/pages/`** klasörüne yükle.
2. `index.html` içine, `js/app.js` satırından **hemen önce** şu tek satırı ekle:
   ```html
   <script type="text/babel" data-type="module" src="js/pages/kameralar.js"></script>
   ```
3. Tarayıcıda **Ctrl+F5**. Giriş yapınca sağ-altta yuvarlak **KAMERALAR** butonu çıkar.
   *(Köprü henüz kurulmadıysa buton açılır ama "köprü adresi girilmemiş" der — normal.)*

## 2️⃣ ADIM — Köprü (go2rtc) — ofis bilgisayarı
1. **İndir:** `go2rtc` (Windows için `go2rtc_win64.zip`) → bir klasöre çıkar (örn. `C:\kamera\`).
2. Bu klasöre `kamera-modulu/ofis-bilgisayari/` içindeki **`go2rtc.yaml`** ve **`baslat.bat`** dosyalarını koy.
3. `go2rtc.yaml`'ı Not Defteri ile aç; **DVR_IP**, **KULLANICI**, **SIFRE** yerlerini kendi bilgilerinle değiştir, kaydet.
4. **`baslat.bat`**'a çift tıkla → siyah pencere açılır ve açık kalır (kapatma).
5. **Test:** Aynı bilgisayarda tarayıcıdan `http://localhost:1984` aç → kameralar listelenmeli, tıklayınca görüntü gelmeli. ✅
   *(Görüntü gelmezse: DVR IP/şifre/port'u kontrol et.)*

## 3️⃣ ADIM — Güvenli tünel (Cloudflare Tunnel) — ofis bilgisayarı
1. **İndir:** `cloudflared` (Windows) → `C:\kamera\cloudflared.exe`.
2. Komut İstemi'ni (CMD) aç, sırayla:
   ```
   cloudflared tunnel login
   cloudflared tunnel create mrhasar-kamera
   cloudflared tunnel route dns mrhasar-kamera kamera.ALANADIN.com
   ```
   *(`ALANADIN.com` yerine Cloudflare'daki alan adını yaz.)*
3. `C:\Users\<kullanıcı>\.cloudflared\config.yml` oluştur:
   ```yaml
   tunnel: mrhasar-kamera
   credentials-file: C:\Users\<kullanıcı>\.cloudflared\<TUNNEL-ID>.json
   ingress:
     - hostname: kamera.ALANADIN.com
       service: http://127.0.0.1:1984
     - service: http_status:404
   ```
4. Başlat:  `cloudflared tunnel run mrhasar-kamera`
   *(Sürekli açık kalmalı. Windows servisi yapmak için: `cloudflared service install`.)*
5. **Test:** Telefondan/başka ağdan `https://kamera.ALANADIN.com` aç → go2rtc açılmalı. ✅

> **Güvenlik (önerilir):** Cloudflare panelinde **Zero Trust → Access** ile `kamera.ALANADIN.com` adresini yalnız izinli e-postalara aç. Böylece adresi bilen herkes değil, sadece sen görürsün.

## 4️⃣ ADIM — Paneli bağla
1. Sistemde sağ-alt **KAMERALAR** → **⚙ AYARLAR**.
2. **Köprü adresi:** `https://kamera.ALANADIN.com` yaz.
3. Kamera adlarını düzenle (örn. GİRİŞ, OTOPARK…), **KAYDET**.
4. **TÜMÜ (2x2)** veya tek kamera seç → **gerçek zamanlı** izle. 🎉

---

## 🔁 Alternatif (Cloudflare alan adın YOKSA)
- **Statik IP + port yönlendirme:** Modemde `1984` portunu ofis bilgisayarına yönlendir. Ama panel HTTPS olduğu için **doğrudan gömme çalışmaz** (sertifika gerekir). Bu durumda panel butonu görüntüyü **yeni sekmede** açacak şekilde ayarlanır (daha az şık, güvenlik açısından adres herkese açık olur). **Önerilmez** — mümkünse Cloudflare Tunnel kullan.

## 🆘 Sık sorunlar
- **Buton çıkmıyor:** `kameralar.js` yüklendi mi? index.html satırı eklendi mi? Ctrl+F5.
- **"Köprü adresi girilmemiş":** ⚙ Ayarlar'dan HTTPS köprü adresini gir.
- **Siyah ekran/görüntü yok:** `http://localhost:1984` çalışıyor mu? DVR IP/şifre doğru mu? `baslat.bat` açık mı?
- **Gecikme fazla:** 2x2'de **alt akış** (kamera0X_alt) kullan; tek kamerada ana akış.

---
*Bu modül tamamen bağımsızdır; mevcut sistemden hiçbir dosyayı değiştirmez, yalnızca yeni dosyalar ekler.*
