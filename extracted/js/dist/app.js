/**
 * MR HASAR DANIŞMANLIK - ANA UYGULAMA
 * NAVİGASYON, ROUTER, BREADCRUMB, ANA YAPI
 */
const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect,
  useCallback,
  useRef
} = React;

/* ═══ MENÜ YAPILANDIRMASI ═══ */
const MENU = [{
  id: 'home',
  label: 'ANA SAYFA',
  icon: 'Home'
}, {
  id: 'dosya',
  label: 'DOSYA İŞLEMLERİ',
  icon: 'FolderOpen',
  sub: [{
    id: 'dosya-liste',
    label: 'DOSYA LİSTESİ',
    icon: 'List'
  }, {
    id: 'dosya-yeni',
    label: 'YENİ DOSYA',
    icon: 'Plus'
  }]
}, {
  id: 'crm',
  label: 'CRM',
  icon: 'Users',
  sub: [{
    id: 'crm-liste',
    label: 'CRM LİSTESİ',
    icon: 'List'
  }, {
    id: 'crm-yeni',
    label: 'YENİ KAYIT',
    icon: 'UserPlus'
  }]
}, {
  id: 'hesap',
  label: 'HESAPLAMALAR',
  icon: 'Calculator',
  sub: [{
    id: 'hesap-adk',
    label: 'ARAÇ DEĞER KAYBI',
    icon: 'Car'
  }, {
    id: 'hesap-bh',
    label: 'BEDENİ HASAR',
    icon: 'Heart'
  }]
}, {
  id: 'muhasebe',
  label: 'MUHASEBE',
  icon: 'Landmark',
  sub: [{
    id: 'muhasebe-kasa',
    label: 'KASA YÖNETİMİ',
    icon: 'Wallet'
  }, {
    id: 'muhasebe-hareketler',
    label: 'HAREKETLER',
    icon: 'ArrowLeftRight'
  }, {
    id: 'muhasebe-gelir',
    label: 'GELİR EKLE',
    icon: 'TrendingUp'
  }, {
    id: 'muhasebe-transfer',
    label: 'TRANSFER',
    icon: 'Repeat'
  }, {
    id: 'muhasebe-rapor',
    label: 'RAPOR',
    icon: 'BarChart3'
  }]
}, {
  id: 'ajanda',
  label: 'AJANDA',
  icon: 'CalendarDays'
}, {
  id: 'bildirim',
  label: 'BİLDİRİMLER',
  icon: 'Bell'
}, {
  id: 'sistem',
  label: 'SİSTEM',
  icon: 'Shield',
  sub: [{
    id: 'sistem-tanimlamalar',
    label: 'TANIMLAMALAR',
    icon: 'Database'
  }, {
    id: 'sistem-kullanici',
    label: 'KULLANICI YÖNETİMİ',
    icon: 'UserCog'
  }, {
    id: 'sistem-log',
    label: 'LOG KAYITLARI',
    icon: 'FileText'
  }, {
    id: 'sistem-netsantral',
    label: 'NETSANTRAL',
    icon: 'Phone'
  }]
}];

/* ═══ ROL BAZLI ERİŞİM ═══ */
const ROL_ERISIM = {
  admin: null,
  avukat: ['home', 'dosya', 'crm', 'hesap', 'ajanda', 'bildirim'],
  uzman: ['home', 'dosya', 'hesap', 'ajanda', 'bildirim'],
  personel: ['home', 'dosya', 'ajanda', 'bildirim'],
  muhasebe: ['home', 'dosya', 'muhasebe', 'ajanda', 'bildirim'],
  portal: ['home', 'dosya', 'bildirim']
};
function menuErisim(user) {
  const izin = ROL_ERISIM[user?.rol];
  if (!izin) return MENU;
  return MENU.filter(m => izin.some(i => m.id === i || m.id.startsWith(i)));
}

/* ═══ İZOLE BİLDİRİM BADGE — kendi başına poll eder, TopNav'ı re-render etmez ═══ */
const BildirimBadge = React.memo(function BildirimBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const fetchCount = async () => {
      const r = await MR.api.bildirimList({
        okunmamis: 1,
        limit: 1
      });
      if (alive && r?.success) setCount(r.data?.total || 0);
    };
    fetchCount();
    const iv = setInterval(fetchCount, 60000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
  if (count <= 0) return null;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: MR.C.danger,
      color: '#fff',
      fontSize: 9,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700
    }
  }, count > 9 ? '9+' : count);
});

