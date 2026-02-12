const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef} = React;

MR.StatCard = ({icon, label, value, color = MR.C.accent}) => (
  <div style={{...MR.S.stat, display:'flex', alignItems:'center', gap:12, padding:'10px 16px'}}>
    <div style={{width:34,height:34,minWidth:34,borderRadius:8,background:`${color}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <MR.LIcon name={icon} size={16} color={color}/>
    </div>
    <div style={{fontSize:20,fontWeight:800,lineHeight:1}}>{value}</div>
    <div style={{fontSize:11,color:MR.C.textMuted,fontWeight:600}}>{label}</div>
  </div>
);

MR.Badge = ({text, color}) => <span style={MR.S.badge(color)}>{text}</span>;

MR.SectionTitle = ({icon, title, sub, right}) => (
  <div style={{...MR.S.cardHead, justifyContent:'space-between'}}>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{width:36,height:36,borderRadius:10,background:`${MR.C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <MR.LIcon name={icon} size={16} color={MR.C.accent}/>
      </div>
      <div>
        <div style={{fontSize:14,fontWeight:700}}>{title}</div>
        {sub && <div style={{fontSize:11,color:MR.C.textMuted}}>{sub}</div>}
      </div>
    </div>
    {right && <div style={{display:'flex',gap:8}}>{right}</div>}
  </div>
);

MR.EmptyState = ({icon, title, desc}) => (
  <div style={{textAlign:'center',padding:60,color:MR.C.textMuted}}>
    <MR.LIcon name={icon} size={48} color={MR.C.textMuted} style={{opacity:0.3,marginBottom:16}}/>
    <div style={{fontSize:16,fontWeight:600,marginBottom:6,color:MR.C.textSec}}>{title}</div>
    <div style={{fontSize:13}}>{desc}</div>
  </div>
);

MR.Modal = ({open, onClose, title, width='66vw', children}) => {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)'}} onClick={onClose}>
      <div style={{width,maxWidth:1000,maxHeight:'90vh',background:MR.C.bgCard,borderRadius:16,border:`1px solid ${MR.C.border}`,overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${MR.C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:14,fontWeight:700}}>{title}</span>
          <MR.LIcon name="X" size={18} color={MR.C.textMuted} style={{cursor:'pointer'}} onClick={onClose}/>
        </div>
        <div style={{flex:1,overflow:'auto',padding:20}}>{children}</div>
      </div>
    </div>
  );
};

MR.FormGroup = ({label, children, full}) => (
  <div style={{gridColumn: full ? 'span 2' : 'span 1'}}>
    <label style={MR.S.label}>{label}</label>
    {children}
  </div>
);

MR.Loading = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60}}>
    <div style={{width:40,height:40,border:'3px solid '+MR.C.border,borderTop:'3px solid '+MR.C.accent,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
  </div>
);

MR.SkeletonPage = ({title, icon, desc, children}) => (
  <div style={MR.S.card} className="fade-in">
    <MR.SectionTitle icon={icon} title={title} sub={desc}/>
    <div style={MR.S.cardBody}>
      {children || <MR.EmptyState icon={icon} title={title} desc="BU MODÜL GELİŞTİRİLME AŞAMASINDADIR."/>}
    </div>
  </div>
);

MR.Confirm = ({open, message, onConfirm, onCancel}) => {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.7)'}} onClick={onCancel}>
      <div style={{width:400,background:MR.C.bgCard,borderRadius:16,border:`1px solid ${MR.C.border}`,padding:30}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:20,textAlign:'center'}}>{message}</div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button style={{...MR.S.btn,...MR.S.btnG}} onClick={onCancel}>İPTAL</button>
          <button style={{...MR.S.btn,...MR.S.btnD}} onClick={onConfirm}>ONAYLA</button>
        </div>
      </div>
    </div>
  );
};

