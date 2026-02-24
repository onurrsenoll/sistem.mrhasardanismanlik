/**
 * MR HASAR DANIŞMANLIK - ANA UYGULAMA
 * NAVİGASYON, ROUTER, BREADCRUMB, ANA YAPI
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

/* ═══ MENÜ YAPILANDIRMASI ═══ */
const MENU = [
  {id:'dosya', label:'DOSYA İŞLEMLERİ', icon:'FolderOpen', sub:[
    {id:'dosya-liste', label:'DOSYA LİSTESİ', icon:'List'},
    {id:'dosya-yeni', label:'YENİ DOSYA', icon:'Plus'}
  ]},
  {id:'crm', label:'CRM / SAHA', icon:'Users', sub:[
    {id:'crm-liste', label:'CRM LİSTESİ', icon:'List'},
    {id:'crm-yeni', label:'YENİ KAYIT', icon:'UserPlus'},
    {id:'crm-arama', label:'ARAMA LİSTESİ', icon:'PhoneCall'},
    {id:'saha-liste', label:'SAHA DOSYALARI', icon:'MapPin'},
    {id:'saha-yeni', label:'YENİ SAHA KAYDI', icon:'PlusCircle'}
  ]},
  {id:'hesap', label:'HESAPLAMALAR', icon:'Calculator', sub:[
    {id:'hesap-adk', label:'ARAÇ DEĞER KAYBI', icon:'Car'},
    {id:'hesap-bh', label:'BEDENİ HASAR', icon:'Heart'}
  ]},
  {id:'paydaslar', label:'PAYDAŞLAR', icon:'Handshake', sub:[
    {id:'ortaklar-ortaklar', label:'İŞ ORTAKLARI', icon:'Briefcase'},
    {id:'ortaklar-paydaslar', label:'İŞ PAYDAŞLARI', icon:'Network'},
    {id:'servis-liste', label:'SERVİS LİSTESİ', icon:'Wrench'},
    {id:'servis-yeni', label:'YENİ SERVİS', icon:'Plus'},
    {id:'servis-rapor', label:'SERVİS RAPORLARI', icon:'BarChart3'}
  ]},
  {id:'police', label:'POLİÇE', icon:'FileCheck', sub:[
    {id:'police-liste', label:'POLİÇE LİSTESİ', icon:'List'},
    {id:'police-yeni', label:'YENİ POLİÇE', icon:'Plus'},
    {id:'police-yenileme', label:'YENİLEME TAKİBİ', icon:'RefreshCw'},
    {id:'police-tahsilat', label:'TAHSİLAT / CARİ', icon:'Wallet'},
    {id:'police-rapor', label:'RAPORLAR', icon:'BarChart3'},
    {id:'police-kazanc', label:'KAZANÇ', icon:'TrendingUp'}
  ]},
  {id:'muhasebe', label:'MUHASEBE', icon:'Landmark', sub:[
    {id:'muhasebe-gelir', label:'GELİR YÖNETİMİ', icon:'TrendingUp'},
    {id:'muhasebe-gider', label:'GİDER YÖNETİMİ', icon:'TrendingDown'},
    {id:'muhasebe-komisyon', label:'KOMİSYON / PRİM', icon:'Percent'},
    {id:'muhasebe-kasa', label:'KASA / BANKA', icon:'Wallet'},
    {id:'muhasebe-maliyet', label:'MALİYET ANALİZİ', icon:'PieChart'},
    {id:'muhasebe-rapor', label:'FİNANSAL RAPORLAR', icon:'BarChart3'},
    {id:'personel-liste', label:'PERSONEL LİSTESİ', icon:'Users'},
    {id:'personel-yeni', label:'YENİ PERSONEL', icon:'UserPlus'},
    {id:'personel-hakedis', label:'HAKEDİŞ TAKİBİ', icon:'Calculator'}
  ]},
  {id:'ajanda', label:'AJANDA', icon:'CalendarDays'},
  {id:'sistem', label:'SİSTEM', icon:'Shield', sub:[
    {id:'sistem-kullanici', label:'KULLANICI YÖNETİMİ', icon:'UserCog'},
    {id:'sistem-yetki', label:'YETKİ YÖNETİMİ', icon:'KeyRound'},
    {id:'sistem-ayarlar', label:'FİRMA AYARLARI', icon:'Settings'},
    {id:'sistem-sms', label:'SMS BİLDİRİM', icon:'MessageSquare'},
    {id:'sistem-portal', label:'PORTAL AYARLARI', icon:'Globe'},
    {id:'sistem-netsantral', label:'NETSANTRAL', icon:'Phone'},
    {id:'sistem-log', label:'LOG KAYITLARI', icon:'FileText'},
    {id:'mesajlar-sistem', label:'SİSTEM BİLDİRİMLERİ', icon:'Bell'},
    {id:'tanimlamalar-dosya', label:'DOSYA TANIMLAMALARI', icon:'Folder'},
    {id:'tanimlamalar-evrak', label:'EVRAK TANIMLAMALARI', icon:'FileText'},
    {id:'tanimlamalar-finansal', label:'FİNANSAL TANIMLAMALAR', icon:'Wallet'},
    {id:'tanimlamalar-sablon', label:'MATBU EVRAK / SÖZLEŞME', icon:'FileSignature'},
    {id:'tanimlamalar-genel', label:'GENEL TANIMLAMALAR', icon:'Settings'}
  ]}
];

/* ═══ ROL BAZLI ERİŞİM ═══ */
const ROL_ERISIM = {
  admin: null,
  avukat: ['home','dosya','crm','hesap','paydaslar','ajanda'],
  uzman: ['home','dosya','hesap','paydaslar','ajanda'],
  personel: ['home','dosya','crm','ajanda'],
  muhasebe: ['home','dosya','police','muhasebe','paydaslar','ajanda','sistem'],
  portal: ['home','dosya']
};

/* MENÜ ID → VERİTABANI MODÜL ADI EŞLEMESİ */
const MENU_MODUL = {
  dosya: 'dosya',
  crm: 'crm',
  hesap: 'hesaplamalar',
  paydaslar: 'paydaslar',
  muhasebe: 'muhasebe',
  ajanda: 'ajanda',
  police: 'police',
  sistem: 'sistem'
};

function menuErisim(user) {
  /* ADMIN HER ZAMAN TÜM MENÜYÜ GÖRÜR */
  if (user?.rol === 'admin') return MENU;

  const yetkiler = user?.yetkiler;

  /* YETKİLER VARSA VERİTABANINDAKİ İZİNLERE GÖRE ALT MODÜL BAZLI FİLTRELE */
  if (yetkiler && Object.keys(yetkiler).length > 0) {
    return MENU.map(m => {
      if (m.id === 'home') return m;
      const modul = MENU_MODUL[m.id];
      if (!modul) return null;

      if (m.sub) {
        /* ALT MODÜL BAZLI: HER SUB-ITEM İÇİN İZİN KONTROLÜ */
        const filteredSub = m.sub.filter(s => yetkiler[modul + '_' + s.id] === 1);
        if (filteredSub.length === 0) return null;
        return {...m, sub: filteredSub};
      }

      /* SUB YOK (AJANDA GİBİ): GENEL GÖRÜNTÜLE İZNİ */
      return yetkiler[modul + '_goruntule'] === 1 ? m : null;
    }).filter(Boolean);
  }

  /* YETKİLER YOKSA STATİK ROL ERİŞİMİNE GERİ DÖN */
  const izin = ROL_ERISIM[user?.rol];
  if (!izin) return MENU;
  return MENU.filter(m => izin.some(i => m.id === i || m.id.startsWith(i)));
}

/* ═══ URL HASH ROUTING ═══ */
function getPageFromHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h || 'home';
}

