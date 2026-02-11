/**
 * MR HASAR DANIŞMANLIK - ANA UYGULAMA
 * NAVİGASYON, ROUTER, BREADCRUMB, ANA YAPI
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef} = React;

/* ═══ MENÜ YAPILANDIRMASI ═══ */
const MENU = [
  {id:'dosya', label:'DOSYA İŞLEMLERİ', icon:'FolderOpen', sub:[
    {id:'dosya-liste', label:'DOSYA LİSTESİ', icon:'List'},
    {id:'dosya-yeni', label:'YENİ DOSYA', icon:'Plus'}
  ]},
  {id:'crm', label:'CRM', icon:'Users', sub:[
    {id:'crm-liste', label:'CRM LİSTESİ', icon:'List'},
    {id:'crm-yeni', label:'YENİ KAYIT', icon:'UserPlus'}
  ]},
  {id:'hesap', label:'HESAPLAMALAR', icon:'Calculator', sub:[
    {id:'hesap-adk', label:'ARAÇ DEĞER KAYBI', icon:'Car'},
    {id:'hesap-bh', label:'BEDENİ HASAR', icon:'Heart'}
  ]},
  {id:'servis', label:'SERVİSLER', icon:'Wrench', sub:[
    {id:'servis-liste', label:'SERVİS LİSTESİ', icon:'List'},
    {id:'servis-yeni', label:'YENİ SERVİS', icon:'Plus'},
    {id:'servis-rapor', label:'SERVİS RAPORLARI', icon:'BarChart3'}
  ]},
  {id:'ortaklar', label:'ORTAKLAR', icon:'Handshake', sub:[
    {id:'ortaklar-ortaklar', label:'İŞ ORTAKLARI', icon:'Briefcase'},
    {id:'ortaklar-paydaslar', label:'İŞ PAYDAŞLARI', icon:'Network'}
  ]},
  {id:'muhasebe', label:'MUHASEBE', icon:'Landmark', sub:[
    {id:'muhasebe-gelir', label:'GELİR YÖNETİMİ', icon:'TrendingUp'},
    {id:'muhasebe-gider', label:'GİDER YÖNETİMİ', icon:'TrendingDown'},
    {id:'muhasebe-komisyon', label:'KOMİSYON / PRİM', icon:'Percent'},
    {id:'muhasebe-kasa', label:'KASA / BANKA', icon:'Wallet'},
    {id:'muhasebe-maliyet', label:'MALİYET ANALİZİ', icon:'PieChart'},
    {id:'muhasebe-rapor', label:'FİNANSAL RAPORLAR', icon:'BarChart3'}
  ]},
  {id:'tanimlamalar', label:'TANIMLAMALAR', icon:'Database', sub:[
    {id:'tanimlamalar-dosya', label:'DOSYA TANIMLAMALARI', icon:'Folder'},
    {id:'tanimlamalar-evrak', label:'EVRAK TANIMLAMALARI', icon:'FileText'},
    {id:'tanimlamalar-finansal', label:'FİNANSAL TANIMLAMALAR', icon:'Wallet'},
    {id:'tanimlamalar-sablon', label:'MATBU EVRAK / SÖZLEŞME', icon:'FileSignature'},
    {id:'tanimlamalar-genel', label:'GENEL TANIMLAMALAR', icon:'Settings'}
  ]},
  {id:'ajanda', label:'AJANDA', icon:'CalendarDays'},
  {id:'mesajlar', label:'MESAJLAR', icon:'Mail', sub:[
    {id:'mesajlar-gelen', label:'GELEN KUTUSU', icon:'Inbox'},
    {id:'mesajlar-giden', label:'GİDEN KUTUSU', icon:'Send'},
    {id:'mesajlar-yeni', label:'YENİ MESAJ', icon:'PenSquare'},
    {id:'mesajlar-sistem', label:'SİSTEM BİLDİRİMLERİ', icon:'Bell'}
  ]},
  {id:'sistem', label:'SİSTEM', icon:'Shield', sub:[
    {id:'sistem-kullanici', label:'KULLANICI YÖNETİMİ', icon:'UserCog'},
    {id:'sistem-yetki', label:'YETKİ YÖNETİMİ', icon:'KeyRound'},
    {id:'sistem-ayarlar', label:'FİRMA AYARLARI', icon:'Settings'},
    {id:'sistem-log', label:'LOG KAYITLARI', icon:'FileText'}
  ]}
];

