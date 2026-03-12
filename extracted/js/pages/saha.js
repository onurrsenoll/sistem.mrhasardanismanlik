/**
 * MR HASAR DANIŞMANLIK - SAHA DOSYALARI MODÜLÜ V3
 * SAHA PERSONELİ DOSYA ONAY İŞ AKIŞI
 * TL Format, Araç Katalog, Evrak Önce Yükle, Direkt Onaya Gönder, 3 Gün Süre
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useMemo, useCallback, useRef} = React;

/* ═══ SABİT VERİLER ═══ */
const HASAR_TIPLERI = ['TRAFİK KAZASI','DASK','YANGIN','SU BASKIN','HIRSIZLIK','DİĞER'];
const HASAR_DURUMLARI = [{v:'dosya_acik',l:'DOSYA AÇIK'},{v:'dosya_kapali',l:'DOSYA KAPALI'},{v:'onarim_devam',l:'ONARIM SÜRECİ DEVAM EDİYOR'}];
const DOSYA_KAYNAKLARI = ['YÖNLENDİREN','SERVİS','ACENTE','ANLAŞMALI KURUM','BİREYSEL BAŞVURU','DİĞER'];
const KUSUR_DURUMLARI = ['KUSUR YOK (%0)','%25 KUSURLU','%50 KUSURLU','%75 KUSURLU','%100 KUSURLU'];

const fmtTarih = (t) => t ? new Date(t).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-';
const fmtTarihSaat = (t) => t ? new Date(t).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';

