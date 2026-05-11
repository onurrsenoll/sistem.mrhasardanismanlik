# MR HASAR v2.12 — MAĞDUR ARAÇ SAHİBİ OTOMATİK DOLDURMA

**Tarih:** 10.05.2026
**Tek dosya:** `js/pages/dosya-yeni.js`

---

## TESPİT EDİLEN HATA

DOSYA YENİ formunda **MAĞDUR ADI SOYADI** ve **T.C. KİMLİK NO** yazıldığında ADK/MDK bölümündeki **RUHSAT SAHİBİ** ve **RUHSAT SAHİBİ TC** alanları otomatik dolması gerekiyordu. Önceki sürümde:

```jsx
<input value={form.ma_ruhsat || form.ad_soyad} onChange={...}/>
```

Bu sadece **görsel hile** idi:
- Ekranda mağdur adı RUHSAT SAHİBİ alanında görünüyordu
- Ama `form.ma_ruhsat` state'i hala **boş**
- KAYDET basılınca backend'e `ma_ruhsat=''`, `ma_tc=''` gidiyordu
- Dosya detayında bu alanlar boş kalıyordu

---

## DÜZELTME

`ADI SOYADI` ve `T.C. KİMLİK NO` onChange'leri sarmalandı — yazılan değer hem mağdur alanına hem de ma_ruhsat/ma_tc state'ine yazılıyor:

```jsx
onChange={e=>{
  const yeni = e.target.value;
  setForm(p => ({
    ...p,
    ad_soyad: yeni,
    ma_ruhsat: (!p.ma_ruhsat || p.ma_ruhsat === p.ad_soyad) ? yeni : p.ma_ruhsat
  }));
}}
```

**Davranış:**
- Mağdur ADI SOYADI yazılırken RUHSAT SAHİBİ alanı **anında** dolar.
- Kullanıcı RUHSAT SAHİBİ alanına **manuel farklı bir isim** girerse (ör. araç başkasının adına), o değer korunur — daha sonra mağdur adı değişse bile **override edilmez**.
- Aynı mantık T.C. KİMLİK NO → RUHSAT SAHİBİ TC için de çalışır.

Görsel hile `value={form.ma_ruhsat || form.ad_soyad}` kaldırıldı, artık `value={form.ma_ruhsat}` yeterli (state senkronize olduğu için).

---

## DOKUNULMAYAN MODÜLLER

- RUHSAT OKUYUCU (`qr-ruhsat.js`)
- İHBAR FÖYÜ (`ihbar-foyu.js`)
- POLİÇE (`police.js`)
- Diğer tüm modüller ve API endpoint'ler

---

## KURULUM

`YUKLENECEK_DOSYALAR/js/pages/dosya-yeni.js` dosyasını sunucudaki **aynı yola** üzerine yazarak kopyalayın. Tarayıcıda `Ctrl+F5`.

---

## TEST

1. DOSYA İŞLEMLERİ → YENİ DOSYA
2. ADK seçili tut.
3. **MAĞDUR BİLGİLERİ** bölümünde "ADI SOYADI" alanına yazarken aşağı kaydır → **MAĞDUR ARACI** bölümünde RUHSAT SAHİBİ alanının canlı olarak senkronize olduğunu gör.
4. T.C. KİMLİK NO da aynı şekilde.
5. RUHSAT SAHİBİ alanına manuel "Mehmet Yılmaz" yaz → ADI SOYADI'nı değiştir → RUHSAT SAHİBİ "Mehmet Yılmaz" olarak kalmalı (override yok).
6. KAYDET → DOSYA LİSTESİ → bu dosyayı aç → MAĞDUR ARAÇ SAHİBİ alanı dolu görünmeli.

---

## GERİ ALMA

Önceki `js/pages/dosya-yeni.js` dosyanızı geri yükleyin.