/* ═══ ÜST NAVİGASYON ═══ */
const TopNav = ({user, page, setPage, onLogout}) => {
  const {C, LIcon, api} = MR;
  const [menuOpen, setMenuOpen] = useState(null);
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const [profilOpen, setProfilOpen] = useState(false);
  const navRef = useRef(null);
  const filteredMenu = menuErisim(user);

  useEffect(() => {
    const sayacGuncelle = async () => {
      try {
        const [r1, r2] = await Promise.all([
          api.bildirimList({okundu: 0, limit: 1}),
          api.mesajList({okunmamis: 1, limit: 1}).catch(() => null)
        ]);
        let toplam = 0;
        if (r1?.success) toplam += (r1.data?.pagination?.total || 0);
        if (r2?.success) toplam += (r2.data?.okunmamis_sayisi || r2.data?.pagination?.total || 0);
        setBildirimSayisi(toplam);
      } catch(e) {}
    };
    sayacGuncelle();
    const iv = setInterval(sayacGuncelle, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(null);
        setProfilOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const isActive = (m) => page === m.id || page.startsWith(m.id + '-');

  return (
    <div ref={navRef} style={{
      background: C.headerBg, borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', padding: '0 12px', height: 48,
      position: 'sticky', top: 0, zIndex: 1000, gap: 0
    }}>
      {/* MENÜ - ESNEK ALAN, TEK SATIR */}
      <div style={{
        display: 'flex', flex: 1, alignItems: 'center',
        justifyContent: 'center', gap: 1, overflow: 'visible'
      }}>
        {filteredMenu.map(m => (
          <div key={m.id} style={{position: 'relative'}}>
            <div
              onClick={() => {
                if (m.sub) { setMenuOpen(menuOpen === m.id ? null : m.id); }
                else { setPage(m.id); setMenuOpen(null); }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                color: isActive(m) ? C.accent : C.text,
                background: isActive(m) ? `${C.accent}15` : 'transparent',
                transition: 'all .2s', position: 'relative'
              }}
              onMouseEnter={e => { if (!isActive(m)) e.currentTarget.style.background = `${C.accent}08`; }}
              onMouseLeave={e => { if (!isActive(m)) e.currentTarget.style.background = 'transparent'; }}
            >
              <LIcon name={m.icon} size={13} color={isActive(m) ? C.accent : C.textSec}/>
              <span>{m.label}</span>
              {m.id === 'sistem' && bildirimSayisi > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 14, height: 14, borderRadius: '50%',
                  background: C.danger, color: '#fff', fontSize: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                }}>{bildirimSayisi > 9 ? '9+' : bildirimSayisi}</span>
              )}
              {m.sub && <LIcon name="ChevronDown" size={10} color={C.textMuted}/>}
            </div>

            {/* DROPDOWN */}
            {m.sub && menuOpen === m.id && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: 6, minWidth: 210,
                boxShadow: '0 10px 40px rgba(0,0,0,.5)', zIndex: 1001
              }}>
                {m.sub.map(s => (
                  <div key={s.id}
                    onClick={() => { setPage(s.id); setMenuOpen(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 12, fontWeight: 500,
                      color: page === s.id ? C.accent : C.textSec,
                      background: page === s.id ? `${C.accent}15` : 'transparent',
                      transition: 'all .15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.accent}10`}
                    onMouseLeave={e => e.currentTarget.style.background = page === s.id ? `${C.accent}15` : 'transparent'}
                  >
                    <LIcon name={s.icon} size={14} color={page === s.id ? C.accent : C.textMuted}/>
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SAĞ TARAF - SABİT ALAN */}
      <div style={{display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8}}>
        {/* TEMA TOGGLE */}
        <div onClick={() => {
          const yeniTema = MR.tema === 'koyu' ? 'acik' : 'koyu';
          MR.setTema(yeniTema);
          setMenuOpen(null);
          window.dispatchEvent(new Event('mr-tema-degisti'));
        }} style={{
          width: 40, height: 40, minWidth: 40, borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: MR.tema === 'koyu' ? `${C.warning}22` : `${C.purple}22`,
          border: `1px solid ${MR.tema === 'koyu' ? C.warning + '44' : C.purple + '44'}`,
          transition: 'all .2s'
        }} title={MR.tema === 'koyu' ? 'AÇIK TEMA' : 'KOYU TEMA'}>
          <LIcon name={MR.tema === 'koyu' ? 'Sun' : 'Moon'} size={19} color={MR.tema === 'koyu' ? C.warning : C.purple}/>
        </div>

        {/* PROFİL */}
        <div style={{position: 'relative'}}>
          <div onClick={() => setProfilOpen(!profilOpen)} style={{
            width: 40, height: 40, minWidth: 40, borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: `${C.accent}22`, overflow: 'hidden'
          }} title={user?.ad_soyad || 'PROFİL'}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" style={{
                width: 40, height: 40, objectFit: 'cover'
              }}/>
            ) : (
              <div style={{
                fontSize: 15, fontWeight: 700, color: C.accent
              }}>{(user?.ad_soyad || 'U')[0]}</div>
            )}
          </div>

          {profilOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: 6, minWidth: 200,
              boxShadow: '0 10px 40px rgba(0,0,0,.5)', zIndex: 1001
            }}>
              <div style={{padding: '10px 14px', borderBottom: `1px solid ${C.border}`, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10}}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" style={{width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0}}/>
                ) : (
                  <div style={{width: 32, height: 32, borderRadius: 8, background: `${C.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.accent, flexShrink: 0}}>{(user?.ad_soyad || 'U')[0]}</div>
                )}
                <div>
                  <div style={{fontSize: 12, fontWeight: 600}}>{user?.ad_soyad}</div>
                  <div style={{fontSize: 10, color: C.textMuted}}>{user?.email}</div>
                </div>
              </div>
              <div onClick={() => { setPage('profil'); setProfilOpen(false); }}
                style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: C.textSec}}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}10`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LIcon name="User" size={14} color={C.textMuted}/> PROFİL
              </div>
              <div onClick={onLogout}
                style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: C.danger}}
                onMouseEnter={e => e.currentTarget.style.background = `${C.danger}10`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LIcon name="LogOut" size={14} color={C.danger}/> ÇIKIŞ YAP
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══ BREADCRUMB ═══ */
const Breadcrumb = ({page, setPage}) => {
  const {C, LIcon} = MR;

  /* ANA SAYFADA BREADCRUMB GÖSTERİLMEZ */
  if (page === 'home') return null;

  const parts = [];
  parts.push({label: 'ANA SAYFA', id: 'home'});

  for (const m of MENU) {
    if (page === m.id) {
      parts.push({label: m.label, id: m.id});
      break;
    }
    if (m.sub) {
      for (const s of m.sub) {
        if (page === s.id || page.startsWith(s.id + '-')) {
          parts.push({label: m.label, id: m.sub[0]?.id || m.id});
          parts.push({label: s.label, id: s.id});
          break;
        }
      }
    }
    if (page.startsWith('dosya-detay-')) {
      if (m.id === 'dosya') {
        parts.push({label: 'DOSYA İŞLEMLERİ', id: 'dosya-liste'});
        parts.push({label: 'DOSYA DETAY', id: page});
        break;
      }
    }
    if (page === 'crm-arama') {
      if (m.id === 'crm') {
        parts.push({label: 'CRM', id: 'crm-liste'});
        parts.push({label: 'ARAMA LİSTESİ', id: page});
        break;
      }
    }
    if (page.startsWith('crm-detay-')) {
      if (m.id === 'crm') {
        parts.push({label: 'CRM / SAHA', id: 'crm-liste'});
        parts.push({label: 'CRM DETAY', id: page});
        break;
      }
    }
    if (page.startsWith('saha-')) {
      if (m.id === 'crm') {
        parts.push({label: 'CRM / SAHA', id: 'crm-liste'});
        const sahaLabels = {'saha-liste':'SAHA DOSYALARI','saha-yeni':'YENİ SAHA KAYDI','saha-beklemede':'ONAY İÇİN BEKLEYEN','saha-onaylanan':'ONAYLANAN','saha-dosyaya_donusen':'DOSYAYA DÖNÜŞEN'};
        parts.push({label: sahaLabels[page] || 'SAHA DOSYALARI', id: page});
        break;
      }
    }
  }

  if (page === 'profil') {
    parts.push({label: 'PROFİL', id: 'profil'});
  }

  if (parts.length <= 1) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 0', fontSize: 11, color: C.textMuted
    }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <LIcon name="ChevronRight" size={12} color={C.textMuted}/>}
          {i < parts.length - 1 ? (
            <span onClick={() => setPage(p.id)} style={{cursor: 'pointer', color: C.textSec}}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.textSec}>
              {p.label}
            </span>
          ) : (
            <span style={{color: C.text, fontWeight: 600}}>{p.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ═══ PROFİL SAYFASI ═══ */
const ROL_ACIKLAMALAR = {
  admin: {label: 'SİSTEM YÖNETİCİSİ', renk: '#ef4444', gorev: 'TÜM SİSTEM YÖNETİMİ, KULLANICI YÖNETİMİ, YETKİ ATAMA, FİRMA AYARLARI VE TÜM MODÜLLERE ERİŞİM'},
  avukat: {label: 'AVUKAT', renk: '#8b5cf6', gorev: 'DOSYA TAKİBİ, CRM YÖNETİMİ, HESAPLAMA MODÜLLERI, SERVİS TAKİBİ, ORTAK YÖNETİMİ VE AJANDA'},
  uzman: {label: 'UZMAN', renk: '#2563eb', gorev: 'DOSYA TAKİBİ, HESAPLAMA MODÜLLERI, SERVİS TAKİBİ VE AJANDA'},
  personel: {label: 'PERSONEL', renk: '#10b981', gorev: 'DOSYA TAKİBİ VE AJANDA YÖNETİMİ'},
  muhasebe: {label: 'MUHASEBE', renk: '#f59e0b', gorev: 'DOSYA TAKİBİ, MUHASEBE İŞLEMLERİ, ORTAK YÖNETİMİ, TANIMLAMALAR VE AJANDA'},
  portal: {label: 'PORTAL KULLANICISI', renk: '#06b6d4', gorev: 'DOSYA GÖRÜNTÜLEME VE MESAJLAŞMA'}
};

const ProfilPage = ({user, setUser}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api} = MR;
  /* ŞİFRE */
  const [eskiSifre, setEskiSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifre2, setYeniSifre2] = useState('');
  /* TELEFON */
  const [telefon, setTelefon] = useState(user?.telefon || '');
  const [telefonDuzenle, setTelefonDuzenle] = useState(false);
  /* AVATAR */
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false);
  /* MESAJLAR */
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const rolBilgi = ROL_ACIKLAMALAR[user?.rol] || {label: (user?.rol || '').toUpperCase(), renk: C.accent, gorev: '-'};

  const sifreDegistir = async () => {
    setMsg(''); setErr('');
    if (!eskiSifre || !yeniSifre) { setErr('TÜM ALANLAR GEREKLİ'); return; }
    if (yeniSifre.length < 6) { setErr('YENİ ŞİFRE EN AZ 6 KARAKTER OLMALI'); return; }
    if (yeniSifre !== yeniSifre2) { setErr('YENİ ŞİFRELER UYUŞMUYOR'); return; }
    const r = await api.changePw({mevcut_sifre: eskiSifre, yeni_sifre: yeniSifre});
    if (r?.success) { setMsg('ŞİFRE BAŞARIYLA DEĞİŞTİRİLDİ'); setEskiSifre(''); setYeniSifre(''); setYeniSifre2(''); }
    else setErr(r?.error || 'HATA OLUŞTU');
  };

  const telefonKaydet = async () => {
    setMsg(''); setErr('');
    const r = await api.profilUpdate({telefon: telefon});
    if (r?.success) { setMsg('TELEFON BAŞARIYLA GÜNCELLENDİ'); setTelefonDuzenle(false); }
    else setErr(r?.error || 'HATA OLUŞTU');
    setTimeout(() => setMsg(''), 3000);
  };

  const avatarSec = () => { fileRef.current?.click(); };
  const avatarDegistir = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr('DOSYA BOYUTU EN FAZLA 2MB OLABİLİR'); return; }
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) { setErr('SADECE PNG, JPG VE WEBP KABUL EDİLİR'); return; }
    setAvatarYukleniyor(true); setErr('');
    const r = await api.avatarYukle(file);
    setAvatarYukleniyor(false);
    if (r?.success && r.data?.avatar_url) {
      setAvatarUrl(r.data.avatar_url);
      if (setUser) setUser(prev => ({...prev, avatar: r.data.avatar_url}));
      setMsg('PROFİL RESMİ BAŞARIYLA GÜNCELLENDİ');
    } else {
      setErr(r?.error || 'PROFİL RESMİ YÜKLEME HATASI');
    }
    setTimeout(() => setMsg(''), 3000);
    e.target.value = '';
  };

  return (
    <div className="fade-in">
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
        {/* SOL KOLON: PROFİL BİLGİLERİ + ROL/GÖREV */}
        <div style={{display: 'grid', gap: 20}}>
          <div style={S.card}>
            <SectionTitle icon="User" title="PROFİL BİLGİLERİ"/>
            <div style={S.cardBody}>
              {msg && <div style={{padding: '10px 14px', background: `${C.success}22`, border: `1px solid ${C.success}44`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: C.success}}>{msg}</div>}
              {err && <div style={{padding: '10px 14px', background: `${C.danger}22`, border: `1px solid ${C.danger}44`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: C.danger}}>{err}</div>}

              {/* AVATAR + İSİM */}
              <div style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24}}>
                <div style={{position: 'relative'}}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="AVATAR" style={{
                      width: 80, height: 80, borderRadius: 20, objectFit: 'cover',
                      border: `3px solid ${C.accent}44`
                    }}/>
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: 20,
                      background: `${C.accent}22`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 30, fontWeight: 800, color: C.accent,
                      border: `3px solid ${C.accent}44`
                    }}>{(user?.ad_soyad || 'U')[0]}</div>
                  )}
                  <div onClick={avatarSec} style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 28, height: 28, borderRadius: '50%',
                    background: C.accent, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: `2px solid ${C.bgCard}`,
                    opacity: avatarYukleniyor ? 0.5 : 1
                  }} title="PROFİL RESMİ DEĞİŞTİR">
                    <LIcon name={avatarYukleniyor ? 'Loader2' : 'Camera'} size={14} color="#fff"/>
                  </div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
                    style={{display: 'none'}} onChange={avatarDegistir}/>
                </div>
                <div>
                  <div style={{fontSize: 20, fontWeight: 800}}>{user?.ad_soyad}</div>
                  <div style={{fontSize: 12, color: C.textMuted, marginTop: 2}}>{user?.email}</div>
                  <div style={{marginTop: 6}}>
                    <span style={{
                      padding: '3px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: `${rolBilgi.renk}22`, color: rolBilgi.renk,
                      border: `1px solid ${rolBilgi.renk}33`
                    }}>{rolBilgi.label}</span>
                  </div>
                </div>
              </div>

              {/* TELEFON */}
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}`}}>
                <span style={{fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6}}>
                  <LIcon name="Phone" size={14} color={C.textMuted}/> TELEFON
                </span>
                {telefonDuzenle ? (
                  <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <input value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="05XX XXX XX XX"
                      style={{...S.input, width: 160, padding: '6px 10px', fontSize: 12}}/>
                    <button onClick={telefonKaydet} style={{...S.btn, padding: '6px 12px', fontSize: 11, background: C.success, color: '#fff'}}>
                      <LIcon name="Check" size={12} color="#fff"/>
                    </button>
                    <button onClick={() => { setTelefonDuzenle(false); setTelefon(user?.telefon || ''); }}
                      style={{...S.btn, padding: '6px 12px', fontSize: 11, background: C.borderLight, color: C.textSec}}>
                      <LIcon name="X" size={12} color={C.textSec}/>
                    </button>
                  </div>
                ) : (
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span style={{fontSize: 12, fontWeight: 600}}>{user?.telefon || '-'}</span>
                    <div onClick={() => setTelefonDuzenle(true)} style={{cursor: 'pointer', padding: 4, borderRadius: 6}}
                      onMouseEnter={e => e.currentTarget.style.background = `${C.accent}15`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <LIcon name="Pencil" size={12} color={C.accent}/>
                    </div>
                  </div>
                )}
              </div>

              {/* KAYIT TARİHİ */}
              <div style={{display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}`}}>
                <span style={{fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6}}>
                  <LIcon name="CalendarDays" size={14} color={C.textMuted}/> KAYIT TARİHİ
                </span>
                <span style={{fontSize: 12, fontWeight: 600}}>{user?.created_at || '-'}</span>
              </div>
            </div>
          </div>

          {/* ROL VE GÖREV BİLGİLERİ */}
          <div style={S.card}>
            <SectionTitle icon="Shield" title="ROL VE GÖREV BİLGİLERİ"/>
            <div style={S.cardBody}>
              <div style={{
                padding: 16, borderRadius: 12,
                background: `${rolBilgi.renk}08`, border: `1px solid ${rolBilgi.renk}22`
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12}}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${rolBilgi.renk}22`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <LIcon name="UserCog" size={18} color={rolBilgi.renk}/>
                  </div>
                  <div>
                    <div style={{fontSize: 14, fontWeight: 700, color: rolBilgi.renk}}>{rolBilgi.label}</div>
                    <div style={{fontSize: 10, color: C.textMuted}}>SİSTEM TARAFINDAN ATANMIŞ ROL</div>
                  </div>
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 8, background: C.bgCard,
                  border: `1px solid ${C.border}`, fontSize: 12, lineHeight: 1.6, color: C.textSec
                }}>
                  <div style={{fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 6, letterSpacing: 1}}>
                    <LIcon name="Briefcase" size={12} color={C.textMuted}/> GÖREV TANIMI
                  </div>
                  {rolBilgi.gorev}
                </div>
              </div>

              {/* YETKİ ÖZETİ */}
              {user?.yetkiler && Object.keys(user.yetkiler).length > 0 && (
                <div style={{marginTop: 16}}>
                  <div style={{fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 8, letterSpacing: 0.5}}>
                    AKTİF YETKİLER
                  </div>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
                    {Object.entries(user.yetkiler).filter(([k, v]) => v === 1 && k.endsWith('_goruntule')).map(([k]) => (
                      <span key={k} style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600,
                        background: `${C.success}15`, color: C.success,
                        border: `1px solid ${C.success}22`
                      }}>{k.replace('_goruntule', '').toUpperCase()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ KOLON: ŞİFRE DEĞİŞTİR */}
        <div style={S.card}>
          <SectionTitle icon="Lock" title="ŞİFRE DEĞİŞTİR"/>
          <div style={S.cardBody}>
            <div style={{display: 'grid', gap: 16}}>
              <FormGroup label="MEVCUT ŞİFRE">
                <input type="password" value={eskiSifre} onChange={e => setEskiSifre(e.target.value)} style={S.input} placeholder="••••••••"/>
              </FormGroup>
              <FormGroup label="YENİ ŞİFRE">
                <input type="password" value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} style={S.input} placeholder="EN AZ 6 KARAKTER"/>
              </FormGroup>
              <FormGroup label="YENİ ŞİFRE (TEKRAR)">
                <input type="password" value={yeniSifre2} onChange={e => setYeniSifre2(e.target.value)} style={S.input} placeholder="••••••••"/>
              </FormGroup>
              <button onClick={sifreDegistir} style={{...S.btn, ...S.btnP, justifyContent: 'center'}}>
                <LIcon name="Lock" size={14} color="#fff"/> ŞİFREYİ DEĞİŞTİR
              </button>
            </div>

            {/* ŞİFRE GÜVENLİĞİ BİLGİSİ */}
            <div style={{
              marginTop: 20, padding: 14, borderRadius: 10,
              background: `${C.warning}08`, border: `1px solid ${C.warning}22`
            }}>
              <div style={{fontSize: 11, fontWeight: 700, color: C.warning, marginBottom: 8}}>
                <LIcon name="ShieldAlert" size={14} color={C.warning}/> ŞİFRE GÜVENLİĞİ
              </div>
              <div style={{fontSize: 11, color: C.textSec, lineHeight: 1.8}}>
                {['EN AZ 6 KARAKTER KULLANIN', 'BÜYÜK VE KÜÇÜK HARF KARIŞIMI ÖNERİLİR', 'RAKAM VE ÖZEL KARAKTER EKLEYİN', 'KİŞİSEL BİLGİLERİNİZİ KULLANMAYIN'].map((t, i) => (
                  <div key={i} style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <LIcon name="CheckCircle2" size={10} color={C.textMuted}/> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ SAYFA ROUTER ═══ */
const PageRouter = ({page, setPage, user, setUser}) => {
  const dosyaIdMatch = page.match(/^dosya-detay-(\d+)$/);
  const crmIdMatch = page.match(/^crm-detay-(\d+)$/);

  if (page === 'home') return <MR.HomePage setPage={setPage} user={user}/>;

  /* DOSYA */
  if (page === 'dosya-liste') return <MR.DosyaListePage setPage={setPage} user={user}/>;
  if (page === 'dosya-yeni') return <MR.DosyaYeniPage setPage={setPage} user={user}/>;
  if (dosyaIdMatch) return <MR.DosyaDetayPage setPage={setPage} user={user} dosyaId={parseInt(dosyaIdMatch[1])}/>;

  /* CRM */
  if (page === 'crm-liste') return <MR.CrmPage setPage={setPage} user={user} view="liste"/>;
  if (page === 'crm-yeni') return <MR.CrmPage setPage={setPage} user={user} view="yeni"/>;
  if (page === 'crm-arama') return <MR.CrmAramaPage setPage={setPage} user={user}/>;
  if (crmIdMatch) return <MR.CrmPage setPage={setPage} user={user} view="detay" crmId={parseInt(crmIdMatch[1])}/>;

  /* SAHA DOSYALARI */
  if (page.startsWith('saha')) {
    const sub = page.replace('saha-', '') || 'liste';
    return <MR.SahaPage setPage={setPage} user={user} subPage={sub === 'saha' ? 'liste' : sub}/>;
  }

  /* HESAPLAMALAR */
  if (page === 'hesap-adk') return <MR.HesapADKPage setPage={setPage} user={user}/>;
  if (page === 'hesap-bh') return <MR.HesapBHPage setPage={setPage} user={user}/>;

  /* SERVİSLER */
  if (page.startsWith('servis')) {
    const sub = page.replace('servis-', '') || 'liste';
    return <MR.ServisPage setPage={setPage} user={user} subPage={sub === 'servis' ? 'liste' : sub}/>;
  }

  /* ORTAKLAR */
  if (page.startsWith('ortaklar')) {
    const sub = page.replace('ortaklar-', '') || 'ortaklar';
    return <MR.OrtaklarPage setPage={setPage} user={user} subPage={sub === 'ortaklar' ? 'ortaklar' : sub}/>;
  }

  /* PERSONEL */
  if (page.startsWith('personel')) {
    const sub = page.replace('personel-', '') || 'liste';
    return <MR.PersonelPage setPage={setPage} user={user} subPage={sub === 'personel' ? 'liste' : sub}/>;
  }

  /* POLİÇE */
  if (page.startsWith('police')) {
    const sub = page.replace('police-', '') || 'liste';
    return <MR.PolicePage setPage={setPage} user={user} subPage={sub === 'police' ? 'liste' : sub}/>;
  }

  /* MUHASEBE */
  if (page.startsWith('muhasebe')) {
    const sub = page.replace('muhasebe-', '') || 'gelir';
    return <MR.MuhasebePage setPage={setPage} user={user} subPage={sub === 'muhasebe' ? 'gelir' : sub}/>;
  }

  /* TANIMLAMALAR */
  if (page.startsWith('tanimlamalar')) {
    const sub = page.replace('tanimlamalar-', '') || 'dosya';
    return <MR.TanimlamalarPage setPage={setPage} user={user} subPage={sub === 'tanimlamalar' ? 'dosya' : sub}/>;
  }

  /* AJANDA */
  if (page === 'ajanda') return <MR.AjandaPage setPage={setPage} user={user}/>;

  /* MESAJLAR (sistem bildirimleri artık sistem menüsünde) */
  if (page === 'mesajlar-sistem') {
    return <MR.MesajlarPage setPage={setPage} user={user} subPage="sistem"/>;
  }

  /* SİSTEM */
  if (page.startsWith('sistem')) {
    const sub = page.replace('sistem-', '') || 'kullanici';
    return <MR.SistemPage setPage={setPage} user={user} subPage={sub === 'sistem' ? 'kullanici' : sub}/>;
  }

  if (page === 'profil') return <ProfilPage user={user} setUser={setUser}/>;

  return <MR.HomePage setPage={setPage} user={user}/>;
};

/* ═══ NETSANTRAL FLOATING KONTROL PANELİ ═══ */
const NetsantralPanel = ({user}) => {
  const {C, LIcon, api} = MR;

  /* YETKİ KONTROLÜ: ADMIN HER ZAMAN GÖREBİLİR, DİĞERLERİ İZİN GEREKTİRİR */
  const yetkiler = user?.yetkiler || {};
  const isAdmin = user?.rol === 'admin';
  const netsantralIzin = isAdmin || yetkiler['netsantral_goruntule'] === 1;

  const [minimized, setMinimized] = useState(true);
  const [dialpadOpen, setDialpadOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [activeCall, setActiveCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [status, setStatus] = useState('hazir'); // hazir, araniyor, gorusmede, mola
  const [statusMsg, setStatusMsg] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferNum, setTransferNum] = useState('');
  const [queueInfo, setQueueInfo] = useState(null);
  const [hangupLoading, setHangupLoading] = useState(false);

  const timerRef = useRef(null);
  const callStartRef = useRef(null);
  const panelRef = useRef(null);
  const pbxOriginatedRef = useRef(false);
  const activeLogIdRef = useRef(0);

  // DAHİLİ NUMARASI APP BİLEŞENİNDE YÜKLENİYOR (MR._netsantralDahili)

  // AYAR DEĞİŞİKLİĞİ DİNLE (SİSTEM > NETSANTRAL SAYFASINDAN KAYDET YAPILINCA)
  useEffect(() => {
    const handler = (e) => {
      const data = e.detail || {};
      console.log('[NETSANTRAL PANEL] AYARLAR GÜNCELLEME ALGILANDI:', data);
      if (data.dahili) setStatusMsg('DAHİLİ GÜNCELLENDİ: ' + data.dahili);
      setTimeout(() => setStatusMsg(''), 3000);
    };
    window.addEventListener('mr-netsantral-ayar-degisti', handler);
    return () => window.removeEventListener('mr-netsantral-ayar-degisti', handler);
  }, []);

  // ARAMA SÜRE SAYACI
  useEffect(() => {
    if (activeCall) {
      callStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setCallTimer(Math.floor((Date.now() - callStartRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallTimer(0);
      callStartRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeCall]);

  // GELEN ÇAĞRI BİLDİRİMİ (OPSİYONEL - WEBHOOK AKTİFSE)
  useEffect(() => {
    const handler = (e) => {
      const data = e.detail || {};
      if (data.arayan) {
        setNumber(data.arayan);
        setActiveCall(true);
        setStatus('gorusmede');
        setMinimized(false);
        setStatusMsg('GELEN ÇAĞRI: ' + (data.arayanAdi || data.arayan));
        setTimeout(() => setStatusMsg(''), 4000);
      }
    };
    window.addEventListener('mr-netsantral-gelen', handler);
    return () => window.removeEventListener('mr-netsantral-gelen', handler);
  }, []);

  // CRM EKRANINDAN ÇAĞRI SONLANDIRILINCA DİNLE
  useEffect(() => {
    const handler = () => {
      if (activeCall) {
        setActiveCall(false);
        setMuted(false);
        setStatus('hazir');
        setStatusMsg('ÇAĞRI SONLANDIRILDI');
        setTransferOpen(false);
        setTimeout(() => setStatusMsg(''), 2000);
      }
    };
    window.addEventListener('mr-arama-sonlandi', handler);
    return () => window.removeEventListener('mr-arama-sonlandi', handler);
  }, [activeCall]);

  // DIŞARIDAN BAŞLATILAN GİDEN ÇAĞRILARI DİNLE (CRM-ARAMA, DOSYA DETAY vs.)
  useEffect(() => {
    const handleAramaBaslat = (e) => {
      const data = e.detail || {};
      if (data.telefon) {
        setNumber(data.telefon);
        setStatusMsg('GİDEN ARAMA BAŞLATILIYOR: ' + (data.ad || data.telefon));
        setStatus('araniyor');
        setMinimized(false);
      }
    };
    const handlePbxSonuc = (e) => {
      const data = e.detail || {};
      if (data.logId) activeLogIdRef.current = data.logId;
      if (data.basarili) {
        pbxOriginatedRef.current = true;
        setActiveCall(true);
        setStatus('gorusmede');
        setStatusMsg('ÇAĞRI BAĞLANDI - ' + (data.ad || data.telefon));
      } else {
        /* PBX BAŞARISIZ - HATA GÖSTER VE TEMİZLE */
        setStatus('hazir');
        setStatusMsg(data.hata || 'GİDEN ARAMA BAŞLATILAMADI');
        pbxOriginatedRef.current = false;
        activeLogIdRef.current = 0;
      }
      setTimeout(() => setStatusMsg(''), 5000);
    };
    window.addEventListener('mr-arama-baslat', handleAramaBaslat);
    window.addEventListener('mr-arama-pbx-sonuc', handlePbxSonuc);
    return () => {
      window.removeEventListener('mr-arama-baslat', handleAramaBaslat);
      window.removeEventListener('mr-arama-pbx-sonuc', handlePbxSonuc);
    };
  }, []);

  // DIŞARI TIKLANINCA MİNİMİZE ET (AKTİF ÇAĞRI YOKSA)
  useEffect(() => {
    if (minimized) return;
    const handleClickOutside = (e) => {
      if (activeCall) return; // AKTİF ÇAĞRI VARKEN MİNİMİZE ETME
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setMinimized(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [minimized, activeCall]);

  /* YETKİ YOKSA RENDER ETME (HOOK'LARDAN SONRA) */
  if (!netsantralIzin) return null;

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // NUMARA TUŞU
  const dialKey = (key) => {
    setNumber(prev => prev + key);
  };

  // GİDEN ARAMA BAŞLAT - NETSANTRAL PBX ORIGINATE API İLE
  const aramaBaslat = async () => {
    if (!number) return;

    /* DAHİLİ KONTROLÜ */
    if (!MR._netsantralDahili) {
      setStatusMsg('DAHİLİ NUMARASI TANIMLI DEĞİL! SİSTEM > AYARLAR > NETSANTRAL BÖLÜMÜNDEN DAHİLİ GİRİN.');
      setTimeout(() => setStatusMsg(''), 6000);
      return;
    }

    setStatusMsg('GİDEN ARAMA BAŞLATILIYOR...');
    setStatus('araniyor');
    setMinimized(false);
    pbxOriginatedRef.current = false;

    /* NUMARA TEMİZLEME VE NORMALİZASYON */
    let cleanNum = number.replace(/[\s\-\(\)\+]/g, '');
    if (cleanNum.startsWith('90') && cleanNum.length >= 12) {
      /* ZATEN 90 İLE BAŞLIYOR */
    } else if (cleanNum.startsWith('0') && cleanNum.length >= 11) {
      cleanNum = '90' + cleanNum.substring(1);
    } else if (cleanNum.length === 10 && /^\d{10}$/.test(cleanNum)) {
      cleanNum = '90' + cleanNum;
    }

    console.log('[NETSANTRAL PANEL] ARAMA:', cleanNum, '| DAHİLİ:', MR._netsantralDahili);

    /* GİDEN ARAMA LOGU OLUŞTUR */
    activeLogIdRef.current = 0;
    try {
      const logR = await api.netsantralAramaLogCreate({
        arayan: MR._netsantralDahili,
        aranan: cleanNum,
        arayan_adi: '',
        yon: 'giden',
        durum: 'araniyor'
      });
      if (logR?.success && logR.data?.log_id) {
        activeLogIdRef.current = logR.data.log_id;
      }
    } catch(e) {}

    /* PBX ORIGINATE: ÖNCEKİ DAHİLİNİZİ ÇALDIRIR, AÇTIĞINIZDA HEDEF NUMARAYI BAĞLAR */
    try {
      const r = await api.netsantralOriginate(cleanNum, MR._netsantralDahili);
      console.log('[NETSANTRAL PANEL] ORIGINATE YANIT:', JSON.stringify(r));
      if (r?.success && r.data?.success_api) {
        pbxOriginatedRef.current = true;
        setActiveCall(true);
        setStatus('gorusmede');
        setStatusMsg('ÇAĞRI BAĞLANDI - ' + cleanNum);
        /* LOG GÜNCELLE: GÖRÜŞMEDE */
        if (activeLogIdRef.current) {
          api.netsantralAramaLogUpdate({ log_id: activeLogIdRef.current, durum: 'gorusmede' }).catch(() => {});
        }
      } else {
        const hataMesaj = r?.data?.response?.hata_mesaj || r?.error || 'PBX ÇAĞRI BAŞLATILAMADI';
        setStatusMsg('HATA: ' + hataMesaj);
        setStatus('hazir');
        /* LOG GÜNCELLE: BAŞARISIZ */
        if (activeLogIdRef.current) {
          api.netsantralAramaLogUpdate({ log_id: activeLogIdRef.current, durum: 'basarisiz', notlar: hataMesaj }).catch(() => {});
          activeLogIdRef.current = 0;
        }
        alert('ARAMA HATASI: ' + hataMesaj);
      }
    } catch(e) {
      console.error('[NETSANTRAL PANEL] BAĞLANTI HATASI:', e);
      setStatusMsg('NETSANTRAL BAĞLANTI HATASI - İNTERNET BAĞLANTINIZI KONTROL EDİN');
      setStatus('hazir');
      if (activeLogIdRef.current) {
        api.netsantralAramaLogUpdate({ log_id: activeLogIdRef.current, durum: 'basarisiz', notlar: 'BAĞLANTI HATASI' }).catch(() => {});
        activeLogIdRef.current = 0;
      }
      alert('NETSANTRAL BAĞLANTI HATASI! İNTERNET BAĞLANTINIZI KONTROL EDİN.');
    }

    setTimeout(() => setStatusMsg(''), 5000);
  };

  // GİDEN ARAMAYI SONLANDIR - PBX HANGUP API İLE
  const aramaKapat = async () => {
    setHangupLoading(true);
    setStatusMsg('ÇAĞRI SONLANDIRILIYOR...');

    let hangupOk = false;

    /* PBX HANGUP API İLE ÇAĞRIYI SONLANDIR */
    const maxRetry = 3;
    for (let attempt = 1; attempt <= maxRetry; attempt++) {
      try {
        const r = await api.netsantralHangup(MR._netsantralDahili || undefined);
        if (r?.success && r.data?.success_api) {
          hangupOk = true;
          break;
        } else if (r?.success && !r.data?.success_api) {
          const hataMesaj = r.data?.response?.hata_mesaj || r.data?.response?.raw_response || '';
          const hataKodu = r.data?.response?.hata_kodu || '';
          /* 70 = GEÇERSİZ PARAMETRE = ÇAĞRI ZATEN BİTMİŞ */
          if (hataKodu === '70' || (hataMesaj && (hataMesaj.includes('70') || hataMesaj.includes('GEÇERSİZ') || hataMesaj.includes('PARAMETRE') || hataMesaj.includes('AKTİF DEĞİL')))) {
            hangupOk = true;
            break;
          }
          if (hataMesaj) setStatusMsg(`DENEME ${attempt}/${maxRetry}: ${hataMesaj}`);
        } else {
          setStatusMsg(`DENEME ${attempt}/${maxRetry}: ${r?.error || 'ÇAĞRI SONLANDIRMA HATASI'}`);
        }
      } catch(e) {
        setStatusMsg(`DENEME ${attempt}/${maxRetry}: BAĞLANTI HATASI`);
      }
      if (attempt < maxRetry) await new Promise(ok => setTimeout(ok, 1500));
    }

    setHangupLoading(false);

    /* ARAMA LOGUNU GÜNCELLE: SONLANDI + SÜRE */
    const aramaLogSure = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : callTimer;
    if (activeLogIdRef.current) {
      api.netsantralAramaLogHangup({ log_id: activeLogIdRef.current, sure: aramaLogSure }).catch(() => {});
    } else {
      /* LOG ID YOK - EN SON AKTİF ÇAĞRIYI SONLANDIR */
      api.netsantralAramaLogHangup({ log_id: 0, sure: aramaLogSure }).catch(() => {});
    }

    /* UI'I TEMİZLE - PBX YANIT VERMEMİŞ OLSA BİLE ÇAĞRI BİTMİŞ SAYILIR */
    setActiveCall(false);
    setMuted(false);
    setStatus('hazir');
    setTransferOpen(false);
    pbxOriginatedRef.current = false;
    activeLogIdRef.current = 0;
    setStatusMsg(hangupOk ? 'ÇAĞRI SONLANDIRILDI' : 'ÇAĞRI SONLANDIRILDI (PBX ZATEN KAPANMIŞ OLABİLİR)');
    window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
    setTimeout(() => setStatusMsg(''), 3000);
  };

  // ZORLA ÇAĞRI SONLANDIR (NETSANTRAL'DAN YANIT ALINAMADIĞINDA)
  const zorlaKapat = () => {
    const aramaLogSure = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : callTimer;
    if (activeLogIdRef.current) {
      api.netsantralAramaLogHangup({ log_id: activeLogIdRef.current, sure: aramaLogSure }).catch(() => {});
    }
    setActiveCall(false);
    setMuted(false);
    setStatus('hazir');
    setTransferOpen(false);
    pbxOriginatedRef.current = false;
    activeLogIdRef.current = 0;
    setStatusMsg('ÇAĞRI ZORLA SONLANDIRILDI');
    setHangupLoading(false);
    window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
    setTimeout(() => setStatusMsg(''), 3000);
  };

  // SESİ KAPAT/AÇ
  const toggleMute = async () => {
    const newState = muted ? 'off' : 'on';
    const r = await api.netsantralMute(newState, MR._netsantralDahili || undefined);
    setMuted(!muted);
    setStatusMsg(muted ? 'MİKROFON AÇILDI' : 'MİKROFON KAPATILDI');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  // TRANSFER
  const transferYap = async () => {
    if (!transferNum) return;
    setStatusMsg('TRANSFER EDİLİYOR...');
    const r = await api.netsantralTransfer(transferNum, MR._netsantralDahili || undefined);
    setStatusMsg('TRANSFER YAPILDI');
    setTransferOpen(false);
    setTransferNum('');
    setActiveCall(false);
    setStatus('hazir');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  // DURUM RENKLERİ
  const statusColors = {
    hazir: C.success,
    araniyor: C.warning,
    gorusmede: C.accent,
    mola: C.purple
  };
  const statusLabels = {
    hazir: 'HAZIR',
    araniyor: 'ARANIYOR',
    gorusmede: 'GÖRÜŞMEDE',
    mola: 'MOLADA'
  };

  const statusColor = statusColors[status] || C.success;

  // DIALPAD TUŞLARI
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  // MİNİMİZE GÖRÜNÜM
  if (minimized) {
    return (
      <div onClick={() => setMinimized(false)} style={{
        position: 'fixed', bottom: 60, right: 24, zIndex: 9998,
        width: 52, height: 52, borderRadius: '50%',
        background: activeCall ? C.accent : `${C.success}22`,
        border: `2px solid ${activeCall ? C.accent : C.success}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,.4)',
        transition: 'all .3s',
        animation: activeCall ? 'pulse 1.5s infinite' : 'none'
      }} title="GİDEN ARAMA PANELİ">
        <LIcon name="Phone" size={22} color={activeCall ? '#fff' : C.success}/>
        {activeCall && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: C.danger, color: '#fff',
            fontSize: 8, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{fmtTime(callTimer)}</div>
        )}
        {/* DURUM NOKTASI */}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: '50%',
          background: statusColor, border: '2px solid #0B1120'
        }}/>
      </div>
    );
  }

  // AÇIK GÖRÜNÜM
  return (
    <div ref={panelRef} style={{
      position: 'fixed', bottom: 60, right: 24, zIndex: 9998,
      width: 320, background: C.bgCard,
      border: `1px solid ${C.border}`, borderRadius: 16,
      boxShadow: '0 10px 50px rgba(0,0,0,.5)',
      overflow: 'hidden', animation: 'slideUp .2s ease-out'
    }}>
      {/* BAŞLIK */}
      <div style={{
        padding: '10px 14px', background: `${statusColor}15`,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: statusColor, boxShadow: `0 0 8px ${statusColor}`
          }}/>
          <span style={{fontSize: 11, fontWeight: 700, color: statusColor}}>
            {statusLabels[status]}
          </span>
          {activeCall && (
            <span style={{fontSize: 11, fontWeight: 800, color: C.text, fontFamily: 'monospace'}}>
              {fmtTime(callTimer)}
            </span>
          )}
        </div>
        <div style={{display: 'flex', gap: 2}}>
          <div onClick={() => setMinimized(true)} style={{
            cursor: 'pointer', padding: 4, borderRadius: 6,
            transition: 'background .15s'
          }} title="KÜÇÜLT"
            onMouseEnter={e => e.currentTarget.style.background = `${C.textMuted}22`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LIcon name="Minus" size={14} color={C.textMuted}/>
          </div>
          <div onClick={() => setMinimized(true)} style={{
            cursor: 'pointer', padding: 4, borderRadius: 6,
            transition: 'background .15s'
          }} title="KAPAT"
            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}22`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LIcon name="X" size={14} color={C.textMuted}/>
          </div>
        </div>
      </div>

      {/* DURUM MESAJI */}
      {statusMsg && (
        <div style={{
          padding: '6px 14px', background: `${C.warning}15`,
          fontSize: 10, fontWeight: 600, color: C.warning, textAlign: 'center'
        }}>{statusMsg}</div>
      )}

      {/* NUMARA GİRİŞİ */}
      <div style={{padding: '12px 14px'}}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.bgInput, border: `1px solid ${C.borderLight}`,
          borderRadius: 10, padding: '8px 12px'
        }}>
          <LIcon name="Phone" size={16} color={C.textMuted}/>
          <input
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="GİDEN ARAMA İÇİN NUMARA GİRİN..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: C.text, fontSize: 16, fontWeight: 700,
              letterSpacing: 1, outline: 'none', fontFamily: 'monospace'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !activeCall) aramaBaslat(); }}
          />
          {number && (
            <div onClick={() => setNumber('')} style={{cursor: 'pointer', padding: 2}}>
              <LIcon name="X" size={14} color={C.textMuted}/>
            </div>
          )}
        </div>
      </div>

      {/* KONTROL BUTONLARI */}
      <div style={{padding: '0 14px 12px', display: 'flex', gap: 8}}>
        {!activeCall ? (
          <button onClick={aramaBaslat} disabled={!number} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none',
            background: number ? C.success : `${C.success}33`,
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: number ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: number ? 1 : 0.5
          }}>
            <LIcon name="PhoneCall" size={16} color="#fff"/> GİDEN ARAMA YAP
          </button>
        ) : (
          <>
            <button onClick={aramaKapat} disabled={hangupLoading} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: C.danger, color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: hangupLoading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: hangupLoading ? 0.7 : 1
            }}>
              <LIcon name="PhoneOff" size={16} color="#fff"/>
              {hangupLoading ? 'SONLANDIRILIYOR...' : 'GÖRÜŞME KAPAT'}
            </button>
            <button onClick={toggleMute} style={{
              padding: '10px 14px', borderRadius: 10, border: 'none',
              background: muted ? `${C.warning}33` : `${C.textMuted}22`,
              color: muted ? C.warning : C.textSec,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <LIcon name={muted ? 'MicOff' : 'Mic'} size={14} color={muted ? C.warning : C.textSec}/>
            </button>
            <button onClick={() => setTransferOpen(!transferOpen)} style={{
              padding: '10px 14px', borderRadius: 10, border: 'none',
              background: transferOpen ? `${C.purple}33` : `${C.textMuted}22`,
              color: transferOpen ? C.purple : C.textSec,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <LIcon name="ArrowRightLeft" size={14} color={transferOpen ? C.purple : C.textSec}/>
            </button>
          </>
        )}
      </div>

      {/* ZORLA KAPAT BUTONU - HANGUP BAŞARISIZ OLDUĞUNDA */}
      {activeCall && !hangupLoading && statusMsg && statusMsg.includes('SONLANDIRILAMADI') && (
        <div style={{padding: '0 14px 12px'}}>
          <button onClick={zorlaKapat} style={{
            width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${C.warning}`,
            background: `${C.warning}22`, color: C.warning, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            <LIcon name="XCircle" size={14} color={C.warning}/> ZORLA SONLANDIR
          </button>
        </div>
      )}

      {/* TRANSFER PANELİ */}
      {transferOpen && activeCall && (
        <div style={{padding: '0 14px 12px'}}>
          <div style={{
            padding: 10, background: `${C.purple}11`, borderRadius: 10,
            border: `1px solid ${C.purple}22`
          }}>
            <div style={{fontSize: 10, fontWeight: 700, color: C.purple, marginBottom: 8}}>
              <LIcon name="ArrowRightLeft" size={12} color={C.purple}/> TRANSFER
            </div>
            <div style={{display: 'flex', gap: 6}}>
              <input
                value={transferNum}
                onChange={e => setTransferNum(e.target.value)}
                placeholder="HEDEF NUMARA..."
                style={{
                  flex: 1, padding: '8px 10px', background: C.bgInput,
                  border: `1px solid ${C.borderLight}`, borderRadius: 8,
                  color: C.text, fontSize: 12, outline: 'none'
                }}
              />
              <button onClick={transferYap} style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: C.purple, color: '#fff', fontSize: 11,
                fontWeight: 700, cursor: 'pointer'
              }}>TRANSFER</button>
            </div>
          </div>
        </div>
      )}

      {/* DIALPAD TOGGLE */}
      <div style={{
        padding: '0 14px 12px', display: 'flex', justifyContent: 'center'
      }}>
        <div onClick={() => setDialpadOpen(!dialpadOpen)} style={{
          cursor: 'pointer', fontSize: 10, fontWeight: 600,
          color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4
        }}>
          <LIcon name={dialpadOpen ? 'ChevronDown' : 'ChevronUp'} size={12} color={C.textMuted}/>
          {dialpadOpen ? 'TUŞLARI GİZLE' : 'TUŞLARI GÖSTER'}
        </div>
      </div>

      {/* DIALPAD */}
      {dialpadOpen && (
        <div style={{padding: '0 14px 14px'}}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6
          }}>
            {keys.flat().map(k => (
              <button key={k} onClick={() => dialKey(k)} style={{
                padding: '12px 0', borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.bgHover, color: C.text,
                fontSize: 18, fontWeight: 700, cursor: 'pointer',
                transition: 'all .15s', fontFamily: 'monospace'
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}22`}
                onMouseLeave={e => e.currentTarget.style.background = C.bgHover}
              >{k}</button>
            ))}
          </div>
          {/* SİL BUTONU */}
          <div style={{marginTop: 6, display: 'flex', justifyContent: 'center'}}>
            <div onClick={() => setNumber(prev => prev.slice(0, -1))} style={{
              cursor: 'pointer', padding: '6px 20px', borderRadius: 8,
              background: `${C.warning}22`, color: C.warning,
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <LIcon name="Delete" size={14} color={C.warning}/> SİL
            </div>
          </div>
        </div>
      )}

      {/* ANİMASYON */}
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
};

/* ═══ GELEN ÇAĞRI POPUP ═══ */
const GelenCagriPopup = ({call, onKapat, onCrmGit, setPage}) => {
  const {C, LIcon} = MR;
  if (!call) return null;
  return (
    <div style={{
      position:'fixed', top:60, right:24, zIndex:9999, width:360,
      background:C.bgCard, border:`2px solid ${C.success}`, borderRadius:16,
      boxShadow:'0 20px 60px rgba(0,0,0,.5)', overflow:'hidden',
      animation:'slideInRight .3s ease-out'
    }}>
      <div style={{
        padding:'14px 16px', background:`${C.success}15`,
        display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.success}30`
      }}>
        <div style={{
          width:36, height:36, borderRadius:'50%', background:`${C.success}25`,
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'pulse 1.5s infinite'
        }}>
          <LIcon name="PhoneIncoming" size={18} color={C.success}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:800, color:C.success}}>GELEN ÇAĞRI</div>
          <div style={{fontSize:10, color:C.textMuted}}>{call.aramaTarihi || new Date().toLocaleTimeString('tr-TR')}</div>
        </div>
        <button onClick={onKapat} style={{background:'none', border:'none', cursor:'pointer', padding:4}}>
          <LIcon name="X" size={16} color={C.textMuted}/>
        </button>
      </div>
      <div style={{padding:16}}>
        <div style={{fontSize:22, fontWeight:800, letterSpacing:1.5, marginBottom:6, color:C.text}}>
          {call.arayan || 'BİLİNMEYEN'}
        </div>
        {call.arayanAdi && <div style={{fontSize:13, color:C.textSec, marginBottom:12}}>{call.arayanAdi}</div>}
        {call.crm_kayit && (
          <div style={{padding:'8px 12px', background:`${C.accent}12`, borderRadius:8, marginBottom:12, fontSize:11, display:'flex', alignItems:'center', gap:6}}>
            <LIcon name="User" size={14} color={C.accent}/>
            <span style={{fontWeight:600}}>CRM KAYITLI: {call.crm_kayit.ad_soyad}</span>
          </div>
        )}
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => { onCrmGit(call); onKapat(); }} style={{
            flex:1, padding:'10px', borderRadius:8, border:'none', cursor:'pointer',
            background:C.accent, color:'#fff', fontSize:12, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6
          }}>
            <LIcon name="UserPlus" size={14} color="#fff"/> CRM KAYIT OLUŞTUR
          </button>
          <button onClick={onKapat} style={{
            padding:'10px 16px', borderRadius:8, border:`1px solid ${C.border}`, cursor:'pointer',
            background:'transparent', color:C.textSec, fontSize:12, fontWeight:600
          }}>KAPAT</button>
        </div>
      </div>
    </div>
  );
};

