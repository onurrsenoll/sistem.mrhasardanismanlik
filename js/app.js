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
    {id:'crm-yeni', label:'YENİ KAYIT', icon:'UserPlus'},
    {id:'crm-arama', label:'ARAMA LİSTESİ', icon:'PhoneCall'},
    {id:'saha-liste', label:'SAHA DOSYALARI', icon:'MapPin'},
    {id:'saha-yeni', label:'YENİ SAHA KAYDI', icon:'PlusCircle'}
  ]},
  {id:'eposta', label:'E-POSTA', icon:'Mail'},
  {id:'hesap', label:'HESAPLAMALAR', icon:'Calculator', sub:[
    {id:'hesap-adk', label:'ARAÇ DEĞER KAYBI', icon:'Car'},
    {id:'hesap-bh', label:'BEDENİ HASAR', icon:'Heart'}
  ]},
  {id:'paydaslar', label:'PAYDAŞLAR', icon:'Handshake', sub:[
    {id:'ortaklar-ortaklar', label:'İŞ ORTAKLARI', icon:'Briefcase'},
    {id:'ortaklar-paydaslar', label:'İŞ PAYDAŞLARI', icon:'Network'},
    {id:'personel-liste', label:'PERSONEL', icon:'Users'}
  ]},
  {id:'police', label:'POLİÇE', icon:'FileCheck', sub:[
    {id:'police-liste', label:'POLİÇE LİSTESİ', icon:'List'},
    {id:'police-yeni', label:'YENİ POLİÇE', icon:'Plus'},
    {id:'police-yenileme', label:'YENİLEME TAKİBİ', icon:'RefreshCw'},
    {id:'police-tahsilat', label:'TAHSİLAT / CARİ', icon:'Wallet'},
    {id:'police-rapor', label:'RAPORLAR', icon:'BarChart3'},
    {id:'police-kazanc', label:'KAZANÇ', icon:'TrendingUp'},
    {id:'police-qr-ruhsat', label:'QR RUHSAT OKUYUCU', icon:'QrCode'},
    {id:'police-ihbar-foyu', label:'İHBAR FÖYÜ / HASAR DOSYASI', icon:'ClipboardList'}
  ]},
  {id:'muhasebe', label:'MUHASEBE', icon:'Landmark', sub:[
    {id:'muhasebe-gelir', label:'GELİR YÖNETİMİ', icon:'TrendingUp'},
    {id:'muhasebe-gider', label:'GİDER YÖNETİMİ', icon:'TrendingDown'},
    {id:'muhasebe-komisyon', label:'KOMİSYON / PRİM', icon:'Percent'},
    {id:'muhasebe-kasa', label:'KASA / BANKA', icon:'Wallet'},
    {id:'muhasebe-ortakkasa', label:'ORTAK KASA', icon:'Users'},
    {id:'muhasebe-maliyet', label:'MALİYET ANALİZİ', icon:'PieChart'},
    {id:'muhasebe-rapor', label:'FİNANSAL RAPORLAR', icon:'BarChart3'},
    {id:'muhasebe-kapanis', label:'KAPANIŞ RAPORU', icon:'FileCheck'},
    {id:'muhasebe-aysonu', label:'AY SONU RAPORU', icon:'CalendarCheck'}
  ]},
  {id:'ictihat', label:'İÇTİHAT', icon:'Scale', sub:[
    {id:'ictihat-yargitay', label:'YARGITAY KARARLARI', icon:'Scale'},
    {id:'ictihat-tahkim', label:'TAHKİM KABUL ÖRNEKLERİ', icon:'Gavel'},
    {id:'ictihat-police-limit', label:'POLİÇE LİMİT TABLOLARI', icon:'FileCheck'},
    {id:'ictihat-kusur-emsal', label:'KUSUR EMSAL DOSYALARI', icon:'Search'}
  ]},
  {id:'ajanda', label:'AJANDA', icon:'CalendarDays'},
  {id:'sistem', label:'SİSTEM', icon:'Shield', sub:[
    {id:'sistem-kullanici', label:'KULLANICI YÖNETİMİ', icon:'UserCog'},
    {id:'sistem-yetki', label:'YETKİ YÖNETİMİ', icon:'KeyRound'},
    {id:'sistem-ayarlar', label:'FİRMA AYARLARI', icon:'Settings'},
    {id:'sistem-sms', label:'SMS BİLDİRİM', icon:'MessageSquare'},
    {id:'sistem-portal', label:'PORTAL AYARLARI', icon:'Globe'},
    {id:'sistem-guvenlik', label:'CİHAZ GÜVENLİĞİ', icon:'ShieldCheck'},
    {id:'sistem-aktarim', label:'TOPLU AKTARIM', icon:'FileSpreadsheet'},
    {id:'sistem-veri', label:'VERİ YÖNETİMİ', icon:'DatabaseBackup'},
    {id:'sistem-log', label:'LOG KAYITLARI', icon:'FileText'},
    {id:'mesajlar-sistem', label:'SİSTEM BİLDİRİMLERİ', icon:'Bell'},
    {id:'tanimlamalar-dosya', label:'DOSYA TANIMLAMALARI', icon:'Folder'},
    {id:'tanimlamalar-evrak', label:'EVRAK TANIMLAMALARI', icon:'FileText'},
    {id:'tanimlamalar-finansal', label:'FİNANSAL TANIMLAMALAR', icon:'Wallet'},
    {id:'tanimlamalar-sablon', label:'MATBU EVRAK / SÖZLEŞME', icon:'FileSignature'},
    {id:'tanimlamalar-genel', label:'GENEL TANIMLAMALAR', icon:'Settings'},
    {id:'sistem-konum', label:'KONUM TAKİBİ', icon:'MapPin'},
    {id:'sistem-netsantral', label:'NETSANTRAL AYARLARI', icon:'Phone'},
    {id:'crm-analiz', label:'CRM ANALİZ', icon:'BarChart3'}
  ]}
];