/* ═══ ÜST NAVİGASYON ═══ */
const TopNav = ({
  user,
  page,
  setPage,
  onLogout
}) => {
  const {
    C,
    LIcon,
    api
  } = MR;
  const [menuOpen, setMenuOpen] = useState(null);
  const [profilOpen, setProfilOpen] = useState(false);
  const navRef = useRef(null);
  const filteredMenu = menuErisim(user);
  useEffect(() => {
    const close = e => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(null);
        setProfilOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const isActive = m => page === m.id || page.startsWith(m.id + '-');
  return /*#__PURE__*/React.createElement("div", {
    ref: navRef,
    style: {
      background: C.headerBg,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setPage('home'),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      marginRight: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: `${C.accent}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 900,
      color: C.accent
    }
  }, "MR"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: C.accent,
      letterSpacing: 1
    }
  }, "MR HASAR"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: C.textMuted,
      letterSpacing: 2
    }
  }, "DANI\u015EMANLIK"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      flex: 1
    }
  }, filteredMenu.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => {
      if (m.sub) {
        setMenuOpen(menuOpen === m.id ? null : m.id);
      } else {
        setPage(m.id);
        setMenuOpen(null);
      }
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      color: isActive(m) ? C.accent : C.textSec,
      background: isActive(m) ? `${C.accent}15` : 'transparent',
      transition: 'all .2s',
      position: 'relative'
    },
    onMouseEnter: e => {
      if (!isActive(m)) e.currentTarget.style.background = `${C.accent}08`;
    },
    onMouseLeave: e => {
      if (!isActive(m)) e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: m.icon,
    size: 14,
    color: isActive(m) ? C.accent : C.textMuted
  }), /*#__PURE__*/React.createElement("span", null, m.label), m.id === 'bildirim' && /*#__PURE__*/React.createElement(BildirimBadge, null), m.sub && /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronDown",
    size: 12,
    color: C.textMuted
  })), m.sub && menuOpen === m.id && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: 6,
      minWidth: 200,
      boxShadow: '0 10px 40px rgba(0,0,0,.5)',
      zIndex: 1001
    }
  }, m.sub.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    onClick: () => {
      setPage(s.id);
      setMenuOpen(null);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 500,
      color: page === s.id ? C.accent : C.textSec,
      background: page === s.id ? `${C.accent}15` : 'transparent',
      transition: 'all .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = `${C.accent}10`,
    onMouseLeave: e => e.currentTarget.style.background = page === s.id ? `${C.accent}15` : 'transparent'
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: s.icon,
    size: 14,
    color: page === s.id ? C.accent : C.textMuted
  }), s.label)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setProfilOpen(!profilOpen),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      background: `${C.accent}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700,
      color: C.accent
    }
  }, (user?.ad_soyad || 'U')[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600
    }
  }, user?.ad_soyad), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.textMuted
    }
  }, (user?.rol || '').toUpperCase())), /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronDown",
    size: 12,
    color: C.textMuted
  })), profilOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 8,
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: 6,
      minWidth: 200,
      boxShadow: '0 10px 40px rgba(0,0,0,.5)',
      zIndex: 1001
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      borderBottom: `1px solid ${C.border}`,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, user?.ad_soyad), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, user?.email)), /*#__PURE__*/React.createElement("div", {
    onClick: () => {
      setPage('profil');
      setProfilOpen(false);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 12,
      color: C.textSec
    },
    onMouseEnter: e => e.currentTarget.style.background = `${C.accent}10`,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "User",
    size: 14,
    color: C.textMuted
  }), " PROF\u0130L"), /*#__PURE__*/React.createElement("div", {
    onClick: onLogout,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 12,
      color: C.danger
    },
    onMouseEnter: e => e.currentTarget.style.background = `${C.danger}10`,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "LogOut",
    size: 14,
    color: C.danger
  }), " \xC7IKI\u015E YAP"))));
};