MR.LoginScreen = ({onLogin}) => {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const go = async (e) => {
    e.preventDefault();
    if (!email || !sifre) { setError('E-POSTA VE ŞİFRE GEREKLİ'); return; }
    setLoading(true); setError('');
    try {
      const r = await MR.api.login(email, sifre);
      if (r && r.success) { MR.api.setToken(r.data.token); onLogin(r.data.user); }
      else setError(r?.error || 'GİRİŞ BAŞARISIZ');
    } catch (e) { setError('BAĞLANTI HATASI'); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:MR.C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:420,padding:40,background:MR.C.bgCard,borderRadius:20,border:`1px solid ${MR.C.border}`,boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:16,background:`${MR.C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24,fontWeight:900,color:MR.C.accent}}>MR</div>
          <div style={{fontSize:20,fontWeight:800,color:MR.C.accent,letterSpacing:2}}>MR HASAR DANIŞMANLIK</div>
          <div style={{fontSize:10,color:MR.C.textMuted,letterSpacing:4,marginTop:4}}>DOSYA TAKİP SİSTEMİ</div>
        </div>
        <form onSubmit={go}>
          {error && <div style={{padding:'10px 14px',background:`${MR.C.danger}22`,border:`1px solid ${MR.C.danger}44`,borderRadius:8,marginBottom:16,fontSize:12,color:MR.C.danger}}>{error}</div>}
          <div style={{marginBottom:16}}>
            <label style={MR.S.label}>E-POSTA</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ADMIN@MRHASAR.COM" style={MR.S.input} autoFocus/>
          </div>
          <div style={{marginBottom:24}}>
            <label style={MR.S.label}>ŞİFRE</label>
            <input type="password" value={sifre} onChange={e=>setSifre(e.target.value)} placeholder="••••••••" style={MR.S.input}/>
          </div>
          <button type="submit" disabled={loading} style={{...MR.S.btn,...MR.S.btnP,width:'100%',justifyContent:'center',padding:'14px',fontSize:14,opacity:loading?0.7:1}}>
            {loading ? 'GİRİŞ YAPILIYOR...' : (<><MR.LIcon name="Lock" size={16} color="#fff"/> GİRİŞ YAP</>)}
          </button>
        </form>
        <div style={{textAlign:'center',marginTop:24,fontSize:13,fontWeight:700,color:MR.C.accent,letterSpacing:4}}>HER ZAMAN FARK EDER</div>
      </div>
    </div>
  );
};

/* ═══ ARAÇ MARKA/MODEL SEÇİCİ ═══ */
MR._aracCache = {markalar: null, modeller: {}};

MR.AracMarkaSelect = ({value, onChange, style}) => {
  const [markalar, setMarkalar] = useState(MR._aracCache.markalar || []);
  const [ara, setAra] = useState('');
  const [acik, setAcik] = useState(false);
  const ref = useRef(null);
  const S = MR.S, C = MR.C;

  useEffect(() => {
    if (MR._aracCache.markalar) { setMarkalar(MR._aracCache.markalar); return; }
    (async () => {
      const r = await MR.api.aracMarkaList();
      if (r?.success && r.data?.markalar) {
        MR._aracCache.markalar = r.data.markalar;
        setMarkalar(r.data.markalar);
      }
    })();
  }, []);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setAcik(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = ara ? markalar.filter(m => m.includes(ara.toUpperCase())) : markalar;

  return (
    <div ref={ref} style={{position:'relative',...(style||{})}}>
      <input
        value={acik ? ara : (value || '')}
        onChange={e => { setAra(e.target.value); if (!acik) setAcik(true); }}
        onFocus={() => { setAcik(true); setAra(''); }}
        placeholder={value || 'MARKA YAZIN...'}
        style={{...S.input, cursor:'pointer'}}
      />
      {acik && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,maxHeight:220,overflowY:'auto',
          background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,zIndex:999,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
          {filtered.length === 0 ? <div style={{padding:8,fontSize:11,color:C.textMuted}}>SONUÇ YOK</div> :
            filtered.slice(0, 50).map(m => (
              <div key={m} onClick={() => { onChange(m); setAcik(false); setAra(''); }}
                style={{padding:'6px 10px',fontSize:11,cursor:'pointer',
                  background: m===value ? `${C.accent}22` : 'transparent',
                  fontWeight: m===value ? 700 : 400,
                  color:C.text,borderBottom:`1px solid ${C.border}22`}}
                onMouseEnter={e=>e.target.style.background=`${C.accent}11`}
                onMouseLeave={e=>e.target.style.background=m===value?`${C.accent}22`:'transparent'}>
                {m}
              </div>
            ))}
          {filtered.length > 50 && <div style={{padding:6,fontSize:10,color:C.textMuted,textAlign:'center'}}>{filtered.length-50} DAHA... (YAZMAYA DEVAM EDİN)</div>}
        </div>
      )}
    </div>
  );
};

MR.AracModelSelect = ({marka, value, onChange, style}) => {
  const [modeller, setModeller] = useState([]);
  const [ara, setAra] = useState('');
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const ref = useRef(null);
  const S = MR.S, C = MR.C;

  useEffect(() => {
    if (!marka) { setModeller([]); return; }
    if (MR._aracCache.modeller[marka]) { setModeller(MR._aracCache.modeller[marka]); return; }
    setYukleniyor(true);
    (async () => {
      const r = await MR.api.aracModelList(marka);
      if (r?.success && r.data?.modeller) {
        MR._aracCache.modeller[marka] = r.data.modeller;
        setModeller(r.data.modeller);
      }
      setYukleniyor(false);
    })();
  }, [marka]);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setAcik(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = ara ? modeller.filter(m => m.includes(ara.toUpperCase())) : modeller;

  return (
    <div ref={ref} style={{position:'relative',...(style||{})}}>
      <input
        value={acik ? ara : (value || '')}
        onChange={e => { setAra(e.target.value); if (!acik) setAcik(true); }}
        onFocus={() => { setAcik(true); setAra(''); }}
        placeholder={yukleniyor ? 'YÜKLENİYOR...' : (value || 'MODEL YAZIN...')}
        disabled={!marka || yukleniyor}
        style={{...S.input, cursor: marka ? 'pointer' : 'not-allowed', opacity: marka ? 1 : 0.5}}
      />
      {acik && marka && !yukleniyor && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,maxHeight:250,overflowY:'auto',
          background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,zIndex:999,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
          {filtered.length === 0 ? <div style={{padding:8,fontSize:11,color:C.textMuted}}>SONUÇ YOK</div> :
            filtered.slice(0, 80).map(m => (
              <div key={m} onClick={() => { onChange(m); setAcik(false); setAra(''); }}
                style={{padding:'5px 10px',fontSize:10,cursor:'pointer',
                  background: m===value ? `${C.accent}22` : 'transparent',
                  fontWeight: m===value ? 700 : 400,
                  color:C.text,borderBottom:`1px solid ${C.border}22`}}
                onMouseEnter={e=>e.target.style.background=`${C.accent}11`}
                onMouseLeave={e=>e.target.style.background=m===value?`${C.accent}22`:'transparent'}>
                {m}
              </div>
            ))}
          {filtered.length > 80 && <div style={{padding:6,fontSize:10,color:C.textMuted,textAlign:'center'}}>{filtered.length-80} DAHA... (YAZMAYA DEVAM EDİN)</div>}
        </div>
      )}
    </div>
  );
};
