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
  const isK = MR.tema === 'koyu';
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',background: isK ? 'rgba(0,0,0,.65)' : 'rgba(0,0,0,.20)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)'}} onClick={onClose}>
      <div style={{width,maxWidth:1000,maxHeight:'90vh',background: isK ? MR.C.bgCard : '#fff',borderRadius:16,border:`1px solid ${MR.C.border}`,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow: isK ? '14px 14px 40px rgba(0,0,0,.60), -10px -10px 24px rgba(255,255,255,.03)' : '8px 8px 30px rgba(0,0,0,.12)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${MR.C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background: isK ? `${MR.C.accent}0a` : `${MR.C.accent}06`}}>
          <span style={{fontSize:15,fontWeight:800}}>{title}</span>
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
  const isK = MR.tema === 'koyu';
  return (
    <div style={{position:'fixed',inset:0,zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center',background: isK ? 'rgba(0,0,0,.65)' : 'rgba(0,0,0,.20)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)'}} onClick={onCancel}>
      <div style={{width:420,background: isK ? MR.C.bgCard : '#fff',borderRadius:16,border:`1px solid ${MR.C.border}`,padding:32,boxShadow: isK ? '14px 14px 40px rgba(0,0,0,.60), -10px -10px 24px rgba(255,255,255,.03)' : '8px 8px 30px rgba(0,0,0,.12)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:22,textAlign:'center'}}>{message}</div>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
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

  const isK = MR.tema === 'koyu';
  return (
    <div style={{minHeight:'100vh',background: MR.C.bgGradient || MR.C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{
        width:440,padding:44,
        background: isK ? MR.C.bgCard : 'rgba(237,241,247,0.85)',
        borderRadius:26,
        border: `1px solid ${MR.C.border}`,
        boxShadow: isK
          ? '20px 20px 48px rgba(0,0,0,.60), -14px -14px 36px rgba(255,255,255,.04), inset 0 1px 0 rgba(255,255,255,.06)'
          : '10px 10px 36px rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.5)',
        backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'
      }}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{
            width:72,height:72,borderRadius:20,
            background: `linear-gradient(145deg, ${MR.C.accent}33, ${MR.C.accent}11)`,
            display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',
            fontSize:26,fontWeight:900,color:MR.C.accent,
            boxShadow: isK
              ? '10px 10px 24px rgba(0,0,0,.50), -8px -8px 20px rgba(245,158,11,.08), 0 0 30px rgba(245,158,11,.20)'
              : '8px 8px 20px rgba(0,0,0,.08), 0 0 20px rgba(217,119,6,.06)',
            border: `1px solid ${MR.C.accent}30`
          }}>MR</div>
          <div style={{fontSize:20,fontWeight:900,color:MR.C.accent,letterSpacing:2,textShadow: isK ? `0 0 30px ${MR.C.accent}60` : 'none'}}>MR HASAR DANIŞMANLIK</div>
          <div style={{fontSize:11,fontWeight:700,color:MR.C.textMuted,letterSpacing:4,marginTop:6}}>DOSYA TAKİP SİSTEMİ</div>
        </div>
        <form onSubmit={go}>
          {error && <div style={{padding:'12px 16px',background:`${MR.C.danger}18`,border:`1px solid ${MR.C.danger}33`,borderRadius:14,marginBottom:18,fontSize:12,color:MR.C.danger,boxShadow: isK ? 'inset 3px 3px 6px rgba(0,0,0,.30)' : 'inset 3px 3px 6px rgba(0,0,0,.04)'}}>{error}</div>}
          <div style={{marginBottom:18}}>
            <label style={MR.S.label}>E-POSTA</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ADMIN@MRHASAR.COM" style={MR.S.input} autoFocus/>
          </div>
          <div style={{marginBottom:28}}>
            <label style={MR.S.label}>ŞİFRE</label>
            <input type="password" value={sifre} onChange={e=>setSifre(e.target.value)} placeholder="••••••••" style={MR.S.input}/>
          </div>
          <button type="submit" disabled={loading} style={{
            ...MR.S.btn,...MR.S.btnP,
            width:'100%',justifyContent:'center',padding:'15px',fontSize:14,
            borderRadius:16,
            opacity:loading?0.7:1
          }}>
            {loading ? 'GİRİŞ YAPILIYOR...' : (<><MR.LIcon name="Lock" size={16} color="#fff"/> GİRİŞ YAP</>)}
          </button>
        </form>
        <div style={{textAlign:'center',marginTop:28,fontSize:13,fontWeight:700,color:MR.C.accent,letterSpacing:4}}>HER ZAMAN FARK EDER</div>
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
  const [pos, setPos] = useState({top:0,left:0,width:0});
  const ref = useRef(null);
  const inputRef = useRef(null);
  const dropRef = useRef(null);
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
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target) && dropRef.current && !dropRef.current.contains(e.target)) setAcik(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const updatePos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({top: r.bottom + 2, left: r.left, width: r.width});
    }
  };

  const filtered = ara ? markalar.filter(m => m.includes(ara.toUpperCase())) : markalar;

  return (
    <div ref={ref} style={{position:'relative',...(style||{})}}>
      <input ref={inputRef}
        value={acik ? ara : (value || '')}
        onChange={e => { setAra(e.target.value); if (!acik) { updatePos(); setAcik(true); } }}
        onFocus={() => { updatePos(); setAcik(true); setAra(''); }}
        placeholder={value || 'MARKA YAZIN...'}
        style={{...S.input, cursor:'pointer'}}
      />
      {acik && ReactDOM.createPortal(
        <div ref={dropRef} style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,maxHeight:220,overflowY:'auto',
          background:C.bgCard,border:`1px solid ${C.borderLight||C.border}`,borderRadius:8,zIndex:99999,
          boxShadow:'0 8px 30px rgba(0,0,0,0.35)'}}>
          {filtered.length === 0 ? <div style={{padding:10,fontSize:11,color:C.textMuted}}>SONUÇ YOK</div> :
            filtered.slice(0, 50).map(m => (
              <div key={m} onClick={() => { onChange(m); setAcik(false); setAra(''); }}
                style={{padding:'8px 12px',fontSize:12,cursor:'pointer',
                  background: m===value ? `${C.accent}22` : 'transparent',
                  fontWeight: m===value ? 700 : 400,
                  color:C.text,borderBottom:`1px solid ${C.border}33`}}
                onMouseEnter={e=>e.target.style.background=`${C.accent}18`}
                onMouseLeave={e=>e.target.style.background=m===value?`${C.accent}22`:'transparent'}>
                {m}
              </div>
            ))}
          {filtered.length > 50 && <div style={{padding:8,fontSize:10,color:C.textMuted,textAlign:'center'}}>{filtered.length-50} DAHA... (YAZMAYA DEVAM EDİN)</div>}
        </div>,
        document.body
      )}
    </div>
  );
};

MR.AracModelSelect = ({marka, value, onChange, style}) => {
  const [modeller, setModeller] = useState([]);
  const [ara, setAra] = useState('');
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [pos, setPos] = useState({top:0,left:0,width:0});
  const ref = useRef(null);
  const inputRef = useRef(null);
  const dropRef = useRef(null);
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
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target) && dropRef.current && !dropRef.current.contains(e.target)) setAcik(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const updatePos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({top: r.bottom + 2, left: r.left, width: r.width});
    }
  };

  const filtered = ara ? modeller.filter(m => m.includes(ara.toUpperCase())) : modeller;

  return (
    <div ref={ref} style={{position:'relative',...(style||{})}}>
      <input ref={inputRef}
        value={acik ? ara : (value || '')}
        onChange={e => { setAra(e.target.value); if (!acik) { updatePos(); setAcik(true); } }}
        onFocus={() => { updatePos(); setAcik(true); setAra(''); }}
        placeholder={yukleniyor ? 'YÜKLENİYOR...' : (value || 'MODEL YAZIN...')}
        disabled={!marka || yukleniyor}
        style={{...S.input, cursor: marka ? 'pointer' : 'not-allowed', opacity: marka ? 1 : 0.5}}
      />
      {acik && marka && !yukleniyor && ReactDOM.createPortal(
        <div ref={dropRef} style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,maxHeight:250,overflowY:'auto',
          background:C.bgCard,border:`1px solid ${C.borderLight||C.border}`,borderRadius:8,zIndex:99999,
          boxShadow:'0 8px 30px rgba(0,0,0,0.35)'}}>
          {filtered.length === 0 ? <div style={{padding:10,fontSize:11,color:C.textMuted}}>SONUÇ YOK</div> :
            filtered.slice(0, 80).map(m => (
              <div key={m} onClick={() => { onChange(m); setAcik(false); setAra(''); }}
                style={{padding:'7px 12px',fontSize:11,cursor:'pointer',
                  background: m===value ? `${C.accent}22` : 'transparent',
                  fontWeight: m===value ? 700 : 400,
                  color:C.text,borderBottom:`1px solid ${C.border}33`}}
                onMouseEnter={e=>e.target.style.background=`${C.accent}18`}
                onMouseLeave={e=>e.target.style.background=m===value?`${C.accent}22`:'transparent'}>
                {m}
              </div>
            ))}
          {filtered.length > 80 && <div style={{padding:8,fontSize:10,color:C.textMuted,textAlign:'center'}}>{filtered.length-80} DAHA... (YAZMAYA DEVAM EDİN)</div>}
        </div>,
        document.body
      )}
    </div>
  );
};