/* MENÜ ID → VERİTABANI MODÜL ADI EŞLEMESİ */
const MENU_MODUL = {
  dosya: 'dosya',
  crm: 'crm',
  eposta: 'eposta',
  hesap: 'hesaplamalar',
  paydaslar: 'paydaslar',
  muhasebe: 'muhasebe',
  ictihat: 'ictihat',
  ajanda: 'ajanda',
  police: 'police',
  sistem: 'sistem'
};

function menuErisim(user) {
  /* ADMIN HER ZAMAN TÜM MENÜYÜ GÖRÜR */
  if (user?.rol === 'admin') return MENU;

  const yetkiler = user?.yetkiler;

  /* YETKİLER YOKSA VEYA BOŞSA → MENÜ GÖSTERİLMEZ (SADECE ANA SAYFA) */
  if (!yetkiler || Object.keys(yetkiler).length === 0) return [];

  /* YETKİLER VARSA → SADECE VERİTABANINDAKİ İZİNLERE GÖRE FİLTRELE */
  return MENU.map(m => {
    if (m.id === 'home') return m;
    const modul = MENU_MODUL[m.id];
    if (!modul) return null;

    if (m.sub) {
      /* ALT MODÜL BAZLI: SADECE izin === 1 OLANLARI GÖSTER */
      const filteredSub = m.sub.filter(s => { const v = yetkiler[modul + '_' + s.id]; return v === 1; });
      if (filteredSub.length === 0) return null;
      return {...m, sub: filteredSub};
    }

    /* SUB YOK (AJANDA GİBİ): GENEL GÖRÜNTÜLE İZNİ */
    return yetkiler[modul + '_goruntule'] === 1 ? m : null;
  }).filter(Boolean);
}

/* ═══ URL HASH ROUTING ═══ */
function getPageFromHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h || 'home';
}

