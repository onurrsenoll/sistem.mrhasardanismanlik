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
    {id:'crm-yeni', label:'YENİ KAYIT', icon:'UserPlus'},
    {id:'crm-arama', label:'ARAMA LİSTESİ', icon:'PhoneCall'}
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
    {id:'sistem-netsantral', label:'NETSANTRAL', icon:'Phone'},
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
            width: 34, height: 34, minWidth: 34, borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: `${C.accent}22`
          }} title={user?.ad_soyad || 'PROFİL'}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: C.accent
            }}>{(user?.ad_soyad || 'U')[0]}</div>
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
    if (page === 'crm-arama') {
      if (m.id === 'crm') {
        parts.push({label: 'CRM', id: 'crm-liste'});
        parts.push({label: 'ARAMA LİSTESİ', id: page});
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
  if (page === 'crm-arama') return <MR.CrmAramaPage setPage={setPage} user={user}/>;
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

/* ═══ NETSANTRAL FLOATING KONTROL PANELİ ═══ */
const NetsantralPanel = ({user}) => {
  const {C, LIcon, api} = MR;

  /* YETKİ KONTROLÜ: ADMIN HER ZAMAN GÖREBİLİR, DİĞERLERİ İZİN GEREKTİRİR */
  const yetkiler = user?.yetkiler || {};
  const isAdmin = user?.rol === 'admin';
  const netsantralIzin = isAdmin || yetkiler['netsantral_goruntule'] === 1;
  if (!netsantralIzin) return null;
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

  const timerRef = useRef(null);
  const callStartRef = useRef(null);

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

  // GELEN ÇAĞRI DİNLE (global event)
  useEffect(() => {
    const handler = (e) => {
      const data = e.detail || {};
      if (data.arayan) {
        setNumber(data.arayan);
        setActiveCall(true);
        setStatus('gorusmede');
        setMinimized(false);
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

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // NUMARA TUŞU
  const dialKey = (key) => {
    setNumber(prev => prev + key);
  };

  // ÇAĞRI BAŞLAT
  const aramaBaslat = async () => {
    if (!number) return;
    setStatusMsg('ARANIYOR...');
    setStatus('araniyor');
    setMinimized(false);

    // SIP PROTOKOLÜ İLE ARA (NetSIPP üzerinden)
    const cleanNum = number.replace(/[\s\-\(\)]/g, '').replace(/^0/, '90');
    try { window.open('sip:' + cleanNum, '_self'); } catch(e) { try { window.open('tel:' + cleanNum, '_self'); } catch(e2) {} }

    // NETSANTRAL API İLE DE ARA
    const r = await api.netsantralOriginate(cleanNum);
    if (r?.success && r.data?.success_api) {
      setActiveCall(true);
      setStatus('gorusmede');
      setStatusMsg('GÖRÜŞME BAŞLADI');
    } else {
      // SIP ile açıldıysa zaten arama başladı, sadece timer'ı aç
      setActiveCall(true);
      setStatus('gorusmede');
      setStatusMsg(r?.data?.response?.raw_response || 'SIP İLE ARAMA BAŞLATILDI');
    }

    // GİDEN ARAMA LOGU
    api.req('/netsipp/giden-cagri.php', {
      method: 'POST', body: JSON.stringify({ arayan: cleanNum, aranan_adi: '', yon: 'giden' })
    }).catch(() => {});

    setTimeout(() => setStatusMsg(''), 3000);
  };

  // ÇAĞRI BİTİR
  const aramaKapat = async () => {
    setStatusMsg('ÇAĞRI SONLANDIRILIYOR...');
    const r = await api.netsantralHangup();
    setActiveCall(false);
    setMuted(false);
    setStatus('hazir');
    setStatusMsg('ÇAĞRI SONLANDIRILDI');
    setTransferOpen(false);
    /* CRM EKRANINA BİLDİR - ÇAĞRI SONLANDI */
    window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
    setTimeout(() => setStatusMsg(''), 2000);
  };

  // SESİ KAPAT/AÇ
  const toggleMute = async () => {
    const newState = muted ? 'off' : 'on';
    const r = await api.netsantralMute(newState);
    setMuted(!muted);
    setStatusMsg(muted ? 'MİKROFON AÇILDI' : 'MİKROFON KAPATILDI');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  // TRANSFER
  const transferYap = async () => {
    if (!transferNum) return;
    setStatusMsg('TRANSFER EDİLİYOR...');
    const r = await api.netsantralTransfer(transferNum);
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
      }} title="NETSANTRAL KONTROL PANELİ">
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
    <div style={{
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
        <div style={{display: 'flex', gap: 4}}>
          <div onClick={() => setMinimized(true)} style={{
            cursor: 'pointer', padding: 4, borderRadius: 6
          }} title="KÜÇÜLT">
            <LIcon name="Minus" size={14} color={C.textMuted}/>
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
            placeholder="NUMARA GİRİN..."
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
            <LIcon name="PhoneCall" size={16} color="#fff"/> ARA
          </button>
        ) : (
          <>
            <button onClick={aramaKapat} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: C.danger, color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <LIcon name="PhoneOff" size={16} color="#fff"/> KAPAT
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

  /* NETSIPP GELEN ÇAĞRI DİNLEYİCİ (localStorage) - OTOMATİK CRM KAYIT EKRANI AÇ */
  /* YETKİ KONTROLÜ: ADMIN VEYA netsipp_goruntule / netsipp_gelen_cagri İZNİ GEREKLİ */
  const netsippIzinVar = user?.rol === 'admin' || user?.yetkiler?.netsipp_goruntule === 1 || user?.yetkiler?.netsipp_gelen_cagri === 1;

  const gelenCagriIsle = useCallback((data) => {
    if (!data || !data.timestamp || (Date.now() - data.timestamp > 30000)) return;
    /* POPUP GÖSTER (KISA SÜRELİ) */
    setGelenCagri(data);
    setTimeout(() => setGelenCagri(prev => prev?.timestamp === data.timestamp ? null : prev), 5000);
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
        <PageRouter page={page} setPage={setPage} user={user}/>
      </div>

      {/* SLOGAN - TÜM SAYFALARDA ALT KISIMDA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        textAlign: 'center', padding: '14px 0',
        fontSize: 12, fontWeight: 700,
        color: C.textMuted, letterSpacing: 5,
        background: `linear-gradient(transparent, ${C.bg})`,
        zIndex: 10
      }}>
        HER ZAMAN FARK EDER
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
