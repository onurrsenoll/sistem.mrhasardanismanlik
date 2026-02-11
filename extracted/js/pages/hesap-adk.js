const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef} = React;

/* ═══════════════════════════════════════════════════════════
   ADK HESAPLAMA - AI DESTEKLİ ARAÇ DEĞER KAYBI ROBOTU
   Tahkim 2024-2025 Emsal + Çoklu Yöntem + PDF Çıktı
   ═══════════════════════════════════════════════════════════ */

/* ---------- HESAPLAMA MOTORU ---------- */
const hesaplaDK = (marka, yil, km, rayic, onarim, kusur, onceki, bolge) => {
  const aracYasi = new Date().getFullYear() - yil;
  const isPremium = MR.ARAC_DB?.[marka]?.premium || false;
  const premiumCarpan = isPremium ? 1.15 : 1.00;

  const kmKatsayi = km < 50000 ? 1.00 : km < 100000 ? 0.90 : km < 150000 ? 0.80 : km < 200000 ? 0.70 : 0.55;
  const yasKatsayi = aracYasi <= 1 ? 1.00 : aracYasi <= 3 ? 0.90 : aracYasi <= 5 ? 0.80 : aracYasi <= 7 ? 0.70 : 0.50;
  const oncekiKatsayi = onceki === 0 ? 1.00 : onceki === 1 ? 0.85 : onceki === 2 ? 0.70 : 0.50;
  const bolgeMap = {on: 0.95, arka: 0.85, yan: 0.90, tavan: 0.80};
  const bolgeKatsayi = bolgeMap[bolge] || 0.90;

  // NİSBİ YÖNTEM
  const nisbiMin = Math.round(onarim * 0.25);
  const nisbiMax = Math.round(onarim * 0.35);
  const nisbiOrt = Math.round((nisbiMin + nisbiMax) / 2);

  // PİYASA YÖNTEMİ
  const piyasa = Math.round(Math.min(rayic * 0.02, onarim * 0.40));

  // TSB YÖNTEMİ
  const katsayiCarpani = Math.max(0.15, 0.60 * kmKatsayi * yasKatsayi * oncekiKatsayi * bolgeKatsayi);
  const tsb = Math.round(rayic * 0.019 * katsayiCarpani);
  const tsbGarantili = Math.max(tsb, Math.round(nisbiMin * 0.70));

  // KOMBİNE SONUÇ
  let onerilenMin = Math.round(Math.max(nisbiMin, piyasa * 0.85));
  let onerilenMax = Math.round(Math.min(nisbiMax * premiumCarpan, rayic * 0.035, onarim * 0.40));
  if (isPremium) { onerilenMin = Math.round(onerilenMin * 1.10); onerilenMax = Math.round(onerilenMax * premiumCarpan); }
  const finalMin = Math.min(onerilenMin, onerilenMax);
  const finalMax = Math.max(onerilenMin, onerilenMax);
  const fullRight = Math.round((finalMin + finalMax) / 2);
  const kusurApplied = Math.round(fullRight * (kusur / 100));

  return { nisbiMin, nisbiMax, nisbiOrt, piyasa, tsbGarantili, fullRightMin: finalMin, fullRightMax: finalMax, fullRight, kusurApplied, isPremium, aracYasi, kmKatsayi, yasKatsayi, oncekiKatsayi, bolgeKatsayi, premiumCarpan };
};

/* ---------- TAHKİM EMSAL ARAMA ---------- */
const findEmsaller = (marka, yil, km) => {
  const isPremium = MR.ARAC_DB?.[marka]?.premium || false;
  const segment = isPremium ? 'premium' : ['FIAT','RENAULT','DACIA','OPEL','CITROEN','PEUGEOT'].includes(marka) ? 'ekonomik' : 'orta';
  const aracYasi = new Date().getFullYear() - yil;
  const db = MR.TAHKIM_DB || [];

  return db.filter(e => {
    if (e.yil < 2024) return false;
    const segOk = e.segment === segment || (segment === 'orta' && e.segment !== 'premium') || (segment === 'premium' && e.segment === 'premium');
    if (!segOk) return false;
    const emsalYasi = new Date().getFullYear() - e.aracYili;
    if (Math.abs(emsalYasi - aracYasi) > 3) return false;
    const kmFark = Math.abs(e.km - km) / Math.max(e.km, km, 1);
    if (kmFark > 0.40) return false;
    return true;
  }).map(e => {
    const emsalYasi = new Date().getFullYear() - e.aracYili;
    const yasFark = Math.abs(emsalYasi - aracYasi) / Math.max(emsalYasi, aracYasi, 1);
    const kmFark = Math.abs(e.km - km) / Math.max(e.km, km, 1);
    const markaBonus = e.marka === marka ? 0 : 0.1;
    const similarity = Math.max(0, 100 - ((yasFark * 30) + (kmFark * 50) + (markaBonus * 20)));
    return {...e, similarity};
  }).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
};

