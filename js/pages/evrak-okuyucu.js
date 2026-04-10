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

/* ══════════════════════════════════════════════════════
   ANA COMPONENT
══════════════════════════════════════════════════════ */
MR.EvrakOkuyucuPage = ({setPage, user}) => {
  const C = MR.C, S = MR.S, LIcon = MR.LIcon;
  const isKoyu = MR.tema === 'koyu';

  const [tip, setTip] = useState('anlasma_ktt');
  const [items, setItems] = useState([]);
  const [selId, setSelId] = useState(null);
  const [drag, setDrag] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  const fileRef = useRef(null);
  const procRef = useRef(false);
  const qRef = useRef([]);

  const TIPLER = {
    anlasma_ktt: {label:'ANLAŞMALI KTT', icon:'FileText', color:'#2563eb', desc:'El Yazısı + TRAMER 48 Senaryo Kusur Analizi'},
    polis_ktt: {label:'POLİS KTT', icon:'ShieldAlert', color:'#dc2626', desc:'Polis Kaza Tespit Tutanağı'},
    hasar_ihbar: {label:'HASAR İHBAR', icon:'AlertTriangle', color:'#d97706', desc:'Sigorta Şirketi Hasar Föyü'}
  };
  const tipInfo = TIPLER[tip];

  // Sistem ayarlarından OpenRouter key çek
  useEffect(() => {
    (async () => {
      try {
        const r = await MR.api.ayarlarList();
        if (r?.success && r?.data?.openrouter_api_key) {
          setApiKey(r.data.openrouter_api_key);
        }
      } catch(e) {}
      setApiKeyLoaded(true);
    })();
  }, []);

  const upd = (id, p) => setItems(x => x.map(i => i.id === id ? {...i, ...p} : i));

  const fileToB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => {
      const dataUrl = e.target.result;
      res({ b64: dataUrl.split(',')[1], mime: file.type, preview: dataUrl });
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const processItem = async (item) => {
    upd(item.id, {status:'analyzing', sub:'OpenRouter Claude-Sonnet analiz ediyor...'});
    try {
      const { b64, mime } = await fileToB64(item.file);
      let result;
      if (item.tip === 'anlasma_ktt') {
        result = await anlasmaKTTAnaliz(apiKey, b64, mime);
      } else if (item.tip === 'polis_ktt') {
        result = await polisKTTAnaliz(apiKey, b64, mime);
      } else {
        result = await hasarIhbarAnaliz(apiKey, b64, mime);
      }
      upd(item.id, {status:'done', result, sub: null});
      setSelId(prev => prev || item.id);
    } catch(e) {
      upd(item.id, {status:'error', sub: e.message});
    }
  };

  const runQueue = async () => {
    if (procRef.current) return;
    procRef.current = true;
    while (qRef.current.length > 0) {
      const batch = qRef.current.splice(0, 2);
      await Promise.all(batch.map(processItem));
    }
    procRef.current = false;
  };

  const addFiles = useCallback((fl) => {
    if (!apiKey) {
      alert('OpenRouter API Key tanımlı değil! Sistem > Firma Ayarları\'ndan eklemelisiniz.');
      return;
    }
    const valid = Array.from(fl).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return;
    const ni = valid.map(f => ({
      id: Date.now() + '-' + Math.random().toString(36).slice(2,6),
      name: f.name,
      file: f,
      preview: URL.createObjectURL(f),
      status:'pending',
      sub:'Sırada',
      result:null,
      tip: tip
    }));
    setItems(p => [...p, ...ni]);
    qRef.current.push(...ni);
    runQueue();
  }, [tip, apiKey]);

  const sel = items.find(i => i.id === selId);
  const kc = o => o === 0 ? '#22c55e' : o === 100 ? '#ef4444' : '#f59e0b';
  const gc = s => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fade-in" style={{padding:'16px', maxWidth:1400, margin:'0 auto'}}>
      {/* HEADER */}
      <div style={{...S.card, marginBottom:14, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${tipInfo.color},${tipInfo.color}cc)`, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <LIcon name="FileSearch" size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{fontSize:16, fontWeight:900, margin:0}}>EVRAK OKUYUCU</h1>
            <p style={{fontSize:10, color:C.textMuted, margin:0}}>OPENROUTER • CLAUDE-SONNET-4.5 • TRAMER KUSUR ANALİZİ</p>
          </div>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          {apiKeyLoaded && (
            <span style={{fontSize:9, fontWeight:700, padding:'4px 10px', borderRadius:6,
              background: apiKey ? '#22c55e18' : '#ef444418',
              color: apiKey ? '#22c55e' : '#ef4444',
              border: `1px solid ${apiKey ? '#22c55e44' : '#ef444444'}`
            }}>
              {apiKey ? '✓ API KEY OK' : '✗ API KEY YOK'}
            </span>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={!apiKey} style={{...S.btn, background:apiKey?tipInfo.color:'#64748b', color:'#fff', padding:'9px 18px', borderRadius:8, fontSize:12, fontWeight:700, opacity:apiKey?1:0.5, cursor:apiKey?'pointer':'not-allowed'}}>
            <LIcon name="Upload" size={14} color="#fff"/> YÜKLE
          </button>
          {items.length > 0 && <button onClick={() => {setItems([]); setSelId(null); qRef.current=[];}} style={{...S.btn, background:`${C.danger}18`, color:C.danger, padding:'9px 14px', borderRadius:8, fontSize:11, fontWeight:700, border:`1px solid ${C.danger}33`}}>
            <LIcon name="Trash2" size={14} color={C.danger}/> TEMİZLE
          </button>}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e => {addFiles(e.target.files); e.target.value='';}}/>
        </div>
      </div>

      {/* API KEY UYARISI */}
      {apiKeyLoaded && !apiKey && (
        <div style={{...S.card, marginBottom:14, padding:'14px 18px', background:'#ef444408', border:'1px solid #ef444444'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="AlertTriangle" size={20} color="#ef4444"/>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:800, color:'#ef4444'}}>OPENROUTER API KEY TANIMLI DEĞİL</div>
              <div style={{fontSize:11, color:C.textMuted, marginTop:3}}>Sistem → Firma Ayarları'na gidin, "OPENROUTER API ANAHTARI" alanına sk-or-v1-... ile başlayan key'inizi girin ve kaydedin.</div>
            </div>
            <button onClick={() => setPage('sistem-ayarlar')} style={{...S.btn, background:'#ef4444', color:'#fff', padding:'8px 16px', borderRadius:6, fontSize:11, fontWeight:700}}>
              AYARLARA GİT
            </button>
          </div>
        </div>
      )}

      {/* TİP SEÇİMİ */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14}}>
        {Object.entries(TIPLER).map(([key, val]) => (
          <div key={key} onClick={() => {setTip(key); setItems([]); setSelId(null); qRef.current=[];}}
            style={{...S.card, padding:'12px 16px', cursor:'pointer', textAlign:'center',
              border: tip===key ? `3px solid ${val.color}` : `1px solid ${C.border}`,
              background: tip===key ? val.color+'12' : C.bgCard, transition:'all 0.2s'}}>
            <LIcon name={val.icon} size={22} color={val.color}/>
            <div style={{fontSize:12, fontWeight:800, marginTop:6, color: tip===key ? val.color : C.text}}>{val.label}</div>
            <div style={{fontSize:9, color:C.textMuted, marginTop:3}}>{val.desc}</div>
          </div>
        ))}
      </div>

      {/* BOŞ DURUM */}
      {items.length === 0 && apiKey && (
        <div onDrop={e => {e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files);}}
          onDragOver={e => {e.preventDefault(); setDrag(true);}} onDragLeave={() => setDrag(false)}
          onClick={() => fileRef.current?.click()}
          style={{...S.card, border:`2px dashed ${drag ? tipInfo.color : C.border}`, padding:'50px 24px', textAlign:'center',
            cursor:'pointer', background: drag ? tipInfo.color+'08' : C.bgCard}}>
          <LIcon name="Upload" size={40} color={drag ? tipInfo.color : C.textMuted}/>
          <p style={{fontSize:14, fontWeight:700, margin:'12px 0 4px'}}>{tipInfo.label.toUpperCase()} YÜKLEYİN</p>
          <p style={{fontSize:11, color:C.textMuted}}>Sürükle & bırak veya tıkla • Birden fazla evrak yükleyebilirsiniz</p>
          <p style={{fontSize:10, color:tipInfo.color, fontWeight:700, marginTop:4}}>{tipInfo.desc} • İkişer ikişer işlenir</p>
        </div>
      )}

      {/* SOL LİSTE + SAĞ DETAY */}
      {items.length > 0 && (
        <div style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:14, alignItems:'start'}}>
          {/* SOL: LİSTE */}
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontSize:10, color:C.textMuted, fontWeight:700}}>{items.length} EVRAK</span>
              <button onClick={() => fileRef.current?.click()} style={{fontSize:9, color:C.textMuted, background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:5, padding:'3px 10px', cursor:'pointer', fontWeight:600}}>+ Ekle</button>
            </div>
            {items.map(item => {
              const isSel = selId === item.id;
              const sc = {analyzing:'#fbbf24', done:'#22c55e', error:'#ef4444', pending:'#64748b'}[item.status];
              const plakaA = item.result?.aracA?.plaka || item.result?.araclar?.[0]?.plaka || item.result?.aracPlaka || '';
              return (
                <div key={item.id} onClick={() => item.status==='done' && setSelId(item.id)}
                  style={{background: isSel ? tipInfo.color+'12' : C.bgCard, border:`1px solid ${isSel ? tipInfo.color+'55' : C.border}`,
                    borderRadius:9, padding:'10px 11px', cursor: item.status==='done' ? 'pointer' : 'default', marginBottom:8, transition:'all .15s'}}>
                  <div style={{display:'flex', gap:8}}>
                    {item.preview && <img src={item.preview} style={{width:40, height:40, borderRadius:5, objectFit:'cover', border:`1px solid ${C.border}`, flexShrink:0}} alt=""/>}
                    <div style={{flex:1, minWidth:0}}>
                      <p style={{margin:'0 0 3px', fontSize:10, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace'}}>
                        {plakaA || item.name}
                      </p>
                      <span style={{fontSize:9, color:sc, background:sc+'18', border:`1px solid ${sc}44`, borderRadius:4, padding:'2px 7px', fontWeight:700}}>
                        {{analyzing:'ANALİZ', done:'TAMAM', error:'HATA', pending:'BEKLE'}[item.status]}
                      </span>
                      {item.result?.eslesenSenaryo && <p style={{margin:'3px 0 0', fontSize:8.5, color:'#ff6b35', fontWeight:800}}>{item.result.eslesenSenaryo}</p>}
                      {item.status==='error' && <p style={{margin:'3px 0 0', fontSize:8, color:C.danger, wordBreak:'break-word'}}>{item.sub}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SAĞ: DETAY */}
          <div>
            {!sel && <div style={{...S.card, textAlign:'center', padding:'55px'}}><LIcon name="ArrowLeft" size={32} color={C.textMuted}/><p style={{color:C.textMuted, marginTop:10}}>Soldan bir evrak seçin</p></div>}
            {sel?.status === 'analyzing' && <div style={{...S.card, textAlign:'center', padding:'50px'}}><div style={{width:24, height:24, border:`3px solid ${tipInfo.color}30`, borderTopColor:tipInfo.color, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px'}}/><p style={{color:tipInfo.color, fontWeight:700, fontSize:13}}>Analiz ediliyor...</p><p style={{color:C.textMuted, fontSize:11}}>{sel.sub}</p></div>}
            {sel?.status === 'error' && <div style={{...S.card, padding:20, background:`${C.danger}08`}}><p style={{color:C.danger, fontWeight:700, wordBreak:'break-word'}}>HATA: {sel.sub}</p></div>}
            {sel?.status === 'done' && sel.result && (() => {
              const itemTip = sel.tip || sel.result.tip || tip;
              if (itemTip === 'anlasma_ktt') return <AnlasmaKTTDetay r={sel.result} C={C} S={S} LIcon={LIcon} kc={kc} gc={gc}/>;
              if (itemTip === 'polis_ktt') return <PolisKTTDetay r={sel.result} C={C} S={S} LIcon={LIcon}/>;
              return <HasarIhbarDetay r={sel.result} C={C} S={S} LIcon={LIcon}/>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