/* ═══ ANA UYGULAMA ═══ */
const App = () => {
  const {C, api, LoginScreen} = MR;
  const [user, setUser] = useState(null);
  const [page, setPageState] = useState(getPageFromHash());
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);
  const [bgLogoUrl, setBgLogoUrl] = useState(MR.logoUrl || '');
  const [gelenCagri, setGelenCagri] = useState(null);
  const [motivasyonSoz, setMotivasyonSoz] = useState('');
  const [sozFade, setSozFade] = useState(true);

  /* URL HASH ROUTING - SAYFA DEĞİŞİNCE URL GÜNCELLENİR */
  const setPage = useCallback((p) => {
    setPageState(p);
    const hash = p === 'home' ? '/' : '/' + p;
    window.history.pushState({page: p}, '', '#' + hash);
    window.scrollTo(0, 0);
  }, []);

  /* TARAYıCı GERİ/İLERİ TUŞLARI */
  useEffect(() => {
    const onPopState = () => {
      setPageState(getPageFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    (async () => {
      if (api.token) {
        const r = await api.me();
        if (r?.success) { setUser(r.data?.user || r.data); }
        else { api.setToken(null); }
      }
      setLoading(false);
    })();
  }, []);

  /* NETSANTRAL DAHİLİ NUMARASINI YÜKLE (GİDEN ARAMA İÇİN KRİTİK) */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const r = await api.ayarlarList();
        if (r?.success && r.data) {
          MR._netsantralDahili = r.data.netsantral_dahili || '';
          MR._netsantralAktif = r.data.netsantral_aktif === '1' || r.data.netsantral_aktif === 1;
          MR._netsantralSantralNo = r.data.netsantral_santral_no || '';
          console.log('[NETSANTRAL] AYARLAR YÜKLENDİ - DAHİLİ:', MR._netsantralDahili || 'BOŞ!', '| AKTİF:', MR._netsantralAktif, '| SANTRAL:', MR._netsantralSantralNo || 'BOŞ!');
          if (!MR._netsantralDahili) {
            console.warn('[NETSANTRAL] UYARI: DAHİLİ NUMARASI TANIMLANMAMIŞ! SİSTEM > AYARLAR > NETSANTRAL BÖLÜMÜNDEN TANIMLAYIN.');
          }
        } else {
          console.warn('[NETSANTRAL] AYARLAR YÜKLENEMEDI:', r);
        }
      } catch(e) {
        console.error('[NETSANTRAL] AYARLAR YÜKLENME HATASI:', e);
      }
    })();
  }, [user]);

  /* TEMA DEĞİŞİMİ DİNLEYİCİ */
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('mr-tema-degisti', handler);
    return () => window.removeEventListener('mr-tema-degisti', handler);
  }, []);

  /* NETSIPP GELEN ÇAĞRI DİNLEYİCİ (localStorage) - OTOMATİK CRM KAYIT EKRANI AÇ */
  /* YETKİ KONTROLÜ: ADMIN VEYA netsipp_goruntule / netsipp_gelen_cagri İZNİ GEREKLİ */
  const netsippIzinVar = user?.rol === 'admin' || user?.yetkiler?.netsipp_goruntule === 1 || user?.yetkiler?.netsipp_gelen_cagri === 1;

  const gelenCagriIsle = useCallback((data) => {
    if (!data || !data.timestamp || (Date.now() - data.timestamp > 30000)) return;
    /* POPUP GÖSTER (15 SANİYE GÖRÜNSÜN - KULLANICI İŞLEM YAPANA KADAR) */
    setGelenCagri(data);
    setTimeout(() => setGelenCagri(prev => prev?.timestamp === data.timestamp ? null : prev), 15000);
    /* SES BİLDİRİMİ - TARAYıCı İZİN VERİYORSA */
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.15;
      osc.start();
      setTimeout(() => { osc.frequency.value = 1000; }, 200);
      setTimeout(() => { osc.frequency.value = 800; }, 400);
      setTimeout(() => { osc.stop(); ac.close(); }, 600);
    } catch(e) {}
    /* OTOMATİK CRM YENİ KAYIT EKRANINA YÖNLENDİR */
    MR._gelenCagriTelefon = data.arayan;
    MR._gelenCagriAdi = data.arayanAdi || '';
    setPage('crm-yeni');
  }, [setPage]);

  useEffect(() => {
    if (!user || !netsippIzinVar) return;
    const handler = (e) => {
      if (e.key === 'mr_netsipp_gelen') {
        try {
          const data = JSON.parse(e.newValue);
          gelenCagriIsle(data);
        } catch(err) {}
      }
    };
    window.addEventListener('storage', handler);
    /* SAYFA AÇIKKEN DE KONTROL ET (AYNI SEKMEDE) */
    const checkLocal = () => {
      try {
        const raw = localStorage.getItem('mr_netsipp_gelen');
        if (raw) {
          const data = JSON.parse(raw);
          if (data && data.timestamp && (Date.now() - data.timestamp < 5000)) {
            localStorage.removeItem('mr_netsipp_gelen');
            gelenCagriIsle(data);
          }
        }
      } catch(err) {}
    };
    const iv = setInterval(checkLocal, 3000);
    return () => { window.removeEventListener('storage', handler); clearInterval(iv); };
  }, [user, netsippIzinVar, gelenCagriIsle]);

  /* NETSANTRAL WEBHOOK POLLING - GELEN ÇAĞRI KONTROLÜ */
  useEffect(() => {
    if (!user || !netsippIzinVar) return;
    const pollNetsantral = async () => {
      try {
        const r = await api.netsantralBekleyen();
        if (r?.success && r.data && r.data.length > 0) {
          const cagri = r.data[0]; // EN SON GELEN ÇAĞRI
          const data = {
            arayan: cagri.arayan_no,
            arayanAdi: cagri.arayan_adi || '',
            aranan: cagri.aranan_no || '',
            aramaId: cagri.arama_id || '',
            yon: 'gelen',
            timestamp: Date.now()
          };
          gelenCagriIsle(data);
          /* NETSANTRAL PANELİNE DE BİLDİR */
          window.dispatchEvent(new CustomEvent('mr-netsantral-gelen', {detail: data}));
        }
      } catch(e) {}
    };
    const iv = setInterval(pollNetsantral, 5000);
    return () => clearInterval(iv);
  }, [user, netsippIzinVar, gelenCagriIsle]);

  /* GİDEN ARAMA'DAN OTOMATİK CRM EKRANI AÇ - YETKİ KONTROLLÜ */
  useEffect(() => {
    if (!user || !netsippIzinVar) return;
    const handler = () => {
      setPage('crm-yeni');
    };
    window.addEventListener('mr-arama-crm-ac', handler);
    return () => window.removeEventListener('mr-arama-crm-ac', handler);
  }, [user, netsippIzinVar, setPage]);

  /* ARKA PLAN LOGO URL - SADECE GİRİŞ YAPILDIKTAN SONRA */
  useEffect(() => {
    if (!user) return;
    if (MR.logoUrl) { setBgLogoUrl(MR.logoUrl); return; }
    (async () => {
      try {
        const r = await api.ayarlarList();
        if (r?.success && r.data?.logo_url) {
          setBgLogoUrl(r.data.logo_url);
          MR.logoUrl = r.data.logo_url;
        }
      } catch(e) {}
    })();
  }, [user]);

  /* KULLANICI DEĞİŞTİĞİNDE GLOBAL REFERANSI GÜNCELLE (YETKİ KONTROLÜ İÇİN) */
  useEffect(() => {
    MR._currentUser = user;
  }, [user]);

  /* YEDEK SÖZLER - API BAŞARISIZ OLURSA BUNLARDAN GÖSTERİR (100+ SÖZ) */
  const yedekSozler = useMemo(() => [
    /* ═══ MAKYAVELİ BAKIŞ AÇISI - STRATEJİ, GÜÇ, PRAGMATIZM ═══ */
    'Güç, onu nasıl kullanacağını bilenlerin elinde anlam kazanır.',
    'Görünüş gerçekten daha çok konuşur; insanlar gözleriyle yargılar.',
    'Kazanan, doğru zamanda doğru hamleyi yapandır. Şans değil, strateji belirler.',
    'Korkulmak sevilmekten daha kalıcı bir saygı getirir.',
    'Kadere güvenen kaybetmeyi hak eder; hazırlığa güvenen kazanır.',
    'Her ittifak bir hesaptır; hesabını bilmeyen ortaklığa girmemeli.',
    'Merhamet zayıflara yakışır; güçlü olan adalet dağıtır.',
    'Düşmanını tanımak, dostunu tanımaktan daha önemlidir.',
    'Bir plan yapmayan, başkasının planının parçası olmaya mahkumdur.',
    'Fırsatlar hazırlanmış zihinlere gelir; tembelliğe değil.',
    'Güçlü olmak yetmez, güçlü görünmek de gerekir.',
    'Tarihten ders almayan, tarihin tekrarlanmasına mahkumdur.',
    'Doğru zamanda sessiz kalmak, yanlış zamanda konuşmaktan daha etkilidir.',
    'Bir zincir en zayıf halkası kadar güçlüdür; lider zayıflıklarını gizler.',
    'Mağlubiyet geçicidir ama ders almayanlar için kalıcıdır.',
    'İktidar koltuğu boş kalamaz; sen oturmasan başkası oturur.',
    'İnsanlar çıkarlarını tehdit edeni asla affetmez.',
    'Değişimi yönetemeyen, değişimin kurbanı olur.',
    'Bilgi güçtür ama paylaşılmamış bilgi daha büyük güçtür.',
    'Her karar bir bedeldir; bedelsiz kazanç yoktur.',
    'Zafer planlanır, tesadüf olmaz; başarı bir süreçtir.',
    'Düşmanına sırtını dönenin sonu hep aynıdır.',
    'Yenilik düşmanları, eskiden faydalananların ilkidir.',
    'Lider kararsız kalmaktansa yanlış karar vermelidir.',
    'Zayıflığını gösteren yardım değil, saldırı davet eder.',
    'Başarılı insan az konuşur, çok gözlemler.',
    'Kaderin yarısı bizim elimizdedir; diğer yarısı için hazırlıklı ol.',
    'Bir hedefe ulaşmak için bazen dolambaçlı yol en kısa yoldur.',
    'Her kriz bir fırsattır; fırsatı gören kazanır, krizi gören kaybeder.',
    'Kontrolü elinde tutan, sonucu belirler.',
    'İnsanlar sözlerden çok sonuçlara bakar.',
    'Gücünü gizleyen, gücünü kullanmaktan daha zekidir.',
    'Sistem kuran kalıcı olur, kahraman olan geçici.',
    'Savaş meydanında cesaret, masa başında zeka kazandırır.',
    'İşini iyi yapan sessiz kalır; sonuç onun adına konuşur.',
    'Barış, savaşa hazırlık döneminden başka bir şey değildir.',
    'İnsan doğası değişmez; onu anlayan yönetir.',
    'Zaman en büyük yargıçtır; bugünün kaybedeni yarının kazananı olabilir.',
    'Söz vermek kolay, söz tutmak zor; ama iktidar söz tutana aittir.',
    'Cesaret risk almaktır; korku ise yerinde saymaktır.',
    'Güveni kazanmak yıllar alır, kaybetmek bir an; stratejist güveni silah gibi kullanır.',
    'Dost çoğaldıkça düşman azalır; ama gerçek dost sayısı hep azdır.',
    'Diplomasi, savaşın başka yollarla devam ettirilmesidir.',
    'Halkı tanımak kendini tanımaktan daha önemlidir.',
    'Rakamlar yalan söylemez ama onları sunanlar söyleyebilir.',
    'Güçlü devletler güçlü kurumlarla, güçlü kurumlar güçlü insanlarla inşa edilir.',
    'Saygınlık itaat ile değil, başarı ile kazanılır.',
    'Herkes için mümkün olan bir iyilik kimse için değerli değildir.',
    'Taht oyunlarında ikinci olmak, hiç oynamamaktan daha tehlikelidir.',
    'Düşmanını küçümseyen, zaferi de küçümser.',
    'Güç boşluk kabul etmez; birisi doldurmuyorsa başkası doldurur.',
    'En tehlikeli düşman, dost gibi görünendir.',
    'Bir lider her şeyi bilemez ama her şeyi bileni bulmalıdır.',
    'Zamanı kontrol eden savaşı kontrol eder.',
    /* ═══ GENEL MOTİVASYON VE İŞ HAYATI ═══ */
    'Başarı, her gün küçük çabaların tekrarlanmasının toplamıdır. - Robert Collier',
    'Gelecek, bugünden hazırlananlarındır. - Malcolm X',
    'Yapabileceğine inanan yapabilir, inanamayan yapamaz. Bu değişmez bir kuraldır. - Pablo Picasso',
    'Bir adım atmadan yol alınmaz, bir söz söylemeden dert anlatılmaz.',
    'Büyük işler küçük adımlarla başlar.',
    'Sabır acıdır ama meyvesi tatlıdır. - Jean-Jacques Rousseau',
    'Zorluklar, başarıya giden yolun taşlarıdır.',
    'Hedefine odaklanan zihin, her engeli aşar.',
    'Bugünün işini yarına bırakma, yarının ne getireceği belirsizdir.',
    'Her şeyin bir başlangıcı vardır, ama devam eden kazanır.',
    'İnsan ancak hayal ettiği kadar büyüktür. - Atatürk',
    'Hayatta en hakiki mürşit ilimdir. - Atatürk',
    'Başarı yolculuğunda en büyük engel, kendi kendimize koyduğumuz sınırlardır.',
    'Zafer, zafer benimdir diyebilenindir. - Atatürk',
    'Yükselmek için tırmanmak gerekir, düşmek için bir anlık dikkatsizlik yeter.',
    'Kararlı bir insanın yapamayacağı hiçbir şey yoktur. - Emerson',
    'Güçlü insanlar başkaları için yol açar, zayıf insanlar yol kenarında bekler.',
    'Her başarının arkasında cesaret, her cesaretin arkasında inanç vardır.',
    'Adalet mülkün temelidir.',
    'Azim ve kararlılık her kapıyı açan anahtardır.',
    'Bilgi güçtür ama uygulanan bilgi gerçek güçtür. - Francis Bacon',
    'Fırtına ne kadar sert olursa olsun, güneş mutlaka doğar.',
    'Dünya cesur insanlar tarafından değiştirilir, korkaklar tarafından değil.',
    'İş yapan insan hata yapabilir ama hiçbir şey yapmayan en büyük hatayı yapar.',
    'Hayat bisiklete binmek gibidir. Dengenizi korumak için hareket etmeye devam etmelisiniz. - Einstein',
    'Başarılı insanlar işe başlar, başarısız insanlar bahane üretir.',
    'Bir şeyi değiştirmek istiyorsanız önce kendinizi değiştirin. - Gandhi',
    'Disiplin, motivasyon bittiğinde devreye giren güçtür.',
    'Başarı bir yolculuktur, varış noktası değil.',
    'Her gün bir önceki günden daha iyi olmak en büyük başarıdır.',
    'Sorunlara odaklanmayı bırak, çözümlere odaklan.',
    'Çalışmak şansı, şans ise başarıyı getirir.',
    'Vasat olmayı reddet, mükemmelliği hedefle.',
    'Düşmeyen yürüyemez; yürüyemeyen hedefe ulaşamaz.',
    'En iyi zaman şimdidir; en iyi yer buradasıdır.',
    'Rakiplerini tanı ama asıl rakibin dünkü kendindir.',
    'İmkansız diye bir şey yoktur, imkansızı mümkün kılan irade vardır.',
    'Hayaller gerçek olur diyenler, gece uyumadan çalışanlardır.',
    'Bir profesyonel, vazgeçmek istediğinde devam eden amatördür.',
    'Konfor alanın dışında büyüme başlar.',
    'Başarısızlık son değil, yeni bir başlangıçtır.',
    'İyi bir lider yol gösterir, mükemmel bir lider yol açar.',
    'Her sabah iki seçenek var: uyumaya devam et ya da kalk ve hayallerinin peşinden koş.',
    'Küçük düşünenler küçük kalır; büyük düşünenler tarihe geçer.',
    'Pes etmek kolaydır, devam etmek cesaret ister.',
    'Başarı tesadüf değildir; hazırlık, fırsat ve cesaretin buluşma noktasıdır.',
    'Engeller seni durdurmak için değil, ne kadar istediğini göstermek içindir.',
    'Bugün ektiğin tohum, yarın topladığın hasattır.',
    'İnanç dağları yerinden oynatır; kararlılık imparatorluklar kurar.',
    'Tek bir kıvılcım ormanı yakabilir; tek bir fikir dünyayı değiştirebilir.',
    'Zor zamanlarda güçlü insanlar ortaya çıkar.',
    'Yaptığın iş seni tanımlasın, söylediğin sözler değil.',
    'Mükemmel anı bekleme; anı mükemmel yap.',
    'Öğrenmek bir lükstür değil, hayatta kalmanın şartıdır.',
    'Hedefe giden yolda her adım önemlidir; hiçbiri boşa değildir.',
    'Güneşi görmek için fırtınayı geçmek gerekir.'
  ], []);

  /* AI MOTİVASYON SÖZÜ - HER SAYFA GEÇİŞİNDE YENİ SÖZ */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSozFade(false);
    const yedekSozGoster = () => {
      if (cancelled) return;
      const rastgele = yedekSozler[Math.floor(Math.random() * yedekSozler.length)];
      setMotivasyonSoz(rastgele);
      setTimeout(() => { if (!cancelled) setSozFade(true); }, 50);
    };
    const timer = setTimeout(async () => {
      try {
        const r = await api.motivasyonSoz();
        if (!cancelled) {
          if (r?.success && r.data?.soz) {
            setMotivasyonSoz(r.data.soz);
            setTimeout(() => { if (!cancelled) setSozFade(true); }, 50);
          } else {
            yedekSozGoster();
          }
        }
      } catch(e) {
        yedekSozGoster();
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user, page, yedekSozler]);

  /* LOGIN SONRASI ME.PHP'DEN YETKİLERİ ÇEK */
  const handleLogin = async (u) => {
    setUser(u);
    try {
      const r = await api.me();
      if (r?.success) { setUser(r.data?.user || r.data); }
    } catch(e) {}
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setPage('home');
  };

  if (loading) {
    return (
      <div style={{minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{width: 48, height: 48, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px'}}/>
          <div style={{fontSize: 12, color: C.textMuted}}>YÜKLENİYOR...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <div style={{minHeight: '100vh', background: C.bg, color: C.text, position: 'relative', overflow: 'hidden'}}>
      <TopNav user={user} page={page} setPage={setPage} onLogout={logout}/>

      {/* ARKA PLAN WATERMARK LOGO - TÜM SAYFALARDA */}
      {bgLogoUrl && (
        <div style={{
          position: 'fixed', top: 48, left: 0, right: 0, bottom: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 0
        }}>
          <img src={bgLogoUrl} alt="" style={{
            maxWidth: '60vw', maxHeight: '70vh', width: 'auto', height: 'auto',
            objectFit: 'contain',
            opacity: MR.tema === 'koyu' ? 0.07 : 0.10,
            filter: MR.tema === 'koyu' ? 'brightness(0) invert(1)' : 'none',
            pointerEvents: 'none', userSelect: 'none'
          }}/>
        </div>
      )}

      <div style={{maxWidth: 1400, margin: '0 auto', padding: '0 24px 40px', position: 'relative', zIndex: 1}}>
        <Breadcrumb page={page} setPage={setPage}/>
        <PageRouter page={page} setPage={setPage} user={user} setUser={setUser}/>
      </div>

      {/* MOTİVASYON SÖZÜ + SLOGAN - ALT KISIMDA SABİT */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        textAlign: 'center',
        background: `linear-gradient(transparent, ${C.bg} 30%)`,
        zIndex: 10, pointerEvents: 'none', padding: '20px 40px 10px'
      }}>
        {/* AI MOTİVASYON SÖZÜ */}
        {motivasyonSoz && (
          <div style={{
            fontSize: 13, fontWeight: 500, fontStyle: 'italic',
            color: MR.tema === 'koyu' ? '#ffffff' : '#0f172a',
            letterSpacing: 0.5, lineHeight: 1.6,
            maxWidth: 700, margin: '0 auto 8px',
            opacity: sozFade ? 0.85 : 0,
            transform: sozFade ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity .8s ease, transform .8s ease'
          }}>
            {motivasyonSoz}
          </div>
        )}
        {/* SLOGAN */}
        <div style={{
          fontSize: 12, fontWeight: 800,
          color: MR.tema === 'koyu' ? '#ffffff' : '#0f172a',
          letterSpacing: 6,
          opacity: 0.9
        }}>
          HER ZAMAN FARK EDER
        </div>
      </div>

      {/* GELEN ÇAĞRI POPUP - YETKİ KONTROLLÜ */}
      {netsippIzinVar && <GelenCagriPopup
        call={gelenCagri}
        onKapat={() => setGelenCagri(null)}
        onCrmGit={(call) => {
          MR._gelenCagriTelefon = call.arayan;
          MR._gelenCagriAdi = call.arayanAdi || '';
          setPage('crm-yeni');
        }}
        setPage={setPage}
      />}

      {/* NETSANTRAL FLOATING KONTROL PANELİ - YETKİ KONTROLLÜ */}
      <NetsantralPanel user={user}/>

      {/* ANİMASYON CSS */}
      <style>{`
        @keyframes slideInRight{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>
    </div>
  );
};

/* ═══ RENDER ═══ */
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
