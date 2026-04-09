/**
 * MR HASAR DANIŞMANLIK - EVRAK OKUYUCU
 * Claude Vision AI ile KTT + Hasar İhbar Föyü okuma
 * 3 Tip: Anlaşmalı KTT, Polis KTT, Hasar İhbar Föyü
 */
const MR = window.MR || (window.MR = {});
const {useState, useCallback, useRef} = React;

/* ═══ ALAN TANIMLARI (TİP BAZLI) ═══ */
const EVRAK_ALANLARI = {
  anlasma_ktt: {
    label: 'ANLAŞMALI KTT',
    icon: 'FileText',
    color: '#2563eb',
    desc: 'Maddi Hasarlı Trafik Kazası Tespit Tutanağı (El Yazısı)',
    alanlar: [
      {g:'KAZA BİLGİLERİ', alanlar:[
        {k:'kaza_tarihi',l:'KAZA TARİHİ'},{k:'kaza_saati',l:'KAZA SAATİ'},
        {k:'kaza_yeri_il',l:'İL'},{k:'kaza_yeri_ilce',l:'İLÇE'},
        {k:'kaza_yeri_mahalle',l:'MAHALLE'},{k:'kaza_yeri_sokak',l:'SOKAK/CADDE'}
      ]},
      {g:'ARAÇ A (SOL TARAF)',nested:'arac_a', alanlar:[
        {k:'plaka',l:'PLAKA'},{k:'marka_model',l:'MARKA / MODEL'},
        {k:'surucu_adi',l:'SÜRÜCÜ ADI SOYADI'},{k:'surucu_tc',l:'TC KİMLİK NO'},
        {k:'surucu_telefon',l:'TELEFON'},{k:'surucu_adres',l:'ADRES'},
        {k:'sigorta_sirketi',l:'SİGORTA ŞİRKETİ'},{k:'police_no',l:'POLİÇE NO'},
        {k:'hasar_bolgeleri',l:'HASAR BÖLGELERİ'},{k:'kusur_isaret',l:'KUSUR MADDELERİ'}
      ]},
      {g:'ARAÇ B (SAĞ TARAF)',nested:'arac_b', alanlar:[
        {k:'plaka',l:'PLAKA'},{k:'marka_model',l:'MARKA / MODEL'},
        {k:'surucu_adi',l:'SÜRÜCÜ ADI SOYADI'},{k:'surucu_tc',l:'TC KİMLİK NO'},
        {k:'surucu_telefon',l:'TELEFON'},{k:'surucu_adres',l:'ADRES'},
        {k:'sigorta_sirketi',l:'SİGORTA ŞİRKETİ'},{k:'police_no',l:'POLİÇE NO'},
        {k:'hasar_bolgeleri',l:'HASAR BÖLGELERİ'},{k:'kusur_isaret',l:'KUSUR MADDELERİ'}
      ]},
      {g:'DİĞER',alanlar:[
        {k:'tanik_adi',l:'TANIK ADI'},{k:'tanik_plaka',l:'TANIK PLAKASI'},
        {k:'kaza_aciklama',l:'KAZA AÇIKLAMASI',wide:true}
      ]}
    ]
  },
  polis_ktt: {
    label: 'POLİS KTT',
    icon: 'ShieldAlert',
    color: '#dc2626',
    desc: 'Polis Trafik Kaza Tespit Tutanağı (Resmi)',
    alanlar: [
      {g:'TUTANAK BİLGİLERİ',alanlar:[
        {k:'tutanak_no',l:'TUTANAK NO'},{k:'kaza_tarihi',l:'KAZA TARİHİ'},{k:'kaza_saati',l:'KAZA SAATİ'},
        {k:'kaza_yeri_il',l:'İL'},{k:'kaza_yeri_ilce',l:'İLÇE'},
        {k:'kaza_yeri_mahalle',l:'MAHALLE/MEVKİ'},{k:'kaza_yeri_adres',l:'YOL/CADDE'},
        {k:'yol_tipi',l:'YOL TİPİ'},{k:'yol_kaplama',l:'YOL KAPLAMA'},{k:'hava_durumu',l:'HAVA DURUMU'}
      ]},
      {g:'ARAÇ BİLGİLERİ (1. ARAÇ)',nested_arr:'araclar',idx:0,alanlar:[
        {k:'plaka',l:'PLAKA'},{k:'marka',l:'MARKA'},{k:'model',l:'MODEL'},{k:'model_yili',l:'MODEL YILI'},
        {k:'surucu_adi',l:'SÜRÜCÜ ADI'},{k:'surucu_tc',l:'TC KİMLİK'},
        {k:'sigorta_sirketi',l:'SİGORTA ŞİRKETİ'},{k:'police_no',l:'POLİÇE NO'},
        {k:'hasar_durumu',l:'HASAR DURUMU'},{k:'kusur_orani',l:'KUSUR / İHLAL'}
      ]},
      {g:'ARAÇ BİLGİLERİ (2. ARAÇ)',nested_arr:'araclar',idx:1,alanlar:[
        {k:'plaka',l:'PLAKA'},{k:'marka',l:'MARKA'},{k:'model',l:'MODEL'},{k:'model_yili',l:'MODEL YILI'},
        {k:'surucu_adi',l:'SÜRÜCÜ ADI'},{k:'surucu_tc',l:'TC KİMLİK'},
        {k:'sigorta_sirketi',l:'SİGORTA ŞİRKETİ'},{k:'police_no',l:'POLİÇE NO'},
        {k:'hasar_durumu',l:'HASAR DURUMU'},{k:'kusur_orani',l:'KUSUR / İHLAL'}
      ]},
      {g:'KAZA ÖZETİ & KUSUR',alanlar:[
        {k:'kaza_ozeti',l:'KAZA ÖZETİ',wide:true},
        {k:'kusur_tespiti',l:'KUSUR TESPİTİ',wide:true}
      ]}
    ]
  },
  hasar_ihbar: {
    label: 'HASAR İHBAR FÖYÜ',
    icon: 'AlertTriangle',
    color: '#d97706',
    desc: 'Sigorta Şirketi Hasar İhbar / Dosya Kapağı',
    alanlar: [
      {g:'DOSYA BİLGİLERİ',alanlar:[
        {k:'dosya_no',l:'DOSYA NO'},{k:'musteri_no',l:'MÜŞTERİ NO'},
        {k:'sigorta_sirketi',l:'SİGORTA ŞİRKETİ'},{k:'acente_adi',l:'ACENTE'},
        {k:'police_no',l:'POLİÇE NO'},{k:'police_turu',l:'POLİÇE TÜRÜ'},
        {k:'sigorta_bedeli',l:'SİGORTA BEDELİ'},{k:'police_bitis',l:'POLİÇE BİTİŞ'}
      ]},
      {g:'SİGORTALI BİLGİLERİ',alanlar:[
        {k:'sigortali_adi',l:'SİGORTALI ADI'},{k:'sigortali_tc',l:'TC / VERGİ NO'},
        {k:'sigortali_telefon',l:'TELEFON'},{k:'sigortali_adres',l:'ADRES',wide:true}
      ]},
      {g:'ARAÇ BİLGİLERİ',alanlar:[
        {k:'arac_plaka',l:'PLAKA'},{k:'arac_marka',l:'MARKA'},{k:'arac_model',l:'MODEL'},
        {k:'arac_yili',l:'MODEL YILI'},{k:'arac_sase',l:'ŞASE NO'}
      ]},
      {g:'HASAR BİLGİLERİ',alanlar:[
        {k:'hasar_tarihi',l:'HASAR TARİHİ'},{k:'ihbar_tarihi',l:'İHBAR TARİHİ'},
        {k:'hasar_nedeni',l:'HASAR NEDENİ'},{k:'hasar_yeri',l:'HASAR YERİ'},
        {k:'kusur_durumu',l:'KUSUR DURUMU'},{k:'toplam_hasar',l:'TOPLAM HASAR'},
        {k:'hasar_aciklama',l:'HASAR AÇIKLAMASI',wide:true}
      ]},
      {g:'EKSPER / SERVİS',alanlar:[
        {k:'eksper_adi',l:'EKSPER ADI'},{k:'servis_adi',l:'SERVİS ADI'}
      ]}
    ]
  }
};

