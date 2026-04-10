/**
 * MR HASAR DANIŞMANLIK - EVRAK OKUYUCU v3
 * OpenRouter API direkt frontend'den (referans koddaki callAI yapısı)
 * Anlaşmalı KTT: TRAMER 48 senaryo + kroki + beyan + kusur analizi
 * Polis KTT + Hasar İhbar: yüksek doğrulukta bilgi çıkarma
 */
const MR = window.MR || (window.MR = {});
const {useState, useCallback, useRef, useEffect, useMemo} = React;

/* ══════════════════════════════════════════════════════
   JSON SAFE PARSER
══════════════════════════════════════════════════════ */
function safeParseJSON(raw) {
  if (!raw) throw new Error("Boş yanıt");
  let txt = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(txt); } catch {}
  const open = (txt.match(/\{/g) || []).length;
  const close = (txt.match(/\}/g) || []).length;
  if (open > close) txt += "}".repeat(open - close);
  try { return JSON.parse(txt); } catch {}
  const last = txt.lastIndexOf("}");
  if (last > 0) {
    const cut = txt.slice(0, last + 1);
    try { return JSON.parse(cut); } catch {}
  }
  const fixed = txt
    .replace(/:\s*"([^"]*?)(?=\s*[,\}\]])/g, (_, v) => `: "${v.replace(/\n/g, " ")}"`)
    .replace(/,\s*\}/g, "}")
    .replace(/,\s*\]/g, "]");
  try { return JSON.parse(fixed); } catch (e) { throw new Error("JSON parse: " + e.message); }
}

/* ══════════════════════════════════════════════════════
   OPENROUTER API (referans koddan birebir)
══════════════════════════════════════════════════════ */
async function callAI(apiKey, userContent, system, maxTokens = 2000) {
  if (!apiKey) throw new Error("OpenRouter API key girilmemiş. Sistem > Firma Ayarları'ndan ekleyin.");
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  msgs.push({ role: "user", content: userContent });
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://sistem.mrhasardanismanlik.com",
      "X-Title": "MR Hasar Evrak Okuyucu"
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      max_tokens: maxTokens,
      messages: msgs
    })
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`OpenRouter ${r.status}: ${e}`);
  }
  const d = await r.json();
  return (d.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
}