/* ═══ IBAN GİRİŞ BİLEŞENİ ═══
   TR + 24 rakam = 26 karakter (standart TR IBAN)
   Otomatik formatlama: TR00 0000 0000 0000 0000 0000 00
   Validasyon: eksik/geçerli durum gösterimi
*/
MR.IBANInput = ({value, onChange, style: customStyle}) => {
  const C = MR.C, S = MR.S;
  const [focused, setFocused] = useState(false);

  // Ham değerden sadece rakamları al
  const rawDigits = (value || '').replace(/[^0-9]/g, '').substring(0, 24);

  const handleChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 24) val = val.substring(0, 24);
    // 4'lü gruplama ile göster
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += val[i];
    }
    onChange(formatted);
  };

  // Formatlı gösterim
  let displayVal = '';
  for (let i = 0; i < rawDigits.length; i++) {
    if (i > 0 && i % 4 === 0) displayVal += ' ';
    displayVal += rawDigits[i];
  }

  const isComplete = rawDigits.length === 24;
  const isEmpty = rawDigits.length === 0;
  const hasError = !isEmpty && !isComplete;

  return (
    <div>
      <div style={{position:'relative'}}>
        <span style={{
          position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
          fontSize:12, fontWeight:800, color: isComplete ? C.success : C.accent,
          letterSpacing:1, pointerEvents:'none', zIndex:1
        }}>TR</span>
        <input
          value={displayVal}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="0000 0000 0000 0000 0000 0000"
          maxLength={29}
          style={{
            ...S.input, ...customStyle,
            paddingLeft: 32, fontWeight:600, letterSpacing:1.5,
            borderColor: isComplete ? C.success : hasError ? C.danger : focused ? C.accent : (S.input.border||'').includes(C.borderLight) ? C.borderLight : C.border,
            boxShadow: focused ? `0 0 0 3px ${isComplete ? C.success+'22' : C.accent+'18'}` : 'none'
          }}
        />
      </div>
      {!isEmpty && (
        <div style={{
          fontSize:9, fontWeight:600, marginTop:3,
          display:'flex', alignItems:'center', gap:3,
          color: isComplete ? C.success : C.danger
        }}>
          {isComplete
            ? <><MR.LIcon name="CheckCircle" size={10} color={C.success}/> TR{rawDigits} — GEÇERLİ FORMAT</>
            : <><MR.LIcon name="AlertCircle" size={10} color={C.danger}/> EKSİK — {rawDigits.length}/24 RAKAM GİRİLDİ</>
          }
        </div>
      )}
    </div>
  );
};