/* ---------- YARDIMCI ---------- */
const fmtMoney = n => (n || 0).toLocaleString('tr-TR') + ' TL';
const bolgeLabel = b => ({on:'ÖN KISIM',arka:'ARKA KISIM',yan:'YAN KISIM',tavan:'TAVAN'}[b] || b);

/* ═══════════════════════════════════════════════════════════
   ANA COMPONENT
   ═══════════════════════════════════════════════════════════ */
MR.HesapADK = () => {
  const C = MR.C, S = MR.S;
  const [mod, setMod] = useState('hizli'); // hizli | detayli
  // FORM
  const [marka, setMarka] = useState('');
  const [model, setModel] = useState('');
  const [yil, setYil] = useState('');
  const [km, setKm] = useState('');
  const [rayic, setRayic] = useState('');
  const [onarim, setOnarim] = useState('');
  const [kusur, setKusur] = useState('100');
  const [onceki, setOnceki] = useState('0');
  const [bolge, setBolge] = useState('on');
  const [plaka, setPlaka] = useState('');
  const [notlar, setNotlar] = useState('');
  // RESULTS
  const [emsaller, setEmsaller] = useState([]);
  const [sonuc, setSonuc] = useState(null);
  const [aiAnaliz, setAiAnaliz] = useState('');
  const [aiKaynak, setAiKaynak] = useState('');
  // LOADING
  const [emsalYukleniyor, setEmsalYukleniyor] = useState(false);
  const [hesapYukleniyor, setHesapYukleniyor] = useState(false);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);

  const modeller = marka && MR.ARAC_DB?.[marka] ? MR.ARAC_DB[marka].modeller : [];
  const isPremium = marka && MR.ARAC_DB?.[marka]?.premium;

  const yillar = [];
  for (let y = new Date().getFullYear(); y >= 2005; y--) yillar.push(y);

  /* ---------- TAHKİM EMSAL ARA ---------- */
  const emsalAra = async () => {
    if (!marka || !yil || !km) return;
    setEmsalYukleniyor(true);
    await new Promise(r => setTimeout(r, 800));
    const sonuclar = findEmsaller(marka, parseInt(yil), MR.parseNum(km));
    setEmsaller(sonuclar);
    if (sonuclar.length > 0) {
      const top3 = sonuclar.slice(0, 3).sort((a, b) => b.rayic - a.rayic);
      setRayic(MR.fmtInput(String(top3[0].rayic)));
    }
    setEmsalYukleniyor(false);
  };

  /* ---------- HESAPLA ---------- */
  const hesapla = async () => {
    const r = MR.parseNum(rayic), o = MR.parseNum(onarim);
    if (!marka || !yil || !r || !o) { alert('MARKA, YIL, RAYİÇ DEĞER VE ONARIM BEDELİ GEREKLİ'); return; }
    if (parseInt(kusur) === 0) { alert('TAM KUSURLU OLDUĞUNUZDA DEĞER KAYBI TALEP EDEMEZSİNİZ'); return; }

    setHesapYukleniyor(true);
    await new Promise(res => setTimeout(res, 600));

    const result = hesaplaDK(marka, parseInt(yil), MR.parseNum(km), r, o, parseInt(kusur), parseInt(onceki), bolge);
    setSonuc(result);
    setHesapYukleniyor(false);

    // AI ANALİZ
    setAiYukleniyor(true);
    setAiAnaliz('');
    try {
      const bestEmsal = emsaller.length > 0 ? emsaller[0] : null;
      const resp = await MR.api.adkAiAnaliz({
        marka, model, yil: parseInt(yil), km: MR.parseNum(km), rayic: r, onarim: o,
        kusur: parseInt(kusur), onceki: parseInt(onceki), bolge, premium: isPremium,
        nisbi: result.nisbiOrt, piyasa: result.piyasa, tsb: result.tsbGarantili,
        fullRight: result.fullRight, kusurApplied: result.kusurApplied,
        emsal: bestEmsal
      });
      if (resp?.success && resp.data?.analiz) {
        setAiAnaliz(resp.data.analiz);
        setAiKaynak(resp.data.kaynak || 'yerel');
      } else {
        setAiAnaliz('AI ANALİZ ALINAMADI. LÜTFEN SİSTEM AYARLARINDAN OPENAI API KEY TANIMLAYIN.');
        setAiKaynak('hata');
      }
    } catch (e) {
      setAiAnaliz('AI SERVİSİNE BAĞLANILAMADI.');
      setAiKaynak('hata');
    }
    setAiYukleniyor(false);
  };

  /* ---------- PDF İNDİR ---------- */
  const pdfIndir = () => {
    if (!sonuc) return;
    setPdfYukleniyor(true);
    const bestEmsal = emsaller.length > 0 ? emsaller[0] : null;
    const raporNo = 'MR-ADK-' + Date.now().toString().slice(-8);
    const tarih = new Date().toLocaleDateString('tr-TR');

    const html = `
      <div style="font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1a1a2e;">
        <div style="border-bottom:3px solid #2563eb;padding-bottom:20px;margin-bottom:30px;">
          <h1 style="color:#2563eb;font-size:22px;margin:0;">MR HASAR DANIŞMANLIK</h1>
          <h2 style="color:#333;font-size:16px;margin:6px 0 0;">ARAÇ DEĞER KAYBI HESAPLAMA RAPORU</h2>
          <p style="color:#64748b;font-size:11px;margin-top:8px;">RAPOR NO: ${raporNo} | TARİH: ${tarih}</p>
        </div>
        <div style="background:#f0f9ff;padding:20px;border-radius:8px;margin-bottom:20px;">
          <h3 style="font-size:14px;margin-bottom:12px;">ARAÇ BİLGİLERİ</h3>
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            <tr><td style="padding:4px 8px;color:#64748b;width:140px;">MARKA/MODEL:</td><td style="padding:4px 8px;font-weight:600;">${marka} ${model}</td>
                <td style="padding:4px 8px;color:#64748b;width:140px;">MODEL YILI:</td><td style="padding:4px 8px;font-weight:600;">${yil}</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">KİLOMETRE:</td><td style="padding:4px 8px;font-weight:600;">${MR.parseNum(km).toLocaleString('tr-TR')} KM</td>
                <td style="padding:4px 8px;color:#64748b;">PLAKA:</td><td style="padding:4px 8px;font-weight:600;">${plaka || '-'}</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">RAYİÇ DEĞER:</td><td style="padding:4px 8px;font-weight:600;">${fmtMoney(MR.parseNum(rayic))}</td>
                <td style="padding:4px 8px;color:#64748b;">ONARIM BEDELİ:</td><td style="padding:4px 8px;font-weight:600;">${fmtMoney(MR.parseNum(onarim))}</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">KUSUR ORANI:</td><td style="padding:4px 8px;font-weight:600;">%${kusur}</td>
                <td style="padding:4px 8px;color:#64748b;">ÖNCEKİ HASAR:</td><td style="padding:4px 8px;font-weight:600;">${onceki === '0' ? 'YOK' : onceki + ' ADET'}</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">HASAR BÖLGESİ:</td><td style="padding:4px 8px;font-weight:600;">${bolgeLabel(bolge)}</td>
                <td style="padding:4px 8px;color:#64748b;">SEGMENT:</td><td style="padding:4px 8px;font-weight:600;">${sonuc.isPremium ? 'PREMİUM' : 'STANDART'}</td></tr>
          </table>
        </div>
        <div style="background:#e0e7ff;padding:20px;border-radius:8px;margin-bottom:20px;">
          <h3 style="font-size:14px;margin-bottom:12px;">HESAPLAMA SONUÇLARI</h3>
          <div style="display:flex;gap:15px;margin-bottom:15px;">
            <div style="flex:1;text-align:center;background:#2563eb;color:white;padding:20px;border-radius:8px;">
              <div style="font-size:10px;margin-bottom:6px;">%100 HAKLI DEĞER KAYBI</div>
              <div style="font-size:28px;font-weight:800;">${fmtMoney(sonuc.fullRight)}</div>
              <div style="font-size:10px;margin-top:4px;">${fmtMoney(sonuc.fullRightMin)} - ${fmtMoney(sonuc.fullRightMax)}</div>
            </div>
            <div style="flex:1;text-align:center;background:#059669;color:white;padding:20px;border-radius:8px;">
              <div style="font-size:10px;margin-bottom:6px;">GERÇEK DEĞER KAYBI (%${kusur} KUSUR)</div>
              <div style="font-size:28px;font-weight:800;">${fmtMoney(sonuc.kusurApplied)}</div>
            </div>
          </div>
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            <tr style="background:rgba(0,0,0,0.05);"><td style="padding:8px;font-weight:600;">NİSBİ YÖNTEM</td><td style="padding:8px;text-align:right;">${fmtMoney(sonuc.nisbiMin)} - ${fmtMoney(sonuc.nisbiMax)}</td></tr>
            <tr><td style="padding:8px;font-weight:600;">PİYASA YÖNTEMİ</td><td style="padding:8px;text-align:right;">${fmtMoney(sonuc.piyasa)}</td></tr>
            <tr style="background:rgba(0,0,0,0.05);"><td style="padding:8px;font-weight:600;">TSB YÖNTEMİ</td><td style="padding:8px;text-align:right;">${fmtMoney(sonuc.tsbGarantili)}</td></tr>
          </table>
        </div>
        ${bestEmsal ? `
        <div style="background:#fffbeb;padding:20px;border-radius:8px;border:2px solid #fbbf24;margin-bottom:20px;">
          <h3 style="font-size:14px;color:#d97706;margin-bottom:12px;">TAHKİM EMSAL KARARI (2024-2025)</h3>
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            <tr><td style="padding:4px 8px;color:#64748b;">DOSYA NO:</td><td style="padding:4px 8px;font-weight:600;">${bestEmsal.dosyaNo}</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">ARAÇ:</td><td style="padding:4px 8px;font-weight:600;">${bestEmsal.marka} ${bestEmsal.model} (${bestEmsal.aracYili})</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">RAYİÇ:</td><td style="padding:4px 8px;font-weight:600;">${fmtMoney(bestEmsal.rayic)}</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">HÜKMEDİLEN DK:</td><td style="padding:4px 8px;font-weight:700;color:#d97706;">${fmtMoney(bestEmsal.dk)}</td></tr>
            <tr><td style="padding:4px 8px;color:#64748b;">BENZERLİK:</td><td style="padding:4px 8px;font-weight:600;">%${Math.round(bestEmsal.similarity)}</td></tr>
          </table>
        </div>` : ''}
        ${aiAnaliz ? `
        <div style="background:#f0fdf4;padding:20px;border-radius:8px;border:1px solid #86efac;margin-bottom:20px;">
          <h3 style="font-size:14px;color:#059669;margin-bottom:12px;">AI ANALİZ RAPORU</h3>
          <div style="font-size:11px;line-height:1.7;white-space:pre-wrap;">${aiAnaliz}</div>
        </div>` : ''}
        <div style="margin-top:30px;padding-top:15px;border-top:2px solid #e0e7ff;text-align:center;font-size:9px;color:#64748b;">
          <p><strong>MR HASAR DANIŞMANLIK</strong> - ARAÇ DEĞER KAYBI HESAPLAMA RAPORU</p>
          <p>BU RAPOR BİLGİLENDİRME AMAÇLIDIR. RESMİ İŞLEMLERDE SİGORTA TAHKİM KOMİSYONU KARARLARI ESAS ALINIR.</p>
        </div>
      </div>`;

    const el = document.createElement('div');
    el.innerHTML = html;
    document.body.appendChild(el);

    html2pdf().set({
      margin: 10,
      filename: `MR_ADK_Rapor_${raporNo}.pdf`,
      image: {type: 'jpeg', quality: 0.98},
      html2canvas: {scale: 2},
      jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait'}
    }).from(el).save().then(() => {
      document.body.removeChild(el);
      setPdfYukleniyor(false);
    }).catch(() => {
      document.body.removeChild(el);
      setPdfYukleniyor(false);
    });
  };

  /* ---------- TEMIZLE ---------- */
  const temizle = () => {
    setMarka(''); setModel(''); setYil(''); setKm(''); setRayic(''); setOnarim('');
    setKusur('100'); setOnceki('0'); setBolge('on'); setPlaka(''); setNotlar('');
    setEmsaller([]); setSonuc(null); setAiAnaliz(''); setAiKaynak('');
  };

  /* ═══════════════ RENDER ═══════════════ */
  const cardS = {...S.card, marginBottom: 20};
  const gridS = {display:'grid', gridTemplateColumns:'1fr 1fr', gap:14};
  const fullS = {gridColumn:'span 2'};
  const tagS = (bg, color) => ({padding:'2px 6px', borderRadius:4, fontSize:8, fontWeight:700, background:bg, color, marginLeft:6});
  const resultBoxS = (bg, bc) => ({flex:1, textAlign:'center', padding:20, borderRadius:12, background:bg, border:`2px solid ${bc}`});
  const methodS = {background:C.bgInput, borderRadius:10, padding:14, textAlign:'center'};
  const emsalS = {display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'rgba(0,0,0,0.15)', borderRadius:8, marginBottom:6, fontSize:11};
  const rankS = {width:22, height:22, borderRadius:'50%', background:`linear-gradient(135deg, ${C.success}, ${C.cyan})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0};

  return (
    <div className="fade-in">
      {/* HEADER */}
      <div style={cardS}>
        <div style={{padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, borderBottom:`1px solid ${C.border}`, background:`linear-gradient(135deg, ${C.accent}11, ${C.purple}11)`}}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={{width:42, height:42, borderRadius:12, background:`linear-gradient(135deg, ${C.purple}, ${C.accent})`, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <MR.LIcon name="Calculator" size={20} color="#fff"/>
            </div>
            <div>
              <div style={{fontSize:15, fontWeight:800}}>ADK HESAPLAMA ROBOTU</div>
              <div style={{fontSize:10, color:C.textMuted}}>AI DESTEKLİ - TAHKİM 2024-2025 - PDF RAPOR</div>
            </div>
          </div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            <span style={S.badge(C.purple)}>AI DESTEKLİ</span>
            <span style={S.badge(C.gold)}>TAHKİM 2024-25</span>
            <span style={S.badge(C.success)}>PDF ÇIKTI</span>
            <span style={S.badge(C.cyan)}>3 YÖNTEM</span>
          </div>
        </div>
      </div>

      {/* MOD TABS */}
      <div style={{display:'flex', gap:12, marginBottom:20}}>
        {[
          {id:'hizli', icon:'Zap', title:'HIZLI HESAPLAMA', desc:'ARAÇ VERİLERİ + TAHKİM EMSAL RAYİÇ + AI ANALİZ'},
          {id:'detayli', icon:'FileText', title:'DETAYLI RAPOR', desc:'TÜM ALANLAR + KAPSAMLI ANALİZ + PDF RAPOR'}
        ].map(t => (
          <div key={t.id} onClick={() => setMod(t.id)} style={{
            flex:1, background: mod === t.id ? `linear-gradient(180deg, ${C.purple}15, ${C.bgCard})` : C.bgCard,
            border: `2px solid ${mod === t.id ? C.purple : C.border}`, borderRadius:14, padding:18, cursor:'pointer',
            transition:'all .3s', position:'relative', overflow:'hidden'
          }}>
            {mod === t.id && <div style={{position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(135deg, ${C.purple}, ${C.accent})`}}/>}
            <div style={{width:40, height:40, borderRadius:10, background: mod === t.id ? `linear-gradient(135deg, ${C.purple}, ${C.accent})` : C.bgInput,
              display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10}}>
              <MR.LIcon name={t.icon} size={18} color={mod === t.id ? '#fff' : C.textMuted}/>
            </div>
            <div style={{fontSize:13, fontWeight:700, marginBottom:4}}>{t.title}</div>
            <div style={{fontSize:10, color:C.textMuted}}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* ANA İÇERİK */}
      <div style={{display:'grid', gridTemplateColumns: mod === 'detayli' ? '1fr 1fr' : '1fr 1.4fr', gap:20}}>

        {/* SOL: FORM */}
        <div>
          {/* ARAÇ BİLGİLERİ */}
          <div style={cardS}>
            <MR.SectionTitle icon="Car" title="ARAÇ BİLGİLERİ" sub="TAHKİM EMSAL RAYİÇ (2024-2025)"/>
            <div style={{...S.cardBody}}>
              <div style={gridS}>
                <MR.FormGroup label={<>MARKA {isPremium && <span style={tagS(`${C.gold}22`, C.gold)}>PREMİUM</span>}</>}>
                  <select value={marka} onChange={e => {setMarka(e.target.value); setModel('');}} style={S.select}>
                    <option value="">MARKA SEÇİNİZ</option>
                    {Object.keys(MR.ARAC_DB || {}).sort().map(m => <option key={m} value={m}>{m}{MR.ARAC_DB[m].premium ? ' ★' : ''}</option>)}
                  </select>
                </MR.FormGroup>
                <MR.FormGroup label="MODEL">
                  <select value={model} onChange={e => setModel(e.target.value)} style={S.select}>
                    <option value="">{marka ? 'MODEL SEÇİNİZ' : 'ÖNCE MARKA SEÇİN'}</option>
                    {modeller.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </MR.FormGroup>
                <MR.FormGroup label="MODEL YILI">
                  <select value={yil} onChange={e => setYil(e.target.value)} style={S.select}>
                    <option value="">SEÇİNİZ</option>
                    {yillar.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </MR.FormGroup>
                <MR.FormGroup label="KİLOMETRE">
                  <input value={km} onChange={e => setKm(MR.fmtInput(e.target.value))} placeholder="ÖRN: 80.000" style={S.input}/>
                </MR.FormGroup>

                {/* TAHKİM EMSAL KUTUSU */}
                <div style={{...fullS, background:`${C.gold}11`, border:`1px solid ${C.gold}33`, borderRadius:12, padding:16}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div style={{width:28, height:28, borderRadius:8, background:`linear-gradient(135deg, ${C.gold}, ${C.warning})`, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <MR.LIcon name="Scale" size={14} color="#fff"/>
                      </div>
                      <div>
                        <div style={{fontSize:11, fontWeight:700, color:C.gold}}>TAHKİM EMSAL RAYİÇ</div>
                        <div style={{fontSize:9, color:C.textMuted}}>2024-2025 KARARLARI</div>
                      </div>
                    </div>
                    <span style={S.badge(emsaller.length > 0 ? C.success : C.textMuted)}>
                      {emsalYukleniyor ? 'TARANIYOR...' : emsaller.length > 0 ? `${emsaller.length} EMSAL` : 'BEKLENİYOR'}
                    </span>
                  </div>

                  {emsaller.length === 0 && !emsalYukleniyor && (
                    <div style={{textAlign:'center', padding:12, color:C.textMuted, fontSize:10}}>
                      MARKA / MODEL / YIL / KM GİRİN, TAHKİM KARARLARI TARANACAK
                    </div>
                  )}

                  {emsaller.length > 0 && (
                    <>
                      <div style={{textAlign:'center', padding:12, background:'rgba(0,0,0,0.15)', borderRadius:10, marginBottom:10}}>
                        <div style={{fontSize:24, fontWeight:800, color:C.gold}}>{fmtMoney(Math.max(...emsaller.slice(0,3).map(e=>e.rayic)))}</div>
                        <div style={{fontSize:9, color:C.textMuted}}>TOP 3 EMSAL EN ÜST DEĞER</div>
                      </div>
                      <div style={{maxHeight:130, overflowY:'auto'}}>
                        {emsaller.slice(0,3).map((e,i) => (
                          <div key={i} style={emsalS}>
                            <span style={rankS}>{i+1}</span>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:600, color:C.gold}}>{e.dosyaNo}</div>
                              <div style={{fontSize:9, color:C.textMuted}}>{e.marka} {e.model} {e.aracYili} - {e.km.toLocaleString('tr-TR')} KM</div>
                            </div>
                            <div style={{fontWeight:700, color:C.cyan}}>{fmtMoney(e.rayic)}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <button onClick={emsalAra} disabled={!marka || !yil || !km || emsalYukleniyor}
                    style={{...S.btn, width:'100%', justifyContent:'center', marginTop:10,
                      background:`linear-gradient(135deg, ${C.gold}, ${C.warning})`, color:'#1a1a2e',
                      opacity: (!marka || !yil || !km || emsalYukleniyor) ? 0.5 : 1}}>
                    {emsalYukleniyor ? <><div style={{width:14,height:14,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#1a1a2e',borderRadius:'50%',animation:'spin 1s linear infinite'}}/> TARANIYOR...</>
                      : <><MR.LIcon name="Scale" size={14} color="#1a1a2e"/> TAHKİM EMSAL ARA (2024-2025)</>}
                  </button>
                </div>

                <MR.FormGroup label={<>RAYİÇ DEĞER <span style={tagS(`${C.gold}22`, C.gold)}>TAHKİM</span></>}>
                  <input value={rayic} onChange={e => setRayic(MR.fmtInput(e.target.value))} placeholder="TAHKİM EMSALİNDEN" style={{...S.input, borderColor: emsaller.length > 0 ? C.success : C.borderLight, background: emsaller.length > 0 ? `${C.success}11` : C.bgInput}}/>
                </MR.FormGroup>
                <MR.FormGroup label="ONARIM BEDELİ">
                  <input value={onarim} onChange={e => setOnarim(MR.fmtInput(e.target.value))} placeholder="HASAR TUTARI" style={S.input}/>
                </MR.FormGroup>
                <MR.FormGroup label={<>KUSUR ORANI <span style={tagS(`${C.danger}22`, C.danger)}>ÖNEMLİ</span></>}>
                  <select value={kusur} onChange={e => setKusur(e.target.value)} style={S.select}>
                    <option value="100">%100 HAKLI</option>
                    <option value="75">%75 HAKLI</option>
                    <option value="50">%50 HAKLI</option>
                    <option value="25">%25 HAKLI</option>
                    <option value="0">%0 (TALEP YOK)</option>
                  </select>
                </MR.FormGroup>
                <MR.FormGroup label="ÖNCEKİ HASAR">
                  <select value={onceki} onChange={e => setOnceki(e.target.value)} style={S.select}>
                    <option value="0">YOK</option>
                    <option value="1">1 ADET</option>
                    <option value="2">2 ADET</option>
                    <option value="3">3+ ADET</option>
                  </select>
                </MR.FormGroup>
                <MR.FormGroup label="HASARLI BÖLGE">
                  <select value={bolge} onChange={e => setBolge(e.target.value)} style={S.select}>
                    <option value="on">ÖN KISIM</option>
                    <option value="arka">ARKA KISIM</option>
                    <option value="yan">YAN KISIM</option>
                    <option value="tavan">TAVAN</option>
                  </select>
                </MR.FormGroup>

                {mod === 'detayli' && (
                  <>
                    <MR.FormGroup label="PLAKA">
                      <input value={plaka} onChange={e => setPlaka(e.target.value.toUpperCase())} placeholder="34 ABC 123" style={S.input}/>
                    </MR.FormGroup>
                    <div style={fullS}>
                      <MR.FormGroup label="NOTLAR" full>
                        <textarea value={notlar} onChange={e => setNotlar(e.target.value)} placeholder="EK NOTLAR..." style={{...S.input, minHeight:60, resize:'vertical'}}/>
                      </MR.FormGroup>
                    </div>
                  </>
                )}
              </div>

              {/* BUTONLAR */}
              <div style={{display:'flex', gap:10, marginTop:16}}>
                <button onClick={temizle} style={{...S.btn, ...S.btnG, flex:1, justifyContent:'center'}}>
                  <MR.LIcon name="RotateCcw" size={14}/> TEMİZLE
                </button>
                <button onClick={hesapla} disabled={hesapYukleniyor}
                  style={{...S.btn, flex:2, justifyContent:'center', background:`linear-gradient(135deg, ${C.accent}, ${C.purple})`, color:'#fff', opacity: hesapYukleniyor ? 0.6 : 1}}>
                  {hesapYukleniyor ? <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 1s linear infinite'}}/> HESAPLANIYOR...</>
                    : <><MR.LIcon name="Calculator" size={14} color="#fff"/> HESAPLA + AI ANALİZ</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: SONUÇLAR */}
        <div>
          <div style={cardS}>
            <MR.SectionTitle icon="BarChart3" title="HESAPLAMA SONUCU" sub="TAHKİM EMSAL BAZLI ANALİZ"/>
            <div style={S.cardBody}>

              {!sonuc && !hesapYukleniyor && (
                <MR.EmptyState icon="Calculator" title="HESAPLAMA BEKLENİYOR" desc="ARAÇ BİLGİLERİNİ GİRİN VE TAHKİM EMSAL ARA BUTONUNA TIKLAYIN."/>
              )}

              {hesapYukleniyor && <MR.Loading/>}

              {sonuc && !hesapYukleniyor && (
                <>
                  {/* ARAÇ BAR */}
                  <div style={{display:'flex', gap:10, flexWrap:'wrap', padding:'10px 14px', background:C.bgInput, borderRadius:10, marginBottom:14, fontSize:11}}>
                    <span><span style={{color:C.textMuted, fontSize:9}}>ARAÇ: </span><b>{marka} {model}</b></span>
                    <span><span style={{color:C.textMuted, fontSize:9}}>YIL: </span><b>{yil}</b></span>
                    <span><span style={{color:C.textMuted, fontSize:9}}>KM: </span><b>{MR.parseNum(km).toLocaleString('tr-TR')}</b></span>
                    <span><span style={{color:C.textMuted, fontSize:9}}>KUSUR: </span><b>%{kusur}</b></span>
                    {sonuc.isPremium && <span style={S.badge(C.gold)}>PREMİUM</span>}
                  </div>

                  {/* SONUÇ KUTULARI */}
                  <div style={{display:'flex', gap:12, marginBottom:14}}>
                    <div style={resultBoxS(`${C.accent}15`, `${C.accent}44`)}>
                      <div style={{fontSize:9, color:C.textSec, letterSpacing:1, marginBottom:6}}>%100 HAKLI</div>
                      <div style={{fontSize:26, fontWeight:800, color:C.accent}}>{fmtMoney(sonuc.fullRight)}</div>
                      <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>{fmtMoney(sonuc.fullRightMin)} - {fmtMoney(sonuc.fullRightMax)}</div>
                    </div>
                    <div style={resultBoxS(`${C.success}15`, `${C.success}44`)}>
                      <div style={{fontSize:9, color:C.textSec, letterSpacing:1, marginBottom:6}}>
                        GERÇEK DK <span style={{...S.badge(C.danger), marginLeft:4}}>%{kusur}</span>
                      </div>
                      <div style={{fontSize:26, fontWeight:800, color:C.success}}>{fmtMoney(sonuc.kusurApplied)}</div>
                      <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>{parseInt(kusur) === 100 ? 'TAM HAK EDİŞ' : 'KUSUR SONRASI'}</div>
                    </div>
                  </div>

                  {/* 3 YÖNTEM */}
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14}}>
                    <div style={methodS}>
                      <div style={{fontSize:9, color:C.textMuted, marginBottom:4}}>NİSBİ YÖNTEM</div>
                      <div style={{fontSize:14, fontWeight:700, color:C.accent}}>{fmtMoney(sonuc.nisbiMin)} - {fmtMoney(sonuc.nisbiMax)}</div>
                    </div>
                    <div style={methodS}>
                      <div style={{fontSize:9, color:C.textMuted, marginBottom:4}}>PİYASA YÖNTEMİ</div>
                      <div style={{fontSize:14, fontWeight:700, color:C.accent}}>{fmtMoney(sonuc.piyasa)}</div>
                    </div>
                    <div style={methodS}>
                      <div style={{fontSize:9, color:C.textMuted, marginBottom:4}}>TSB YÖNTEMİ</div>
                      <div style={{fontSize:14, fontWeight:700, color:C.accent}}>{fmtMoney(sonuc.tsbGarantili)}</div>
                    </div>
                  </div>

                  {/* KATSAYILAR */}
                  <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:14}}>
                    {[
                      {l:'KM', v:sonuc.kmKatsayi}, {l:'YAŞ', v:sonuc.yasKatsayi},
                      {l:'ÖNCEKİ', v:sonuc.oncekiKatsayi}, {l:'BÖLGE', v:sonuc.bolgeKatsayi}
                    ].map((k,i) => (
                      <div key={i} style={{background:C.bgInput, borderRadius:6, padding:'6px 10px', fontSize:9}}>
                        <span style={{color:C.textMuted}}>{k.l}: </span>
                        <span style={{fontWeight:700, color: k.v >= 0.9 ? C.success : k.v >= 0.7 ? C.warning : C.danger}}>{k.v.toFixed(2)}</span>
                      </div>
                    ))}
                    {sonuc.isPremium && <div style={{background:`${C.gold}22`, borderRadius:6, padding:'6px 10px', fontSize:9, color:C.gold, fontWeight:700}}>PREMİUM: x{sonuc.premiumCarpan}</div>}
                  </div>

                  {/* AI ANALİZ */}
                  <div style={{background:`linear-gradient(135deg, ${C.purple}11, ${C.accent}11)`, borderRadius:12, padding:16, border:`1px solid ${C.purple}33`, marginBottom:14}}>
                    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                      <div style={{width:24, height:24, borderRadius:6, background:`linear-gradient(135deg, ${C.purple}, ${C.accent})`, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <MR.LIcon name="Sparkles" size={12} color="#fff"/>
                      </div>
                      <span style={{fontSize:11, fontWeight:700, color:C.purple}}>AI ANALİZ RAPORU</span>
                      {aiKaynak && <span style={S.badge(aiKaynak === 'ai' ? C.success : C.warning)}>{aiKaynak === 'ai' ? 'OPENAI' : 'YEREL'}</span>}
                    </div>
                    {aiYukleniyor ? (
                      <div style={{display:'flex', alignItems:'center', gap:8, padding:12, color:C.textMuted, fontSize:11}}>
                        <div style={{width:14,height:14,border:'2px solid '+C.border,borderTopColor:C.purple,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
                        AI ANALİZ YAPILIYOR...
                      </div>
                    ) : (
                      <div style={{fontSize:11, lineHeight:1.7, color:C.textSec, whiteSpace:'pre-wrap'}}>{aiAnaliz || 'HESAPLAMA YAPINCA AI ANALİZ OTOMATİK BAŞLAR.'}</div>
                    )}
                  </div>

                  {/* TAHKİM EMSAL SONUÇ */}
                  {emsaller.length > 0 && (
                    <div style={{background:`${C.gold}11`, border:`2px solid ${C.gold}33`, borderRadius:12, padding:16, marginBottom:14}}>
                      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
                        <div style={{width:24, height:24, borderRadius:6, background:`linear-gradient(135deg, ${C.gold}, ${C.warning})`, display:'flex', alignItems:'center', justifyContent:'center'}}>
                          <MR.LIcon name="Scale" size={12} color="#fff"/>
                        </div>
                        <div>
                          <div style={{fontSize:11, fontWeight:700, color:C.gold}}>BENZER TAHKİM KARARI</div>
                          <div style={{fontSize:9, color:C.textMuted}}>2024-2025 EMSAL KARARLARI</div>
                        </div>
                      </div>
                      {emsaller.slice(0,1).map((e,i) => (
                        <div key={i} style={{background:'rgba(0,0,0,0.15)', borderRadius:8, padding:12}}>
                          {[
                            ['DOSYA NO', e.dosyaNo, true],
                            ['ARAÇ', `${e.marka} ${e.model} (${e.aracYili})`],
                            ['KM', e.km.toLocaleString('tr-TR')],
                            ['RAYİÇ', fmtMoney(e.rayic)],
                            ['HÜKMEDİLEN DK', fmtMoney(e.dk), true],
                            ['BENZERLİK', `%${Math.round(e.similarity)}`],
                            ['KAYNAK', e.kaynak]
                          ].map(([l,v,hl],j) => (
                            <div key={j} style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${C.border}33`, fontSize:10}}>
                              <span style={{color:C.textMuted}}>{l}</span>
                              <span style={{fontWeight:600, color: hl ? C.gold : C.text}}>{v}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div style={{marginTop:8, padding:8, background:`${C.gold}11`, borderRadius:6, fontSize:9, color:C.textSec}}>
                        <b style={{color:C.gold}}>NOT:</b> TAHKİM EMSALLERİ REFERANS AMAÇLIDIR. HER DAVA KENDİ KOŞULLARI İÇİNDE DEĞERLENDİRİLİR.
                      </div>
                    </div>
                  )}

                  {/* PDF BUTON */}
                  <button onClick={pdfIndir} disabled={pdfYukleniyor}
                    style={{...S.btn, width:'100%', justifyContent:'center', background:`linear-gradient(135deg, ${C.success}, ${C.cyan})`, color:'#fff', padding:14, fontSize:13, opacity: pdfYukleniyor ? 0.6 : 1}}>
                    {pdfYukleniyor ? <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 1s linear infinite'}}/> PDF OLUŞTURULUYOR...</>
                      : <><MR.LIcon name="Download" size={16} color="#fff"/> PDF RAPOR İNDİR</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