function imgContent(b64, mime, text) {
  return [
    { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
    { type: "text", text }
  ];
}

/* ══════════════════════════════════════════════════════
   TRAMER 48 SENARYO (sadece Anlaşmalı KTT için)
══════════════════════════════════════════════════════ */
const TRAMER = `DURUM 1A: Aynı yönde A kırmızı ışıkta durmuş B takip mesafesi korumadı → B %100 (K.Y.T.K.56/c,Yön:107)
DURUM 1B: A yeşil ışıkta aniden durdu B hız aştı → A %50 B %50
DURUM 1C: A kırmızı→yeşil geçişinde geri hareket → A %100 (K.Y.T.K.67,Yön:137)
DURUM 2: Kırmızı ışıkta geçiş yapan A → A %100 (K.Y.T.K.47,Yön:95)
DURUM 3: B yanlış şeritten geldi A yeşil kurallı dönüyor → B %100
DURUM 4: Her iki sürücü yeşil ışık iddiasında → A %50 B %50
DURUM 5: B yetkili kişi işaretine uymadı → B %100
DURUM 6: B tali yoldan ana yola çıkarken A'ya yol vermedi → B %100
DURUM 7: B karşı şeride geçti → B %100
DURUM 8: B ters yönde geri manevra yaptı → B %100
DURUM 9: A B'ye arkadan çarptı → A %100 (K.Y.T.K.56/1-c,Yön:107)
DURUM 10: A arkadan çarptı → A %100
DURUM 11: Kavşakta A arkadan çarptı → A %100
DURUM 12: B sağ şeritten dar kavisle dönüş yapmadı → B %100
DURUM 13: İşaretsiz kavşakta B sağdan gelen A'ya öncelik vermedi → B %100
DURUM 14: Her iki araç sağ şerit ihlali → A %50 B %50
DURUM 15: B yasak yerde durdu %50 A sağa dönüşü dar yapmadı %50
DURUM 16: Dönel kavşakta B sağdan dönmedi → B %100
DURUM 18: Dar yolda B A'ya geçiş hakkı vermedi → B %100
DURUM 19: Her iki araç karşılıklı şerit ihlali → A %50 B %50
DURUM 20: A sollamada sol taraftan gelen aracı beklemedi → A %100
DURUM 22: A geçiş kurallarını ihlal etti → A %100
DURUM 23: A kurallı dönüş yaparken B kavşağa hızlı yaklaştı → B %100
DURUM 25: B iz/mülkten çıkarken A'nın geçişini beklemedi → B %100
DURUM 26: B şerit değiştirme ihlali → B %100
DURUM 27: A kurallı park etmiş araca çarptı → A %100
DURUM 30: Zincirleme arkadan çarpmalar her çarpan araç %100
DURUM 32: B dönel kavşakta A'nın şeridini ihlal etti → B %100
DURUM 33: Dönel kavşakta A kurallı B'ye çarptı → A %100
DURUM 44: A dikkatsiz ana yola çıktı B'ye çarptı A %100
DURUM 45: C şerit değiştirerek B'yi A'ya itti → C %100
DURUM 47: B kontrolsüz U dönüşü → B %100
DURUM 48: A ters yöne girdi B ile çarpıştı → A %100`;

/* ══════════════════════════════════════════════════════
   PROMPT'LAR
══════════════════════════════════════════════════════ */
const ANLASMA_SYS = `Türk trafik sigortası kusur analiz uzmanısın. TRAMER:
${TRAMER}

Anlaşmalı Maddi Hasarlı Kaza Tespit Tutanağı'nı analiz et. EL YAZISI ile doldurulmuş olabilir, dikkatle oku. Önce krokilere (bölüm 9-10), sonra beyanlara (bölüm 11) bak.

SADECE geçerli JSON döndür, başka hiçbir şey yazma:
{"kaza":{"tarih":"","saat":"","il":"","ilce":"","cadde":"","yolTipi":""},"a":{"plaka":"","marka":"","surucu":"","tc":"","telefon":"","adres":"","sigorta":"","policeNo":"","hasar":""},"b":{"plaka":"","marka":"","surucu":"","tc":"","telefon":"","adres":"","sigorta":"","policeNo":"","hasar":""},"kroki":{"yol":"","aPos":"","bPos":"","carpma":"","sinyal":"","refuj":""},"beyan":{"a":"","b":"","celisme":"","uyum":""},"senaryo":"DURUM X","kategori":"","analiz":"Bu kazanın oluşumunda; [3-4 cümle]","kusur":[{"arac":"A","plaka":"","oran":0,"neden":""},{"arac":"B","plaka":"","oran":100,"neden":""}],"yasal":[""],"tespitler":[""],"guven":85,"uyarilar":[]}`;

const POLIS_SYS = `Sen Türk trafik sigortası evrak analiz uzmanısın. Polis Trafik Kaza Tespit Tutanağı'nı yüksek doğrulukta oku ve tüm bilgileri çıkar.

SADECE geçerli JSON döndür:
{"tutanakNo":"","tarih":"","saat":"","il":"","ilce":"","mahalle":"","cadde":"","yolTipi":"","hava":"","araclar":[{"sira":1,"plaka":"","marka":"","model":"","modelYili":"","renk":"","surucu":"","tc":"","dogumYili":"","ehliyet":"","sigorta":"","policeNo":"","hasar":"","kusurOrani":"","ihlal":"","alkol":""}],"yaralilar":[{"adi":"","tc":"","pozisyon":"","durum":""}],"kazaOzeti":"M.KAZANIN ÖZETİ bölümündeki TAM METİN","kusurTespiti":"","kanunMaddeleri":[""],"guven":90}

KURALLAR:
- Tüm araçları araclar dizisine ekle (1 veya daha fazla)
- Yaralıları yaralilar dizisine ekle
- "M.KAZANIN ÖZETİ" bölümündeki metni tam oku
- Plaka, TC, poliçe no gibi numaraları harf/rakam olarak DOĞRU çıkar
- null kullan bulamadığın için`;

const HASAR_SYS = `Sen sigorta şirketi hasar dosya analiz uzmanısın. Sigorta şirketi hasar ihbar föyü / dosya kapağını yüksek doğrulukta oku. Her şirketin formatı farklıdır.

SADECE geçerli JSON döndür:
{"dosyaNo":"","musteriNo":"","sigortaSirketi":"","acenteAdi":"","policeNo":"","policeTuru":"","urunKodu":"","sigortaBedeli":"","policeBaslangic":"","policeBitis":"","sigortaliAdi":"","sigortaliTc":"","sigortaliTelefon":"","sigortaliEmail":"","sigortaliAdres":"","aracPlaka":"","aracMarka":"","aracModel":"","aracYili":"","aracSase":"","hasarTarihi":"","ihbarTarihi":"","hasarNedeni":"","hasarAltNedeni":"","hasarYeri":"","hasarAciklama":"","tahminiHasar":"","ihbarEden":"","eksperAdi":"","eksperFirma":"","servisAdi":"","magdurlar":[{"adi":"","plaka":"","tutar":""}],"toplamHasar":"","odenenTutar":"","guven":90}

KURALLAR:
- Dosya no, müşteri no, poliçe no gibi numaraları tam oku
- Tarihleri DD.MM.YYYY formatında çıkar
- Tutarları sayı olarak al (TL işareti olmadan)
- Birden fazla mağdur varsa hepsini listele
- Bulamadığın alanlara null yaz`;

/* ══════════════════════════════════════════════════════
   ANA ANALİZ FONKSİYONLARI
══════════════════════════════════════════════════════ */
async function anlasmaKTTAnaliz(apiKey, b64, mime) {
  const txt = await callAI(
    apiKey,
    imgContent(b64, mime, "Tutanağı analiz et. SADECE JSON döndür. Tüm string değerleri çift tırnakla kapat."),
    ANLASMA_SYS,
    2500
  );
  const parsed = safeParseJSON(txt);
  return {
    tip: 'anlasma_ktt',
    kazaBilgileri: { tarih: parsed.kaza?.tarih || "", saat: parsed.kaza?.saat || "", il: parsed.kaza?.il || "", ilce: parsed.kaza?.ilce || "", cadde: parsed.kaza?.cadde || "", yolTipi: parsed.kaza?.yolTipi || "" },
    aracA: { plaka: parsed.a?.plaka || "", marka: parsed.a?.marka || "", surucu: parsed.a?.surucu || "", tc: parsed.a?.tc || "", telefon: parsed.a?.telefon || "", adres: parsed.a?.adres || "", sigortaSirketi: parsed.a?.sigorta || "", policeNo: parsed.a?.policeNo || "", hasarYeri: parsed.a?.hasar || "" },
    aracB: { plaka: parsed.b?.plaka || "", marka: parsed.b?.marka || "", surucu: parsed.b?.surucu || "", tc: parsed.b?.tc || "", telefon: parsed.b?.telefon || "", adres: parsed.b?.adres || "", sigortaSirketi: parsed.b?.sigorta || "", policeNo: parsed.b?.policeNo || "", hasarYeri: parsed.b?.hasar || "" },
    kroKiAnalizi: { yolYapisi: parsed.kroki?.yol || "", aAracPozisyon: parsed.kroki?.aPos || "", bAracPozisyon: parsed.kroki?.bPos || "", carpismaNokta: parsed.kroki?.carpma || "", sinyal: parsed.kroki?.sinyal || "", refuj: parsed.kroki?.refuj || "" },
    beyanAnalizi: { aBeyan: parsed.beyan?.a || "", bBeyan: parsed.beyan?.b || "", celisme: parsed.beyan?.celisme || "", kroKiUyum: parsed.beyan?.uyum || "" },
    eslesenSenaryo: parsed.senaryo || "",
    senaryoKategori: parsed.kategori || "",
    kusurAnalizi: parsed.analiz || "",
    kusurTablosu: (parsed.kusur || []).map(k => ({ arac: k.arac, plaka: k.plaka || "", kusurOrani: k.oran ?? 50, kusurNedeni: k.neden || "" })),
    yasalDayanak: parsed.yasal || [],
    kritikTespitler: parsed.tespitler || [],
    guvenSkoru: parsed.guven || 75,
    uyarilar: parsed.uyarilar || []
  };
}

async function polisKTTAnaliz(apiKey, b64, mime) {
  const txt = await callAI(
    apiKey,
    imgContent(b64, mime, "Polis kaza tespit tutanağını analiz et. SADECE JSON döndür."),
    POLIS_SYS,
    2500
  );
  const parsed = safeParseJSON(txt);
  return { tip: 'polis_ktt', ...parsed };
}

async function hasarIhbarAnaliz(apiKey, b64, mime) {
  const txt = await callAI(
    apiKey,
    imgContent(b64, mime, "Sigorta şirketi hasar ihbar föyünü analiz et. SADECE JSON döndür."),
    HASAR_SYS,
    2500
  );
  const parsed = safeParseJSON(txt);
  return { tip: 'hasar_ihbar', ...parsed };
}