/* ═══ TARİH GİRİŞ BİLEŞENİ (GG/AA/YYYY) ═══
   Manuel GG/AA/YYYY + Takvim seçici
   value: YYYY-MM-DD (veritabanı formatı)
   onChange: YYYY-MM-DD döndürür
*/
MR.DateInput = ({value, onChange, style: customStyle, disabled}) => {
  const C = MR.C, S = MR.S;
  const hiddenRef = useRef(null);

  // YYYY-MM-DD → ayrıştır
  const parts = (value || '').split('-');
  const yil = parts[0] || '';
  const ay = parts[1] || '';
  const gun = parts[2] || '';

  const [g, setG] = useState(gun);
  const [a, setA] = useState(ay);
  const [y, setY] = useState(yil);
  const [err, setErr] = useState('');
  const gunRef = useRef(null);
  const ayRef = useRef(null);
  const yilRef = useRef(null);

  // Dışarıdan value değişince senkronla
  useEffect(() => {
    const p = (value || '').split('-');
    setY(p[0] || ''); setA(p[1] || ''); setG(p[2] || '');
  }, [value]);

  const emitChange = (gun, ay, yil) => {
    if (gun.length === 2 && ay.length === 2 && yil.length === 4) {
      onChange(`${yil}-${ay}-${gun}`);
    } else if (!gun && !ay && !yil) {
      onChange('');
    }
  };

  const handleGun = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '').substring(0, 2);
    setG(val); setErr('');
    if (val.length === 2) {
      const n = parseInt(val);
      if (n < 1 || n > 31) { setG(''); setErr('GÜN 01-31 ARASI OLMALI'); return; }
      ayRef.current?.focus();
    }
    emitChange(val, a, y);
  };

  const handleAy = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '').substring(0, 2);
    setA(val); setErr('');
    if (val.length === 2) {
      const n = parseInt(val);
      if (n < 1 || n > 12) { setA(''); setErr('AY 01-12 ARASI OLMALI'); return; }
      yilRef.current?.focus();
    }
    emitChange(g, val, y);
  };

  const handleYil = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
    setY(val); setErr('');
    if (val.length === 4) {
      const n = parseInt(val);
      if (n < 1950 || n > 2035) { setErr('YIL 1950-2035 ARASI OLMALI'); return; }
    }
    emitChange(g, a, val);
  };

  const handleKeyDown = (e, prevRef) => {
    if (e.key === 'Backspace' && e.target.value === '' && prevRef) {
      prevRef.current?.focus();
    }
  };

  const handleCalendarPick = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [yy, mm, dd] = val.split('-');
    setG(dd); setA(mm); setY(yy);
    onChange(val);
  };

  const isComplete = g.length === 2 && a.length === 2 && y.length === 4;
  const partStyle = {
    ...S.input, ...customStyle,
    textAlign:'center', fontWeight:600, letterSpacing:1,
    padding:'7px 4px', fontSize:12
  };

  return (
    <div>
      <div style={{display:'flex', gap:4, alignItems:'center'}}>
        <input ref={gunRef} value={g} onChange={handleGun} onKeyDown={e=>handleKeyDown(e, null)}
          placeholder="GG" maxLength={2} disabled={disabled}
          style={{...partStyle, flex:1, minWidth:0}}/>
        <span style={{fontSize:14, fontWeight:800, color:C.textMuted, userSelect:'none'}}>/</span>
        <input ref={ayRef} value={a} onChange={handleAy} onKeyDown={e=>handleKeyDown(e, gunRef)}
          placeholder="AA" maxLength={2} disabled={disabled}
          style={{...partStyle, flex:1, minWidth:0}}/>
        <span style={{fontSize:14, fontWeight:800, color:C.textMuted, userSelect:'none'}}>/</span>
        <input ref={yilRef} value={y} onChange={handleYil} onKeyDown={e=>handleKeyDown(e, ayRef)}
          placeholder="YYYY" maxLength={4} disabled={disabled}
          style={{...partStyle, flex:1.5, minWidth:0}}/>
        <div style={{position:'relative', flexShrink:0}}>
          <div style={{
            width:30, height:30, borderRadius:6,
            border:`1px solid ${C.border}`, background:C.bgHover || C.bgInput,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:C.textMuted
          }}>
            <MR.LIcon name="Calendar" size={14} color={C.textMuted}/>
          </div>
          <input ref={hiddenRef} type="date" value={value || ''}
            onChange={handleCalendarPick}
            style={{position:'absolute', opacity:0, width:30, height:30, top:0, left:0, cursor:'pointer'}}
          />
        </div>
      </div>
      {err && (
        <div style={{fontSize:9, fontWeight:600, marginTop:3, color:C.danger, display:'flex', alignItems:'center', gap:3}}>
          <MR.LIcon name="AlertCircle" size={10} color={C.danger}/> {err}
        </div>
      )}
      {isComplete && !err && (
        <div style={{fontSize:9, fontWeight:600, marginTop:3, color:C.success, display:'flex', alignItems:'center', gap:3}}>
          <MR.LIcon name="CheckCircle" size={10} color={C.success}/> {g}/{a}/{y}
        </div>
      )}
    </div>
  );
};