/* ═══ TL PARA FORMATI ═══ */
const fmtTL = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const num = parseInt(String(val).replace(/\./g,'').replace(/[^0-9]/g,''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('tr-TR');
};
const parseTL = (str) => {
  if (!str) return '';
  return str.replace(/\./g,'').replace(/[^0-9]/g,'');
};

const DURUM_RENK = (d) => {
  const C = MR.C;
  return {taslak:C.textMuted, beklemede:C.warning, onaylandi:C.success, reddedildi:C.danger, dosyaya_donustu:C.purple, suresi_doldu:C.textMuted}[d] || C.textMuted;
};
const DURUM_LABEL = {taslak:'TASLAK', beklemede:'ONAY BEKLİYOR', onaylandi:'ONAYLANDI', reddedildi:'REDDEDİLDİ', dosyaya_donustu:'DOSYAYA DÖNÜŞTÜ', suresi_doldu:'SÜRESİ DOLDU'};
const HASAR_DURUMU_LABEL = {dosya_acik:'DOSYA AÇIK', dosya_kapali:'DOSYA KAPALI', onarim_devam:'ONARIM DEVAM EDİYOR'};

/* ═══ SÜRE HESAPLAMA (3 GÜN COUNTDOWN) ═══ */
const kalanSure = (onay_tarihi) => {
  if (!onay_tarihi) return null;
  const onay = new Date(onay_tarihi);
  const son = new Date(onay.getTime() + 3 * 24 * 60 * 60 * 1000);
  const simdi = new Date();
  const fark = son.getTime() - simdi.getTime();
  if (fark <= 0) return {gun:0, saat:0, gecmis:true};
  const gun = Math.floor(fark / (24*60*60*1000));
  const saat = Math.floor((fark % (24*60*60*1000)) / (60*60*1000));
  return {gun, saat, gecmis:false};
};
const sureRenk = (kalan) => {
  const C = MR.C;
  if (!kalan || kalan.gecmis) return C.textMuted;
  if (kalan.gun >= 2) return C.success;
  if (kalan.gun >= 1) return C.warning;
  return C.danger;
};
const sureLabel = (kalan) => {
  if (!kalan || kalan.gecmis) return 'SÜRESİ DOLDU';
  if (kalan.gun > 0) return `${kalan.gun} GÜN ${kalan.saat} SAAT`;
  return `${kalan.saat} SAAT`;
};

/* ═══ UYARI/BAŞARI MESAJI ═══ */
const Msg = ({text, type, onClose}) => {
  const C = MR.C, LIcon = MR.LIcon;
  const renk = type === 'success' ? C.success : C.danger;
  return (
    <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${renk}18`,border:`1px solid ${renk}44`,display:'flex',alignItems:'center',gap:10}}>
      <LIcon name={type==='success'?'CheckCircle':'AlertCircle'} size={16} color={renk}/>
      <span style={{flex:1,fontSize:12,fontWeight:600,color:renk}}>{text}</span>
      {onClose && <span style={{cursor:'pointer',color:renk}} onClick={onClose}><LIcon name="X" size={14}/></span>}
    </div>
  );
};

/* ═══ TL INPUT BİLEŞENİ ═══ */
const TLInput = ({value, onChange, disabled, placeholder}) => {
  const S = MR.S;
  const formatted = fmtTL(value);
  const handleChange = (e) => {
    const raw = parseTL(e.target.value);
    onChange(raw);
  };
  return (
    <div style={{position:'relative'}}>
      <input style={{...S.input, paddingRight:30}} value={formatted} onChange={handleChange} disabled={disabled} placeholder={placeholder||'0'}/>
      <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:12,fontWeight:700,color:MR.C.textMuted,pointerEvents:'none'}}>₺</span>
    </div>
  );
};

/* ═══ YEREL MEDYA YÜKLEME ZONE (KAYIT ÖNCESİ) ═══ */
const LocalMedyaZone = ({files, setFiles}) => {
  const {C, LIcon} = MR;
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (newFiles) => {
    if (!newFiles?.length) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };
  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };
  const onDrop = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        style={{
          border:`2px dashed ${dragging ? C.accent : C.borderLight}`,
          borderRadius:12, padding:'30px 20px', textAlign:'center', cursor:'pointer',
          background: dragging ? `${C.accent}11` : C.bgInput,
          transition:'all .2s', marginBottom:16
        }}>
        <LIcon name="Upload" size={32} color={dragging ? C.accent : C.textMuted} style={{marginBottom:8}}/>
        <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>
          DOSYA YÜKLEMEK İÇİN TIKLAYIN VEYA SÜRÜKLEYİN
        </div>
        <div style={{fontSize:11,color:C.textMuted}}>JPG, PNG, PDF DOSYALARI DESTEKLENİR (MAX 20MB)</div>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,application/pdf"
          onChange={e => {addFiles(e.target.files); e.target.value='';}} style={{display:'none'}}/>
      </div>

      {files.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>
          {files.map((f, i) => {
            const isImg = f.type?.startsWith('image/');
            const url = isImg ? URL.createObjectURL(f) : null;
            return (
              <div key={i} style={{position:'relative',borderRadius:8,overflow:'hidden',border:`1px solid ${C.border}`,background:C.bgCard}}>
                {isImg ? (
                  <img src={url} alt={f.name} style={{width:'100%',height:100,objectFit:'cover'}}/>
                ) : (
                  <div style={{width:'100%',height:100,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:8}}>
                    <LIcon name="FileText" size={28} color={C.danger}/>
                    <div style={{fontSize:9,color:C.textMuted,marginTop:4,textAlign:'center',wordBreak:'break-all',lineHeight:1.2}}>{f.name}</div>
                  </div>
                )}
                <button onClick={() => removeFile(i)} style={{
                  position:'absolute',top:4,right:4,width:22,height:22,borderRadius:'50%',border:'none',
                  background:'rgba(239,68,68,0.9)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12
                }}>✕</button>
                <div style={{padding:'4px 6px',fontSize:9,color:C.textMuted,borderTop:`1px solid ${C.border}`,textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>
                  {f.name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══ SAHA MEDYA ÖNİZLEME MODALI (3:2 ORANDA ORTALI) ═══ */
const SahaMedyaPreview = ({medya, onClose}) => {
  const {C, LIcon} = MR;
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [mimeType, setMimeType] = React.useState('');
  const [hata, setHata] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!medya) return;
    let iptal = false;
    const yukle = async () => {
      try {
        const token = MR.api?.token;
        const r = await fetch(`/api/v1/saha/medya-download.php?id=${medya.id}&mode=inline`, {
          headers: token ? {'Authorization': 'Bearer ' + token} : {},
          cache: 'no-cache'
        });
        if (iptal) return;
        if (!r.ok) {
          let msg = 'HATA: ' + r.status;
          try { const j = await r.json(); msg = j.error || msg; } catch(e){}
          setHata(msg); setLoading(false); return;
        }
        const ct = r.headers.get('content-type') || 'application/octet-stream';
        const ab = await r.arrayBuffer();
        if (iptal) return;
        if (ab.byteLength === 0) { setHata('DOSYA BOŞ'); setLoading(false); return; }
        const blob = new Blob([ab], {type: ct});
        setBlobUrl(URL.createObjectURL(blob));
        setMimeType(ct.toLowerCase());
        setLoading(false);
      } catch(e) {
        if (!iptal) { setHata('BAĞLANTI HATASI: ' + e.message); setLoading(false); }
      }
    };
    yukle();
    return () => { iptal = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [medya?.id]);

  const indir = async () => {
    try {
      const token = MR.api?.token;
      const r = await fetch(`/api/v1/saha/medya-download.php?id=${medya.id}&mode=attachment`, {
        headers: token ? {'Authorization': 'Bearer ' + token} : {}
      });
      if (!r.ok) { alert('İNDİRME HATASI'); return; }
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = medya.dosya_adi || 'dosya';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
  };

  if (!medya) return null;
  const isImg = mimeType.startsWith('image/');

  return (
    <div onClick={onClose} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'min(900px, 85vw)', height:'min(600px, 80vh)',
        background:C.bgCard, borderRadius:14, overflow:'hidden',
        display:'flex', flexDirection:'column', cursor:'default',
        boxShadow:'0 25px 60px rgba(0,0,0,0.6)'
      }}>
        {/* BAŞLIK */}
        <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}08`,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}}>
            <LIcon name="Eye" size={14} color={C.accent}/>
            <span style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{medya.dosya_adi}</span>
            {medya.dosya_boyutu && <span style={{fontSize:9,color:C.textMuted,flexShrink:0}}>({(medya.dosya_boyutu/1024).toFixed(0)}KB)</span>}
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            <button onClick={indir} style={{...S.btn,...S.btnS,padding:'6px 14px',fontSize:10}}>
              <LIcon name="Download" size={11} color="#fff"/> İNDİR
            </button>
            <button onClick={onClose} style={{...S.btn,...S.btnD,padding:'6px 14px',fontSize:10}}>
              <LIcon name="X" size={11} color="#fff"/> KAPAT
            </button>
          </div>
        </div>
        {/* İÇERİK */}
        <div style={{flex:1,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a'}}>
          {loading ? (
            <div style={{color:'#6b7280',fontSize:12,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,border:'3px solid transparent',borderTopColor:C.accent,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
              YÜKLENİYOR...
            </div>
          ) : hata ? (
            <div style={{color:'#ef4444',fontSize:12,display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:20,textAlign:'center'}}>
              <LIcon name="AlertTriangle" size={32} color="#ef4444"/>
              <div style={{fontWeight:700}}>DOSYA YÜKLENEMEDİ</div>
              <div style={{fontSize:10,color:'#6b7280',maxWidth:400}}>{hata}</div>
            </div>
          ) : isImg ? (
            <img src={blobUrl} alt={medya.dosya_adi} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
          ) : (
            <object data={blobUrl} type={mimeType || 'application/pdf'} style={{width:'100%',height:'100%',border:'none'}}>
              <embed src={blobUrl} type={mimeType || 'application/pdf'} style={{width:'100%',height:'100%',border:'none'}}/>
            </object>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══ MEDYA UPLOAD ZONE (KAYIT SONRASI - SERVER) ═══ */
const MedyaUploadZone = ({sahaId, medyalar, setMedyalar}) => {
  const {C, S, LIcon, api} = MR;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hata, setHata] = useState('');
  const [previewMedya, setPreviewMedya] = useState(null);
  const fileRef = useRef(null);

  const yukle = async (files) => {
    if (!files?.length || !sahaId) return;
    setYukleniyor(true); setHata('');
    for (const file of files) {
      const r = await api.sahaDosyaYukle(sahaId, file, '');
      if (!r?.success) { setHata(r?.error || 'YÜKLEME HATASI'); }
    }
    const lr = await api.sahaMedyaList(sahaId);
    if (lr?.success) setMedyalar(lr.data || []);
    setYukleniyor(false);
  };

  const sil = async (id) => {
    if (!confirm('BU DOSYAYI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?')) return;
    const r = await api.sahaDosyaSil(id);
    if (r?.success) {
      const lr = await api.sahaMedyaList(sahaId);
      if (lr?.success) setMedyalar(lr.data || []);
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); yukle(e.dataTransfer.files); };

  // Auth token'lı URL (img src ve a href için)
  const authParam = MR.api?.token ? '&auth=' + MR.api.token : '';

  return (
    <div>
      {hata && <Msg text={hata} type="error"/>}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        style={{
          border:`2px dashed ${dragging ? C.accent : C.borderLight}`,
          borderRadius:12, padding:'30px 20px', textAlign:'center', cursor:'pointer',
          background: dragging ? `${C.accent}11` : C.bgInput,
          transition:'all .2s', marginBottom:16
        }}>
        <LIcon name="Upload" size={32} color={dragging ? C.accent : C.textMuted} style={{marginBottom:8}}/>
        <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>
          {yukleniyor ? 'YÜKLENİYOR...' : 'DOSYA YÜKLEMEK İÇİN TIKLAYIN VEYA SÜRÜKLEYİN'}
        </div>
        <div style={{fontSize:11,color:C.textMuted}}>JPG, PNG, PDF DOSYALARI DESTEKLENİR (MAX 20MB)</div>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,application/pdf"
          onChange={e => {yukle(e.target.files); e.target.value='';}} style={{display:'none'}}/>
      </div>

      {medyalar.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
          {medyalar.map(m => {
            const isImg = (m.mime_type||'').startsWith('image/');
            const thumbUrl = `/api/v1/saha/medya-download.php?id=${m.id}&mode=inline${authParam}`;
            return (
              <div key={m.id} style={{position:'relative',borderRadius:8,overflow:'hidden',border:`1px solid ${C.border}`,background:C.bgCard}}>
                {isImg ? (
                  <img src={thumbUrl} alt={m.dosya_adi}
                    style={{width:'100%',height:100,objectFit:'cover',cursor:'pointer'}}
                    onClick={() => setPreviewMedya(m)}/>
                ) : (
                  <div style={{width:'100%',height:100,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:8,cursor:'pointer'}}
                    onClick={() => setPreviewMedya(m)}>
                    <LIcon name="FileText" size={28} color={C.danger}/>
                    <div style={{fontSize:9,color:C.textMuted,marginTop:4,textAlign:'center',wordBreak:'break-all',lineHeight:1.2}}>{m.dosya_adi}</div>
                  </div>
                )}
                <button onClick={() => sil(m.id)} style={{
                  position:'absolute',top:4,right:4,width:22,height:22,borderRadius:'50%',border:'none',
                  background:'rgba(239,68,68,0.9)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12
                }}>✕</button>
                <div style={{display:'flex',gap:4,padding:'5px 6px',borderTop:`1px solid ${C.border}`}}>
                  <button onClick={() => setPreviewMedya(m)} title="ÖNİZLE"
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:3,padding:'4px 0',borderRadius:5,border:`1px solid ${C.accent}44`,background:`${C.accent}11`,color:C.accent,cursor:'pointer',fontSize:8,fontWeight:700}}>
                    <LIcon name="Eye" size={10}/> ÖNİZLE
                  </button>
                  <button onClick={async () => {
                    try {
                      const token = MR.api?.token;
                      const r = await fetch(`/api/v1/saha/medya-download.php?id=${m.id}&mode=attachment`, {
                        headers: token ? {'Authorization':'Bearer '+token} : {}
                      });
                      if (!r.ok) { alert('İNDİRME HATASI'); return; }
                      const blob = await r.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = m.dosya_adi || 'dosya';
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                    } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                  }} title="İNDİR"
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:3,padding:'4px 0',borderRadius:5,border:`1px solid ${C.success}44`,background:`${C.success}11`,color:C.success,cursor:'pointer',fontSize:8,fontWeight:700}}>
                    <LIcon name="Download" size={10}/> İNDİR
                  </button>
                </div>
                <div style={{padding:'3px 6px',fontSize:8,color:C.textMuted,borderTop:`1px solid ${C.border}22`,textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>
                  {m.dosya_adi}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* ÖNİZLEME MODALI */}
      {previewMedya && <SahaMedyaPreview medya={previewMedya} onClose={() => setPreviewMedya(null)}/>}
    </div>
  );
};

/* ═══ KART BAŞLIĞI (SECTION HEADER) ═══ */
const SectionHeader = ({icon, title, subtitle, color}) => {
  const {C, LIcon} = MR;
  const c = color || C.accent;
  return (
    <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,background: MR.tema === 'koyu' ? `${c}08` : `${c}05`}}>
      <div style={{width:36,height:36,borderRadius:10,background:`${c}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <LIcon name={icon} size={16} color={c}/>
      </div>
      <div>
        <div style={{fontSize:14,fontWeight:700}}>{title}</div>
        {subtitle && <div style={{fontSize:11,color:C.textMuted}}>{subtitle}</div>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ANA SAHA SAYFA BİLEŞENİ
   ═══════════════════════════════════════════════════════════ */
MR.SahaPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'liste';

  const sekmeler = [
    {key:'liste',           label:'ONAY BEKLEYEN',     icon:'Clock'},
    {key:'onaylanan',       label:'ONAYLANAN',         icon:'CheckCircle'},
    {key:'reddedilen',      label:'REDDEDİLEN',        icon:'XCircle'},
    {key:'dosyaya_donusen', label:'DOSYAYA DÖNÜŞEN',   icon:'FolderOpen'},
    {key:'yeni',            label:'YENİ SAHA KAYDI',   icon:'Plus'}
  ];

  return (
    <div className="fade-in">
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`,overflowX:'auto'}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('saha-' + s.key)}
              style={{flex:1,padding:'12px 8px',borderRadius:8,cursor:'pointer',textAlign:'center',minWidth:100,
                background:aktif?`${C.accent}22`:'transparent',border:`1px solid ${aktif?C.accent+'44':'transparent'}`,transition:'all .2s'}}
              onMouseEnter={e=>{if(!aktif)e.currentTarget.style.background=C.bgHover}}
              onMouseLeave={e=>{if(!aktif)e.currentTarget.style.background='transparent'}}>
              <LIcon name={s.icon} size={16} color={aktif?C.accent:C.textMuted} style={{marginBottom:4}}/>
              <div style={{fontSize:10,fontWeight:aktif?700:500,color:aktif?C.accent:C.textSec,marginTop:4,letterSpacing:.5}}>{s.label}</div>
            </div>
          );
        })}
      </div>
      {aktifSekme === 'liste'           && <SahaBekleyen setPage={setPage} user={user}/>}
      {aktifSekme === 'onaylanan'       && <SahaOnaylanan setPage={setPage} user={user}/>}
      {aktifSekme === 'reddedilen'      && <SahaReddedilen setPage={setPage} user={user}/>}
      {aktifSekme === 'dosyaya_donusen' && <SahaDosyayaDonusen setPage={setPage} user={user}/>}
      {aktifSekme === 'yeni'            && <SahaYeniKayit setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   DETAY MODAL
   ═══════════════════════════════════════════════════════════ */
const SahaDetayModal = ({item, onClose, user, onOnayla, onReddet}) => {
  const {C, S, LIcon, Modal, Badge, api} = MR;
  const [medyalar, setMedyalar] = useState([]);
  const [detayPreviewMedya, setDetayPreviewMedya] = useState(null);
  if (!item) return null;
  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    if (item?.id) api.sahaMedyaList(item.id).then(r => { if (r?.success) setMedyalar(r.data || []); });
  }, [item?.id]);

  const Satir = ({label, value}) => (
    <div style={{display:'flex',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
      <div style={{width:160,fontSize:11,fontWeight:600,color:C.textMuted}}>{label}</div>
      <div style={{flex:1,fontSize:12,fontWeight:500,color:C.text}}>{value || '-'}</div>
    </div>
  );

  return (
    <Modal open={true} onClose={onClose} title="SAHA DOSYA DETAYI" width="750px">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <Badge text={DURUM_LABEL[item.durum] || item.durum} color={DURUM_RENK(item.durum)}/>
        <span style={{fontSize:11,color:C.textMuted}}>#{item.id}</span>
      </div>

      {/* MÜŞTERİ */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="User" title="MÜŞTERİ BİLGİLERİ" color={C.cyan}/>
        <div style={{padding:16}}>
          <Satir label="MÜŞTERİ ADI" value={item.musteri_adi}/>
          <Satir label="TELEFON" value={item.musteri_telefon}/>
          <Satir label="TC KİMLİK" value={item.musteri_tc}/>
        </div>
      </div>

      {/* HASAR */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="AlertTriangle" title="HASAR BİLGİLERİ" color={C.warning}/>
        <div style={{padding:16}}>
          <Satir label="HASAR TİPİ" value={item.hasar_tipi}/>
          <Satir label="HASAR TARİHİ" value={fmtTarih(item.hasar_tarihi)}/>
          <Satir label="HASAR TUTARI" value={item.hasar_tutari ? fmtTL(item.hasar_tutari) + ' ₺' : '-'}/>
          <Satir label="HASAR YERİ" value={item.hasar_yeri}/>
          <Satir label="AÇIKLAMA" value={item.hasar_aciklama}/>
          <Satir label="HASAR DURUMU" value={HASAR_DURUMU_LABEL[item.hasar_durumu] || item.hasar_durumu}/>
          <Satir label="GEÇMİŞ HASAR" value={item.gecmis_hasar === 'var' ? 'VAR' : 'YOK'}/>
          <Satir label="DOSYA KAYNAĞI" value={item.dosya_kaynagi}/>
        </div>
      </div>

      {/* ARAÇ */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="Car" title="HASARLI ARAÇ BİLGİLERİ" color={C.accent}/>
        <div style={{padding:16}}>
          <Satir label="PLAKA" value={item.arac_plaka}/>
          <Satir label="MARKA" value={item.arac_marka}/>
          <Satir label="MODEL" value={item.arac_model}/>
          <Satir label="MODEL YILI" value={item.arac_model_yili}/>
          <Satir label="KM" value={item.arac_km}/>
          <Satir label="RENK" value={item.arac_renk}/>
          <Satir label="RUHSAT SAHİBİ" value={item.arac_ruhsat_sahibi}/>
          <Satir label="KUSUR DURUMU" value={item.arac_kusur_durumu}/>
          <Satir label="ŞASİ NO" value={item.arac_sasi_no}/>
        </div>
      </div>

      {/* KARŞI ARAÇ */}
      {(item.karsi_plaka || item.karsi_sigorta) && (
        <div style={{...S.card, marginBottom:12}}>
          <SectionHeader icon="ArrowLeftRight" title="KARŞI ARAÇ BİLGİLERİ" color={C.danger}/>
          <div style={{padding:16}}>
            <Satir label="KARŞI PLAKA" value={item.karsi_plaka}/>
            <Satir label="KARŞI SİGORTA" value={item.karsi_sigorta}/>
          </div>
        </div>
      )}

      {/* MEDYALAR */}
      {medyalar.length > 0 && (() => {
        const authParam = MR.api?.token ? '&auth=' + MR.api.token : '';
        return (
        <div style={{...S.card, marginBottom:12}}>
          <SectionHeader icon="Camera" title={`YÜKLENEN GÖRSELLER / EVRAKLAR (${medyalar.length})`} color={C.gold}/>
          <div style={{padding:16}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
              {medyalar.map(m => {
                const isImg = (m.mime_type||'').startsWith('image/');
                const thumbUrl = `/api/v1/saha/medya-download.php?id=${m.id}&mode=inline${authParam}`;
                return (
                  <div key={m.id} style={{borderRadius:8,overflow:'hidden',border:`1px solid ${C.border}`,background:C.bgCard}}>
                    {isImg ? (
                      <img src={thumbUrl} alt={m.dosya_adi} style={{width:'100%',height:100,objectFit:'cover',cursor:'pointer'}}
                        onClick={() => setDetayPreviewMedya(m)}/>
                    ) : (
                      <div style={{height:100,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:8}}
                        onClick={() => setDetayPreviewMedya(m)}>
                        <LIcon name="FileText" size={28} color={C.danger}/>
                        <div style={{fontSize:9,color:C.textMuted,marginTop:4,textAlign:'center',wordBreak:'break-all',lineHeight:1.2}}>{m.dosya_adi}</div>
                      </div>
                    )}
                    <div style={{display:'flex',gap:4,padding:'6px 8px',borderTop:`1px solid ${C.border}`,background:`${C.bgCard}`}}>
                      <button onClick={() => setDetayPreviewMedya(m)} title="ÖNİZLE"
                        style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'5px 0',borderRadius:6,border:`1px solid ${C.accent}44`,background:`${C.accent}11`,color:C.accent,cursor:'pointer',fontSize:9,fontWeight:700}}>
                        <LIcon name="Eye" size={12}/> ÖNİZLE
                      </button>
                      <button onClick={async () => {
                        try {
                          const token = MR.api?.token;
                          const r = await fetch(`/api/v1/saha/medya-download.php?id=${m.id}&mode=attachment`, {
                            headers: token ? {'Authorization':'Bearer '+token} : {}
                          });
                          if (!r.ok) { alert('İNDİRME HATASI'); return; }
                          const blob = await r.blob();
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(blob);
                          a.download = m.dosya_adi || 'dosya';
                          document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                        } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                      }} title="İNDİR"
                        style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'5px 0',borderRadius:6,border:`1px solid ${C.success}44`,background:`${C.success}11`,color:C.success,cursor:'pointer',fontSize:9,fontWeight:700}}>
                        <LIcon name="Download" size={12}/> İNDİR
                      </button>
                    </div>
                    <div style={{padding:'3px 8px',fontSize:8,color:C.textMuted,borderTop:`1px solid ${C.border}22`,textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>
                      {m.dosya_adi}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* ÖNİZLEME MODALI */}
          {detayPreviewMedya && <SahaMedyaPreview medya={detayPreviewMedya} onClose={() => setDetayPreviewMedya(null)}/>}
        </div>
        );
      })()}

      {/* İŞLEM */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="Info" title="İŞLEM BİLGİLERİ" color={C.accent}/>
        <div style={{padding:16}}>
          <Satir label="PERSONEL" value={item.personel_adi}/>
          <Satir label="KAYIT TARİHİ" value={fmtTarihSaat(item.created_at)}/>
          {item.onaylayan_adi && <Satir label="ONAYLAYAN" value={item.onaylayan_adi}/>}
          {item.onay_tarihi && <Satir label="ONAY TARİHİ" value={fmtTarihSaat(item.onay_tarihi)}/>}
          {item.onay_notu && <Satir label="ONAY NOTU" value={item.onay_notu}/>}
          {item.red_nedeni && <Satir label="RED NEDENİ" value={item.red_nedeni}/>}
          {item.sigorta_sirketi && <Satir label="SİGORTA ŞİRKETİ" value={item.sigorta_sirketi}/>}
          {item.police_no && <Satir label="POLİÇE NO" value={item.police_no}/>}
          {item.dosya_no && <Satir label="DOSYA NO" value={item.dosya_no}/>}
        </div>
      </div>

      {/* ONAY/RED BUTONLARI */}
      {MR.hasYetki(user,'crm','saha-onay') && item.durum === 'beklemede' && (
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
          <button style={{...S.btn,...S.btnS}} onClick={() => onOnayla && onOnayla(item)}>
            <LIcon name="CheckCircle" size={14}/> ONAYLA
          </button>
          {MR.hasYetki(user,'crm','saha-red') && <button style={{...S.btn,...S.btnD}} onClick={() => onReddet && onReddet(item)}>
            <LIcon name="XCircle" size={14}/> REDDET
          </button>}
        </div>
      )}
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1: ONAY BEKLEYEN
   ═══════════════════════════════════════════════════════════ */
const SahaBekleyen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [arama, setArama] = useState('');
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [detayItem, setDetayItem] = useState(null);
  const [onayModal, setOnayModal] = useState(null);
  const [onayNotu, setOnayNotu] = useState('');
  const [onayLoading, setOnayLoading] = useState(false);
  const [redModal, setRedModal] = useState(null);
  const [redNedeni, setRedNedeni] = useState('');
  const [redLoading, setRedLoading] = useState(false);
  const isAdmin = user?.rol === 'admin';

  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {durum:'beklemede', limit:500};
    if (arama.trim()) p.arama = arama.trim();
    const r = await api.sahaList(p);
    if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
    setLoading(false);
  }, [arama]);

  useEffect(() => { yukle(); }, []);

  const onaylaGonder = async () => {
    if (!onayModal) return;
    setOnayLoading(true);
    const r = await api.sahaOnayla({id:onayModal.id, onay_notu:onayNotu});
    setOnayLoading(false);
    if (r?.success) { setOnayModal(null); setOnayNotu(''); setDetayItem(null); setBasari('SAHA DOSYASI ONAYLANDI'); setTimeout(()=>setBasari(''),4000); yukle(); }
    else { setHata(r?.error||'ONAYLAMA HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  const reddetGonder = async () => {
    if (!redModal || !redNedeni.trim()) { setHata('RED NEDENİ GİRİNİZ'); setTimeout(()=>setHata(''),3000); return; }
    setRedLoading(true);
    const r = await api.sahaReddet({id:redModal.id, red_nedeni:redNedeni});
    setRedLoading(false);
    if (r?.success) { setRedModal(null); setRedNedeni(''); setDetayItem(null); setBasari('SAHA DOSYASI REDDEDİLDİ'); setTimeout(()=>setBasari(''),4000); yukle(); }
    else { setHata(r?.error||'RED HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && <Msg text={basari} type="success"/>}
      {hata && <Msg text={hata} type="error"/>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="Clock" label="TOPLAM BEKLEYEN" value={toplam} color={C.warning}/>
      </div>

      <div style={{...S.card, marginBottom:20}}>
        <div style={{padding:16,display:'flex',gap:10}}>
          <input style={{...S.input,flex:1}} placeholder="MÜŞTERİ ADI, TELEFON, PLAKA ARA..." value={arama}
            onChange={e=>setArama(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')yukle()}}/>
          <button style={{...S.btn,...S.btnP}} onClick={yukle}><LIcon name="Search" size={14}/> ARA</button>
        </div>
      </div>

      <div style={S.card}>
        <SectionTitle icon="Clock" title="ONAY BEKLEYEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? <EmptyState icon="Inbox" title="BEKLEYEN KAYIT YOK" desc="ONAY BEKLEYEN SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af'}}>
                  {['PERSONEL','PLAKA','MARKA','MODEL','YILI','KM','KUSUR','KAZA TARİHİ','HASAR TUTARI','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:800,fontSize:'12px',color:'#FFFFFF',borderBottom:`2px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item,i)=>(
                  <tr key={item.id} style={{backgroundColor:MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff'),backgroundImage:'none',borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>{if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    <td style={{padding:'10px 12px',fontWeight:600,whiteSpace:'nowrap',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px'}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:700,color:C.accent,fontSize:'12px'}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{item.arac_marka||'-'}</td>
                    <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{item.arac_model||'-'}</td>
                    <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{item.arac_model_yili||'-'}</td>
                    <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{item.arac_km ? Number(item.arac_km).toLocaleString('tr-TR') : '-'}</td>
                    <td style={{padding:'10px 12px',fontSize:'12px',fontWeight:600,color:MR.tema==='koyu'?'#e2e8f0':'#1e293b'}}>{item.arac_kusur_durumu||'-'}</td>
                    <td style={{padding:'10px 12px',whiteSpace:'nowrap',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{fmtTarih(item.hasar_tarihi)}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.warning,whiteSpace:'nowrap',fontSize:'12px'}}>{item.hasar_tutari ? fmtTL(item.hasar_tutari) + ' ₺' : '-'}</td>
                    <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6}}>
                        {MR.hasYetki(user,'crm','saha-onay') ? (<>
                          <button style={{...S.btn,...S.btnS,padding:'6px 12px',fontSize:10}} onClick={()=>{setOnayModal(item);setOnayNotu('');}}>
                            <LIcon name="Check" size={12}/> ONAYLA
                          </button>
                          {MR.hasYetki(user,'crm','saha-red') && <button style={{...S.btn,...S.btnD,padding:'6px 12px',fontSize:10}} onClick={()=>{setRedModal(item);setRedNedeni('');}}>
                            <LIcon name="X" size={12}/> REDDET
                          </button>}
                        </>) : (
                          <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}} onClick={()=>setDetayItem(item)}>
                            <LIcon name="Eye" size={12}/> DETAY
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}
        onOnayla={i=>{setOnayModal(i);setOnayNotu('');}} onReddet={i=>{setRedModal(i);setRedNedeni('');}}/>}

      <Modal open={!!onayModal} onClose={()=>setOnayModal(null)} title="SAHA DOSYASINI ONAYLA" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:8}}><strong>{onayModal?.musteri_adi}</strong> MÜŞTERİSİNE AİT SAHA DOSYASINI ONAYLAMAK İSTEDİĞİNİZE EMİN MİSİNİZ?</div>
          <FormGroup label="ONAY NOTU (OPSİYONEL)">
            <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={onayNotu} onChange={e=>setOnayNotu(e.target.value)} placeholder="ONAY NOTU..."/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={()=>setOnayModal(null)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={onaylaGonder} disabled={onayLoading}>
            <LIcon name="CheckCircle" size={14}/> {onayLoading?'ONAYLANIYOR...':'ONAYLA'}
          </button>
        </div>
      </Modal>

      <Modal open={!!redModal} onClose={()=>setRedModal(null)} title="SAHA DOSYASINI REDDET" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:8}}><strong>{redModal?.musteri_adi}</strong> MÜŞTERİSİNE AİT SAHA DOSYASINI REDDETMEK İSTEDİĞİNİZE EMİN MİSİNİZ?</div>
          <FormGroup label="RED NEDENİ *">
            <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={redNedeni} onChange={e=>setRedNedeni(e.target.value)} placeholder="RED NEDENİNİ GİRİNİZ..."/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={()=>setRedModal(null)}>İPTAL</button>
          <button style={{...S.btn,...S.btnD}} onClick={reddetGonder} disabled={redLoading}>
            <LIcon name="XCircle" size={14}/> {redLoading?'REDDEDİLİYOR...':'REDDET'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2: ONAYLANAN (3 GÜN COUNTDOWN + DÜZELTME + SİLME)
   ═══════════════════════════════════════════════════════════ */
const SahaOnaylanan = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [detayItem, setDetayItem] = useState(null);
  /* DOSYAYA DÖNÜŞTÜR */
  const [donusturItem, setDonusturItem] = useState(null);
  const [donusturForm, setDonusturForm] = useState({sigorta_sirketi:'', police_no:''});
  const [donusturLoading, setDonusturLoading] = useState(false);
  /* DÜZENLEME */
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMedyalar, setEditMedyalar] = useState([]);
  /* SİLME */
  const [silLoading, setSilLoading] = useState(null);
  /* MARKA/MODEL */
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);
  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    api.aracMarkaList().then(r => { if (r?.success) setMarkalar(r.data?.markalar || Object.keys(r.data || {})); });
  }, []);

  useEffect(() => {
    if (editForm.arac_marka) {
      api.aracModelList(editForm.arac_marka).then(r => { if (r?.success) setModeller(r.data?.modeller || []); });
    } else { setModeller([]); }
  }, [editForm.arac_marka]);

  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.sahaList({durum:'onaylandi,suresi_doldu', limit:500});
    if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  const dosyayaDonustur = async () => {
    if (!donusturItem) return;
    if (!donusturForm.sigorta_sirketi.trim()) { setHata('SİGORTA ŞİRKETİ GEREKLİ'); setTimeout(()=>setHata(''),3000); return; }
    if (!donusturForm.police_no.trim()) { setHata('POLİÇE NO GEREKLİ'); setTimeout(()=>setHata(''),3000); return; }
    setDonusturLoading(true);
    const r = await api.sahaDosyayaDonustur({id:donusturItem.id, sigorta_sirketi:donusturForm.sigorta_sirketi, police_no:donusturForm.police_no});
    setDonusturLoading(false);
    if (r?.success) {
      setDonusturItem(null);
      setBasari('DOSYAYA DÖNÜŞTÜRÜLDÜ: ' + (r.data?.dosya_no||'')); setTimeout(()=>setBasari(''),4000);
      yukle();
    } else { setHata(r?.error||'DÖNÜŞTÜRME HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  /* DÜZENLE MODAL AÇ */
  const duzenleAc = async (item) => {
    const r = await api.sahaGet(item.id);
    const d = r?.success ? r.data : item;
    setEditForm({
      id: d.id,
      musteri_adi: d.musteri_adi||'', musteri_telefon: d.musteri_telefon||'', musteri_tc: d.musteri_tc||'',
      hasar_tipi: d.hasar_tipi||'', hasar_tarihi: d.hasar_tarihi||'', hasar_yeri: d.hasar_yeri||'',
      hasar_aciklama: d.hasar_aciklama||'', hasar_tutari: d.hasar_tutari ? String(Math.round(Number(d.hasar_tutari))) : '',
      hasar_durumu: d.hasar_durumu||'dosya_acik', gecmis_hasar: d.gecmis_hasar||'yok', dosya_kaynagi: d.dosya_kaynagi||'',
      arac_plaka: d.arac_plaka||'', arac_marka: d.arac_marka||'', arac_model: d.arac_model||'',
      arac_model_yili: d.arac_model_yili||'', arac_km: d.arac_km||'',
      arac_ruhsat_sahibi: d.arac_ruhsat_sahibi||'', arac_kusur_durumu: d.arac_kusur_durumu||'',
      arac_renk: d.arac_renk||'', arac_sasi_no: d.arac_sasi_no||'',
      karsi_plaka: d.karsi_plaka||'', karsi_sigorta: d.karsi_sigorta||''
    });
    const mr = await api.sahaMedyaList(d.id);
    if (mr?.success) setEditMedyalar(mr.data||[]);
    setEditItem(d);
  };

  /* DÜZENLEME KAYDET */
  const editKaydet = async () => {
    if (!editForm.musteri_adi?.trim()) { setHata('MÜŞTERİ ADI ZORUNLU'); setTimeout(()=>setHata(''),3000); return; }
    setEditLoading(true);
    const r = await api.sahaUpdate(editForm);
    if (!r?.success) { setHata(r?.error||'GÜNCELLEME HATASI'); setEditLoading(false); setTimeout(()=>setHata(''),4000); return; }
    setBasari('SAHA DOSYASI GÜNCELLENDİ');
    setEditLoading(false);
    setEditItem(null);
    setTimeout(()=>setBasari(''),4000);
    yukle();
  };

  /* SİL */
  const sil = async (item) => {
    if (!confirm(`${item.musteri_adi} - SAHA DOSYASINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?`)) return;
    setSilLoading(item.id);
    const r = await api.sahaSil(item.id);
    setSilLoading(null);
    if (r?.success) { setBasari('SAHA DOSYASI SİLİNDİ'); setTimeout(()=>setBasari(''),4000); yukle(); }
    else { setHata(r?.error||'SİLME HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));
  const grid2 = {display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16};

  if (loading) return <Loading/>;

  const aktifler = data.filter(d => d.durum === 'onaylandi');
  const suresiDolanlar = data.filter(d => d.durum === 'suresi_doldu');

  return (
    <div>
      {basari && <Msg text={basari} type="success"/>}
      {hata && <Msg text={hata} type="error"/>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="CheckCircle" label="AKTİF ONAYLANAN" value={aktifler.length} color={C.success}/>
        {suresiDolanlar.length > 0 && <StatCard icon="Clock" label="SÜRESİ DOLAN" value={suresiDolanlar.length} color={C.textMuted}/>}
      </div>

      {/* AKTİF ONAYLANANLAR */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionTitle icon="CheckCircle" title="ONAYLANAN SAHA DOSYALARI" sub={`${aktifler.length} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {aktifler.length === 0 ? <EmptyState icon="CheckCircle" title="ONAYLANAN KAYIT YOK" desc="HENÜZ ONAYLANMIŞ SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af'}}>
                  {['PERSONEL','MÜŞTERİ','TELEFON','PLAKA','ONAY TARİHİ','KALAN SÜRE','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:800,fontSize:'12px',color:'#FFFFFF',borderBottom:`2px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aktifler.map((item,i)=>{
                  const kalan = kalanSure(item.onay_tarihi);
                  const kRenk = sureRenk(kalan);
                  return (
                    <tr key={item.id} style={{backgroundColor:MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff'),backgroundImage:'none',borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8,cursor:'pointer'}}
                      onClick={()=>setDetayItem(item)}
                      onMouseEnter={e=>{if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                      <td style={{padding:'10px 12px',fontWeight:600,color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px'}}>{item.personel_adi||'-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600,color:C.accent,fontSize:'12px'}}>{item.musteri_adi}</td>
                      <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{item.musteri_telefon||'-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600,color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px'}}>{item.arac_plaka||'-'}</td>
                      <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{fmtTarihSaat(item.onay_tarihi)}</td>
                      <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>
                        <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:20,background:`${kRenk}18`,border:`1px solid ${kRenk}44`}}>
                          <LIcon name="Clock" size={12} color={kRenk}/>
                          <span style={{fontSize:10,fontWeight:700,color:kRenk}}>{sureLabel(kalan)}</span>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {isAdmin && (
                            <button style={{...S.btn,background:C.accent,color:'#fff',padding:'6px 12px',fontSize:10}}
                              onClick={()=>{setDonusturItem(item);setDonusturForm({sigorta_sirketi:'',police_no:''});}}>
                              <LIcon name="FolderPlus" size={12}/> DÖNÜŞTÜR
                            </button>
                          )}
                          {isAdmin && (
                            <button style={{...S.btn,...S.btnW,padding:'6px 12px',fontSize:10}} onClick={()=>duzenleAc(item)}>
                              <LIcon name="Pencil" size={12}/> DÜZENLE
                            </button>
                          )}
                          {isAdmin && (
                            <button style={{...S.btn,...S.btnD,padding:'6px 12px',fontSize:10}} onClick={()=>sil(item)} disabled={silLoading===item.id}>
                              <LIcon name="Trash2" size={12}/> {silLoading===item.id ? '...' : 'SİL'}
                            </button>
                          )}
                          {!isAdmin && (
                            <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}} onClick={()=>setDetayItem(item)}>
                              <LIcon name="Eye" size={12}/> DETAY
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SÜRESİ DOLANLAR */}
      {suresiDolanlar.length > 0 && (
        <div style={{...S.card, opacity:0.7}}>
          <SectionTitle icon="Clock" title="SÜRESİ DOLMUŞ DOSYALAR" sub={`${suresiDolanlar.length} KAYIT`}/>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af'}}>
                  {['PERSONEL','MÜŞTERİ','PLAKA','ONAY TARİHİ','DURUM','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:800,fontSize:'12px',color:'#FFFFFF',borderBottom:`2px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suresiDolanlar.map((item,i)=>(
                  <tr key={item.id} style={{backgroundColor:MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff'),backgroundImage:'none',borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>{if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',color:C.textMuted}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px'}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px',color:C.textMuted}}>{fmtTarihSaat(item.onay_tarihi)}</td>
                    <td style={{padding:'10px 12px'}}>
                      <Badge text="SÜRESİ DOLDU" color={C.textMuted}/>
                    </td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      {isAdmin && (
                        <div style={{display:'flex',gap:6}}>
                          <button style={{...S.btn,...S.btnW,padding:'6px 12px',fontSize:10}} onClick={()=>duzenleAc(item)}>
                            <LIcon name="Pencil" size={12}/> DÜZENLE
                          </button>
                          <button style={{...S.btn,...S.btnD,padding:'6px 12px',fontSize:10}} onClick={()=>sil(item)} disabled={silLoading===item.id}>
                            <LIcon name="Trash2" size={12}/> {silLoading===item.id ? '...' : 'SİL'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}/>}

      {/* DOSYAYA DÖNÜŞTÜR MODAL */}
      <Modal open={!!donusturItem} onClose={()=>setDonusturItem(null)} title="DOSYAYA DÖNÜŞTÜR" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:12}}>
            <strong>{donusturItem?.musteri_adi}</strong> SAHA DOSYASINI SİSTEM DOSYASINA DÖNÜŞTÜRMEK İÇİN SİGORTA BİLGİLERİNİ GİRİNİZ.
          </div>
          <FormGroup label="SİGORTA ŞİRKETİ *">
            <input style={S.input} value={donusturForm.sigorta_sirketi} onChange={e=>setDonusturForm(f=>({...f,sigorta_sirketi:e.target.value}))} placeholder="SİGORTA ŞİRKETİ ADI"/>
          </FormGroup>
          <FormGroup label="POLİÇE NO *">
            <input style={S.input} value={donusturForm.police_no} onChange={e=>setDonusturForm(f=>({...f,police_no:e.target.value}))} placeholder="POLİÇE NUMARASI"/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={()=>setDonusturItem(null)}>İPTAL</button>
          <button style={{...S.btn,background:C.accent,color:'#fff'}} onClick={dosyayaDonustur} disabled={donusturLoading}>
            <LIcon name="FolderPlus" size={14}/> {donusturLoading?'DÖNÜŞTÜRÜLÜYOR...':'DOSYAYA DÖNÜŞTÜR'}
          </button>
        </div>
      </Modal>

      {/* DÜZENLEME MODALI */}
      <Modal open={!!editItem} onClose={()=>setEditItem(null)} title="ONAYLANAN SAHA DOSYASINI DÜZENLE" width="800px">
        {editItem && (
          <div>
            {/* ONAY BİLGİSİ */}
            <div style={{padding:'12px 16px',marginBottom:16,borderRadius:8,background:`${C.success}12`,border:`1px solid ${C.success}33`}}>
              <div style={{fontSize:11,fontWeight:600,color:C.success,marginBottom:4}}>ONAYLAYAN: {editItem.onaylayan_adi||'-'}</div>
              <div style={{fontSize:11,color:C.text}}>ONAY TARİHİ: {fmtTarihSaat(editItem.onay_tarihi)} {editItem.onay_notu ? ` — NOT: ${editItem.onay_notu}` : ''}</div>
            </div>

            {/* MÜŞTERİ */}
            <div style={{...S.card, marginBottom:12}}>
              <SectionHeader icon="User" title="MÜŞTERİ BİLGİLERİ" color={C.cyan}/>
              <div style={{padding:16}}>
                <div style={grid2}>
                  <FormGroup label="MÜŞTERİ ADI *"><input style={S.input} value={editForm.musteri_adi} onChange={e=>setE('musteri_adi',e.target.value)}/></FormGroup>
                  <FormGroup label="TELEFON"><input style={S.input} value={editForm.musteri_telefon} onChange={e=>setE('musteri_telefon',e.target.value)}/></FormGroup>
                </div>
                <div style={{marginTop:12}}>
                  <FormGroup label="TC KİMLİK"><input style={{...S.input,maxWidth:300}} value={editForm.musteri_tc} onChange={e=>setE('musteri_tc',e.target.value)} maxLength={11}/></FormGroup>
                </div>
              </div>
            </div>

            {/* HASAR */}
            <div style={{...S.card, marginBottom:12}}>
              <SectionHeader icon="AlertTriangle" title="HASAR BİLGİLERİ" color={C.warning}/>
              <div style={{padding:16}}>
                <div style={grid2}>
                  <FormGroup label="HASAR TİPİ">
                    <select style={S.select} value={editForm.hasar_tipi} onChange={e=>setE('hasar_tipi',e.target.value)}>
                      <option value="">SEÇİNİZ</option>
                      {HASAR_TIPLERI.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="HASAR TARİHİ"><MR.DateInput value={editForm.hasar_tarihi} onChange={v=>setE('hasar_tarihi',v)}/></FormGroup>
                </div>
                <div style={{...grid2, marginTop:12}}>
                  <FormGroup label="HASAR TUTARI (₺)">
                    <TLInput value={editForm.hasar_tutari} onChange={v=>setE('hasar_tutari',v)}/>
                  </FormGroup>
                  <FormGroup label="DOSYA KAYNAĞI">
                    <select style={S.select} value={editForm.dosya_kaynagi} onChange={e=>setE('dosya_kaynagi',e.target.value)}>
                      <option value="">SEÇİNİZ</option>
                      {DOSYA_KAYNAKLARI.map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </FormGroup>
                </div>
                <div style={{marginTop:12}}>
                  <FormGroup label="HASAR YERİ"><input style={S.input} value={editForm.hasar_yeri} onChange={e=>setE('hasar_yeri',e.target.value)}/></FormGroup>
                </div>
                <div style={{marginTop:12}}>
                  <FormGroup label="AÇIKLAMA"><textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={editForm.hasar_aciklama} onChange={e=>setE('hasar_aciklama',e.target.value)}/></FormGroup>
                </div>
              </div>
            </div>

            {/* ARAÇ (MARKA/MODEL API SEÇİM) */}
            <div style={{...S.card, marginBottom:12}}>
              <SectionHeader icon="Car" title="ARAÇ BİLGİLERİ" color={C.accent}/>
              <div style={{padding:16}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                  <FormGroup label="PLAKA"><input style={S.input} value={editForm.arac_plaka} onChange={e=>setE('arac_plaka',e.target.value)}/></FormGroup>
                  <FormGroup label="MARKA">
                    <select style={S.select} value={editForm.arac_marka} onChange={e=>{setE('arac_marka',e.target.value);setE('arac_model','');}}>
                      <option value="">SEÇİNİZ</option>
                      {markalar.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="MODEL">
                    <select style={S.select} value={editForm.arac_model} onChange={e=>setE('arac_model',e.target.value)} disabled={!editForm.arac_marka}>
                      <option value="">SEÇİNİZ</option>
                      {modeller.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </FormGroup>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:12}}>
                  <FormGroup label="MODEL YILI"><input type="number" style={S.input} value={editForm.arac_model_yili} onChange={e=>setE('arac_model_yili',e.target.value)}/></FormGroup>
                  <FormGroup label="KM"><input type="number" style={S.input} value={editForm.arac_km} onChange={e=>setE('arac_km',e.target.value)}/></FormGroup>
                  <FormGroup label="RENK"><input style={S.input} value={editForm.arac_renk} onChange={e=>setE('arac_renk',e.target.value)}/></FormGroup>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:12}}>
                  <FormGroup label="RUHSAT SAHİBİ"><input style={S.input} value={editForm.arac_ruhsat_sahibi} onChange={e=>setE('arac_ruhsat_sahibi',e.target.value)}/></FormGroup>
                  <FormGroup label="ŞASİ NO"><input style={S.input} value={editForm.arac_sasi_no} onChange={e=>setE('arac_sasi_no',e.target.value)}/></FormGroup>
                  <FormGroup label="KUSUR DURUMU">
                    <select style={S.select} value={editForm.arac_kusur_durumu} onChange={e=>setE('arac_kusur_durumu',e.target.value)}>
                      <option value="">SEÇİNİZ</option>
                      {KUSUR_DURUMLARI.map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </FormGroup>
                </div>
              </div>
            </div>

            {/* KARŞI ARAÇ */}
            <div style={{...S.card, marginBottom:12}}>
              <SectionHeader icon="ArrowLeftRight" title="KARŞI ARAÇ BİLGİLERİ" color={C.danger}/>
              <div style={{padding:16}}>
                <div style={grid2}>
                  <FormGroup label="KARŞI PLAKA"><input style={S.input} value={editForm.karsi_plaka} onChange={e=>setE('karsi_plaka',e.target.value)}/></FormGroup>
                  <FormGroup label="KARŞI SİGORTA"><input style={S.input} value={editForm.karsi_sigorta} onChange={e=>setE('karsi_sigorta',e.target.value)}/></FormGroup>
                </div>
              </div>
            </div>

            {/* MEDYA YÜKLEME */}
            <div style={{...S.card, marginBottom:16}}>
              <SectionHeader icon="Camera" title="GÖRSELLER / EVRAKLAR" color={C.gold}/>
              <div style={{padding:16}}>
                <MedyaUploadZone sahaId={editItem.id} medyalar={editMedyalar} setMedyalar={setEditMedyalar}/>
              </div>
            </div>

            {/* BUTONLAR */}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',flexWrap:'wrap'}}>
              <button style={{...S.btn,...S.btnG}} onClick={()=>setEditItem(null)}>İPTAL</button>
              <button style={{...S.btn,...S.btnS}} onClick={editKaydet} disabled={editLoading}>
                <LIcon name="Save" size={14}/> {editLoading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3: REDDEDİLEN (TL INPUT + MARKA/MODEL SELECT)
   ═══════════════════════════════════════════════════════════ */
const SahaReddedilen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, EmptyState, Loading, Modal, FormGroup, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [detayItem, setDetayItem] = useState(null);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMedyalar, setEditMedyalar] = useState([]);
  const [silLoading, setSilLoading] = useState(null);
  /* MARKA/MODEL */
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);

  useEffect(() => {
    api.aracMarkaList().then(r => { if (r?.success) setMarkalar(r.data?.markalar || Object.keys(r.data || {})); });
  }, []);

  useEffect(() => {
    if (editForm.arac_marka) {
      api.aracModelList(editForm.arac_marka).then(r => { if (r?.success) setModeller(r.data?.modeller || []); });
    } else { setModeller([]); }
  }, [editForm.arac_marka]);

  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.sahaList({durum:'reddedildi', limit:500});
    if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  const duzenleAc = async (item) => {
    const r = await api.sahaGet(item.id);
    const d = r?.success ? r.data : item;
    setEditForm({
      id: d.id,
      musteri_adi: d.musteri_adi||'', musteri_telefon: d.musteri_telefon||'', musteri_tc: d.musteri_tc||'',
      hasar_tipi: d.hasar_tipi||'', hasar_tarihi: d.hasar_tarihi||'', hasar_yeri: d.hasar_yeri||'',
      hasar_aciklama: d.hasar_aciklama||'', hasar_tutari: d.hasar_tutari ? String(Math.round(Number(d.hasar_tutari))) : '',
      hasar_durumu: d.hasar_durumu||'dosya_acik', gecmis_hasar: d.gecmis_hasar||'yok', dosya_kaynagi: d.dosya_kaynagi||'',
      arac_plaka: d.arac_plaka||'', arac_marka: d.arac_marka||'', arac_model: d.arac_model||'',
      arac_model_yili: d.arac_model_yili||'', arac_km: d.arac_km||'',
      arac_ruhsat_sahibi: d.arac_ruhsat_sahibi||'', arac_kusur_durumu: d.arac_kusur_durumu||'',
      arac_renk: d.arac_renk||'', arac_sasi_no: d.arac_sasi_no||'',
      karsi_plaka: d.karsi_plaka||'', karsi_sigorta: d.karsi_sigorta||''
    });
    const mr = await api.sahaMedyaList(d.id);
    if (mr?.success) setEditMedyalar(mr.data||[]);
    setEditItem(d);
  };

  const editKaydet = async (veTekrarGonder) => {
    if (!editForm.musteri_adi?.trim()) { setHata('MÜŞTERİ ADI ZORUNLU'); setTimeout(()=>setHata(''),3000); return; }
    setEditLoading(true);
    const r = await api.sahaUpdate(editForm);
    if (!r?.success) { setHata(r?.error||'GÜNCELLEME HATASI'); setEditLoading(false); setTimeout(()=>setHata(''),4000); return; }
    if (veTekrarGonder) {
      const r2 = await api.sahaOnayaGonder({id: editForm.id});
      if (!r2?.success) { setHata(r2?.error||'ONAYA GÖNDERME HATASI'); setEditLoading(false); setTimeout(()=>setHata(''),4000); return; }
      setBasari('DOSYA GÜNCELLENDİ VE TEKRAR ONAYA GÖNDERİLDİ');
    } else {
      setBasari('DOSYA GÜNCELLENDİ (TASLAK DURUMUNA ALINDI)');
    }
    setEditLoading(false);
    setEditItem(null);
    setTimeout(()=>setBasari(''),4000);
    yukle();
  };

  const sil = async (item) => {
    if (!confirm(`${item.musteri_adi} - SAHA DOSYASINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?`)) return;
    setSilLoading(item.id);
    const r = await api.sahaSil(item.id);
    setSilLoading(null);
    if (r?.success) { setBasari('SAHA DOSYASI SİLİNDİ'); setTimeout(()=>setBasari(''),4000); yukle(); }
    else { setHata(r?.error||'SİLME HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));
  const grid2 = {display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16};

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && <Msg text={basari} type="success"/>}
      {hata && <Msg text={hata} type="error"/>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="XCircle" label="TOPLAM REDDEDİLEN" value={toplam} color={C.danger}/>
      </div>
      <div style={S.card}>
        <SectionTitle icon="XCircle" title="REDDEDİLEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? <EmptyState icon="XCircle" title="REDDEDİLEN KAYIT YOK" desc="REDDEDİLMİŞ SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af'}}>
                  {['PERSONEL','MÜŞTERİ','PLAKA','RED TARİHİ','RED NEDENİ','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:800,fontSize:'12px',color:'#FFFFFF',borderBottom:`2px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item,i)=>(
                  <tr key={item.id} style={{backgroundColor:MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff'),backgroundImage:'none',borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>{if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.onay_tarihi)}</td>
                    <td style={{padding:'10px 12px',color:C.danger,fontSize:11,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.red_nedeni||'-'}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6}}>
                        <button style={{...S.btn,...S.btnW,padding:'6px 12px',fontSize:10}} onClick={()=>duzenleAc(item)}>
                          <LIcon name="Pencil" size={12}/> DÜZENLE
                        </button>
                        <button style={{...S.btn,...S.btnD,padding:'6px 12px',fontSize:10}} onClick={()=>sil(item)} disabled={silLoading===item.id}>
                          <LIcon name="Trash2" size={12}/> {silLoading===item.id ? 'SİLİNİYOR...' : 'SİL'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}/>}

      {/* DÜZENLEME MODALI */}
      <Modal open={!!editItem} onClose={()=>setEditItem(null)} title="SAHA DOSYASINI DÜZENLE" width="800px">
        {editItem && (
          <div>
            {/* RED NEDENİ */}
            <div style={{padding:'12px 16px',marginBottom:16,borderRadius:8,background:`${C.danger}12`,border:`1px solid ${C.danger}33`}}>
              <div style={{fontSize:11,fontWeight:600,color:C.danger,marginBottom:4}}>RED NEDENİ:</div>
              <div style={{fontSize:12,color:C.text}}>{editItem.red_nedeni||'-'}</div>
            </div>

            {/* MÜŞTERİ */}
            <div style={{...S.card, marginBottom:12}}>
              <SectionHeader icon="User" title="MÜŞTERİ BİLGİLERİ" color={C.cyan}/>
              <div style={{padding:16}}>
                <div style={grid2}>
                  <FormGroup label="MÜŞTERİ ADI *"><input style={S.input} value={editForm.musteri_adi} onChange={e=>setE('musteri_adi',e.target.value)}/></FormGroup>
                  <FormGroup label="TELEFON"><input style={S.input} value={editForm.musteri_telefon} onChange={e=>setE('musteri_telefon',e.target.value)}/></FormGroup>
                </div>
                <div style={{marginTop:12}}>
                  <FormGroup label="TC KİMLİK"><input style={{...S.input,maxWidth:300}} value={editForm.musteri_tc} onChange={e=>setE('musteri_tc',e.target.value)} maxLength={11}/></FormGroup>
                </div>
              </div>
            </div>

            {/* HASAR */}
            <div style={{...S.card, marginBottom:12}}>
              <SectionHeader icon="AlertTriangle" title="HASAR BİLGİLERİ" color={C.warning}/>
              <div style={{padding:16}}>
                <div style={grid2}>
                  <FormGroup label="HASAR TİPİ">
                    <select style={S.select} value={editForm.hasar_tipi} onChange={e=>setE('hasar_tipi',e.target.value)}>
                      <option value="">SEÇİNİZ</option>
                      {HASAR_TIPLERI.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="HASAR TARİHİ"><MR.DateInput value={editForm.hasar_tarihi} onChange={v=>setE('hasar_tarihi',v)}/></FormGroup>
                </div>
                <div style={{...grid2, marginTop:12}}>
                  <FormGroup label="HASAR TUTARI (₺)">
                    <TLInput value={editForm.hasar_tutari} onChange={v=>setE('hasar_tutari',v)}/>
                  </FormGroup>
                  <FormGroup label="DOSYA KAYNAĞI">
                    <select style={S.select} value={editForm.dosya_kaynagi} onChange={e=>setE('dosya_kaynagi',e.target.value)}>
                      <option value="">SEÇİNİZ</option>
                      {DOSYA_KAYNAKLARI.map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </FormGroup>
                </div>
                <div style={{marginTop:12}}>
                  <FormGroup label="HASAR YERİ"><input style={S.input} value={editForm.hasar_yeri} onChange={e=>setE('hasar_yeri',e.target.value)}/></FormGroup>
                </div>
                <div style={{marginTop:12}}>
                  <FormGroup label="AÇIKLAMA"><textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={editForm.hasar_aciklama} onChange={e=>setE('hasar_aciklama',e.target.value)}/></FormGroup>
                </div>
              </div>
            </div>

            {/* ARAÇ (MARKA/MODEL API SEÇİM) */}
            <div style={{...S.card, marginBottom:12}}>
              <SectionHeader icon="Car" title="ARAÇ BİLGİLERİ" color={C.accent}/>
              <div style={{padding:16}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                  <FormGroup label="PLAKA"><input style={S.input} value={editForm.arac_plaka} onChange={e=>setE('arac_plaka',e.target.value)}/></FormGroup>
                  <FormGroup label="MARKA">
                    <select style={S.select} value={editForm.arac_marka} onChange={e=>{setE('arac_marka',e.target.value);setE('arac_model','');}}>
                      <option value="">SEÇİNİZ</option>
                      {markalar.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="MODEL">
                    <select style={S.select} value={editForm.arac_model} onChange={e=>setE('arac_model',e.target.value)} disabled={!editForm.arac_marka}>
                      <option value="">SEÇİNİZ</option>
                      {modeller.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </FormGroup>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:12}}>
                  <FormGroup label="MODEL YILI"><input type="number" style={S.input} value={editForm.arac_model_yili} onChange={e=>setE('arac_model_yili',e.target.value)}/></FormGroup>
                  <FormGroup label="KM"><input type="number" style={S.input} value={editForm.arac_km} onChange={e=>setE('arac_km',e.target.value)}/></FormGroup>
                  <FormGroup label="RENK"><input style={S.input} value={editForm.arac_renk} onChange={e=>setE('arac_renk',e.target.value)}/></FormGroup>
                </div>
                <div style={{...grid2, marginTop:12}}>
                  <FormGroup label="RUHSAT SAHİBİ"><input style={S.input} value={editForm.arac_ruhsat_sahibi} onChange={e=>setE('arac_ruhsat_sahibi',e.target.value)}/></FormGroup>
                  <FormGroup label="KUSUR DURUMU">
                    <select style={S.select} value={editForm.arac_kusur_durumu} onChange={e=>setE('arac_kusur_durumu',e.target.value)}>
                      <option value="">SEÇİNİZ</option>
                      {KUSUR_DURUMLARI.map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </FormGroup>
                </div>
              </div>
            </div>

            {/* MEDYA YÜKLEME */}
            <div style={{...S.card, marginBottom:16}}>
              <SectionHeader icon="Camera" title="GÖRSELLER / EVRAKLAR" color={C.gold}/>
              <div style={{padding:16}}>
                <MedyaUploadZone sahaId={editItem.id} medyalar={editMedyalar} setMedyalar={setEditMedyalar}/>
              </div>
            </div>

            {/* BUTONLAR */}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',flexWrap:'wrap'}}>
              <button style={{...S.btn,...S.btnG}} onClick={()=>setEditItem(null)}>İPTAL</button>
              <button style={{...S.btn,...S.btnW}} onClick={()=>editKaydet(false)} disabled={editLoading}>
                <LIcon name="Save" size={14}/> {editLoading ? 'KAYDEDİLİYOR...' : 'KAYDET (TASLAK)'}
              </button>
              <button style={{...S.btn,...S.btnS}} onClick={()=>editKaydet(true)} disabled={editLoading}>
                <LIcon name="Send" size={14}/> {editLoading ? 'GÖNDERİLİYOR...' : 'KAYDET VE ONAYA GÖNDER'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 4: DOSYAYA DÖNÜŞEN
   ═══════════════════════════════════════════════════════════ */
const SahaDosyayaDonusen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [detayItem, setDetayItem] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await api.sahaList({durum:'dosyaya_donustu', limit:500});
      if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading/>;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="FolderOpen" label="TOPLAM DÖNÜŞEN" value={toplam} color={C.purple}/>
      </div>
      <div style={S.card}>
        <SectionTitle icon="FolderOpen" title="DOSYAYA DÖNÜŞEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? <EmptyState icon="FolderOpen" title="DÖNÜŞEN KAYIT YOK" desc="DOSYAYA DÖNÜŞMÜŞ SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af'}}>
                  {['PERSONEL','MÜŞTERİ','PLAKA','DOSYA NO','DÖNÜŞME TARİHİ','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:800,fontSize:'12px',color:'#FFFFFF',borderBottom:`2px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item,i)=>(
                  <tr key={item.id} style={{backgroundColor:MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff'),backgroundImage:'none',borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>{if(MR.tema==='koyu'){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.backgroundColor=MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff');e.currentTarget.style.borderLeft=MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px'}}><Badge text={item.dosya_no||'-'} color={C.purple}/></td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.dosyaya_donusme_tarihi)}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6}}>
                        {item.dosya_id && (
                          <button style={{...S.btn,...S.btnS,padding:'6px 12px',fontSize:10}} onClick={()=>setPage('dosya-detay-'+item.dosya_id)}>
                            <LIcon name="ExternalLink" size={12}/> DOSYAYA GİT
                          </button>
                        )}
                        <button style={{...S.btn,...S.btnG,padding:'6px 12px',fontSize:10}} onClick={()=>setDetayItem(item)}>
                          <LIcon name="Eye" size={12}/> DETAY
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5: YENİ SAHA KAYDI V3
   TL Input, Araç Katalog, Evrak Önce Yükle, Direkt Onaya Gönder
   ═══════════════════════════════════════════════════════════ */
const SahaYeniKayit = ({setPage, user}) => {
  const {C, S, LIcon, FormGroup, api} = MR;
  const [loading, setLoading] = useState(false);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  /* YEREL DOSYALAR (KAYIT ÖNCESİ) */
  const [localFiles, setLocalFiles] = useState([]);
  /* ARAÇ KATALOG */
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Marka listesi yükle
  useEffect(() => {
    api.aracMarkaList().then(r => { if (r?.success) setMarkalar(r.data?.markalar || Object.keys(r.data || {})); });
  }, []);

  const [form, setForm] = useState({
    musteri_adi:'', musteri_telefon:'', musteri_tc:'',
    hasar_tipi:'', hasar_tarihi:'', hasar_yeri:'', hasar_aciklama:'', hasar_tutari:'',
    hasar_durumu:'dosya_acik', gecmis_hasar:'yok', dosya_kaynagi:'',
    arac_plaka:'', arac_marka:'', arac_model:'', arac_model_yili:'', arac_km:'',
    arac_ruhsat_sahibi:'', arac_kusur_durumu:'', arac_renk:'', arac_sasi_no:'',
    karsi_plaka:'', karsi_sigorta:''
  });

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Marka değişince model listesini güncelle
  useEffect(() => {
    if (form.arac_marka) {
      api.aracModelList(form.arac_marka).then(r => { if (r?.success) setModeller(r.data?.modeller || []); });
    } else { setModeller([]); }
  }, [form.arac_marka]);

  /* KAYDET VEYA DİREKT ONAYA GÖNDER */
  const kaydet = async (onayaGonder = false) => {
    if (!form.musteri_adi.trim()) { setHata('MÜŞTERİ ADI ZORUNLUDUR'); setTimeout(()=>setHata(''),3000); return; }
    setLoading(true); setHata('');

    // 1. Kayıt oluştur (taslak)
    const r = await api.sahaCreate(form);
    if (!r?.success) {
      setHata(r?.error||'KAYIT HATASI'); setLoading(false); setTimeout(()=>setHata(''),4000);
      return;
    }
    const sahaId = r.data?.id;

    // 2. Yerel dosyaları yükle
    if (localFiles.length > 0 && sahaId) {
      for (const file of localFiles) {
        await api.sahaDosyaYukle(sahaId, file, '');
      }
    }

    // 3. Onaya gönder (opsiyonel)
    if (onayaGonder && sahaId) {
      const r2 = await api.sahaOnayaGonder({id: sahaId});
      if (r2?.success) {
        setBasari('SAHA DOSYASI KAYDEDİLDİ VE ONAYA GÖNDERİLDİ!');
        setLoading(false);
        setTimeout(() => { setBasari(''); setPage('saha-liste'); }, 2000);
        return;
      } else {
        setHata('KAYIT OLUŞTU FAKAT ONAYA GÖNDERME HATASI: ' + (r2?.error||''));
        setLoading(false);
        setTimeout(()=>setHata(''),6000);
        return;
      }
    }

    setBasari('SAHA DOSYASI TASLAK OLARAK KAYDEDİLDİ');
    setLoading(false);
    setTimeout(() => { setBasari(''); setPage('saha-liste'); }, 2000);
  };

  const grid2 = {display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)',gap:16};
  const grid3 = {display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',gap:16};

  return (
    <div className="fade-in" style={{maxWidth: isMobile ? '100%' : '66.66%', margin:'0 auto'}}>

      {basari && <Msg text={basari} type="success"/>}
      {hata && <Msg text={hata} type="error"/>}

      {/* 1. MÜŞTERİ BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="User" title="MÜŞTERİ BİLGİLERİ" subtitle="MÜŞTERİ İLETİŞİM BİLGİLERİ" color={C.cyan}/>
        <div style={{...S.cardBody}}>
          <div style={grid2}>
            <FormGroup label="MÜŞTERİ ADI *">
              <input style={S.input} value={form.musteri_adi} onChange={e=>set('musteri_adi',e.target.value)} placeholder="MÜŞTERİ AD SOYAD" disabled={loading}/>
            </FormGroup>
            <FormGroup label="TELEFON">
              <input style={S.input} value={form.musteri_telefon} onChange={e=>set('musteri_telefon',e.target.value)} placeholder="05XX XXX XX XX" disabled={loading}/>
            </FormGroup>
          </div>
          <div style={{marginTop:16}}>
            <FormGroup label="TC KİMLİK NO">
              <input style={{...S.input,maxWidth:300}} value={form.musteri_tc} onChange={e=>set('musteri_tc',e.target.value)} placeholder="XXXXXXXXXXX" maxLength={11} disabled={loading}/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 2. HASAR BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="AlertTriangle" title="HASAR BİLGİLERİ" subtitle="HASAR DETAYLARI" color={C.warning}/>
        <div style={{...S.cardBody}}>
          <div style={grid2}>
            <FormGroup label="HASAR TİPİ">
              <select style={S.select} value={form.hasar_tipi} onChange={e=>set('hasar_tipi',e.target.value)} disabled={loading}>
                <option value="">SEÇİNİZ</option>
                {HASAR_TIPLERI.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="HASAR TARİHİ">
              <MR.DateInput value={form.hasar_tarihi} onChange={v=>set('hasar_tarihi',v)} disabled={loading}/>
            </FormGroup>
          </div>
          <div style={{...grid2, marginTop:16}}>
            <FormGroup label="HASAR TUTARI (₺)">
              <TLInput value={form.hasar_tutari} onChange={v=>set('hasar_tutari',v)} disabled={loading}/>
            </FormGroup>
            <FormGroup label="HASAR YERİ">
              <input style={S.input} value={form.hasar_yeri} onChange={e=>set('hasar_yeri',e.target.value)} placeholder="KAZA / HASAR YERİ ADRESİ" disabled={loading}/>
            </FormGroup>
          </div>
          <div style={{marginTop:16}}>
            <FormGroup label="HASAR AÇIKLAMASI">
              <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={form.hasar_aciklama} onChange={e=>set('hasar_aciklama',e.target.value)} placeholder="HASAR İLE İLGİLİ DETAYLI AÇIKLAMA..." disabled={loading}/>
            </FormGroup>
          </div>
          <div style={{...grid2, marginTop:16}}>
            <FormGroup label="HASAR DURUMU">
              <select style={S.select} value={form.hasar_durumu} onChange={e=>set('hasar_durumu',e.target.value)} disabled={loading}>
                {HASAR_DURUMLARI.map(d=><option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="GEÇMİŞ HASAR">
              <select style={S.select} value={form.gecmis_hasar} onChange={e=>set('gecmis_hasar',e.target.value)} disabled={loading}>
                <option value="yok">YOK</option>
                <option value="var">VAR</option>
              </select>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 3. DOSYA BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="Folder" title="DOSYA BİLGİLERİ" subtitle="DOSYA KAYNAĞI" color={C.purple}/>
        <div style={{...S.cardBody}}>
          <FormGroup label="DOSYA KAYNAĞI">
            <select style={S.select} value={form.dosya_kaynagi} onChange={e=>set('dosya_kaynagi',e.target.value)} disabled={loading}>
              <option value="">SEÇİNİZ</option>
              {DOSYA_KAYNAKLARI.map(k=><option key={k} value={k}>{k}</option>)}
            </select>
          </FormGroup>
        </div>
      </div>

      {/* 4. HASARLI ARAÇ BİLGİLERİ (MARKA/MODEL API SEÇİM) */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="Car" title="HASARLI ARAÇ BİLGİLERİ" subtitle="MAĞDUR ARACI" color={C.accent}/>
        <div style={{...S.cardBody}}>
          <div style={grid3}>
            <FormGroup label="PLAKA">
              <input style={S.input} value={form.arac_plaka} onChange={e=>set('arac_plaka',e.target.value)} placeholder="34 XX 1234" disabled={loading}/>
            </FormGroup>
            <FormGroup label="MARKA">
              <select style={S.select} value={form.arac_marka} onChange={e=>{set('arac_marka',e.target.value);set('arac_model','');}} disabled={loading}>
                <option value="">SEÇİNİZ</option>
                {markalar.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="MODEL">
              <select style={S.select} value={form.arac_model} onChange={e=>set('arac_model',e.target.value)} disabled={loading || !form.arac_marka}>
                <option value="">{form.arac_marka ? 'SEÇİNİZ' : 'ÖNCE MARKA SEÇİNİZ'}</option>
                {modeller.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </FormGroup>
          </div>
          <div style={{...grid3, marginTop:16}}>
            <FormGroup label="MODEL YILI">
              <input type="number" style={S.input} value={form.arac_model_yili} onChange={e=>set('arac_model_yili',e.target.value)} placeholder="2024" disabled={loading}/>
            </FormGroup>
            <FormGroup label="KM">
              <input type="number" style={S.input} value={form.arac_km} onChange={e=>set('arac_km',e.target.value)} placeholder="45000" disabled={loading}/>
            </FormGroup>
            <FormGroup label="RENK">
              <input style={S.input} value={form.arac_renk} onChange={e=>set('arac_renk',e.target.value)} placeholder="BEYAZ" disabled={loading}/>
            </FormGroup>
          </div>
          <div style={{...grid2, marginTop:16}}>
            <FormGroup label="RUHSAT SAHİBİ">
              <input style={S.input} value={form.arac_ruhsat_sahibi} onChange={e=>set('arac_ruhsat_sahibi',e.target.value)} placeholder="RUHSAT SAHİBİ AD SOYAD" disabled={loading}/>
            </FormGroup>
            <FormGroup label="KUSUR DURUMU">
              <select style={S.select} value={form.arac_kusur_durumu} onChange={e=>set('arac_kusur_durumu',e.target.value)} disabled={loading}>
                <option value="">SEÇİNİZ</option>
                {KUSUR_DURUMLARI.map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </FormGroup>
          </div>
          <div style={{marginTop:16}}>
            <FormGroup label="ŞASİ NO">
              <input style={S.input} value={form.arac_sasi_no} onChange={e=>set('arac_sasi_no',e.target.value)} placeholder="ŞASİ NUMARASI" disabled={loading}/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 5. KARŞI ARAÇ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="ArrowLeftRight" title="KARŞI ARAÇ BİLGİLERİ" color={C.danger}/>
        <div style={{...S.cardBody}}>
          <div style={grid2}>
            <FormGroup label="KARŞI PLAKA">
              <input style={S.input} value={form.karsi_plaka} onChange={e=>set('karsi_plaka',e.target.value)} placeholder="KARŞI TARAF PLAKASI" disabled={loading}/>
            </FormGroup>
            <FormGroup label="KARŞI SİGORTA">
              <input style={S.input} value={form.karsi_sigorta} onChange={e=>set('karsi_sigorta',e.target.value)} placeholder="KARŞI TARAF SİGORTA ŞİRKETİ" disabled={loading}/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 6. GÖRSEL VE EVRAK - KAYIT ÖNCESİ YÜKLEME */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="Camera" title="GÖRSEL VE EVRAK YÜKLE" subtitle="FOTOĞRAF VE PDF DOSYALARI (KAYIT ÖNCESİ)" color={C.gold}/>
        <div style={{...S.cardBody}}>
          <LocalMedyaZone files={localFiles} setFiles={setLocalFiles}/>
          {localFiles.length > 0 && (
            <div style={{marginTop:8,fontSize:11,color:C.success,fontWeight:600}}>
              <LIcon name="CheckCircle" size={12} color={C.success}/> {localFiles.length} DOSYA KAYIT İLE BİRLİKTE YÜKLENECEKTİR
            </div>
          )}
        </div>
      </div>

      {/* BUTONLAR */}
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,flexWrap:'wrap',marginBottom:40}}>
        <button style={{...S.btn,...S.btnG}} onClick={()=>setPage('saha-liste')} disabled={loading}>
          <LIcon name="ArrowLeft" size={14}/> GERİ DÖN
        </button>
        <button style={{...S.btn,...S.btnW,padding:'12px 24px',fontSize:13}} onClick={()=>kaydet(false)} disabled={loading}>
          <LIcon name="Save" size={16}/> {loading ? 'KAYDEDİLİYOR...' : 'TASLAK KAYDET'}
        </button>
        <button style={{...S.btn,...S.btnS,padding:'12px 24px',fontSize:13}} onClick={()=>kaydet(true)} disabled={loading}>
          <LIcon name="Send" size={16}/> {loading ? 'GÖNDERİLİYOR...' : 'KAYDET VE ONAYA GÖNDER'}
        </button>
      </div>
    </div>
  );
};