/* ═══ BREADCRUMB ═══ */
const Breadcrumb = ({
  page,
  setPage
}) => {
  const {
    C,
    LIcon
  } = MR;
  const parts = [];
  parts.push({
    label: 'ANA SAYFA',
    id: 'home'
  });
  for (const m of MENU) {
    if (page === m.id) {
      parts.push({
        label: m.label,
        id: m.id
      });
      break;
    }
    if (m.sub) {
      for (const s of m.sub) {
        if (page === s.id || page.startsWith(s.id + '-')) {
          parts.push({
            label: m.label,
            id: m.sub[0]?.id || m.id
          });
          parts.push({
            label: s.label,
            id: s.id
          });
          break;
        }
      }
    }
    if (page.startsWith('dosya-detay-')) {
      if (m.id === 'dosya') {
        parts.push({
          label: 'DOSYA İŞLEMLERİ',
          id: 'dosya-liste'
        });
        parts.push({
          label: 'DOSYA DETAY',
          id: page
        });
        break;
      }
    }
    if (page.startsWith('crm-detay-')) {
      if (m.id === 'crm') {
        parts.push({
          label: 'CRM',
          id: 'crm-liste'
        });
        parts.push({
          label: 'CRM DETAY',
          id: page
        });
        break;
      }
    }
  }
  if (page === 'profil') {
    parts.push({
      label: 'PROFİL',
      id: 'profil'
    });
  }
  if (parts.length <= 1 && page === 'home') return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 0',
      fontSize: 11,
      color: C.textMuted
    }
  }, parts.map((p, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronRight",
    size: 12,
    color: C.textMuted
  }), i < parts.length - 1 ? /*#__PURE__*/React.createElement("span", {
    onClick: () => setPage(p.id),
    style: {
      cursor: 'pointer',
      color: C.textSec
    },
    onMouseEnter: e => e.currentTarget.style.color = C.accent,
    onMouseLeave: e => e.currentTarget.style.color = C.textSec
  }, p.label) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.text,
      fontWeight: 600
    }
  }, p.label))));
};

