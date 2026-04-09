/**
 * MR HASAR DANIŞMANLIK - EVRAK OKUYUCU v2
 * Sol panel liste / sağ panel detay / ikişer kuyruk
 * Anlaşmalı KTT: TRAMER 48 senaryo + kusur analizi
 * Polis KTT + Hasar İhbar: bilgi çıkarma
 */
const MR = window.MR || (window.MR = {});
const {useState, useCallback, useRef, useEffect, useMemo} = React;

MR.EvrakOkuyucuPage = ({setPage, user}) => {
  const C = MR.C, S = MR.S, LIcon = MR.LIcon;
  const isKoyu = MR.tema === 'koyu';

  const [tip, setTip] = useState('anlasma_ktt');
  const [items, setItems] = useState([]);
  const [selId, setSelId] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const procRef = useRef(false);
  const qRef = useRef([]);

  const TIPLER = {
    anlasma_ktt: {label:'ANLAŞMALI KTT', icon:'FileText', color:'#2563eb', desc:'El Yazısı Tutanak + TRAMER Kusur Analizi'},
    polis_ktt: {label:'POLİS KTT', icon:'ShieldAlert', color:'#dc2626', desc:'Polis Kaza Tespit Tutanağı'},
    hasar_ihbar: {label:'HASAR İHBAR', icon:'AlertTriangle', color:'#d97706', desc:'Sigorta Şirketi Hasar Föyü'}
  };
  const tipInfo = TIPLER[tip];

  const upd = (id, p) => setItems(x => x.map(i => i.id === id ? {...i, ...p} : i));

  const processItem = async (item) => {
    upd(item.id, {status:'analyzing', sub:'Claude AI analiz ediyor...'});
    try {
      const fd = new FormData();
      fd.append('dosya_0', item.file);
      fd.append('dosya_sayisi', '1');
      fd.append('tip', tip);
      const r = await MR.api.evrakAnaliz(fd);
      if (r.success && r.data) {
        upd(item.id, {status:'done', result: r.data, sub: null});
        setSelId(item.id);
      } else {
        upd(item.id, {status:'error', sub: r.error || 'ANALİZ BAŞARISIZ'});
      }
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
    const valid = Array.from(fl).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!valid.length) return;
    const ni = valid.map(f => {
      const preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
      return {id: Date.now() + '-' + Math.random().toString(36).slice(2,6), name: f.name, file: f, preview, status:'pending', sub:'Sırada', result:null};
    });
    setItems(p => [...p, ...ni]);
    qRef.current.push(...ni);
    runQueue();
  }, [tip]);

  const sel = items.find(i => i.id === selId);
  const doneCount = items.filter(i => i.status === 'done').length;
  const kc = o => o === 0 ? '#22c55e' : o === 100 ? '#ef4444' : '#f59e0b';
  const gc = s => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  const cardBg = isKoyu ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isKoyu ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)';
  const Row = ({l, v, c}) => v ? (
    <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${cardBorder}`}}>
      <span style={{fontSize:9, color:C.textMuted, fontWeight:700}}>{l}</span>
      <span style={{fontSize:10, color:c||C.text, textAlign:'right', maxWidth:'65%'}}>{v}</span>
    </div>
  ) : null;

  const SecTitle = ({icon, text, color}) => (
    <div style={{fontSize:10, fontWeight:800, letterSpacing:0.5, color:color||tipInfo.color, textTransform:'uppercase', marginBottom:10, display:'flex', alignItems:'center', gap:6}}>
      <LIcon name={icon} size={13} color={color||tipInfo.color}/> {text}
    </div>
  );

  const Card = ({children, color, style}) => (
    <div style={{background: color ? color+'0a' : cardBg, border:`1px solid ${color ? color+'33' : cardBorder}`, borderRadius:10, padding:14, ...style}}>
      {children}
    </div>
  );

  // ═══ ANLAŞMALI KTT SONUÇ RENDER ═══
  const renderAnlasmaKTT = (r) => {
    const kt = r.kusurTablosu || [];
    return (
      <div style={{display:'flex', flexDirection:'column', gap:11}}>
        {/* SENARYO + GÜVEN */}
        <Card color="#ff6b35" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, padding:'14px 16px'}}>
          <div>
            <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>TRAMER SENARYO</div>
            <div style={{fontSize:22, fontWeight:900, color:'#ff6b35'}}>{r.eslesenSenaryo || '-'}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>GÜVEN</div>
            <div style={{fontSize:24, fontWeight:900, color:gc(r.guven||r.guvenSkoru||0)}}>{r.guven||r.guvenSkoru||'?'}%</div>
          </div>
        </Card>

        {/* ARAÇ A + B */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:11}}>
          {['aracA','aracB'].map((k,i) => {
            const ar = r[k]; if (!ar) return null;
            const harf = i===0?'A':'B';
            const ktItem = kt.find(x=>x.arac===harf);
            const oran = ktItem?.kusurOrani ?? 50;
            const col = kc(oran);
            return (
              <Card key={k} style={{borderTop:`3px solid ${col}`}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                  <div>
                    <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>ARAÇ {harf}</div>
                    <div style={{fontFamily:'monospace', fontSize:15, fontWeight:900, color:col}}>{ar.plaka||'-'}</div>
                  </div>
                  <div style={{fontSize:22, fontWeight:900, color:col}}>{oran}%</div>
                </div>
                <div style={{height:5, background:'rgba(128,128,128,0.15)', borderRadius:3, marginBottom:10}}>
                  <div style={{height:'100%', width:`${oran}%`, background:col, borderRadius:3}}/>
                </div>
                <Row l="Sürücü" v={ar.surucu}/>
                <Row l="TC" v={ar.tc}/>
                <Row l="Telefon" v={ar.telefon}/>
                <Row l="Sigorta" v={ar.sigorta}/>
                <Row l="Poliçe" v={ar.policeNo}/>
                <Row l="Hasar" v={ar.hasarYeri}/>
                {ktItem?.kusurNedeni && <div style={{marginTop:7, fontSize:10, color:C.textSec, background:'rgba(128,128,128,0.06)', borderRadius:6, padding:'6px 8px', borderLeft:`2px solid ${col}`}}>{ktItem.kusurNedeni}</div>}
              </Card>
            );
          })}
        </div>

        {/* KUSUR ANALİZİ */}
        <Card color="#8b5cf6">
          <SecTitle icon="Scale" text="KUSUR ANALİZİ" color="#8b5cf6"/>
          <div style={{fontSize:12, lineHeight:1.85, fontStyle:'italic', color:C.text}}>{r.kusurAnalizi||'-'}</div>
        </Card>

        {/* KROKİ + BEYAN */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:11}}>
          <Card color="#3b82f6">
            <SecTitle icon="Map" text="KROKİ ANALİZİ" color="#3b82f6"/>
            <Row l="Yol" v={r.kroKiAnalizi?.yolYapisi}/>
            <Row l="Araç A" v={r.kroKiAnalizi?.aAracPozisyon}/>
            <Row l="Araç B" v={r.kroKiAnalizi?.bAracPozisyon}/>
            <Row l="Çarpışma" v={r.kroKiAnalizi?.carpismaNokta}/>
            {r.kroKiAnalizi?.ozet && <div style={{marginTop:6, fontSize:10, color:C.textSec, fontStyle:'italic'}}>{r.kroKiAnalizi.ozet}</div>}
          </Card>
          <Card color="#3b82f6">
            <SecTitle icon="MessageSquare" text="BEYAN ANALİZİ" color="#3b82f6"/>
            {r.beyanAnalizi?.aBeyan && <div style={{marginBottom:8}}><div style={{fontSize:8.5, color:'#ff6b35', fontWeight:800}}>A SÜRÜCÜSÜ</div><div style={{fontSize:10, color:C.textSec, lineHeight:1.6, background:'rgba(0,0,0,0.04)', borderRadius:6, padding:'6px 8px'}}>{r.beyanAnalizi.aBeyan}</div></div>}
            {r.beyanAnalizi?.bBeyan && <div style={{marginBottom:8}}><div style={{fontSize:8.5, color:'#3b82f6', fontWeight:800}}>B SÜRÜCÜSÜ</div><div style={{fontSize:10, color:C.textSec, lineHeight:1.6, background:'rgba(0,0,0,0.04)', borderRadius:6, padding:'6px 8px'}}>{r.beyanAnalizi.bBeyan}</div></div>}
            {r.beyanAnalizi?.celisme && <div style={{background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:6, padding:'6px 8px', marginTop:5}}><span style={{fontSize:8.5, color:'#fbbf24', fontWeight:800}}>CELİŞME: </span><span style={{fontSize:10, color:C.textSec}}>{r.beyanAnalizi.celisme}</span></div>}
          </Card>
        </div>

        {/* YASAL + TESPİT */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:11}}>
          <Card color="#22c55e">
            <SecTitle icon="BookOpen" text="YASAL DAYANAK" color="#22c55e"/>
            <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>{(r.yasalDayanak||[]).filter(Boolean).map((m,i)=><span key={i} style={{background:'rgba(34,197,94,0.1)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.28)', borderRadius:5, padding:'3px 10px', fontSize:10, fontWeight:700}}>{m}</span>)}</div>
          </Card>
          <Card color="#f59e0b">
            <SecTitle icon="Search" text="TESPİTLER" color="#f59e0b"/>
            {(r.kritikTespitler||[]).filter(Boolean).map((t,i)=><div key={i} style={{fontSize:10, color:C.textSec, paddingBottom:4, marginBottom:4, borderBottom:`1px solid ${cardBorder}`}}>• {t}</div>)}
          </Card>
        </div>
      </div>
    );
  };

  // ═══ POLİS KTT / HASAR İHBAR SONUÇ RENDER ═══
  const renderGeneric = (r) => {
    const groups = tip === 'polis_ktt' ? [
      {title:'TUTANAK', icon:'FileText', fields:[['Tutanak No',r.kazaBilgileri?.tutanakNo],['Tarih',r.kazaBilgileri?.tarih],['Saat',r.kazaBilgileri?.saat],['İl',r.kazaBilgileri?.il],['İlçe',r.kazaBilgileri?.ilce],['Cadde',r.kazaBilgileri?.cadde],['Yol Tipi',r.kazaBilgileri?.yolTipi],['Hava',r.kazaBilgileri?.havaDurumu]]},
      {title:'ARAÇ A', icon:'Car', fields:[['Plaka',r.aracA?.plaka],['Marka',r.aracA?.marka],['Model',r.aracA?.model],['Yıl',r.aracA?.modelYili],['Sürücü',r.aracA?.surucu],['TC',r.aracA?.tc],['Sigorta',r.aracA?.sigorta],['Poliçe',r.aracA?.policeNo],['Hasar',r.aracA?.hasarYeri]]},
      {title:'ARAÇ B', icon:'Car', fields:[['Plaka',r.aracB?.plaka],['Marka',r.aracB?.marka],['Model',r.aracB?.model],['Yıl',r.aracB?.modelYili],['Sürücü',r.aracB?.surucu],['TC',r.aracB?.tc],['Sigorta',r.aracB?.sigorta],['Poliçe',r.aracB?.policeNo],['Hasar',r.aracB?.hasarYeri]]},
      {title:'KAZA ÖZETİ', icon:'FileText', fields:[['Özet',r.kazaOzeti]], wide:true},
    ] : [
      {title:'DOSYA', icon:'Folder', fields:[['Dosya No',r.dosyaNo],['Müşteri No',r.musteriNo],['Sigorta',r.sigortaSirketi],['Acente',r.acenteAdi],['Poliçe No',r.policeNo],['Poliçe Türü',r.policeTuru],['Bedel',r.sigortaBedeli],['Bitiş',r.policeBitis]]},
      {title:'SİGORTALI', icon:'User', fields:[['Adı',r.sigortaliAdi],['TC/Vergi',r.sigortaliTc],['Telefon',r.sigortaliTelefon],['Adres',r.sigortaliAdres]]},
      {title:'ARAÇ', icon:'Car', fields:[['Plaka',r.aracPlaka],['Marka',r.aracMarka],['Model',r.aracModel],['Yıl',r.aracYili],['Şase',r.aracSase]]},
      {title:'HASAR', icon:'AlertTriangle', fields:[['Tarih',r.hasarTarihi],['İhbar',r.ihbarTarihi],['Neden',r.hasarNedeni],['Yer',r.hasarYeri],['Kusur',r.kusurDurumu],['Toplam',r.toplamHasar],['Açıklama',r.hasarAciklama]]},
      {title:'EKSPER/SERVİS', icon:'Wrench', fields:[['Eksper',r.eksperAdi],['Servis',r.servisAdi]]},
    ];

    return (
      <div style={{display:'flex', flexDirection:'column', gap:11}}>
        {/* GÜVEN */}
        <Card style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <LIcon name="CheckCircle" size={18} color={gc(r.guven||75)}/>
            <span style={{fontSize:13, fontWeight:800, color:gc(r.guven||75)}}>ANALİZ TAMAMLANDI</span>
          </div>
          <div style={{fontSize:20, fontWeight:900, color:gc(r.guven||75)}}>{r.guven||'-'}%</div>
        </Card>
        {/* GRUPLAR */}
        {groups.map((g, gi) => (
          <Card key={gi} color={tipInfo.color} style={g.wide ? {} : {}}>
            <SecTitle icon={g.icon} text={g.title}/>
            {g.fields.filter(([,v])=>v).map(([l,v],fi) => <Row key={fi} l={l} v={typeof v === 'object' ? JSON.stringify(v) : String(v)}/>)}
          </Card>
        ))}
      </div>
    );
  };

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
            <p style={{fontSize:10, color:C.textMuted, margin:0}}>CLAUDE AI • KTT + HASAR İHBAR</p>
          </div>
        </div>
        <div style={{display:'flex', gap:6}}>
          <button onClick={() => fileRef.current?.click()} style={{...S.btn, background:tipInfo.color, color:'#fff', padding:'9px 18px', borderRadius:8, fontSize:12, fontWeight:700}}>
            <LIcon name="Upload" size={14} color="#fff"/> YÜKLE
          </button>
          {items.length > 0 && <button onClick={() => {setItems([]); setSelId(null); qRef.current=[];}} style={{...S.btn, background:`${C.danger}18`, color:C.danger, padding:'9px 14px', borderRadius:8, fontSize:11, fontWeight:700, border:`1px solid ${C.danger}33`}}>
            <LIcon name="Trash2" size={14} color={C.danger}/> TEMİZLE
          </button>}
          <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{display:'none'}} onChange={e => {addFiles(e.target.files); e.target.value='';}}/>
        </div>
      </div>

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
      {items.length === 0 && (
        <div onDrop={e => {e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files);}}
          onDragOver={e => {e.preventDefault(); setDrag(true);}} onDragLeave={() => setDrag(false)}
          onClick={() => fileRef.current?.click()}
          style={{...S.card, border:`2px dashed ${drag ? tipInfo.color : C.border}`, padding:'50px 24px', textAlign:'center',
            cursor:'pointer', background: drag ? tipInfo.color+'08' : C.bgCard}}>
          <LIcon name="Upload" size={40} color={drag ? tipInfo.color : C.textMuted}/>
          <p style={{fontSize:14, fontWeight:700, margin:'12px 0 4px'}}>EVRAK GÖRSELLERİNİ YÜKLEYİN</p>
          <p style={{fontSize:11, color:C.textMuted}}>Sürükle & bırak veya tıkla • Birden fazla evrak yükleyebilirsiniz</p>
          <p style={{fontSize:10, color:tipInfo.color, fontWeight:700, marginTop:4}}>Her evrak ayrı ayrı analiz edilir • İkişer ikişer işlenir</p>
        </div>
      )}

      {/* SOL LİSTE + SAĞ DETAY */}
      {items.length > 0 && (
        <div style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:14, alignItems:'start'}}>
          {/* SOL: TUTANAK LİSTESİ */}
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontSize:10, color:C.textMuted, fontWeight:700}}>{items.length} EVRAK</span>
              <button onClick={() => fileRef.current?.click()} style={{fontSize:9, color:C.textMuted, background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:5, padding:'3px 10px', cursor:'pointer', fontWeight:600}}>+ Ekle</button>
            </div>
            {items.map(item => {
              const isSel = selId === item.id;
              const sc = {analyzing:'#fbbf24', done:'#22c55e', error:'#ef4444', pending:'#64748b'}[item.status];
              const plakaA = item.result?.aracA?.plaka || item.result?.aracPlaka || '';
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
                      {item.status==='error' && <p style={{margin:'3px 0 0', fontSize:8, color:C.danger}}>{item.sub}</p>}
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
            {sel?.status === 'error' && <div style={{...S.card, padding:20, background:`${C.danger}08`}}><p style={{color:C.danger, fontWeight:700}}>HATA: {sel.sub}</p></div>}
            {sel?.status === 'done' && sel.result && (
              tip === 'anlasma_ktt' ? renderAnlasmaKTT(sel.result) : renderGeneric(sel.result)
            )}
          </div>
        </div>
      )}
    </div>
  );
};
