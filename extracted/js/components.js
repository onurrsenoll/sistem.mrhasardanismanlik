const MR = window.MR || (window.MR = {});
const {useState} = React;

MR.StatCard = ({icon, label, value, color = MR.C.accent}) => (
  <div style={MR.S.stat}>
    <div style={{width:38,height:38,borderRadius:10,background:`${color}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <MR.LIcon name={icon} size={18} color={color}/>
    </div>
    <div style={{marginTop:12,fontSize:22,fontWeight:800}}>{value}</div>
    <div style={{fontSize:11,color:MR.C.textMuted,marginTop:2}}>{label}</div>
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
      if (r && r.success) { MR.api.setToken(r.data.token, r.data.refresh_token || null); onLogin(r.data.user); }
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