/* ═══ PROFİL SAYFASI ═══ */
const ProfilPage = ({
  user
}) => {
  const {
    C,
    S,
    LIcon,
    SectionTitle,
    FormGroup,
    api
  } = MR;
  const [eskiSifre, setEskiSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifre2, setYeniSifre2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const sifreDegistir = async () => {
    setMsg('');
    setErr('');
    if (!eskiSifre || !yeniSifre) {
      setErr('TÜM ALANLAR GEREKLİ');
      return;
    }
    if (yeniSifre.length < 6) {
      setErr('YENİ ŞİFRE EN AZ 6 KARAKTER OLMALI');
      return;
    }
    if (yeniSifre !== yeniSifre2) {
      setErr('YENİ ŞİFRELER UYUŞMUYOR');
      return;
    }
    const r = await api.changePw({
      eski_sifre: eskiSifre,
      yeni_sifre: yeniSifre
    });
    if (r?.success) {
      setMsg('ŞİFRE BAŞARIYLA DEĞİŞTİRİLDİ');
      setEskiSifre('');
      setYeniSifre('');
      setYeniSifre2('');
    } else setErr(r?.error || 'HATA OLUŞTU');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "User",
    title: "PROF\u0130L B\u0130LG\u0130LER\u0130"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 16,
      background: `${C.accent}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      fontWeight: 800,
      color: C.accent
    }
  }, (user?.ad_soyad || 'U')[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, user?.ad_soyad), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textMuted
    }
  }, user?.email))), [['ROL', (user?.rol || '').toUpperCase()], ['TELEFON', user?.telefon || '-'], ['KAYIT TARİHİ', user?.created_at || '-']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.textMuted
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, v))))), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Lock",
    title: "\u015E\u0130FRE DE\u011E\u0130\u015ET\u0130R"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, msg && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: `${C.success}22`,
      border: `1px solid ${C.success}44`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.success
    }
  }, msg), err && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: `${C.danger}22`,
      border: `1px solid ${C.danger}44`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger
    }
  }, err), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "MEVCUT \u015E\u0130FRE"
  }, /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: eskiSifre,
    onChange: e => setEskiSifre(e.target.value),
    style: S.input
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "YEN\u0130 \u015E\u0130FRE"
  }, /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: yeniSifre,
    onChange: e => setYeniSifre(e.target.value),
    style: S.input
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "YEN\u0130 \u015E\u0130FRE (TEKRAR)"
  }, /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: yeniSifre2,
    onChange: e => setYeniSifre2(e.target.value),
    style: S.input
  })), /*#__PURE__*/React.createElement("button", {
    onClick: sifreDegistir,
    style: {
      ...S.btn,
      ...S.btnP,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Lock",
    size: 14,
    color: "#fff"
  }), " \u015E\u0130FREY\u0130 DE\u011E\u0130\u015ET\u0130R"))))));
};

/* ═══ SAYFA ROUTER ═══ */
const PageRouter = ({
  page,
  setPage,
  user
}) => {
  const dosyaIdMatch = page.match(/^dosya-detay-(\d+)$/);
  const crmIdMatch = page.match(/^crm-detay-(\d+)$/);
  if (page === 'home') return /*#__PURE__*/React.createElement(MR.HomePage, {
    setPage: setPage,
    user: user
  });
  if (page === 'dosya-liste') return /*#__PURE__*/React.createElement(MR.DosyaListePage, {
    setPage: setPage,
    user: user
  });
  if (page === 'dosya-yeni') return /*#__PURE__*/React.createElement(MR.DosyaYeniPage, {
    setPage: setPage,
    user: user
  });
  if (dosyaIdMatch) return /*#__PURE__*/React.createElement(MR.DosyaDetayPage, {
    setPage: setPage,
    user: user,
    dosyaId: parseInt(dosyaIdMatch[1])
  });
  if (page === 'crm-liste') return /*#__PURE__*/React.createElement(MR.CrmPage, {
    setPage: setPage,
    user: user,
    view: "liste"
  });
  if (page === 'crm-yeni') return /*#__PURE__*/React.createElement(MR.CrmPage, {
    setPage: setPage,
    user: user,
    view: "yeni"
  });
  if (crmIdMatch) return /*#__PURE__*/React.createElement(MR.CrmPage, {
    setPage: setPage,
    user: user,
    view: "detay",
    crmId: parseInt(crmIdMatch[1])
  });
  if (page === 'hesap-adk') return /*#__PURE__*/React.createElement(MR.HesapADKPage, {
    setPage: setPage,
    user: user
  });
  if (page === 'hesap-bh') return /*#__PURE__*/React.createElement(MR.HesapBHPage, {
    setPage: setPage,
    user: user
  });
  if (page.startsWith('muhasebe')) {
    const sub = page.replace('muhasebe-', '') || 'kasa';
    return /*#__PURE__*/React.createElement(MR.MuhasebePage, {
      setPage: setPage,
      user: user,
      subPage: sub === 'muhasebe' ? 'kasa' : sub
    });
  }
  if (page === 'ajanda') return /*#__PURE__*/React.createElement(MR.AjandaPage, {
    setPage: setPage,
    user: user
  });
  if (page === 'bildirim') return /*#__PURE__*/React.createElement(MR.BildirimPage, {
    setPage: setPage,
    user: user
  });
  if (page.startsWith('sistem')) {
    const sub = page.replace('sistem-', '') || 'tanimlamalar';
    return /*#__PURE__*/React.createElement(MR.SistemPage, {
      setPage: setPage,
      user: user,
      subPage: sub === 'sistem' ? 'tanimlamalar' : sub
    });
  }
  if (page === 'profil') return /*#__PURE__*/React.createElement(ProfilPage, {
    user: user
  });
  return /*#__PURE__*/React.createElement(MR.HomePage, {
    setPage: setPage,
    user: user
  });
};

/* ═══ ANA UYGULAMA ═══ */
const App = () => {
  const {
    C,
    api,
    LoginScreen
  } = MR;
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      if (api.token) {
        const r = await api.me();
        if (r?.success) {
          setUser(r.data?.user || r.data);
        } else {
          api.setToken(null, null);
        }
      }
      setLoading(false);
    })();
  }, []);
  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    api.setToken(null, null);
    setUser(null);
    setPage('home');
  };
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.accent}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: C.textMuted
      }
    }, "Y\xDCKLEN\u0130YOR...")));
  }
  if (!user) return /*#__PURE__*/React.createElement(LoginScreen, {
    onLogin: setUser
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: C.bg,
      color: C.text
    }
  }, /*#__PURE__*/React.createElement(TopNav, {
    user: user,
    page: page,
    setPage: setPage,
    onLogout: logout
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      padding: '0 24px 40px'
    }
  }, /*#__PURE__*/React.createElement(Breadcrumb, {
    page: page,
    setPage: setPage
  }), /*#__PURE__*/React.createElement(PageRouter, {
    page: page,
    setPage: setPage,
    user: user
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '20px 0',
      borderTop: `1px solid ${C.border}`,
      fontSize: 10,
      color: C.textMuted,
      letterSpacing: 1
    }
  }, "MR HASAR DANI\u015EMANLIK \xA9 2025 \u2014 DOSYA TAK\u0130P S\u0130STEM\u0130 \u2014 HER ZAMAN FARK EDER"), MR.SoftphoneWidget && /*#__PURE__*/React.createElement(MR.SoftphoneWidget, {
    user: user
  }));
};

/* ═══ RENDER ═══ */
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));