/* ═══ ROL BAZLI ERİŞİM ═══ */
const ROL_ERISIM = {
  admin: null,
  avukat: ['home','dosya','crm','hesap','servis','ortaklar','ajanda','mesajlar'],
  uzman: ['home','dosya','hesap','servis','ajanda','mesajlar'],
  personel: ['home','dosya','ajanda','mesajlar'],
  muhasebe: ['home','dosya','muhasebe','ortaklar','tanimlamalar','ajanda','mesajlar'],
  portal: ['home','dosya','mesajlar']
};

/* MENÜ ID → VERİTABANI MODÜL ADI EŞLEMESİ */
const MENU_MODUL = {
  dosya: 'dosya',
  crm: 'crm',
  hesap: 'hesaplamalar',
  servis: 'servis',
  ortaklar: 'ortaklar',
  muhasebe: 'muhasebe',
  tanimlamalar: 'tanimlamalar',
  ajanda: 'ajanda',
  mesajlar: 'mesajlar',
  sistem: 'sistem'
};

function menuErisim(user) {
  /* ADMIN HER ZAMAN TÜM MENÜYÜ GÖRÜR */
  if (user?.rol === 'admin') return MENU;

  const yetkiler = user?.yetkiler;

  /* YETKİLER VARSA VERİTABANINDAKİ İZİNLERE GÖRE FİLTRELE */
  if (yetkiler && Object.keys(yetkiler).length > 0) {
    return MENU.filter(m => {
      /* ANA SAYFA HER ZAMAN GÖRÜNSİN */
      if (m.id === 'home') return true;
      /* MODÜL ADINI BUL */
      const modul = MENU_MODUL[m.id];
      if (!modul) return false;
      /* modul_goruntule = 1 İSE GÖSTER */
      return yetkiler[modul + '_goruntule'] === 1;
    });
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
  const [logoUrl, setLogoUrl] = useState(MR.logoUrl || '');
  const navRef = useRef(null);
  const filteredMenu = menuErisim(user);

  /* LOGO URL'İNİ AYARLARDAN ÇEK */
  useEffect(() => {
    (async () => {
      try {
        const r = await api.ayarlarList();
        if (r?.success && r.data?.logo_url) {
          setLogoUrl(r.data.logo_url);
          MR.logoUrl = r.data.logo_url;
        }
      } catch(e) {}
    })();
  }, []);

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
      display: 'flex', alignItems: 'center', padding: '0 12px', height: 54,
      position: 'sticky', top: 0, zIndex: 1000, gap: 0
    }}>
      {/* LOGO */}
      <div onClick={() => setPage('home')} style={{
        display: 'flex', alignItems: 'center', cursor: 'pointer',
        height: 42, marginRight: 8, flexShrink: 0
      }}>
        {logoUrl ? (
          <img src={logoUrl} alt="LOGO" style={{
            height: 38, width: 'auto', maxWidth: 140, objectFit: 'contain',
            filter: MR.tema === 'koyu' ? 'brightness(0) invert(1)' : 'none'
          }}/>
        ) : (
          <div style={{
            width: 34, height: 34, minWidth: 34, borderRadius: 8,
            background: `${C.accent}22`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 13, fontWeight: 900, color: C.accent
          }}>MR</div>
        )}
      </div>

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
                fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
                color: isActive(m) ? C.accent : C.textSec,
                background: isActive(m) ? `${C.accent}15` : 'transparent',
                transition: 'all .2s', position: 'relative'
              }}
              onMouseEnter={e => { if (!isActive(m)) e.currentTarget.style.background = `${C.accent}08`; }}
              onMouseLeave={e => { if (!isActive(m)) e.currentTarget.style.background = 'transparent'; }}
            >
              <LIcon name={m.icon} size={13} color={isActive(m) ? C.accent : C.textMuted}/>
              <span>{m.label}</span>
              {m.id === 'mesajlar' && bildirimSayisi > 0 && (
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
          width: 34, height: 34, minWidth: 34, borderRadius: 8, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: MR.tema === 'koyu' ? `${C.warning}22` : `${C.purple}22`,
          border: `1px solid ${MR.tema === 'koyu' ? C.warning + '44' : C.purple + '44'}`,
          transition: 'all .2s'
        }} title={MR.tema === 'koyu' ? 'AÇIK TEMA' : 'KOYU TEMA'}>
          <LIcon name={MR.tema === 'koyu' ? 'Sun' : 'Moon'} size={15} color={MR.tema === 'koyu' ? C.warning : C.purple}/>
        </div>

        {/* PROFİL */}
        <div style={{position: 'relative'}}>
          <div onClick={() => setProfilOpen(!profilOpen)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
            borderRadius: 8, cursor: 'pointer', border: `1px solid ${C.border}`,
            height: 34
          }}>
            <div style={{
              width: 26, height: 26, minWidth: 26, borderRadius: 6,
              background: `${C.accent}22`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: C.accent
            }}>{(user?.ad_soyad || 'U')[0]}</div>
            <div style={{overflow: 'hidden'}}>
              <div style={{fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100}}>{user?.ad_soyad}</div>
              <div style={{fontSize: 8, color: C.textMuted, whiteSpace: 'nowrap'}}>{(user?.rol || '').toUpperCase()}</div>
            </div>
            <LIcon name="ChevronDown" size={10} color={C.textMuted}/>
          </div>

          {profilOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: 6, minWidth: 200,
              boxShadow: '0 10px 40px rgba(0,0,0,.5)', zIndex: 1001
            }}>
              <div style={{padding: '10px 14px', borderBottom: `1px solid ${C.border}`, marginBottom: 4}}>
                <div style={{fontSize: 12, fontWeight: 600}}>{user?.ad_soyad}</div>
                <div style={{fontSize: 10, color: C.textMuted}}>{user?.email}</div>
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
    if (page.startsWith('crm-detay-')) {
      if (m.id === 'crm') {
        parts.push({label: 'CRM', id: 'crm-liste'});
        parts.push({label: 'CRM DETAY', id: page});
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
const ProfilPage = ({user}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api} = MR;
  const [eskiSifre, setEskiSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifre2, setYeniSifre2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const sifreDegistir = async () => {
    setMsg(''); setErr('');
    if (!eskiSifre || !yeniSifre) { setErr('TÜM ALANLAR GEREKLİ'); return; }
    if (yeniSifre.length < 6) { setErr('YENİ ŞİFRE EN AZ 6 KARAKTER OLMALI'); return; }
    if (yeniSifre !== yeniSifre2) { setErr('YENİ ŞİFRELER UYUŞMUYOR'); return; }
    const r = await api.changePw({eski_sifre: eskiSifre, yeni_sifre: yeniSifre});
    if (r?.success) { setMsg('ŞİFRE BAŞARIYLA DEĞİŞTİRİLDİ'); setEskiSifre(''); setYeniSifre(''); setYeniSifre2(''); }
    else setErr(r?.error || 'HATA OLUŞTU');
  };

  return (
    <div className="fade-in">
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
        <div style={S.card}>
          <SectionTitle icon="User" title="PROFİL BİLGİLERİ"/>
          <div style={S.cardBody}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20}}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: `${C.accent}22`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 800, color: C.accent
              }}>{(user?.ad_soyad || 'U')[0]}</div>
              <div>
                <div style={{fontSize: 18, fontWeight: 700}}>{user?.ad_soyad}</div>
                <div style={{fontSize: 12, color: C.textMuted}}>{user?.email}</div>
              </div>
            </div>
            {[
              ['ROL', (user?.rol || '').toUpperCase()],
              ['TELEFON', user?.telefon || '-'],
              ['KAYIT TARİHİ', user?.created_at || '-']
            ].map(([k, v]) => (
              <div key={k} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}`}}>
                <span style={{fontSize: 12, color: C.textMuted}}>{k}</span>
                <span style={{fontSize: 12, fontWeight: 600}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <SectionTitle icon="Lock" title="ŞİFRE DEĞİŞTİR"/>
          <div style={S.cardBody}>
            {msg && <div style={{padding: '10px 14px', background: `${C.success}22`, border: `1px solid ${C.success}44`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: C.success}}>{msg}</div>}
            {err && <div style={{padding: '10px 14px', background: `${C.danger}22`, border: `1px solid ${C.danger}44`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: C.danger}}>{err}</div>}
            <div style={{display: 'grid', gap: 16}}>
              <FormGroup label="MEVCUT ŞİFRE">
                <input type="password" value={eskiSifre} onChange={e => setEskiSifre(e.target.value)} style={S.input}/>
              </FormGroup>
              <FormGroup label="YENİ ŞİFRE">
                <input type="password" value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} style={S.input}/>
              </FormGroup>
              <FormGroup label="YENİ ŞİFRE (TEKRAR)">
                <input type="password" value={yeniSifre2} onChange={e => setYeniSifre2(e.target.value)} style={S.input}/>
              </FormGroup>
              <button onClick={sifreDegistir} style={{...S.btn, ...S.btnP, justifyContent: 'center'}}>
                <LIcon name="Lock" size={14} color="#fff"/> ŞİFREYİ DEĞİŞTİR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ SAYFA ROUTER ═══ */
const PageRouter = ({page, setPage, user}) => {
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
  if (crmIdMatch) return <MR.CrmPage setPage={setPage} user={user} view="detay" crmId={parseInt(crmIdMatch[1])}/>;

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

  /* MESAJLAR */
  if (page.startsWith('mesajlar')) {
    const sub = page.replace('mesajlar-', '') || 'gelen';
    return <MR.MesajlarPage setPage={setPage} user={user} subPage={sub === 'mesajlar' ? 'gelen' : sub}/>;
  }

  /* SİSTEM */
  if (page.startsWith('sistem')) {
    const sub = page.replace('sistem-', '') || 'kullanici';
    return <MR.SistemPage setPage={setPage} user={user} subPage={sub === 'sistem' ? 'kullanici' : sub}/>;
  }

  if (page === 'profil') return <ProfilPage user={user}/>;

  return <MR.HomePage setPage={setPage} user={user}/>;
};

/* ═══ ANA UYGULAMA ═══ */
const App = () => {
  const {C, api, LoginScreen} = MR;
  const [user, setUser] = useState(null);
  const [page, setPageState] = useState(getPageFromHash());
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

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

  /* TEMA DEĞİŞİMİ DİNLEYİCİ */
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('mr-tema-degisti', handler);
    return () => window.removeEventListener('mr-tema-degisti', handler);
  }, []);

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
    <div style={{minHeight: '100vh', background: C.bg, color: C.text}}>
      <TopNav user={user} page={page} setPage={setPage} onLogout={logout}/>
      <div style={{maxWidth: 1400, margin: '0 auto', padding: '0 24px 40px'}}>
        <Breadcrumb page={page} setPage={setPage}/>
        <PageRouter page={page} setPage={setPage} user={user}/>
      </div>

      {/* FOOTER - ANA SAYFADA GÖSTERİLMEZ (SLOGAN SABİT) */}
      {page !== 'home' && (
        <div style={{
          textAlign: 'center', padding: '20px 0', borderTop: `1px solid ${C.border}`,
          fontSize: 10, color: C.textMuted, letterSpacing: 1
        }}>
          MR HASAR DANIŞMANLIK © {new Date().getFullYear()} — DOSYA TAKİP SİSTEMİ
        </div>
      )}
    </div>
  );
};

/* ═══ RENDER ═══ */
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
