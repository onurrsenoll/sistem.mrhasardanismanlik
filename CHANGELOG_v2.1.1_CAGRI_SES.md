# MR HASAR — v2.1.1 ÇAĞRI WIDGET + SES KALİTESİ HOT-FIX
**Tarih:** 2026-04-29
**Risk:** Çok düşük (sadece 3 JS dosyası, DB/auth/PHP yok)
**Çalışma süresi:** 5 dakika

> Bu yama **bağımsız** — v2.1 yamasından önce de sonra da uygulanabilir, çakışmaz.

---

## NE DÜZELTİLDİ

### 1. Çağrı widget artık görünüyor
**Sorun:** `MR.WebrtcWidget` component'i yazılmış ama `app.js` içinde **mount edilmemişti**. Bu yüzden çağrı geldiğinde:
- Zil çalıyordu (webrtc-phone.js bağımsız) ✓
- Olay tetikleniyordu ✓
- Ama "Cevapla / Sessize Al / Reddet" popup'ı **hiç render edilmiyordu** ❌

**Çözüm:** `app.js`'in App render'ına `<MR.WebrtcWidget user={user} setPage={setPage}/>` mount eklendi.

### 2. Çoklu yetki desteği (yetki anahtarınızdan emin değildiniz)
**Çözüm:** `MR.cagriWidgetYetkili(user)` fonksiyonu eklendi. Şu durumlarda widget gösterilir:
- Kullanıcı **admin** ise — her zaman
- Veya kullanıcının yetkilerinde şu öneklerden herhangi biri varsa:
  - `netsantral_*` (netsantral modülü herhangi yetkisi)
  - `cagri_*`
  - `cagri-merkezi_*`
  - `arama_*`
  - `arama-log_*`

Yani yetki ekranında **netsantral, çağrı, çağrı merkezi, arama veya arama log** gruplarından hangisini işaretlemiş olursanız olun çalışır.

### 3. Ses kalitesi (karşı tarafa giden ses)
**Sorun:** `webrtc-phone.js`'de `_mikrofonAkisiOlustur()` adında gelişmiş bir mikrofon fonksiyonu vardı ama `ara()` ve `cevapla()` bunu **çağırmıyordu**. İkisi de düz `getUserMedia({audio: true})` kullanıyordu — yani:
- Eko önleme ❌
- Gürültü bastırma ❌
- Otomatik kazanç ❌
- HD ses (48 kHz) ❌
- Seçili kulaklık desteği ❌
- Mikrofon yükseltici ❌

**Çözüm:** `ara()` ve `cevapla()` artık `_mikrofonAkisiOlustur()`'u çağırıyor. Aktifleşen özellikler:
- ✅ `echoCancellation` — eko önleme
- ✅ `noiseSuppression` — klavye/fan/ofis gürültü bastırma
- ✅ `autoGainControl` — otomatik kazanç (alçak ses otomatik yükseltilir)
- ✅ 48 kHz HD ses
- ✅ Mono kanal (telefon görüşmesine uygun)
- ✅ Seçili mikrofon (kulaklık takıldığında otomatik kullanılır — `mikrofonId` ayarı varsa)
- ✅ Mikrofon kazanç kontrolü (`mikrofonGain` ayarı varsa)

---

## YÜKLEME (5 dakika)

1. cPanel → Dosya Yöneticisi → `public_html/sistem.mrhasardanismanlik.com/`
2. `mr_hasar_yama_v2.1.1_cagri_ses_2026-04-29.zip`'i yükle
3. Sağ tık → Çıkart → "Mevcut dosyaların üzerine yaz" işaretli
4. ZIP'i sil
5. Kullanıcıların tarayıcılarında **Ctrl+F5** ile hard refresh yapsınlar (cache busting `MR_VERSION` zaten var ama emin olmak için)

**Üzerine yazılan 3 dosya:**
- `public_html/.../js/app.js`
- `public_html/.../js/webrtc-widget.js`
- `public_html/.../js/webrtc-phone.js`

**Diğer hiçbir dosyaya, klasöre, veritabanına dokunulmaz.**

---

## TEST

1. **Admin hesapla giriş yap.**
2. Telefonundan ofise ara →
   - ✓ Sağ üstte "GELEN ÇAĞRI" popup'ı çıkmalı (Cevapla/Sessize/Reddet butonları)
   - ✓ Cevapla'ya bas → karşı taraf seni temiz duymalı (eko/gürültü olmadan)
   - ✓ Sen de karşıyı duymalısın (zaten bu çalışıyordu)
3. **Yetki verilmiş bir kullanıcı hesabıyla** giriş yap → aynı testi yap.
4. **Hiç yetki olmayan bir kullanıcıyla** giriş yap → çağrı geldiğinde popup **çıkmamalı** (yetki kapısı çalışıyor).

### Eğer yetki verilen kullanıcıda yine de görünmezse
F12 → Console'a yaz:
```
console.log(MR._currentUser?.yetkiler);
```
Çıktıdaki anahtarları bana ilet → kapıyı genişletirim. Ama büyük ihtimalle ihtiyaç olmayacak (5 önek desteği var).

---

## ROLLBACK (sorun olursa)

Yedeğindeki orijinal `js/app.js`, `js/webrtc-widget.js`, `js/webrtc-phone.js`'yi public_html'a geri yükle. Başka hiçbir dosya etkilenmedi.

---

## v2.1 İLE ÇAKIŞMA YOK

v2.1 yaması (mesai sonrası uygulayacağın) **bu 3 dosyaya dokunmuyor.** Sırasız uygulanabilir:
- Önce v2.1.1, sonra v2.1 → ✓
- Önce v2.1, sonra v2.1.1 → ✓
- İkisi birden tek ZIP halinde → istersen birleştirebilirim, söyle.
