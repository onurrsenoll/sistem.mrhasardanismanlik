# MR HASAR — v2.9.2 BİLDİRİMLER + AJANDA + YETKİ ESNEKLİĞİ

**Tarih:** 2026-05-08
**Branch:** `claude/view-all-branches-qZ0JW`

## YAPILAN

### 1. Menü sırası değişti
- Eski: ... E-POSTA / **BİLDİRİMLER** / HESAPLAMALAR / ... / AJANDA / SİSTEM
- Yeni: ... E-POSTA / HESAPLAMALAR / ... / **BİLDİRİMLER** / SİSTEM
- AJANDA ana menüden çıkarıldı.

### 2. AJANDA artık BİLDİRİMLER sayfasının **ilk sekmesi**
- Sekme sırası: **AJANDA** | GELEN KUTUSU | GİDEN KUTUSU | YENİ MESAJ | SİSTEM BİLDİRİMLERİ
- BİLDİRİMLER tıklandığında varsayılan **AJANDA** açılır.
- Eski `#/ajanda` URL'i otomatik **#/mesajlar-ajanda**'ya yönlenir (geri uyumluluk).

### 3. Yetki esnekliği (BUG FIX)
**Sorun:** menuErisim() fonksiyonu sadece `<modul>_goruntule` veya `<modul>_<modul>-goruntule` pattern'lerini arıyordu. Yetki listesinde `mesaj-goruntule`, `bildirim-goruntule`, `ajanda-goruntule` gibi farklı isimli anahtarlar var → bunlar **yakalanamıyordu** → kullanıcı yetki vermiş olsa bile menüde gözükmüyordu.

**Düzeltme:** Modülün **herhangi bir izni** varsa ana menü item'ı görünür artık (`<modul>_*` herhangi bir anahtar = 1 ise göster).

Bu **rol-bazlı sınıflandırma değil** (kullanıcının uyarısına uygun) — sadece yetki anahtarı isimlendirme uyumsuzluğunun bug fix'i.

## DOSYA LİSTESİ (2 dosya)

| Dosya | Hedef |
|---|---|
| `YUKLENECEK_DOSYALAR/js/app.js` | `<root>/js/app.js` |
| `YUKLENECEK_DOSYALAR/js/pages/mesajlar.js` | `<root>/js/pages/mesajlar.js` |

## YÜKLEME
1. 2 dosyayı kopyala
2. **Hard reload** (Ctrl+Shift+R)
3. SQL gerekmez

## YETKİ MATRİSİ DURUMU (mevcut sistem.js'de TÜM modüller TANIMLI)
✅ dosya, crm, hesaplamalar, paydaslar, police, muhasebe, masraf, evrak, ajanda, mesajlar, bildirim, ictihat, netsantral, crm-analiz, eposta, mail, sistem

Yani SİSTEM > YETKİ YÖNETİMİ ekranında bu modüllerin hepsi listelenir, kullanıcılara verebilirsin.

## ROLLBACK
Yedeklediğin app.js + mesajlar.js'i geri yükle.