/* ═══ ÜST NAVİGASYON ═══ */
const TopNav = ({user, page, setPage, onLogout, sidebarLogoUrl}) => {
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

  const isK = MR.tema === 'koyu';

  return (
    <div ref={navRef} style={{
      background: C.headerBg,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', padding: '0 14px', height: 54,
      position: 'sticky', top: 0, zIndex: 1000, gap: 0,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: isK
        ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
        : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
    }}>
      {/* SOL ÜST LOGO - ANASAYFAYA YÖNLENDİRİR */}
      <div
        onClick={() => { setPage('home'); setMenuOpen(null); }}
        style={{
          height: 40, minWidth: 40, maxWidth: 150, flexShrink: 0,
          borderRadius: 12, cursor: 'pointer', marginRight: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', transition: 'all .2s',
          background: sidebarLogoUrl ? 'transparent' : `linear-gradient(135deg, ${C.accent}22, ${C.accent}0a)`,
          border: sidebarLogoUrl ? 'none' : `1.5px solid ${C.accent}30`,
          boxShadow: sidebarLogoUrl ? 'none' : (isK
            ? '0 4px 6px -1px rgba(0,0,0,0.1)'
            : '0 4px 6px -1px rgba(0,0,0,0.05)')
        }}
        title="ANASAYFA"
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(0.97)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {sidebarLogoUrl ? (
          <img src={sidebarLogoUrl} alt="LOGO" style={{
            height: 36, maxWidth: 140, objectFit: 'contain'
          }}/>
        ) : (
          <div style={{
            fontSize: 15, fontWeight: 900, color: C.accent, letterSpacing: '-0.5px',
            padding: '0 10px', whiteSpace: 'nowrap',
            textShadow: isK ? `0 0 20px ${C.accent}40` : 'none'
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
                padding: '6px 10px', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                color: isActive(m) ? C.accent : C.text,
                background: isActive(m) ? `${C.accent}15` : 'transparent',
                transition: 'all .2s', position: 'relative',
                boxShadow: isActive(m)
                  ? (isK ? '0 1px 2px rgba(0,0,0,0.05)' : '0 1px 2px rgba(0,0,0,0.05)')
                  : 'none'
              }}
              onMouseEnter={e => { if (!isActive(m)) { e.currentTarget.style.background = `${C.accent}08`; } }}
              onMouseLeave={e => { if (!isActive(m)) { e.currentTarget.style.background = 'transparent'; } }}
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
                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                background: isK ? C.bgCard : 'rgba(237,241,247,0.92)',
                border: `1px solid ${C.border}`,
                borderRadius: 16, padding: 8, minWidth: 220,
                boxShadow: isK
                  ? '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)'
                  : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                zIndex: 1001,
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                maxHeight: 'calc(100vh - 80px)', overflowY: 'auto'
              }}>
                {m.sub.map(s => (
                  <div key={s.id}
                    onClick={() => { setPage(s.id); setMenuOpen(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700,
                      color: page === s.id ? C.accent : C.textSec,
                      background: page === s.id ? `${C.accent}12` : 'transparent',
                      transition: 'all .15s',
                      boxShadow: page === s.id
                        ? (isK ? '0 1px 2px rgba(0,0,0,0.05)' : '0 1px 2px rgba(0,0,0,0.05)')
                        : 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.accent}0c`}
                    onMouseLeave={e => e.currentTarget.style.background = page === s.id ? `${C.accent}12` : 'transparent'}
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
      <div style={{display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10}}>
        {/* TEMA TOGGLE - 3D */}
        <div onClick={() => {
          const yeniTema = MR.tema === 'koyu' ? 'acik' : 'koyu';
          MR.setTema(yeniTema);
          setMenuOpen(null);
          window.dispatchEvent(new Event('mr-tema-degisti'));
        }} style={{
          width: 42, height: 42, minWidth: 42, borderRadius: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isK ? `${C.warning}18` : `${C.purple}12`,
          border: `1px solid ${isK ? C.warning + '33' : C.purple + '33'}`,
          transition: 'all .2s',
          boxShadow: isK
            ? '0 4px 6px -1px rgba(0,0,0,0.1)'
            : '0 4px 6px -1px rgba(0,0,0,0.05)'
        }} title={isK ? 'AÇIK TEMA' : 'KOYU TEMA'}>
          <LIcon name={isK ? 'Sun' : 'Moon'} size={19} color={isK ? C.warning : C.purple}/>
        </div>

        {/* PROFİL - 3D */}
        <div style={{position: 'relative'}}>
          <div onClick={() => setProfilOpen(!profilOpen)} style={{
            width: 42, height: 42, minWidth: 42, borderRadius: 13, cursor: 'pointer',
            border: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: `${C.accent}18`, overflow: 'hidden',
            boxShadow: isK
              ? '0 4px 6px -1px rgba(0,0,0,0.1)'
              : '0 4px 6px -1px rgba(0,0,0,0.05)'
          }} title={user?.ad_soyad || 'PROFİL'}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" style={{
                width: 42, height: 42, objectFit: 'cover'
              }}/>
            ) : (
              <div style={{
                fontSize: 16, fontWeight: 700, color: C.accent
              }}>{(user?.ad_soyad || 'U')[0]}</div>
            )}
          </div>

          {profilOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: isK ? C.bgCard : 'rgba(237,241,247,0.92)',
              border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 8, minWidth: 210,
              boxShadow: isK
                ? '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)'
                : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
              zIndex: 1001,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
            }}>
              <div style={{padding: '10px 14px', borderBottom: `1px solid ${C.border}`, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10}}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" style={{width: 34, height: 34, borderRadius: 10, objectFit: 'cover', flexShrink: 0}}/>
                ) : (
                  <div style={{width: 34, height: 34, borderRadius: 10, background: `${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.accent, flexShrink: 0, boxShadow: isK ? '0 1px 2px rgba(0,0,0,0.05)' : '0 1px 2px rgba(0,0,0,0.05)'}}>{(user?.ad_soyad || 'U')[0]}</div>
                )}
                <div>
                  <div style={{fontSize: 12, fontWeight: 600}}>{user?.ad_soyad}</div>
                  <div style={{fontSize: 10, color: C.textMuted}}>{user?.email}</div>
                </div>
              </div>
              <div onClick={() => { setPage('profil'); setProfilOpen(false); }}
                style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.textSec}}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}0c`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LIcon name="User" size={14} color={C.textMuted}/> PROFİL
              </div>
              <div onClick={onLogout}
                style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.danger}}
                onMouseEnter={e => e.currentTarget.style.background = `${C.danger}0c`}
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

  /* SİSTEM ALT MODÜLLER İÇİN BREADCRUMB */
  if (page.startsWith('sistem-') && parts.length <= 1) {
    const sistemLabels = {
      'sistem-kullanici': 'KULLANICI YÖNETİMİ', 'sistem-yetki': 'YETKİ YÖNETİMİ',
      'sistem-ayarlar': 'FİRMA AYARLARI', 'sistem-sms': 'SMS BİLDİRİM',
      'sistem-portal': 'PORTAL AYARLARI',
      'sistem-guvenlik': 'CİHAZ GÜVENLİĞİ', 'sistem-log': 'LOG KAYITLARI', 'sistem-aktarim': 'TOPLU AKTARIM', 'sistem-veri': 'VERİ YÖNETİMİ',
      'sistem-konum': 'KONUM TAKİBİ',
      'sistem-netsantral': 'NETSANTRAL AYARLARI'
    };
    parts.push({label: 'SİSTEM', id: 'sistem'});
    parts.push({label: sistemLabels[page] || page.replace('sistem-','').toUpperCase(), id: page});
  }
  if (page === 'crm-analiz' && parts.length <= 1) {
    parts.push({label: 'SİSTEM', id: 'sistem'});
    parts.push({label: 'CRM ANALİZ', id: 'crm-analiz'});
  }
  if (page.startsWith('tanimlamalar-') && parts.length <= 1) {
    const tanimLabels = {
      'tanimlamalar-dosya': 'DOSYA TANIMLAMALARI', 'tanimlamalar-evrak': 'EVRAK TANIMLAMALARI',
      'tanimlamalar-finansal': 'FİNANSAL TANIMLAMALAR', 'tanimlamalar-sablon': 'MATBU EVRAK / SÖZLEŞME',
      'tanimlamalar-genel': 'GENEL TANIMLAMALAR'
    };
    parts.push({label: 'SİSTEM', id: 'sistem'});
    parts.push({label: tanimLabels[page] || 'TANIMLAMALAR', id: page});
  }
  if (page === 'eposta' && parts.length <= 1) {
    parts.push({label: 'E-POSTA', id: 'eposta'});
  }
  if (page === 'mesajlar-sistem' && parts.length <= 1) {
    parts.push({label: 'SİSTEM', id: 'sistem'});
    parts.push({label: 'SİSTEM BİLDİRİMLERİ', id: page});
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
  admin: {label: 'SİSTEM YÖNETİCİSİ', renk: '#1a56db', gorev: 'TÜM SİSTEM YÖNETİMİ, KULLANICI YÖNETİMİ, YETKİ ATAMA, FİRMA AYARLARI VE TÜM MODÜLLERE ERİŞİM'},
  avukat: {label: 'AVUKAT', renk: '#8b5cf6', gorev: 'DOSYA TAKİBİ, CRM YÖNETİMİ, HESAPLAMA MODÜLLERI, SERVİS TAKİBİ, ORTAK YÖNETİMİ VE AJANDA'},
  uzman: {label: 'UZMAN', renk: '#3b82f6', gorev: 'DOSYA TAKİBİ, HESAPLAMA MODÜLLERI, SERVİS TAKİBİ VE AJANDA'},
  personel: {label: 'PERSONEL', renk: '#06b6d4', gorev: 'DOSYA TAKİBİ VE AJANDA YÖNETİMİ'},
  muhasebe: {label: 'MUHASEBE', renk: '#10b981', gorev: 'DOSYA TAKİBİ, MUHASEBE İŞLEMLERİ, ORTAK YÖNETİMİ, TANIMLAMALAR VE AJANDA'},
  portal: {label: 'PORTAL KULLANICISI', renk: '#f59e0b', gorev: 'DOSYA GÖRÜNTÜLEME VE MESAJLAŞMA'}
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
  if (page === 'crm-analiz') return <MR.AramaGecmisPage setPage={setPage} user={user}/>;
  if (crmIdMatch) return <MR.CrmPage setPage={setPage} user={user} view="detay" crmId={parseInt(crmIdMatch[1])}/>;

  /* SAHA DOSYALARI */
  if (page.startsWith('saha')) {
    const sub = page.replace('saha-', '') || 'liste';
    return <MR.SahaPage setPage={setPage} user={user} subPage={sub === 'saha' ? 'liste' : sub}/>;
  }

  /* HESAPLAMALAR */
  if (page === 'hesap-adk') return <MR.HesapADKPage setPage={setPage} user={user}/>;
  if (page === 'hesap-bh') return <MR.HesapBHPage setPage={setPage} user={user}/>;

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

  /* QR RUHSAT OKUYUCU */
  if (page === 'police-qr-ruhsat') return <MR.QrRuhsatPage setPage={setPage} user={user}/>;

  /* İHBAR FÖYÜ / HASAR DOSYASI */
  if (page === 'police-ihbar-foyu') return <MR.IhbarFoyuPage setPage={setPage} user={user}/>;

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

  /* İÇTİHAT */
  if (page.startsWith('ictihat')) {
    const sub = page.replace('ictihat-', '') || 'yargitay';
    return <MR.IctihatPage setPage={setPage} user={user} subPage={sub === 'ictihat' ? 'yargitay' : sub}/>;
  }

  /* E-POSTA */
  if (page === 'eposta') return <MR.MailPage setPage={setPage} user={user}/>;

  /* AJANDA */
  if (page === 'ajanda') return <MR.AjandaPage setPage={setPage} user={user}/>;

  /* MESAJLAR (sistem bildirimleri artık sistem menüsünde) */
  if (page === 'mesajlar-sistem') {
    return <MR.MesajlarPage setPage={setPage} user={user} subPage="sistem"/>;
  }

  /* NETSANTRAL AYARLARI */
  if (page === 'sistem-netsantral') {
    return <MR.NetsantralAyarlariPage setPage={setPage} user={user}/>;
  }

  /* KONUM TAKİBİ (ADMIN ONLY) */
  if (page === 'sistem-konum') {
    if (user?.rol !== 'admin') return <div style={{padding:40,textAlign:'center',color:MR.C.danger,fontWeight:800}}>YETKİSİZ ERİŞİM</div>;
    return <MR.KonumTakipPage setPage={setPage} user={user}/>;
  }

  /* SİSTEM */
  if (page.startsWith('sistem')) {
    const sub = page.replace('sistem-', '') || 'kullanici';
    return <MR.SistemPage setPage={setPage} user={user} subPage={sub === 'sistem' ? 'kullanici' : sub}/>;
  }

  if (page === 'profil') return <ProfilPage user={user} setUser={setUser}/>;

  return <MR.HomePage setPage={setPage} user={user}/>;
};

/* ═══ ANA UYGULAMA ═══ */


/* ═══ ANA UYGULAMA ═══ */
const App = () => {
  const {C, api, LoginScreen} = MR;
  const [user, setUser] = useState(null);
  const [page, setPageState] = useState(getPageFromHash());
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);
  const [bgLogoUrl, setBgLogoUrl] = useState(MR.logoUrl || '');
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState(MR.sidebarLogoUrl || '');
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


  /* TEMA DEĞİŞİMİ DİNLEYİCİ */
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('mr-tema-degisti', handler);
    return () => window.removeEventListener('mr-tema-degisti', handler);
  }, []);


  /* ARKA PLAN LOGO URL + SIDEBAR LOGO - SADECE GİRİŞ YAPILDIKTAN SONRA */
  useEffect(() => {
    if (!user) return;
    if (MR.logoUrl && MR.sidebarLogoUrl !== undefined) {
      setBgLogoUrl(MR.logoUrl);
      setSidebarLogoUrl(MR.sidebarLogoUrl || '');
      return;
    }
    (async () => {
      try {
        const r = await api.ayarlarList();
        if (r?.success && r.data) {
          if (r.data.logo_url) {
            setBgLogoUrl(r.data.logo_url);
            MR.logoUrl = r.data.logo_url;
          }
          if (r.data.sidebar_logo_url) {
            setSidebarLogoUrl(r.data.sidebar_logo_url);
            MR.sidebarLogoUrl = r.data.sidebar_logo_url;
          } else {
            MR.sidebarLogoUrl = '';
          }
        }
      } catch(e) {}
    })();
  }, [user]);

  /* SIDEBAR LOGO DEĞİŞİM DİNLEYİCİ (AYARLARDAN YÜKLEME SONRASI) */
  useEffect(() => {
    const handler = () => {
      setSidebarLogoUrl(MR.sidebarLogoUrl || '');
    };
    window.addEventListener('mr-sidebar-logo-degisti', handler);
    return () => window.removeEventListener('mr-sidebar-logo-degisti', handler);
  }, []);

  /* KULLANICI DEĞİŞTİĞİNDE GLOBAL REFERANSI GÜNCELLE (YETKİ KONTROLÜ İÇİN) */
  useEffect(() => {
    MR._currentUser = user;
  }, [user]);

  /* ═══ ARAMA LOG — WEBRTC ÇAĞRI BİTTİĞİNDE OTOMATİK KAYIT ═══ */
  useEffect(() => {
    if (!user) return;
    var aramaBaslangic = null;
    var aramaNumara = '';
    var aramaAdi = '';
    var aramaYon = 'giden';
    var gorusmeCevaplandi = false;

    const durumHandler = (e) => {
      const d = e.detail;
      if (!d) return;

      if (d.durum === 'araniyor') {
        aramaBaslangic = Date.now();
        aramaNumara = d.detay || '';
        aramaYon = 'giden';
        gorusmeCevaplandi = false;
      }
      if (d.durum === 'gelen-cagri') {
        aramaBaslangic = Date.now();
        aramaYon = 'gelen';
        gorusmeCevaplandi = false;
        if (d.detay) {
          aramaNumara = d.detay.arayan || '';
          aramaAdi = d.detay.arayanAdi || '';
        }
      }
      if (d.durum === 'gorusmede') {
        gorusmeCevaplandi = true;
        aramaBaslangic = Date.now();
      }
      if (d.durum === 'kapandi' || d.durum === 'reddedildi' || (d.durum === 'hata' && aramaBaslangic)) {
        var sure = aramaBaslangic ? Math.round((Date.now() - aramaBaslangic) / 1000) : 0;
        var durum = gorusmeCevaplandi ? 'cevaplandi' : (d.durum === 'reddedildi' ? 'reddedildi' : 'cevapsiz');
        if (d.durum === 'hata') {
          var detayStr = (d.detay || '').toLowerCase();
          if (detayStr.indexOf('rejected') >= 0 || detayStr.indexOf('busy') >= 0) durum = 'reddedildi';
          else durum = 'cevapsiz';
        }
        if (aramaNumara) {
          var now = new Date();
          var baslangic = now.getFullYear() + '-' +
            String(now.getMonth()+1).padStart(2,'0') + '-' +
            String(now.getDate()).padStart(2,'0') + ' ' +
            String(now.getHours()).padStart(2,'0') + ':' +
            String(now.getMinutes()).padStart(2,'0') + ':' +
            String(now.getSeconds()).padStart(2,'0');
          api.aramaLogCreate({
            numara: aramaNumara,
            yon: aramaYon,
            durum: durum,
            sure_saniye: sure,
            baslangic_zamani: baslangic,
            musteri_adi: aramaAdi || ''
          }).catch(() => {});
        }
        aramaBaslangic = null;
        aramaNumara = '';
        aramaAdi = '';
        gorusmeCevaplandi = false;
      }
    };

    window.addEventListener('mr-webrtc-durum', durumHandler);
    return () => window.removeEventListener('mr-webrtc-durum', durumHandler);
  }, [user]);

  /* ═══ SESSİZ KONUM TAKİP SERVİSİ — TÜM KULLANICILAR ═══ */
  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) return;

    let intervalId = null;
    let lastSent = 0;
    const ARALIK = 120000; /* 2 dakika */

    const konumOlustur = (pos) => ({
      enlem: pos.coords.latitude,
      boylam: pos.coords.longitude,
      dogruluk: Math.round(pos.coords.accuracy),
      hiz: pos.coords.speed || 0,
      yon: pos.coords.heading || 0,
      cihaz_tipi: /Mobi|Android/i.test(navigator.userAgent) ? 'mobil' : 'pc',
      zaman: new Date().toISOString()
    });

    const konumGonder = (pos) => {
      const now = Date.now();
      if (now - lastSent < ARALIK) return;
      lastSent = now;
      const d = konumOlustur(pos);
      api.konumGuncelle(d).catch(() => {});
      /* localStorage yedek — SW de kullanır */
      try { localStorage.setItem('mr_son_konum', JSON.stringify(d)); } catch(e) {}
      /* SW'ye de bildir (arka plan iletimi) */
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'KONUM_GUNCELLE', konum: d, token: api.token
        });
      }
    };

    const konumAl = () => {
      navigator.geolocation.getCurrentPosition(konumGonder, () => {}, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 60000
      });
    };

    /* Hemen bir kez al, sonra her 2 dk tekrarla */
    konumAl();
    intervalId = setInterval(konumAl, ARALIK);

    /* ═══ SERVICE WORKER KAYDI + ARKA PLAN SYNC ═══ */
    const swKayit = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('[KONUM] SERVICE WORKER KAYITLI');

        /* Periodic Background Sync — tarayıcı destekliyorsa */
        if ('periodicSync' in reg) {
          try {
            await reg.periodicSync.register('mr-konum-sync', { minInterval: 2 * 60 * 1000 });
            console.log('[KONUM] PERIODIC SYNC AKTİF (2dk)');
          } catch(e) {
            console.log('[KONUM] PERIODIC SYNC KAPALI:', e.message);
          }
        }

        /* Normal Background Sync */
        if ('sync' in reg) {
          try {
            await reg.sync.register('mr-konum-sync-once');
          } catch(e) {}
        }
      } catch(e) {
        console.log('[KONUM] SW KAYIT HATASI:', e.message);
      }
    };
    swKayit();

    /* SW'den gelen konum isteğine cevap ver */
    const swMesajHandler = (e) => {
      if (!e.data) return;
      if (e.data.type === 'KONUM_ISTE') {
        navigator.geolocation.getCurrentPosition(
          (pos) => { e.ports[0]?.postMessage(konumOlustur(pos)); },
          () => {
            try {
              const son = JSON.parse(localStorage.getItem('mr_son_konum'));
              e.ports[0]?.postMessage(son);
            } catch(err) { e.ports[0]?.postMessage(null); }
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 }
        );
      }
      if (e.data.type === 'TOKEN_ISTE') {
        e.ports[0]?.postMessage({ token: api.token });
      }
    };
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', swMesajHandler);
    }

    /* ═══ KEEP-ALIVE: SW'yi uyanık tut (her 20sn) ═══ */
    const keepAliveId = setInterval(() => {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'KEEP_ALIVE' });
      }
    }, 20000);

    /* ═══ VISIBILITY CHANGE: Sayfa tekrar görünür olunca hemen konum al ═══ */
    const visHandler = () => {
      if (document.visibilityState === 'visible') {
        lastSent = 0; /* throttle'ı sıfırla */
        konumAl();
      }
    };
    document.addEventListener('visibilitychange', visHandler);

    return () => {
      if (intervalId) clearInterval(intervalId);
      clearInterval(keepAliveId);
      document.removeEventListener('visibilitychange', visHandler);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', swMesajHandler);
      }
    };
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
      <div style={{minHeight: '100vh', background: C.bgGradient || C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{width: 52, height: 52, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px', boxShadow: `0 0 20px ${C.accent}30`}}/>
          <div style={{fontSize: 12, color: C.textMuted, fontWeight: 600}}>YÜKLENİYOR...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <div style={{minHeight: '100vh', background: C.bg, color: C.text, position: 'relative', overflow: 'hidden'}}>
      <TopNav user={user} page={page} setPage={setPage} onLogout={logout} sidebarLogoUrl={sidebarLogoUrl}/>

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
        background: 'transparent',
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
