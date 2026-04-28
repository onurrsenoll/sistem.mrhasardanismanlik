const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect
} = React;
MR.HomePage = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    StatCard,
    Badge,
    SectionTitle,
    EmptyState,
    Loading,
    api,
    fmt
  } = MR;
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ds, fl] = await Promise.all([api.dashboard(), api.dosyaList({
        limit: 5
      })]);
      if (ds?.success) setStats(ds.data);
      if (fl?.success) setRecent(fl.data.items || []);
      setLoading(false);
    })();
  }, []);
  if (loading) return /*#__PURE__*/React.createElement(Loading, null);
  const d = stats?.dosya || {};
  const m = stats?.mali || {};
  const k = stats?.kullanici || {};
  const crm = stats?.crm || {};
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 16,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "FolderOpen",
    label: "TOPLAM DOSYA",
    value: d.toplam || 0,
    color: C.accent
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "FileCheck",
    label: "A\xC7IK DOSYA",
    value: d.acik || 0,
    color: C.success
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Clock",
    label: "BU AY YEN\u0130",
    value: d.bu_ay || 0,
    color: C.warning
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Users",
    label: "CRM KAYIT",
    value: crm.toplam || 0,
    color: C.purple
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "DollarSign",
    label: "TOPLAM BAK\u0130YE",
    value: fmt(m.toplam_bakiye || 0),
    color: C.cyan
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "FolderOpen",
    title: "SON DOSYALAR"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, recent.length > 0 ? /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: `1px solid ${C.border}`
    }
  }, ['DOSYA NO', 'MAĞDUR', 'TÜR', 'AŞAMA'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '8px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 10
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, recent.map((d, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: `1px solid ${C.border}`,
      cursor: 'pointer'
    },
    onClick: () => setPage('dosya-detay-' + (d.dosya_id || d.id))
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      fontWeight: 600,
      color: C.accent
    }
  }, d.dosya_no), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, d.magdur_adi || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: d.dosya_turu,
    color: d.dosya_turu === 'ADK' ? C.accent : C.purple
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: d.asama || 'DOSYA AÇIK',
    color: C.cyan
  })))))) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "FolderOpen",
    title: "HEN\xDCZ DOSYA YOK",
    desc: "YEN\u0130 DOSYA OLU\u015ETURMAK \u0130\xC7\u0130N TIKLAYIN"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 11
    },
    onClick: () => setPage('dosya-liste')
  }, "T\xDCM DOSYALAR \u2192")))), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Zap",
    title: "HIZLI \u0130\u015ELEMLER"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, [{
    i: 'Plus',
    l: 'YENİ DOSYA OLUŞTUR',
    p: 'dosya-yeni',
    c: C.accent
  }, {
    i: 'Calculator',
    l: 'ADK HESAPLA',
    p: 'hesap-adk',
    c: C.success
  }, {
    i: 'Heart',
    l: 'BEDENİ HASAR',
    p: 'hesap-bh',
    c: C.purple
  }, {
    i: 'UserPlus',
    l: 'YENİ CRM KAYDI',
    p: 'crm-yeni',
    c: C.cyan
  }, {
    i: 'CalendarDays',
    l: 'AJANDA',
    p: 'ajanda',
    c: C.warning
  }, {
    i: 'Bell',
    l: 'BİLDİRİMLER',
    p: 'bildirim',
    c: C.pink
  }].map(({
    i,
    l,
    p,
    c
  }, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    onClick: () => setPage(p),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 10,
      cursor: 'pointer',
      marginBottom: 6,
      border: `1px solid ${C.border}`,
      transition: 'all .2s'
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = c;
      e.currentTarget.style.background = `${c}11`;
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = C.border;
      e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      background: `${c}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: i,
    size: 16,
    color: c
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, l), /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronRight",
    size: 14,
    color: C.textMuted,
    style: {
      marginLeft: 'auto'
    }
  })))))), stats?.son_aktiviteler?.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Activity",
    title: "SON AKT\u0130V\u0130TELER"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, stats.son_aktiviteler.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: `${C.accent}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Activity",
    size: 14,
    color: C.accent
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, a.islem), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted
    }
  }, a.detay)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, a.kullanici_adi, " \u2022 ", a.created_at))))));
};