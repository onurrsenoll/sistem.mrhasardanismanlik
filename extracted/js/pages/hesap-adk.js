/* ============================================================
   MR HASAR DANIŞMANLIK – ADK HESAPLAMA SAYFASI (hesap-adk.js)
   ARAÇ DEĞER KAYBI HESAPLAYICI
   ============================================================ */

const MR = window.MR || (window.MR = {});
const {useState, useMemo, useRef} = React;

MR.HesapADKPage = ({setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, FormGroup, EmptyState, fmt, fmtK, parseNum, fmtInput, ARAC_DB, TAHKIM_EMSALLERI} = MR;

  /* ---------- FORM STATE ---------- */
  const [form, setForm] = useState({
    marka: '',
    model: '',
    modelYili: '',
    kazaTarihi: '',
    km: '',
    onarimBedeli: '',
    rayicDeger: '',
    kusurOrani: '100',
    oncekiHasar: '0',
    hasarBolgesi: ''
  });

  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const sonucRef = useRef(null);

  const u = (k, v) => setForm(p => ({...p, [k]: v}));

  /* ---------- MARKA LİSTESİ ---------- */
  const markalar = useMemo(() => Object.keys(ARAC_DB).sort(), []);

  /* ---------- MODEL LİSTESİ ---------- */
  const modeller = useMemo(() => {
    if (!form.marka || !ARAC_DB[form.marka]) return [];
    return ARAC_DB[form.marka].modeller || [];
  }, [form.marka]);

  /* ---------- YIL LİSTESİ ---------- */
  const buYil = new Date().getFullYear();
  const yillar = useMemo(() => Array.from({length: 20}, (_, i) => buYil - i), []);

  /* ---------- HASAR BÖLGELERİ ---------- */
  const hasarBolgeleri = ['ÖN', 'ARKA', 'YAN', 'TAVAN', 'ÇOKLU'];

  /* ---------- HESAPLAMA ---------- */
  const hesapla = () => {
    setHata('');
    setSonuc(null);

    /* VALİDASYON */
    if (!form.marka) { setHata('ARAÇ MARKA SEÇİNİZ'); return; }
    if (!form.model) { setHata('ARAÇ MODEL SEÇİNİZ'); return; }
    if (!form.modelYili) { setHata('MODEL YILI SEÇİNİZ'); return; }
    if (!form.kazaTarihi) { setHata('KAZA TARİHİ GİRİNİZ'); return; }
    if (!form.hasarBolgesi) { setHata('HASAR BÖLGESİ SEÇİNİZ'); return; }

    const rayic = parseNum(form.rayicDeger);
    const onarim = parseNum(form.onarimBedeli);
    const km = parseNum(form.km);
    const kusur = Number(form.kusurOrani) || 100;
    const oncekiHsr = Number(form.oncekiHasar) || 0;

    if (rayic <= 0) { setHata('RAYİÇ DEĞER GİRİNİZ'); return; }
    if (onarim <= 0) { setHata('ONARIM BEDELİ GİRİNİZ'); return; }

    /* ARAÇ YAŞI */
    const aracYasi = buYil - Number(form.modelYili);

    /* PREMİUM KONTROL */
    const premiumMi = ARAC_DB[form.marka]?.premium || false;

    /* YÖNTEM BELİRLEME */
    let yontem = 'GENEL HASAR';
    if (onarim > rayic * 0.6) yontem = 'PERT TOTAL';
    else if (onarim > rayic * 0.4) yontem = 'PERT FARKI';

    /* YAŞ BAZLI ORAN */
    let yasOrani = 0;
    if (aracYasi <= 1) yasOrani = 0.12;
    else if (aracYasi <= 2) yasOrani = 0.10;
    else if (aracYasi <= 3) yasOrani = 0.09;
    else if (aracYasi <= 5) yasOrani = 0.07;
    else if (aracYasi <= 7) yasOrani = 0.05;
    else if (aracYasi <= 10) yasOrani = 0.04;
    else if (aracYasi <= 15) yasOrani = 0.03;
    else yasOrani = 0.02;

    /* HASAR BÖLGESİ KATSAYISI */
    let bolgeKatsayisi = 1.0;
    switch (form.hasarBolgesi) {
      case 'ÖN': bolgeKatsayisi = 1.15; break;
      case 'ARKA': bolgeKatsayisi = 1.0; break;
      case 'YAN': bolgeKatsayisi = 1.05; break;
      case 'TAVAN': bolgeKatsayisi = 1.20; break;
      case 'ÇOKLU': bolgeKatsayisi = 1.30; break;
    }

    /* KM FAKTÖRÜ */
    let kmFaktoru = 1.0;
    if (km > 0) {
      if (km < 30000) kmFaktoru = 1.10;
      else if (km < 60000) kmFaktoru = 1.05;
      else if (km < 100000) kmFaktoru = 1.0;
      else if (km < 150000) kmFaktoru = 0.95;
      else if (km < 200000) kmFaktoru = 0.90;
      else kmFaktoru = 0.85;
    }

    /* PREMİUM BONUS */
    const premiumBonus = premiumMi ? 1.15 : 1.0;

    /* TEMEL DEĞER KAYBI */
    let temelDK = rayic * yasOrani * bolgeKatsayisi;

    /* ONARIM / RAYİÇ İLİŞKİSİ */
    const onarimOrani = onarim / rayic;
    let onarimFaktoru = 1.0;
    if (onarimOrani >= 0.6) onarimFaktoru = 1.35;
    else if (onarimOrani >= 0.4) onarimFaktoru = 1.20;
    else if (onarimOrani >= 0.25) onarimFaktoru = 1.10;
    else if (onarimOrani >= 0.10) onarimFaktoru = 1.0;
    else onarimFaktoru = 0.85;

    /* ÖNCEKİ HASAR DÜŞÜŞİ */
    const oncekiHasarFaktoru = Math.max(0.50, 1 - (oncekiHsr * 0.05));

    /* NİHAİ HESAPLAMA */
    let degerKaybi = temelDK * kmFaktoru * premiumBonus * onarimFaktoru * oncekiHasarFaktoru;

    /* KUSUR ORANI UYGULA */
    const kusurluTutar = degerKaybi * (kusur / 100);

    /* PERT TOTAL İSE FARK HESAPLA */
    let pertFarki = 0;
    if (yontem === 'PERT TOTAL') {
      pertFarki = rayic - onarim;
      if (pertFarki < 0) pertFarki = 0;
    }

    const nihai = Math.round(kusurluTutar);

    const sonucObj = {
      marka: form.marka,
      model: form.model,
      modelYili: form.modelYili,
      aracYasi,
      premiumMi,
      rayic,
      onarim,
      km,
      yontem,
      yasOrani,
      bolgeKatsayisi,
      hasarBolgesi: form.hasarBolgesi,
      kmFaktoru,
      premiumBonus,
      onarimFaktoru,
      onarimOrani,
      oncekiHasarFaktoru,
      oncekiHasar: oncekiHsr,
      kusurOrani: kusur,
      temelDK: Math.round(temelDK),
      degerKaybi: Math.round(degerKaybi),
      kusurluTutar: nihai,
      pertFarki,
      kazaTarihi: form.kazaTarihi
    };

    setSonuc(sonucObj);

    /* SONUÇ ALANINA KAYDIRMA */
    setTimeout(() => {
      if (sonucRef.current) sonucRef.current.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 100);
  };

  /* ---------- TEMİZLE ---------- */
  const temizle = () => {
    setForm({
      marka: '', model: '', modelYili: '', kazaTarihi: '', km: '',
      onarimBedeli: '', rayicDeger: '', kusurOrani: '100', oncekiHasar: '0', hasarBolgesi: ''
    });
    setSonuc(null);
    setHata('');
  };

  /* ---------- PDF ÇIKTI ---------- */
  const pdfCikti = () => {
    if (!sonuc) return;
    const tarih = new Date().toLocaleDateString('tr-TR');
    const saat = new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>ADK HESAPLAMA RAPORU - ${sonuc.marka} ${sonuc.model}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','Arial',sans-serif;color:#1a1a1a;font-size:12px;line-height:1.5;padding:20px 30px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:16px}
.header h1{font-size:16px;color:#2563eb;letter-spacing:1px}
.header .info{text-align:right;font-size:10px;color:#666}
.section{margin-bottom:14px;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden}
.section-head{background:#2563eb;color:#fff;padding:8px 14px;font-weight:700;font-size:11px;letter-spacing:0.5px}
.section-head.green{background:#059669}
.section-head.orange{background:#d97706}
.section-body{padding:10px 14px}
table{width:100%;border-collapse:collapse}
table th,table td{padding:6px 10px;border-bottom:1px solid #eee;text-align:left;font-size:11px}
table th{background:#f8fafc;font-weight:600;color:#475569;font-size:10px}
.val{font-weight:700;text-align:right}
.big{font-size:24px;font-weight:900;color:#059669;text-align:center;padding:16px 0}
.sub{font-size:10px;color:#666;text-align:center}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-weight:700;font-size:10px}
.badge-green{background:#d1fae5;color:#059669}
.badge-orange{background:#fef3c7;color:#d97706}
.badge-red{background:#fee2e2;color:#dc2626}
.footer{text-align:center;font-size:9px;color:#999;border-top:1px solid #e0e0e0;padding-top:10px;margin-top:16px}
.note{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:8px 12px;font-size:10px;color:#0369a1;margin-top:10px}
@media print{body{padding:10px 20px}@page{size:A4;margin:10mm}}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>MR HASAR DANISMANLIK</h1>
    <div style="font-size:10px;color:#666;margin-top:2px">ARAC DEGER KAYBI HESAPLAMA RAPORU</div>
  </div>
  <div class="info">
    <div>TARIH: ${tarih}</div>
    <div>SAAT: ${saat}</div>
    <div>RAPOR NO: ADK-${Date.now().toString(36).toUpperCase()}</div>
  </div>
</div>

<div class="section">
  <div class="section-head">ARAC BILGILERI</div>
  <div class="section-body">
    <table>
      <tr><td>MARKA / MODEL</td><td class="val">${sonuc.marka} ${sonuc.model} ${sonuc.premiumMi ? '<span class="badge badge-orange">PREMIUM</span>' : ''}</td></tr>
      <tr><td>MODEL YILI</td><td class="val">${sonuc.modelYili}</td></tr>
      <tr><td>ARAC YASI</td><td class="val">${sonuc.aracYasi} YIL</td></tr>
      <tr><td>KILOMETRE</td><td class="val">${sonuc.km > 0 ? sonuc.km.toLocaleString('tr-TR') + ' KM' : 'BELIRTILMEDI'}</td></tr>
      <tr><td>KAZA TARIHI</td><td class="val">${sonuc.kazaTarihi}</td></tr>
      <tr><td>HASAR BOLGESI</td><td class="val">${sonuc.hasarBolgesi}</td></tr>
      <tr><td>ONCEKI HASAR SAYISI</td><td class="val">${sonuc.oncekiHasar}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-head orange">HESAPLAMA PARAMETRELERI</div>
  <div class="section-body">
    <table>
      <tr><td>RAYIC DEGER</td><td class="val">${fmtK(sonuc.rayic)}</td></tr>
      <tr><td>ONARIM BEDELI</td><td class="val">${fmtK(sonuc.onarim)}</td></tr>
      <tr><td>ONARIM / RAYIC ORANI</td><td class="val">%${(sonuc.onarimOrani * 100).toFixed(1)}</td></tr>
      <tr><td>YAS ORANI</td><td class="val">%${(sonuc.yasOrani * 100).toFixed(1)}</td></tr>
      <tr><td>BOLGE KATSAYISI (${sonuc.hasarBolgesi})</td><td class="val">x${sonuc.bolgeKatsayisi.toFixed(2)}</td></tr>
      <tr><td>KM FAKTORU</td><td class="val">x${sonuc.kmFaktoru.toFixed(2)}</td></tr>
      <tr><td>ONARIM FAKTORU</td><td class="val">x${sonuc.onarimFaktoru.toFixed(2)}</td></tr>
      <tr><td>ONCEKI HASAR FAKTORU</td><td class="val">x${sonuc.oncekiHasarFaktoru.toFixed(2)}</td></tr>
      <tr><td>PREMIUM BONUS</td><td class="val">${sonuc.premiumMi ? 'x1.15' : 'x1.00'}</td></tr>
      <tr><td>KUSUR ORANI</td><td class="val">%${sonuc.kusurOrani}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-head green">HESAPLAMA SONUCU</div>
  <div class="section-body">
    <table>
      <tr><td>YONTEM</td><td class="val"><span class="badge ${sonuc.yontem === 'PERT TOTAL' ? 'badge-red' : sonuc.yontem === 'PERT FARKI' ? 'badge-orange' : 'badge-green'}">${sonuc.yontem}</span></td></tr>
      <tr><td>TEMEL DEGER KAYBI</td><td class="val">${fmtK(sonuc.temelDK)}</td></tr>
      <tr><td>KUSURSUZ TUTAR</td><td class="val">${fmtK(sonuc.degerKaybi)}</td></tr>
      ${sonuc.pertFarki > 0 ? '<tr><td>PERT FARKI</td><td class="val">' + fmtK(sonuc.pertFarki) + '</td></tr>' : ''}
    </table>
    <div class="big">${fmtK(sonuc.kusurluTutar)}</div>
    <div class="sub">HESAPLANAN DEGER KAYBI TUTARI ${sonuc.kusurOrani < 100 ? '(KUSUR ORANI %' + sonuc.kusurOrani + ' UYGULANMISTIR)' : ''}</div>
  </div>
</div>

<div class="note">
  <strong>ONEMLI NOT:</strong> BU RAPOR MR HASAR DANISMANLIK DOSYA TAKIP SISTEMI TARAFINDAN
  OTOMATIK OLARAK OLUSTURULMUSTUR. HESAPLAMA SONUCLARI EMSAL KARARLAR VE GUNCEL
  PIYASA DEGERLERI REFERANS ALINARAK HAZIRLANMISTIR. KESIN TUTAR MAHKEME VEYA
  TAHKIM KOMISYONU KARARIYLA BELIRLENIR.
</div>

<div class="footer">
  MR HASAR DANISMANLIK &copy; ${new Date().getFullYear()} - DOSYA TAKIP SISTEMI - HERZAMAN FARK EDER
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=1000');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    } else {
      alert('PDF OLUSTURMAK ICIN POP-UP ENGELLEYICINIZI KAPATINIZ');
    }
  };

  /* ---------- DOSYAYA KAYDET ---------- */
  const dosyayaKaydet = async () => {
    if (!sonuc) return;
    const urlParts = (window.location.hash || '').split('dosya_id=');
    const dosyaId = urlParts.length > 1 ? urlParts[1] : null;
    if (!dosyaId) {
      alert('BU HESAPLAMAYI BİR DOSYAYA KAYDETMEK İÇİN DOSYA DETAY SAYFASINDAN ERİŞİNİZ.');
      return;
    }
    try {
      const r = await MR.api.req('/dosya/hesaplama-kaydet.php', {
        method: 'POST',
        body: JSON.stringify({
          dosya_id: dosyaId,
          hesap_turu: 'ADK',
          sonuc: sonuc
        })
      });
      if (r?.success) alert('HESAPLAMA DOSYAYA KAYDEDİLDİ');
      else alert(r?.error || 'KAYDETME HATASI');
    } catch (e) {
      alert('BAĞLANTI HATASI');
    }
  };

  /* ---------- EMSAL FİLTRE ---------- */
  const filtrelenmisEmsaller = useMemo(() => {
    if (!sonuc) return TAHKIM_EMSALLERI;
    return TAHKIM_EMSALLERI.filter(e => {
      const yasUygun = Math.abs(e.aracYasi - sonuc.aracYasi) <= 3;
      return yasUygun;
    }).sort((a, b) => Math.abs(a.aracYasi - sonuc.aracYasi) - Math.abs(b.aracYasi - sonuc.aracYasi));
  }, [sonuc]);

  /* ---------- YÖNTEM RENGİ ---------- */
  const yontemRenk = (y) => {
    if (y === 'PERT TOTAL') return C.danger;
    if (y === 'PERT FARKI') return C.warning;
    return C.success;
  };

  /* ---------- TABLO STİLLERİ ---------- */
  const thStyle = {padding: '10px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${C.border}`};
  const tdStyle = {padding: '10px 12px', fontSize: 12, borderBottom: `1px solid ${C.border}`};

  /* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
  return (
    <div className="fade-in">
      {/* BAŞLIK */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 44, height: 44, borderRadius: 12, background: `${C.success}22`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <LIcon name="Calculator" size={22} color={C.success}/>
          </div>
          <div>
            <div style={{fontSize: 20, fontWeight: 800}}>ADK HESAPLAMA</div>
            <div style={{fontSize: 11, color: C.textMuted, letterSpacing: 1}}>ARAÇ DEĞER KAYBI HESAPLAYICI</div>
          </div>
        </div>
        <button style={{...S.btn, ...S.btnG}} onClick={() => setPage('home')}>
          <LIcon name="ArrowLeft" size={14}/> ANA SAYFA
        </button>
      </div>

      {/* HATA MESAJI */}
      {hata && (
        <div style={{padding: '12px 16px', background: `${C.danger}22`, border: `1px solid ${C.danger}44`, borderRadius: 10, marginBottom: 16, fontSize: 12, color: C.danger, display: 'flex', alignItems: 'center', gap: 8}}>
          <LIcon name="AlertCircle" size={16} color={C.danger}/> {hata}
        </div>
      )}

      {/* ANA İÇERİK: SOL FORM + SAĞ SONUÇ */}
      <div style={{display: 'grid', gridTemplateColumns: sonuc ? '1fr 1fr' : '1fr', gap: 20}}>

        {/* ═══ SOL: HESAPLAMA FORMU ═══ */}
        <div style={S.card}>
          <SectionTitle icon="Car" title="ARAÇ VE HASAR BİLGİLERİ" sub="HESAPLAMA PARAMETRELERİNİ GİRİNİZ"/>
          <div style={S.cardBody}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>

              {/* MARKA */}
              <FormGroup label="ARAÇ MARKA *">
                <select style={S.select} value={form.marka} onChange={e => {u('marka', e.target.value); u('model', '');}}>
                  <option value="">MARKA SEÇİNİZ</option>
                  {markalar.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormGroup>

              {/* MODEL */}
              <FormGroup label="ARAÇ MODEL *">
                <select style={S.select} value={form.model} onChange={e => u('model', e.target.value)} disabled={!form.marka}>
                  <option value="">MODEL SEÇİNİZ</option>
                  {modeller.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormGroup>

              {/* MODEL YILI */}
              <FormGroup label="MODEL YILI *">
                <select style={S.select} value={form.modelYili} onChange={e => u('modelYili', e.target.value)}>
                  <option value="">YIL SEÇİNİZ</option>
                  {yillar.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>

              {/* KAZA TARİHİ */}
              <FormGroup label="KAZA TARİHİ *">
                <input type="date" style={S.input} value={form.kazaTarihi} onChange={e => u('kazaTarihi', e.target.value)}/>
              </FormGroup>

              {/* KM */}
              <FormGroup label="KİLOMETRE (KM)">
                <input style={S.input} value={form.km} placeholder="ÖRN: 85.000"
                  onChange={e => u('km', fmtInput(e.target.value))}/>
              </FormGroup>

              {/* ONARIM BEDELİ */}
              <FormGroup label="ONARIM BEDELİ (₺) *">
                <input style={S.input} value={form.onarimBedeli} placeholder="ÖRN: 45.000"
                  onChange={e => u('onarimBedeli', fmtInput(e.target.value))}/>
              </FormGroup>

              {/* RAYİÇ DEĞER */}
              <FormGroup label="RAYİÇ DEĞER (₺) *">
                <input style={S.input} value={form.rayicDeger} placeholder="ÖRN: 750.000"
                  onChange={e => u('rayicDeger', fmtInput(e.target.value))}/>
              </FormGroup>

              {/* KUSUR ORANI */}
              <FormGroup label="KUSUR ORANI (%)">
                <input type="number" style={S.input} value={form.kusurOrani} min="0" max="100"
                  onChange={e => u('kusurOrani', e.target.value)} placeholder="100"/>
              </FormGroup>

              {/* ÖNCEKİ HASAR SAYISI */}
              <FormGroup label="ÖNCEKİ HASAR SAYISI">
                <input type="number" style={S.input} value={form.oncekiHasar} min="0" max="10"
                  onChange={e => u('oncekiHasar', e.target.value)} placeholder="0"/>
              </FormGroup>

              {/* HASAR BÖLGESİ */}
              <FormGroup label="HASAR BÖLGESİ *">
                <select style={S.select} value={form.hasarBolgesi} onChange={e => u('hasarBolgesi', e.target.value)}>
                  <option value="">BÖLGE SEÇİNİZ</option>
                  {hasarBolgeleri.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </FormGroup>
            </div>

            {/* PREMİUM ARAÇ BİLGİSİ */}
            {form.marka && ARAC_DB[form.marka]?.premium && (
              <div style={{marginTop: 16, padding: '10px 14px', background: `${C.gold}15`, border: `1px solid ${C.gold}33`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8}}>
                <LIcon name="Star" size={16} color={C.gold}/>
                <span style={{fontSize: 12, color: C.gold, fontWeight: 600}}>PREMİUM SEGMENT ARAÇ - %15 EK DEĞER KAYBI UYGULANIR</span>
              </div>
            )}

            {/* BUTONLAR */}
            <div style={{display: 'flex', gap: 10, marginTop: 24}}>
              <button style={{...S.btn, ...S.btnS, flex: 1, justifyContent: 'center'}} onClick={hesapla}>
                <LIcon name="Calculator" size={16} color="#fff"/> HESAPLA
              </button>
              <button style={{...S.btn, ...S.btnG}} onClick={temizle}>
                <LIcon name="RefreshCw" size={14}/> TEMİZLE
              </button>
              {sonuc && (
                <button style={{...S.btn, ...S.btnW}} onClick={pdfCikti}>
                  <LIcon name="Printer" size={14}/> PDF ÇIKTI
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SAĞ: SONUÇLAR PANELİ ═══ */}
        {sonuc && (
          <div ref={sonucRef}>
            {/* ANA SONUÇ KARTI */}
            <div style={{...S.card, marginBottom: 16, border: `1px solid ${C.success}44`}}>
              <div style={{...S.cardHead, background: `${C.success}11`}}>
                <LIcon name="TrendingUp" size={18} color={C.success}/>
                <span style={{fontWeight: 700, fontSize: 14, color: C.success}}>HESAPLAMA SONUCU</span>
                <div style={{marginLeft: 'auto'}}>
                  <Badge text={sonuc.yontem} color={yontemRenk(sonuc.yontem)}/>
                </div>
              </div>
              <div style={S.cardBody}>
                {/* BÜYÜK TUTAR */}
                <div style={{textAlign: 'center', padding: '20px 0'}}>
                  <div style={{fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 6}}>HESAPLANAN DEĞER KAYBI</div>
                  <div style={{fontSize: 36, fontWeight: 900, color: C.success, letterSpacing: -1}}>{fmtK(sonuc.kusurluTutar)}</div>
                  {sonuc.kusurOrani < 100 && (
                    <div style={{fontSize: 11, color: C.textMuted, marginTop: 4}}>
                      KUSURSUZ TUTAR: {fmtK(sonuc.degerKaybi)} | KUSUR: %{sonuc.kusurOrani}
                    </div>
                  )}
                </div>

                {/* ARAÇ BİLGİSİ */}
                <div style={{padding: '12px 16px', background: `${C.accent}11`, borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10}}>
                  <LIcon name="Car" size={18} color={C.accent}/>
                  <div>
                    <div style={{fontSize: 13, fontWeight: 700}}>{sonuc.marka} {sonuc.model}</div>
                    <div style={{fontSize: 11, color: C.textMuted}}>{sonuc.modelYili} MODEL | {sonuc.aracYasi} YAŞ</div>
                  </div>
                  {sonuc.premiumMi && (
                    <Badge text="PREMİUM" color={C.gold}/>
                  )}
                </div>

                {/* HESAPLAMA DETAYLARI */}
                <div style={{fontSize: 12}}>
                  <div style={{fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 10, letterSpacing: 0.5}}>HESAPLAMA DETAYLARI</div>

                  {[
                    {label: 'RAYİÇ DEĞER', value: fmtK(sonuc.rayic), icon: 'TurkishLira', color: C.accent},
                    {label: 'ONARIM BEDELİ', value: fmtK(sonuc.onarim), icon: 'Briefcase', color: C.warning},
                    {label: 'ONARIM / RAYİÇ ORANI', value: '%' + (sonuc.onarimOrani * 100).toFixed(1), icon: 'Percent', color: C.purple},
                    {label: 'YAŞ ORANI', value: '%' + (sonuc.yasOrani * 100).toFixed(1), icon: 'Clock', color: C.cyan},
                    {label: 'BÖLGE KATSAYISI (' + sonuc.hasarBolgesi + ')', value: 'x' + sonuc.bolgeKatsayisi.toFixed(2), icon: 'Target', color: C.pink},
                    {label: 'KM FAKTÖRÜ', value: 'x' + sonuc.kmFaktoru.toFixed(2), icon: 'Activity', color: C.success},
                    {label: 'ONARIM FAKTÖRÜ', value: 'x' + sonuc.onarimFaktoru.toFixed(2), icon: 'TrendingUp', color: C.warning},
                    {label: 'ÖNCEKİ HASAR FAKTÖRÜ (' + sonuc.oncekiHasar + ' HASAR)', value: 'x' + sonuc.oncekiHasarFaktoru.toFixed(2), icon: 'Layers', color: C.danger},
                    {label: 'PREMİUM BONUS', value: sonuc.premiumMi ? 'x1.15' : 'x1.00', icon: 'Star', color: C.gold}
                  ].map((row, i) => (
                    <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <LIcon name={row.icon} size={14} color={row.color}/>
                        <span style={{color: C.textSec}}>{row.label}</span>
                      </div>
                      <span style={{fontWeight: 700}}>{row.value}</span>
                    </div>
                  ))}

                  {/* TEMEL DEĞER KAYBI */}
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginTop: 6, borderTop: `2px solid ${C.accent}44`}}>
                    <span style={{fontWeight: 700, color: C.accent}}>TEMEL DEĞER KAYBI</span>
                    <span style={{fontWeight: 800, fontSize: 14, color: C.accent}}>{fmtK(sonuc.temelDK)}</span>
                  </div>

                  {/* NİHAİ TUTAR */}
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: `${C.success}15`, borderRadius: 8, marginTop: 8}}>
                    <span style={{fontWeight: 800, color: C.success}}>NİHAİ DEĞER KAYBI</span>
                    <span style={{fontWeight: 900, fontSize: 18, color: C.success}}>{fmtK(sonuc.kusurluTutar)}</span>
                  </div>
                </div>

                {/* PERT BİLGİSİ */}
                {sonuc.yontem === 'PERT TOTAL' && (
                  <div style={{marginTop: 12, padding: '10px 14px', background: `${C.danger}15`, border: `1px solid ${C.danger}33`, borderRadius: 8}}>
                    <div style={{fontSize: 11, fontWeight: 700, color: C.danger, marginBottom: 4}}>PERT TOTAL TESPİTİ</div>
                    <div style={{fontSize: 12, color: C.textSec}}>
                      ONARIM BEDELİ RAYİÇ DEĞERİN %60'INI AŞMAKTADIR. ARAÇ EKONOMİK ÖMRÜNÜ TAMAMLAMIŞ SAYILIR.
                      PERT FARKI: {fmtK(sonuc.pertFarki)}
                    </div>
                  </div>
                )}

                {sonuc.yontem === 'PERT FARKI' && (
                  <div style={{marginTop: 12, padding: '10px 14px', background: `${C.warning}15`, border: `1px solid ${C.warning}33`, borderRadius: 8}}>
                    <div style={{fontSize: 11, fontWeight: 700, color: C.warning, marginBottom: 4}}>PERT FARKI TESPİTİ</div>
                    <div style={{fontSize: 12, color: C.textSec}}>
                      ONARIM BEDELİ RAYİÇ DEĞERİN %40-60 ARALIĞINDADIR. PERT FARKI YÖNTEMİ UYGULANMIŞTIR.
                    </div>
                  </div>
                )}

                {/* DOSYAYA KAYDET BUTONU */}
                <div style={{marginTop: 16, display: 'flex', gap: 10}}>
                  <button style={{...S.btn, ...S.btnP, flex: 1, justifyContent: 'center'}} onClick={dosyayaKaydet}>
                    <LIcon name="Save" size={14} color="#fff"/> DOSYAYA KAYDET
                  </button>
                  <button style={{...S.btn, ...S.btnW}} onClick={pdfCikti}>
                    <LIcon name="Printer" size={14}/> PDF ÇIKTI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ ALT: EMSAL KARARLAR ═══ */}
      <div style={{...S.card, marginTop: 20}}>
        <SectionTitle icon="Gavel" title="EMSAL KARARLAR" sub={sonuc ? 'BENZER KOŞULLARA GÖRE FİLTRELENMİŞ' : 'TAHKİM KOMİSYONU VE YARGITAY KARARLARI'}/>
        <div style={S.cardBody}>
          {filtrelenmisEmsaller.length > 0 ? (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    {['DOSYA NO', 'ARAÇ TİPİ', 'ARAÇ YAŞI', 'KM', 'ONARIM', 'RAYİÇ', 'DEĞER KAYBI', 'KUSUR', 'ÖNCEKİ HASAR', 'BÖLGE', 'YÖNTEM'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmisEmsaller.map((e, i) => (
                    <tr key={i} style={{transition: 'background .2s'}}
                      onMouseEnter={ev => ev.currentTarget.style.background = C.bgHover}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td style={{...tdStyle, fontWeight: 600, color: C.accent}}>{e.dosyaNo}</td>
                      <td style={tdStyle}><Badge text={e.aracTipi} color={e.aracTipi === 'PREMİUM' ? C.gold : e.aracTipi === 'ORTA' ? C.accent : C.cyan}/></td>
                      <td style={{...tdStyle, textAlign: 'center'}}>{e.aracYasi} YIL</td>
                      <td style={tdStyle}>{e.kmOrtalama ? e.kmOrtalama.toLocaleString('tr-TR') : '-'}</td>
                      <td style={tdStyle}>{fmtK(e.onarimBedeli)}</td>
                      <td style={tdStyle}>{fmtK(e.rayicDeger)}</td>
                      <td style={{...tdStyle, fontWeight: 700, color: C.success}}>{fmtK(e.degerKaybi)}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>%{e.kusurOrani}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>{e.oncekiHasar}</td>
                      <td style={tdStyle}><Badge text={e.hasarBolgesi} color={C.purple}/></td>
                      <td style={tdStyle}><Badge text={e.yontem} color={yontemRenk(e.yontem)}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="Gavel" title="EMSAL BULUNAMADI" desc="BU KRİTERLERE UYGUN EMSAL KARAR BULUNAMAMIŞTIR"/>
          )}

          {/* EMSAL KARŞILAŞTIRMA NOTU */}
          {sonuc && filtrelenmisEmsaller.length > 0 && (
            <div style={{marginTop: 16, padding: '12px 16px', background: `${C.accent}11`, borderRadius: 8, border: `1px solid ${C.accent}22`}}>
              <div style={{fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 6}}>KARŞILAŞTIRMA NOTU</div>
              <div style={{fontSize: 12, color: C.textSec, lineHeight: 1.5}}>
                YUKARIDA LİSTELENEN EMSAL KARARLAR, SEÇİLEN ARACA YAKIN KOŞULLARDA VERİLMİŞ KARARLARDIR.
                HESAPLANAN DEĞER KAYBI ({fmtK(sonuc.kusurluTutar)}) İLE EMSAL KARARLARIN KARŞILAŞTIRILMASI
                DEĞERLENDİRME RAPORUNUZA ESAS TEŞKİL EDEBİLİR.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