/* ═══ ANA BİLEŞEN ═══ */
MR.EvrakOkuyucuPage = ({setPage, user}) => {
  const C = MR.C, S = MR.S, LIcon = MR.LIcon;

  const [tip, setTip] = useState('anlasma_ktt');
  const [dosyalar, setDosyalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [onizlemeler, setOnizlemeler] = useState([]);
  const fileRef = useRef(null);

  const evrakTipi = EVRAK_ALANLARI[tip];

  const dosyaEkle = useCallback((files) => {
    const yeni = Array.from(files).filter(f => ['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type));
    setDosyalar(prev => [...prev, ...yeni]);
    yeni.forEach(f => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => setOnizlemeler(prev => [...prev, {name:f.name, src:e.target.result}]);
        reader.readAsDataURL(f);
      }
    });
  }, []);

  const dosyaSil = (idx) => {
    setDosyalar(prev => prev.filter((_,i) => i !== idx));
    setOnizlemeler(prev => prev.filter((_,i) => i !== idx));
  };

  const analiz = useCallback(async () => {
    if (dosyalar.length === 0) { setHata('EN AZ BİR DOSYA YÜKLEYİN'); return; }
    setYukleniyor(true); setHata(''); setSonuc(null);
    try {
      const fd = new FormData();
      dosyalar.forEach((f, i) => fd.append('dosya_' + i, f));
      fd.append('dosya_sayisi', dosyalar.length);
      fd.append('tip', tip);
      const r = await MR.api.evrakAnaliz(fd);
      if (r.success && r.data) {
        setSonuc(r.data);
      } else {
        setHata(r.error || 'ANALİZ BAŞARISIZ');
      }
    } catch(e) {
      setHata('HATA: ' + e.message);
    }
    setYukleniyor(false);
  }, [dosyalar, tip]);

  const temizle = () => {
    setDosyalar([]); setSonuc(null); setHata(''); setOnizlemeler([]);
  };

  // Sonuçtan değer al (nested objeler için)
  const getValue = (data, nested, nested_arr, idx, key) => {
    if (nested && data[nested]) return data[nested][key] ?? '';
    if (nested_arr && data[nested_arr] && data[nested_arr][idx]) return data[nested_arr][idx][key] ?? '';
    return data[key] ?? '';
  };

  // Sonuç düzenleme
  const updateValue = (nested, nested_arr, idx, key, val) => {
    setSonuc(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (nested) { if (!copy[nested]) copy[nested] = {}; copy[nested][key] = val; }
      else if (nested_arr) { if (!copy[nested_arr]) copy[nested_arr] = []; if (!copy[nested_arr][idx]) copy[nested_arr][idx] = {}; copy[nested_arr][idx][key] = val; }
      else { copy[key] = val; }
      return copy;
    });
  };

  // Excel aktar
  const excelAktar = () => {
    if (!sonuc) return;
    const rows = [];
    evrakTipi.alanlar.forEach(g => {
      g.alanlar.forEach(a => {
        const v = getValue(sonuc, g.nested, g.nested_arr, g.idx, a.k);
        rows.push([a.l, typeof v === 'object' ? JSON.stringify(v) : String(v || '')]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet([['ALAN','DEĞER'], ...rows]);
    ws['!cols'] = [{wch:25},{wch:50}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, evrakTipi.label);
    XLSX.writeFile(wb, evrakTipi.label.replace(/\s/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
  };

  // Kopyala
  const kopyala = () => {
    if (!sonuc) return;
    let text = evrakTipi.label + '\n' + '='.repeat(40) + '\n';
    evrakTipi.alanlar.forEach(g => {
      text += '\n' + g.g + '\n' + '-'.repeat(30) + '\n';
      g.alanlar.forEach(a => {
        const v = getValue(sonuc, g.nested, g.nested_arr, g.idx, a.k);
        text += a.l + ': ' + (typeof v === 'object' ? JSON.stringify(v) : (v || '-')) + '\n';
      });
    });
    navigator.clipboard.writeText(text);
    MR.toast && MR.toast('KOPYALANDI', 'success');
  };

  const isKoyu = MR.tema === 'koyu';
  const bgCard = isKoyu ? 'rgba(15,35,66,0.4)' : '#fafbfc';
  const borderC = isKoyu ? 'rgba(6,182,212,0.15)' : '#e5e7eb';

  return (
    <div className="fade-in" style={{padding:'20px', maxWidth:1400, margin:'0 auto'}}>

      {/* HEADER */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12}}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={{width:48, height:48, borderRadius:14, background:`linear-gradient(135deg, ${evrakTipi.color}, ${evrakTipi.color}cc)`, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <LIcon name="FileSearch" size={26} color="#fff"/>
            </div>
            <div>
              <h1 style={{fontSize:20, fontWeight:900, margin:0}}>EVRAK OKUYUCU</h1>
              <p style={{fontSize:11, color:C.textMuted, margin:0}}>CLAUDE AI İLE KTT + HASAR İHBAR ANALİZİ</p>
            </div>
          </div>
          {sonuc && (
            <div style={{display:'flex', gap:8}}>
              <button onClick={kopyala} style={{...S.btn, background:C.accent, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:12, fontWeight:700}}>
                <LIcon name="Copy" size={14} color="#fff"/> KOPYALA
              </button>
              <button onClick={excelAktar} style={{...S.btn, background:'#059669', color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:12, fontWeight:700}}>
                <LIcon name="FileSpreadsheet" size={14} color="#fff"/> EXCEL
              </button>
              <button onClick={temizle} style={{...S.btn, background:C.danger, color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:12, fontWeight:700}}>
                <LIcon name="Trash2" size={14} color="#fff"/> TEMİZLE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* EVRAK TİPİ SEÇİMİ */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20}}>
        {Object.entries(EVRAK_ALANLARI).map(([key, val]) => (
          <div key={key} onClick={() => { setTip(key); setSonuc(null); setHata(''); }}
            style={{...S.card, padding:'16px 20px', cursor:'pointer', textAlign:'center',
              border: tip === key ? `3px solid ${val.color}` : `1px solid ${C.border}`,
              background: tip === key ? val.color + '12' : C.bgCard,
              transform: tip === key ? 'scale(1.02)' : 'scale(1)', transition:'all 0.2s'}}>
            <LIcon name={val.icon} size={28} color={val.color}/>
            <div style={{fontSize:13, fontWeight:800, marginTop:8, color: tip === key ? val.color : C.text}}>{val.label}</div>
            <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>{val.desc}</div>
          </div>
        ))}
      </div>

      {/* YÜKLEME ALANI + SONUÇ */}
      <div style={{display:'grid', gridTemplateColumns: sonuc ? '350px 1fr' : '1fr', gap:20}}>

        {/* SOL: DOSYA YÜKLEME */}
        <div>
          <div style={{...S.card, marginBottom:16}}>
            <div style={{padding:16}}>
              <div onDragOver={e => {e.preventDefault(); setDragOver(true);}} onDragLeave={() => setDragOver(false)}
                onDrop={e => {e.preventDefault(); setDragOver(false); dosyaEkle(e.dataTransfer.files);}}
                onClick={() => fileRef.current?.click()}
                style={{border:`2px dashed ${dragOver ? evrakTipi.color : C.border}`, borderRadius:10, padding:30, textAlign:'center',
                  background: dragOver ? evrakTipi.color+'10' : C.bgInput, cursor:'pointer'}}>
                <LIcon name="Upload" size={36} color={dragOver ? evrakTipi.color : C.textMuted}/>
                <p style={{margin:'10px 0 4px', fontWeight:700, fontSize:13}}>EVRAK GÖRSELLERİNİ YÜKLEYİN</p>
                <p style={{margin:0, color:C.textSec, fontSize:10}}>SÜRÜKLE & BIRAK veya TIKLA (JPG, PNG, PDF)</p>
                <p style={{margin:'4px 0 0', color:evrakTipi.color, fontSize:10, fontWeight:700}}>BİRDEN FAZLA SAYFA YÜKLEYEBİLİRSİNİZ</p>
              </div>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple style={{display:'none'}} onChange={e => {dosyaEkle(e.target.files); e.target.value='';}}/>
            </div>
          </div>

          {/* YÜKLENEN DOSYALAR */}
          {dosyalar.length > 0 && (
            <div style={{...S.card, marginBottom:16}}>
              <div style={{padding:12}}>
                {dosyalar.map((f, i) => (
                  <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:8, background:C.bgInput, borderRadius:6, marginBottom:6}}>
                    {onizlemeler[i] && <img src={onizlemeler[i].src} style={{width:40, height:40, objectFit:'cover', borderRadius:4}}/>}
                    <div style={{flex:1}}>
                      <div style={{fontSize:11, fontWeight:600}}>{f.name}</div>
                      <div style={{fontSize:9, color:C.textMuted}}>{(f.size/1024).toFixed(0)} KB</div>
                    </div>
                    <button onClick={() => dosyaSil(i)} style={{background:'transparent', border:'none', cursor:'pointer', padding:4}}>
                      <LIcon name="X" size={16} color={C.danger}/>
                    </button>
                  </div>
                ))}
                <button onClick={analiz} disabled={yukleniyor}
                  style={{...S.btn, width:'100%', justifyContent:'center', marginTop:10, padding:'14px 20px', fontSize:13, fontWeight:800,
                    background:`linear-gradient(135deg, ${evrakTipi.color}, ${evrakTipi.color}cc)`, color:'#fff', borderRadius:10,
                    opacity: yukleniyor ? 0.6 : 1}}>
                  {yukleniyor ? (
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div style={{width:18, height:18, border:'3px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite'}}/>
                      <span>CLAUDE AI ANALİZ EDİYOR...</span>
                    </div>
                  ) : (
                    <><LIcon name="FileSearch" size={18} color="#fff"/> {evrakTipi.label} ANALİZ ET</>
                  )}
                </button>
              </div>
            </div>
          )}

          {hata && <div style={{padding:12, background:`${C.danger}18`, border:`1px solid ${C.danger}44`, borderRadius:8, fontSize:12, color:C.danger, marginBottom:16}}>
            <LIcon name="AlertCircle" size={14} color={C.danger}/> {hata}
          </div>}
        </div>

        {/* SAĞ: SONUÇLAR */}
        {sonuc && (
          <div>
            {/* GÜVEN SKORU */}
            <div style={{...S.card, marginBottom:16, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <LIcon name="CheckCircle" size={20} color={C.success}/>
                <span style={{fontSize:14, fontWeight:800, color:C.success}}>ANALİZ TAMAMLANDI</span>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{fontSize:11, color:C.textMuted}}>GÜVEN:</span>
                <span style={{fontSize:16, fontWeight:800, color: (sonuc.guven||0) >= 70 ? C.success : (sonuc.guven||0) >= 40 ? C.warning : C.danger}}>
                  %{sonuc.guven || '-'}
                </span>
              </div>
            </div>

            {/* ALAN GRUPLARI */}
            {evrakTipi.alanlar.map((grup, gi) => (
              <div key={gi} style={{...S.card, marginBottom:14}}>
                <div style={{padding:'10px 16px', background:evrakTipi.color+'12', borderBottom:`1px solid ${evrakTipi.color}33`, display:'flex', alignItems:'center', gap:8}}>
                  <LIcon name="ChevronRight" size={14} color={evrakTipi.color}/>
                  <span style={{fontSize:12, fontWeight:800, color:evrakTipi.color}}>{grup.g}</span>
                </div>
                <div style={{padding:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                  {grup.alanlar.map((alan, ai) => {
                    const val = getValue(sonuc, grup.nested, grup.nested_arr, grup.idx, alan.k);
                    const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val || '');
                    return (
                      <div key={ai} style={{gridColumn: alan.wide ? 'span 2' : 'span 1'}}>
                        <label style={{fontSize:9, fontWeight:700, color:C.textMuted, marginBottom:3, display:'block', letterSpacing:0.3}}>{alan.l}</label>
                        {alan.wide ? (
                          <textarea style={{...S.input, fontSize:11, padding:'7px 10px', minHeight:60, width:'100%', boxSizing:'border-box'}}
                            value={strVal} onChange={e => updateValue(grup.nested, grup.nested_arr, grup.idx, alan.k, e.target.value)}/>
                        ) : (
                          <input style={{...S.input, fontSize:12, padding:'8px 10px', fontWeight:600, width:'100%', boxSizing:'border-box',
                            background: strVal ? `${C.success}08` : C.bgInput, borderColor: strVal ? `${C.success}30` : C.border}}
                            value={strVal} onChange={e => updateValue(grup.nested, grup.nested_arr, grup.idx, alan.k, e.target.value)}/>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
