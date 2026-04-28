const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect,
  useCallback,
  useRef
} = React;

/* ════════════════════════════════════════════════════════════════
   MR HASAR DANIŞMANLIK - SİSTEM YÖNETİMİ SAYFASI
   TANIMLAMALAR | KULLANICI YÖNETİMİ | LOG KAYITLARI
   ════════════════════════════════════════════════════════════════ */

/* ─── TANIMLAMALAR KATEGORİ HARİTASI ─── */
const TANIM_KATEGORILER = [{
  key: 'dosya_turu',
  label: 'DOSYA TÜRÜ',
  icon: 'Folder'
}, {
  key: 'asama',
  label: 'AŞAMA',
  icon: 'Layers'
}, {
  key: 'sigorta_sirketi',
  label: 'SİGORTA ŞİRKETİ',
  icon: 'Shield'
}, {
  key: 'hasar_turu',
  label: 'HASAR TÜRÜ',
  icon: 'AlertCircle'
}, {
  key: 'evrak_turu',
  label: 'EVRAK TÜRÜ',
  icon: 'FileText'
}, {
  key: 'masraf_kalemi',
  label: 'MASRAF KALEMİ',
  icon: 'Receipt'
}, {
  key: 'oncelik',
  label: 'ÖNCELİK',
  icon: 'Zap'
}, {
  key: 'crm_durum',
  label: 'CRM DURUM',
  icon: 'Target'
}, {
  key: 'crm_kaynak',
  label: 'CRM KAYNAK',
  icon: 'Globe'
}, {
  key: 'il',
  label: 'İL',
  icon: 'MapPin'
}];

/* ─── ROL RENK HARİTASI ─── */
const ROL_RENK = {
  admin: MR.C.danger,
  avukat: MR.C.purple,
  uzman: MR.C.accent,
  personel: MR.C.cyan,
  muhasebe: MR.C.success,
  portal: MR.C.warning
};
const ROL_LABEL = {
  admin: 'ADMİN',
  avukat: 'AVUKAT',
  uzman: 'UZMAN',
  personel: 'PERSONEL',
  muhasebe: 'MUHASEBE',
  portal: 'PORTAL'
};

/* ─── LOG İŞLEM RENK HARİTASI ─── */
const LOG_ISLEM_RENK = islem => {
  if (!islem) return MR.C.textSec;
  const s = islem.toUpperCase();
  if (s.includes('SİL') || s.includes('DELETE') || s.includes('KALDIR')) return MR.C.danger;
  if (s.includes('OLUŞTUR') || s.includes('CREATE') || s.includes('EKLE') || s.includes('YENİ')) return MR.C.success;
  if (s.includes('GÜNCELLE') || s.includes('UPDATE') || s.includes('DÜZENLE')) return MR.C.warning;
  if (s.includes('GİRİŞ') || s.includes('LOGIN')) return MR.C.accent;
  if (s.includes('ÇIKIŞ') || s.includes('LOGOUT')) return MR.C.purple;
  return MR.C.cyan;
};

/* ════════════════════════════════════════════════════════════════
   TAB 1 - TANIMLAMALAR
   ════════════════════════════════════════════════════════════════ */
const TanimlamalarTab = () => {
  const {
    C,
    S,
    LIcon,
    Badge,
    Loading,
    EmptyState,
    Modal,
    Confirm,
    api
  } = MR;
  const [seciliKat, setSeciliKat] = useState(TANIM_KATEGORILER[0].key);
  const [degerler, setDegerler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formDeger, setFormDeger] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    id: null
  });
  const [dragIdx, setDragIdx] = useState(null);
  const seciliLabel = TANIM_KATEGORILER.find(k => k.key === seciliKat)?.label || '';
  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.tanimList({
      kategori: seciliKat
    });
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setDegerler(Array.isArray(items) ? items : []);
    } else {
      setDegerler([]);
    }
    setLoading(false);
  }, [seciliKat]);
  useEffect(() => {
    load();
  }, [load]);
  const yeniEkle = () => {
    setEditItem(null);
    setFormDeger('');
    setModalOpen(true);
  };
  const duzenle = item => {
    setEditItem(item);
    setFormDeger(item.deger || '');
    setModalOpen(true);
  };
  const kaydet = async () => {
    if (!formDeger.trim()) return;
    setSaving(true);
    let r;
    if (editItem) {
      r = await api.tanimUpdate({
        id: editItem.id,
        deger: formDeger.trim()
      });
    } else {
      r = await api.tanimCreate({
        kategori: seciliKat,
        deger: formDeger.trim()
      });
    }
    if (r?.success) {
      setModalOpen(false);
      setFormDeger('');
      setEditItem(null);
      await load();
    }
    setSaving(false);
  };
  const toggleAktif = async item => {
    await api.tanimUpdate({
      id: item.id,
      aktif: item.aktif ? 0 : 1
    });
    await load();
  };
  const silOnayla = id => {
    setConfirmState({
      open: true,
      id
    });
  };
  const sil = async () => {
    if (confirmState.id) {
      await api.tanimDelete(confirmState.id);
      setConfirmState({
        open: false,
        id: null
      });
      await load();
    }
  };

  /* ─── SIRALAMA (DRAG & DROP) ─── */
  const handleDragStart = idx => {
    setDragIdx(idx);
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const yeni = [...degerler];
    const [moved] = yeni.splice(dragIdx, 1);
    yeni.splice(idx, 0, moved);
    setDegerler(yeni);
    setDragIdx(idx);
  };
  const handleDragEnd = async () => {
    setDragIdx(null);
    for (let i = 0; i < degerler.length; i++) {
      if (degerler[i].sira !== i + 1) {
        await api.tanimUpdate({
          id: degerler[i].id,
          sira: i + 1
        });
      }
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      gap: 16,
      minHeight: 500
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      height: 'fit-content'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Database",
    size: 14,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, "KATEGOR\u0130LER")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8
    }
  }, TANIM_KATEGORILER.map(kat => {
    const aktif = seciliKat === kat.key;
    return /*#__PURE__*/React.createElement("div", {
      key: kat.key,
      onClick: () => setSeciliKat(kat.key),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        marginBottom: 2,
        transition: 'all .2s',
        background: aktif ? `${C.accent}18` : 'transparent',
        borderLeft: aktif ? `3px solid ${C.accent}` : '3px solid transparent',
        color: aktif ? C.accent : C.textSec
      },
      onMouseEnter: e => {
        if (!aktif) e.currentTarget.style.background = C.bgHover;
      },
      onMouseLeave: e => {
        if (!aktif) e.currentTarget.style.background = 'transparent';
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: kat.icon,
      size: 14,
      color: aktif ? C.accent : C.textMuted
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: aktif ? 700 : 500
      }
    }, kat.label));
  }))), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "List",
    size: 14,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, seciliLabel), /*#__PURE__*/React.createElement(Badge, {
    text: `${degerler.length} KAYIT`,
    color: C.accent
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 11,
      padding: '8px 16px'
    },
    onClick: yeniEkle
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Plus",
    size: 14,
    color: "#fff"
  }), " YEN\u0130 EKLE")), loading ? /*#__PURE__*/React.createElement(Loading, null) : degerler.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Database",
    title: "TANIMLAMA BULUNAMADI",
    desc: `${seciliLabel} KATEGORİSİNDE HENÜZ KAYIT YOK`
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12
    }
  }, degerler.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: item.id || idx,
    draggable: true,
    onDragStart: () => handleDragStart(idx),
    onDragOver: e => handleDragOver(e, idx),
    onDragEnd: handleDragEnd,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 8,
      marginBottom: 4,
      transition: 'all .2s',
      background: dragIdx === idx ? `${C.accent}11` : 'transparent',
      border: `1px solid ${dragIdx === idx ? C.accent + '44' : C.border}`,
      opacity: item.aktif === 0 ? 0.5 : 1
    },
    onMouseEnter: e => {
      if (dragIdx === null) e.currentTarget.style.background = C.bgHover;
    },
    onMouseLeave: e => {
      if (dragIdx === null) e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      cursor: 'grab',
      color: C.textMuted,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      padding: '0 4px'
    },
    title: "SIRALAMA"
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Menu",
    size: 14,
    color: C.textMuted
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      fontWeight: 600,
      minWidth: 20,
      textAlign: 'center'
    }
  }, idx + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
      color: item.aktif === 0 ? C.textMuted : C.text
    }
  }, item.deger), /*#__PURE__*/React.createElement("div", {
    onClick: () => toggleAktif(item),
    style: {
      cursor: 'pointer',
      padding: '4px 10px',
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: item.aktif !== 0 ? `${C.success}22` : `${C.danger}22`,
      color: item.aktif !== 0 ? C.success : C.danger,
      border: `1px solid ${item.aktif !== 0 ? C.success + '33' : C.danger + '33'}`
    }
  }, item.aktif !== 0 ? 'AKTİF' : 'PASİF'), /*#__PURE__*/React.createElement("div", {
    onClick: () => duzenle(item),
    style: {
      cursor: 'pointer',
      padding: 6,
      borderRadius: 6,
      transition: 'all .2s'
    },
    onMouseEnter: e => e.currentTarget.style.background = `${C.accent}22`,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    title: "D\xDCZENLE"
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Edit",
    size: 14,
    color: C.accent
  })), /*#__PURE__*/React.createElement("div", {
    onClick: () => silOnayla(item.id),
    style: {
      cursor: 'pointer',
      padding: 6,
      borderRadius: 6,
      transition: 'all .2s'
    },
    onMouseEnter: e => e.currentTarget.style.background = `${C.danger}22`,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    title: "S\u0130L"
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Trash2",
    size: 14,
    color: C.danger
  })))))), /*#__PURE__*/React.createElement(Modal, {
    open: modalOpen,
    onClose: () => setModalOpen(false),
    title: editItem ? 'TANIMLAMA DÜZENLE' : 'YENİ TANIMLAMA EKLE',
    width: "440px"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: S.label
  }, "DE\u011EER"), /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: formDeger,
    onChange: e => setFormDeger(e.target.value),
    placeholder: "DE\u011EER G\u0130R\u0130N\u0130Z",
    autoFocus: true,
    onKeyDown: e => {
      if (e.key === 'Enter') kaydet();
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      marginTop: 8
    }
  }, "KATEGOR\u0130: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: C.accent
    }
  }, seciliLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 12
    },
    onClick: () => setModalOpen(false)
  }, "\u0130PTAL"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS,
      fontSize: 12,
      opacity: saving ? 0.7 : 1
    },
    onClick: kaydet,
    disabled: saving
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " ", saving ? 'KAYDEDİLİYOR...' : 'KAYDET')))), /*#__PURE__*/React.createElement(Confirm, {
    open: confirmState.open,
    message: "BU TANIMLAMAYI S\u0130LMEK \u0130STED\u0130\u011E\u0130N\u0130ZDEN EM\u0130N M\u0130S\u0130N\u0130Z?",
    onConfirm: sil,
    onCancel: () => setConfirmState({
      open: false,
      id: null
    })
  }));
};

/* ════════════════════════════════════════════════════════════════
   TAB 2 - KULLANICI YÖNETİMİ
   ════════════════════════════════════════════════════════════════ */
const KullaniciTab = () => {
  const {
    C,
    S,
    LIcon,
    Badge,
    StatCard,
    Loading,
    EmptyState,
    Modal,
    FormGroup,
    Confirm,
    api
  } = MR;
  const [kullanicilar, setKullanicilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState({
    open: false,
    id: null,
    msg: ''
  });
  const bos = {
    ad_soyad: '',
    email: '',
    sifre: '',
    telefon: '',
    rol: 'personel'
  };
  const [form, setForm] = useState({
    ...bos
  });
  const up = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const load = async () => {
    setLoading(true);
    const r = await api.kullaniciList();
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setKullanicilar(Array.isArray(items) ? items : []);
    } else {
      setKullanicilar([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const toplam = kullanicilar.length;
  const aktifSayi = kullanicilar.filter(u => u.aktif !== 0 && u.aktif !== false).length;
  const pasifSayi = toplam - aktifSayi;
  const yeniKullanici = () => {
    setEditUser(null);
    setForm({
      ...bos
    });
    setError('');
    setModalOpen(true);
  };
  const duzenle = user => {
    setEditUser(user);
    setForm({
      ad_soyad: user.ad_soyad || '',
      email: user.email || '',
      sifre: '',
      telefon: user.telefon || '',
      rol: user.rol || 'personel'
    });
    setError('');
    setModalOpen(true);
  };
  const kaydet = async () => {
    if (!form.ad_soyad.trim() || !form.email.trim()) {
      setError('AD SOYAD VE E-POSTA ZORUNLU ALANLARDIR');
      return;
    }
    if (!editUser && !form.sifre) {
      setError('YENİ KULLANICI İÇİN ŞİFRE ZORUNLUDUR');
      return;
    }
    setSaving(true);
    setError('');
    let r;
    if (editUser) {
      const payload = {
        id: editUser.id,
        ad_soyad: form.ad_soyad.trim(),
        email: form.email.trim(),
        telefon: form.telefon.trim(),
        rol: form.rol
      };
      if (form.sifre) payload.sifre = form.sifre;
      r = await api.kullaniciUpdate(payload);
    } else {
      r = await api.kullaniciCreate({
        ad_soyad: form.ad_soyad.trim(),
        email: form.email.trim(),
        sifre: form.sifre,
        telefon: form.telefon.trim(),
        rol: form.rol
      });
    }
    if (r?.success) {
      setModalOpen(false);
      setForm({
        ...bos
      });
      setEditUser(null);
      await load();
    } else {
      setError(r?.error || 'BİR HATA OLUŞTU');
    }
    setSaving(false);
  };
  const toggleAktif = user => {
    const yeniDurum = user.aktif !== 0 && user.aktif !== false ? 0 : 1;
    const msg = yeniDurum === 0 ? `"${user.ad_soyad}" KULLANICISINI PASİF YAPMAK İSTEDİĞİNİZDEN EMİN MİSİNİZ?` : `"${user.ad_soyad}" KULLANICISINI AKTİF YAPMAK İSTEDİĞİNİZDEN EMİN MİSİNİZ?`;
    setConfirmState({
      open: true,
      id: user.id,
      msg,
      action: 'toggle',
      aktif: yeniDurum
    });
  };
  const silKullanici = user => {
    setConfirmState({
      open: true,
      id: user.id,
      msg: `"${user.ad_soyad}" KULLANICISINI SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? (PASİF YAPILACAKTIR)`,
      action: 'delete'
    });
  };
  const confirmAction = async () => {
    if (!confirmState.id) return;
    if (confirmState.action === 'toggle') {
      await api.kullaniciUpdate({
        id: confirmState.id,
        aktif: confirmState.aktif
      });
    } else if (confirmState.action === 'delete') {
      await api.kullaniciDelete(confirmState.id);
    }
    setConfirmState({
      open: false,
      id: null,
      msg: ''
    });
    await load();
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "Users",
    label: "TOPLAM KULLANICI",
    value: toplam,
    color: C.accent
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "UserCheck",
    label: "AKT\u0130F",
    value: aktifSayi,
    color: C.success
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "User",
    label: "PAS\u0130F",
    value: pasifSayi,
    color: C.danger
  })), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Users",
    size: 14,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "KULLANICI Y\xD6NET\u0130M\u0130"), /*#__PURE__*/React.createElement(Badge, {
    text: `${toplam} KULLANICI`,
    color: C.accent
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 11,
      padding: '8px 16px'
    },
    onClick: yeniKullanici
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "UserPlus",
    size: 14,
    color: "#fff"
  }), " YEN\u0130 KULLANICI")), loading ? /*#__PURE__*/React.createElement(Loading, null) : kullanicilar.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Users",
    title: "KULLANICI BULUNAMADI",
    desc: "S\u0130STEMDE KAYITLI KULLANICI YOK"
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
      minWidth: 800
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.bgHover
    }
  }, ['AD SOYAD', 'E-POSTA', 'TELEFON', 'ROL', 'DURUM', 'İŞLEMLER'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 9,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, kullanicilar.map((u, i) => {
    const aktif = u.aktif !== 0 && u.aktif !== false;
    const rolRenk = ROL_RENK[u.rol] || C.textSec;
    return /*#__PURE__*/React.createElement("tr", {
      key: u.id || i,
      style: {
        borderBottom: `1px solid ${C.border}`
      },
      onMouseEnter: e => e.currentTarget.style.background = C.bgHover,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `${rolRenk}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 800,
        color: rolRenk
      }
    }, (u.ad_soyad || '?')[0].toUpperCase()), u.ad_soyad)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        color: C.textSec
      }
    }, u.email), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        color: C.textSec
      }
    }, u.telefon || '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      text: ROL_LABEL[u.rol] || (u.rol || '').toUpperCase(),
      color: rolRenk
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      text: aktif ? 'AKTİF' : 'PASİF',
      color: aktif ? C.success : C.danger
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => duzenle(u),
      style: {
        cursor: 'pointer',
        padding: 6,
        borderRadius: 6,
        transition: 'all .2s'
      },
      onMouseEnter: e => e.currentTarget.style.background = `${C.accent}22`,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent',
      title: "D\xDCZENLE"
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Edit",
      size: 14,
      color: C.accent
    })), /*#__PURE__*/React.createElement("div", {
      onClick: () => toggleAktif(u),
      style: {
        cursor: 'pointer',
        padding: 6,
        borderRadius: 6,
        transition: 'all .2s'
      },
      onMouseEnter: e => e.currentTarget.style.background = `${C.warning}22`,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent',
      title: aktif ? 'PASİF YAP' : 'AKTİF YAP'
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: aktif ? 'XCircle' : 'CheckSquare',
      size: 14,
      color: aktif ? C.warning : C.success
    })), /*#__PURE__*/React.createElement("div", {
      onClick: () => silKullanici(u),
      style: {
        cursor: 'pointer',
        padding: 6,
        borderRadius: 6,
        transition: 'all .2s'
      },
      onMouseEnter: e => e.currentTarget.style.background = `${C.danger}22`,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent',
      title: "S\u0130L"
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Trash2",
      size: 14,
      color: C.danger
    })))));
  }))))), /*#__PURE__*/React.createElement(Modal, {
    open: modalOpen,
    onClose: () => setModalOpen(false),
    title: editUser ? 'KULLANICI DÜZENLE' : 'YENİ KULLANICI OLUŞTUR',
    width: "520px"
  }, /*#__PURE__*/React.createElement("div", null, error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: `${C.danger}22`,
      border: `1px solid ${C.danger}44`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "AD SOYAD *"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.ad_soyad,
    onChange: e => up('ad_soyad', e.target.value),
    placeholder: "AD SOYAD"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "E-POSTA *"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    type: "email",
    value: form.email,
    onChange: e => up('email', e.target.value),
    placeholder: "E-POSTA ADRES\u0130"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: editUser ? 'ŞİFRE (OPSIYONEL)' : 'ŞİFRE *'
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    type: "password",
    value: form.sifre,
    onChange: e => up('sifre', e.target.value),
    placeholder: editUser ? 'BOŞSA DEĞİŞMEZ' : 'ŞİFRE GİRİNİZ'
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "TELEFON"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    type: "tel",
    value: form.telefon,
    onChange: e => up('telefon', e.target.value),
    placeholder: "05XX XXX XXXX"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "ROL *",
    full: true
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.rol,
    onChange: e => up('rol', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "admin"
  }, "ADM\u0130N"), /*#__PURE__*/React.createElement("option", {
    value: "avukat"
  }, "AVUKAT"), /*#__PURE__*/React.createElement("option", {
    value: "uzman"
  }, "UZMAN"), /*#__PURE__*/React.createElement("option", {
    value: "personel"
  }, "PERSONEL"), /*#__PURE__*/React.createElement("option", {
    value: "muhasebe"
  }, "MUHASEBE"), /*#__PURE__*/React.createElement("option", {
    value: "portal"
  }, "PORTAL")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 12
    },
    onClick: () => setModalOpen(false)
  }, "\u0130PTAL"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS,
      fontSize: 12,
      opacity: saving ? 0.7 : 1
    },
    onClick: kaydet,
    disabled: saving
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " ", saving ? 'KAYDEDİLİYOR...' : 'KAYDET')))), /*#__PURE__*/React.createElement(Confirm, {
    open: confirmState.open,
    message: confirmState.msg,
    onConfirm: confirmAction,
    onCancel: () => setConfirmState({
      open: false,
      id: null,
      msg: ''
    })
  }));
};

/* ════════════════════════════════════════════════════════════════
   TAB 3 - LOG KAYITLARI
   ════════════════════════════════════════════════════════════════ */
const LogTab = () => {
  const {
    C,
    S,
    LIcon,
    Badge,
    Loading,
    EmptyState,
    api
  } = MR;
  const [loglar, setLoglar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [kullanicilar, setKullanicilar] = useState([]);
  const limit = 25;
  const [filtreler, setFiltreler] = useState({
    islem: '',
    kullanici_id: '',
    modul: '',
    baslangic: '',
    bitis: ''
  });
  const upF = (k, v) => setFiltreler(p => ({
    ...p,
    [k]: v
  }));

  /* MODÜL SEÇENEKLERİ */
  const moduller = ['DOSYA', 'CRM', 'MUHASEBE', 'MASRAF', 'EVRAK', 'KULLANICI', 'TANIM', 'BİLDİRİM', 'AJANDA', 'SİSTEM', 'AUTH'];

  /* KULLANICI LİSTESİ (FİLTRE İÇİN) */
  useEffect(() => {
    (async () => {
      const r = await api.kullaniciList();
      if (r?.success) {
        const items = r.data?.items || r.data || [];
        setKullanicilar(Array.isArray(items) ? items : []);
      }
    })();
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    const p = {
      limit,
      offset: sayfa * limit
    };
    if (filtreler.islem) p.islem = filtreler.islem;
    if (filtreler.kullanici_id) p.kullanici_id = filtreler.kullanici_id;
    if (filtreler.modul) p.modul = filtreler.modul;
    if (filtreler.baslangic) p.baslangic = filtreler.baslangic;
    if (filtreler.bitis) p.bitis = filtreler.bitis;
    const r = await api.loglar(p);
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setLoglar(Array.isArray(items) ? items : []);
      setTotal(r.data?.pagination?.total || r.data?.total || items.length || 0);
    } else {
      setLoglar([]);
      setTotal(0);
    }
    setLoading(false);
  }, [sayfa, filtreler]);
  useEffect(() => {
    load();
  }, [load]);

  /* FİLTRE DEĞİŞTİĞİNDE SAYFAYI SIFIRLA */
  const filtreDegistir = (k, v) => {
    upF(k, v);
    setSayfa(0);
  };
  const toplamSayfa = Math.max(1, Math.ceil(total / limit));

  /* ─── CSV EXPORT ─── */
  const exportCSV = () => {
    if (loglar.length === 0) return;
    const headers = ['TARİH', 'KULLANICI', 'İŞLEM', 'DETAY', 'MODÜL', 'KAYIT ID'];
    const rows = loglar.map(l => [l.created_at || l.tarih || '', l.kullanici_adi || l.kullanici || '', l.islem || '', (l.detay || '').replace(/"/g, '""'), l.modul || '', l.kayit_id || '']);
    let csv = '\uFEFF'; /* BOM - EXCEL TÜRKÇE UYUMLULUĞU */
    csv += headers.join(';') + '\n';
    rows.forEach(row => {
      csv += row.map(v => `"${v}"`).join(';') + '\n';
    });
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOG_KAYITLARI_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* FİLTRELERİ TEMİZLE */
  const filtreTemizle = () => {
    setFiltreler({
      islem: '',
      kullanici_id: '',
      modul: '',
      baslangic: '',
      bitis: ''
    });
    setSayfa(0);
  };
  const aktifFiltreSayisi = Object.values(filtreler).filter(v => v).length;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between',
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Filter",
    size: 14,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, "F\u0130LTRELER"), aktifFiltreSayisi > 0 && /*#__PURE__*/React.createElement(Badge, {
    text: `${aktifFiltreSayisi} FİLTRE AKTİF`,
    color: C.warning
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, aktifFiltreSayisi > 0 && /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 12px'
    },
    onClick: filtreTemizle
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "X",
    size: 12,
    color: C.textSec
  }), " TEM\u0130ZLE"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS,
      fontSize: 10,
      padding: '6px 12px'
    },
    onClick: exportCSV,
    disabled: loglar.length === 0
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Download",
    size: 12,
    color: "#fff"
  }), " CSV EXPORT"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: S.label
  }, "\u0130\u015ELEM"), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.input,
      fontSize: 11
    },
    placeholder: "\u0130\u015ELEM ARA...",
    value: filtreler.islem,
    onChange: e => filtreDegistir('islem', e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: S.label
  }, "KULLANICI"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.select,
      fontSize: 11
    },
    value: filtreler.kullanici_id,
    onChange: e => filtreDegistir('kullanici_id', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "T\xDCM\xDC"), kullanicilar.map(u => /*#__PURE__*/React.createElement("option", {
    key: u.id,
    value: u.id
  }, u.ad_soyad)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: S.label
  }, "MOD\xDCL"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.select,
      fontSize: 11
    },
    value: filtreler.modul,
    onChange: e => filtreDegistir('modul', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "T\xDCM\xDC"), moduller.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: S.label
  }, "BA\u015ELANGI\xC7 TAR\u0130H\u0130"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: {
      ...S.input,
      fontSize: 11
    },
    value: filtreler.baslangic,
    onChange: e => filtreDegistir('baslangic', e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: S.label
  }, "B\u0130T\u0130\u015E TAR\u0130H\u0130"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: {
      ...S.input,
      fontSize: 11
    },
    value: filtreler.bitis,
    onChange: e => filtreDegistir('bitis', e.target.value)
  })))), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Activity",
    size: 14,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "LOG KAYITLARI"), /*#__PURE__*/React.createElement(Badge, {
    text: `${total} KAYIT`,
    color: C.accent
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, "SAYFA ", sayfa + 1, " / ", toplamSayfa)), loading ? /*#__PURE__*/React.createElement(Loading, null) : loglar.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Activity",
    title: "LOG KAYDI BULUNAMADI",
    desc: "F\u0130LTRE KR\u0130TERLER\u0130N\u0130ZE UYGUN KAYIT BULUNMAMAKTADIR"
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
      minWidth: 900
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.bgHover
    }
  }, ['TARİH', 'KULLANICI', 'İŞLEM', 'DETAY', 'MODÜL', 'KAYIT ID'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 9,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, loglar.map((log, i) => {
    const islemRenk = LOG_ISLEM_RENK(log.islem);
    return /*#__PURE__*/React.createElement("tr", {
      key: log.id || i,
      style: {
        borderBottom: `1px solid ${C.border}`
      },
      onMouseEnter: e => e.currentTarget.style.background = C.bgHover,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.textMuted,
        fontSize: 10,
        whiteSpace: 'nowrap'
      }
    }, log.created_at || log.tarih || '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        fontWeight: 600
      }
    }, log.kullanici_adi || log.kullanici || '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      text: log.islem || '-',
      color: islemRenk
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.textSec,
        maxWidth: 300,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, log.detay || '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      text: log.modul || '-',
      color: C.purple
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.textMuted,
        fontFamily: 'monospace',
        fontSize: 10
      }
    }, log.kayit_id || '-'));
  })))), total > limit && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, "TOPLAM ", total, " KAYIT | ", sayfa * limit + 1, " - ", Math.min((sayfa + 1) * limit, total), " ARASI G\xD6STER\u0130L\u0130YOR"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSayfa(0),
    disabled: sayfa === 0,
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 10px',
      opacity: sayfa === 0 ? 0.4 : 1
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronLeft",
    size: 12,
    color: C.textSec
  }), /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronLeft",
    size: 12,
    color: C.textSec
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSayfa(p => Math.max(0, p - 1)),
    disabled: sayfa === 0,
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 10px',
      opacity: sayfa === 0 ? 0.4 : 1
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronLeft",
    size: 12,
    color: C.textSec
  }), " \xD6NCEK\u0130"), (() => {
    const pages = [];
    const start = Math.max(0, sayfa - 2);
    const end = Math.min(toplamSayfa - 1, sayfa + 2);
    for (let p = start; p <= end; p++) {
      pages.push(/*#__PURE__*/React.createElement("button", {
        key: p,
        onClick: () => setSayfa(p),
        style: {
          ...S.btn,
          fontSize: 10,
          padding: '6px 12px',
          minWidth: 36,
          background: p === sayfa ? C.accent : C.borderLight,
          color: p === sayfa ? '#fff' : C.textSec,
          fontWeight: p === sayfa ? 700 : 400
        }
      }, p + 1));
    }
    return pages;
  })(), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSayfa(p => Math.min(toplamSayfa - 1, p + 1)),
    disabled: sayfa >= toplamSayfa - 1,
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 10px',
      opacity: sayfa >= toplamSayfa - 1 ? 0.4 : 1
    }
  }, "SONRAK\u0130 ", /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronRight",
    size: 12,
    color: C.textSec
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSayfa(toplamSayfa - 1),
    disabled: sayfa >= toplamSayfa - 1,
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 10px',
      opacity: sayfa >= toplamSayfa - 1 ? 0.4 : 1
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronRight",
    size: 12,
    color: C.textSec
  }), /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronRight",
    size: 12,
    color: C.textSec
  }))))));
};

/* ════════════════════════════════════════════════════════════════
   TAB 4 - NETSANTRAL AYARLARI
   ════════════════════════════════════════════════════════════════ */
const NetSantralTab = () => {
  const {
    C,
    S,
    LIcon,
    Badge,
    Loading,
    EmptyState,
    Modal,
    FormGroup,
    Confirm,
    api
  } = MR;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSonuc, setTestSonuc] = useState(null);
  const [kullanicilar, setKullanicilar] = useState([]);
  const [aramaKayitlari, setAramaKayitlari] = useState([]);
  const [aramaLoading, setAramaLoading] = useState(false);
  const [aramaTotal, setAramaTotal] = useState(0);
  const [aramaSayfa, setAramaSayfa] = useState(0);
  const [form, setForm] = useState({
    santral_no: '',
    kullanici_adi: '',
    sifre: '',
    api_key: '',
    varsayilan_dahili: '102',
    gelen_cagri_modu: 'dinamik_tts',
    webhook_aktif: 1,
    netsipp_aktif: 1,
    dahililer: []
  });
  const [mevcutAyar, setMevcutAyar] = useState(null);
  const [altTab, setAltTab] = useState('baglanti');
  const up = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const siteUrl = window.location.origin;
  const webhookUrl = siteUrl + '/api/v1/netsantral/webhook.php';
  const netsippUrl = siteUrl + '/api/v1/netsipp/gelen-cagri.php';
  const load = async () => {
    setLoading(true);
    const [ayarR, kulR] = await Promise.all([api.netsantralAyarGetir(), api.kullaniciList()]);
    if (ayarR?.success && ayarR.data) {
      const d = ayarR.data;
      setMevcutAyar(d);
      setForm({
        santral_no: d.santral_no || '',
        kullanici_adi: d.kullanici_adi || '',
        sifre: '',
        api_key: d.api_key || '',
        varsayilan_dahili: d.varsayilan_dahili || '102',
        gelen_cagri_modu: d.gelen_cagri_modu || 'dinamik_tts',
        webhook_aktif: d.webhook_aktif ?? 1,
        netsipp_aktif: d.netsipp_aktif ?? 1,
        dahililer: d.dahililer || []
      });
      if (d.son_baglanti_durumu === 'basarili') {
        setTestSonuc({
          durum: 'basarili',
          mesaj: 'BAĞLANTI BAŞARILI',
          tarih: d.son_baglanti_tarihi
        });
      }
    }
    if (kulR?.success) {
      const items = kulR.data?.items || kulR.data || [];
      setKullanicilar(Array.isArray(items) ? items : []);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  const loadAramalar = useCallback(async () => {
    setAramaLoading(true);
    const r = await api.netsantralAramaKayitlari({
      page: aramaSayfa + 1,
      limit: 15
    });
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setAramaKayitlari(Array.isArray(items) ? items : []);
      setAramaTotal(r.data?.pagination?.total || 0);
    }
    setAramaLoading(false);
  }, [aramaSayfa]);
  useEffect(() => {
    if (altTab === 'arama_gecmisi') loadAramalar();
  }, [altTab, loadAramalar]);
  const kaydet = async () => {
    if (!form.santral_no || !form.kullanici_adi) return;
    setSaving(true);
    const r = await api.netsantralAyarKaydet(form);
    if (r?.success) {
      setTestSonuc(null);
      await load();
    }
    setSaving(false);
  };
  const baglantiTest = async () => {
    setTesting(true);
    setTestSonuc(null);
    const r = await api.netsantralBaglantiTest({
      santral_no: form.santral_no,
      kullanici_adi: form.kullanici_adi,
      sifre: form.sifre || undefined
    });
    if (r?.success) {
      setTestSonuc({
        durum: 'basarili',
        mesaj: r.message || 'BAĞLANTI BAŞARILI',
        yetenekler: r.data?.yetenekler || []
      });
    } else {
      setTestSonuc({
        durum: 'basarisiz',
        mesaj: r?.error || 'BAĞLANTI HATASI - KULLANICI DOĞRULANAMADI'
      });
    }
    setTesting(false);
  };
  const dahiliEkle = () => up('dahililer', [...form.dahililer, {
    dahili: '',
    kullanici_id: ''
  }]);
  const dahiliGuncelle = (idx, key, val) => {
    const yeni = [...form.dahililer];
    yeni[idx] = {
      ...yeni[idx],
      [key]: val
    };
    up('dahililer', yeni);
  };
  const dahiliSil = idx => up('dahililer', form.dahililer.filter((_, i) => i !== idx));
  const kopyala = text => navigator.clipboard.writeText(text);
  if (loading) return React.createElement(Loading);
  const altTabs = [{
    key: 'baglanti',
    label: 'BAĞLANTI AYARLARI',
    icon: 'Settings'
  }, {
    key: 'webhook',
    label: 'WEBHOOK & ENTEGRASYON',
    icon: 'Link'
  }, {
    key: 'arama_gecmisi',
    label: 'ARAMA GEÇMİŞİ',
    icon: 'Phone'
  }];
  const durumRenk = d => ({
    caliyor: C.warning,
    cevaplandi: C.success,
    mesgul: C.danger,
    cevaplanmadi: C.danger,
    transfer: C.purple
  })[d] || C.textMuted;
  const durumLabel = d => ({
    caliyor: 'ÇALIYOR',
    cevaplandi: 'CEVAPLANDI',
    mesgul: 'MEŞGUL',
    cevaplanmadi: 'CEVAPLANMADI',
    transfer: 'TRANSFER'
  })[d] || 'BİLİNMİYOR';
  return React.createElement('div', null, /* ALT TAB MENÜSÜ */
  React.createElement('div', {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 16,
      background: C.bgCard,
      borderRadius: 10,
      padding: 4,
      border: `1px solid ${C.border}`
    }
  }, altTabs.map(t => React.createElement('div', {
    key: t.key,
    onClick: () => setAltTab(t.key),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 18px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: altTab === t.key ? 700 : 500,
      color: altTab === t.key ? '#fff' : C.textSec,
      background: altTab === t.key ? C.accent : 'transparent',
      transition: 'all .2s',
      flex: 1,
      justifyContent: 'center'
    }
  }, React.createElement(LIcon, {
    name: t.icon,
    size: 14,
    color: altTab === t.key ? '#fff' : C.textMuted
  }), t.label))), /* ─── BAĞLANTI AYARLARI TAB ─── */
  altTab === 'baglanti' && React.createElement('div', null, /* BAĞLANTI DURUMU */
  testSonuc && React.createElement('div', {
    style: {
      ...S.card,
      marginBottom: 16,
      borderColor: (testSonuc.durum === 'basarili' ? C.success : C.danger) + '44'
    }
  }, React.createElement('div', {
    style: {
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: testSonuc.durum === 'basarili' ? `${C.success}11` : `${C.danger}11`
    }
  }, React.createElement('div', {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: testSonuc.durum === 'basarili' ? `${C.success}22` : `${C.danger}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, React.createElement(LIcon, {
    name: testSonuc.durum === 'basarili' ? 'CheckCircle' : 'XCircle',
    size: 22,
    color: testSonuc.durum === 'basarili' ? C.success : C.danger
  })), React.createElement('div', {
    style: {
      flex: 1
    }
  }, React.createElement('div', {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: testSonuc.durum === 'basarili' ? C.success : C.danger
    }
  }, testSonuc.mesaj), testSonuc.tarih && React.createElement('div', {
    style: {
      fontSize: 10,
      color: C.textMuted,
      marginTop: 2
    }
  }, 'Son test: ' + testSonuc.tarih)), testSonuc.durum === 'basarili' && React.createElement(Badge, {
    text: 'AKTİF',
    color: C.success
  })), testSonuc.yetenekler && testSonuc.yetenekler.length > 0 && React.createElement('div', {
    style: {
      padding: '14px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      borderTop: `1px solid ${C.border}`
    }
  }, testSonuc.yetenekler.map((y, i) => React.createElement('div', {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      borderRadius: 20,
      background: `${C.success}11`,
      border: `1px solid ${C.success}22`,
      fontSize: 10,
      fontWeight: 600,
      color: C.success
    }
  }, React.createElement(LIcon, {
    name: 'Check',
    size: 12,
    color: C.success
  }), y.label)))), /* FORM - 2 KOLON */
  React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /* SOL - BAĞLANTI BİLGİLERİ */
  React.createElement('div', {
    style: S.card
  }, React.createElement('div', {
    style: S.cardHead
  }, React.createElement(LIcon, {
    name: 'Phone',
    size: 14,
    color: C.accent
  }), React.createElement('span', {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, 'SANTRAL BAĞLANTI BİLGİLERİ')), React.createElement('div', {
    style: {
      ...S.cardBody,
      display: 'grid',
      gap: 16
    }
  }, React.createElement(FormGroup, {
    label: 'SANTRAL NUMARASI *'
  }, React.createElement('input', {
    style: S.input,
    value: form.santral_no,
    onChange: e => up('santral_no', e.target.value),
    placeholder: '03625026502'
  })), React.createElement(FormGroup, {
    label: 'KULLANICI ADI *'
  }, React.createElement('input', {
    style: S.input,
    value: form.kullanici_adi,
    onChange: e => up('kullanici_adi', e.target.value),
    placeholder: '3625026502'
  })), React.createElement(FormGroup, {
    label: mevcutAyar ? 'ŞİFRE (BOŞ BIRAKIRSAN DEĞİŞMEZ)' : 'ŞİFRE *'
  }, React.createElement('input', {
    style: S.input,
    type: 'password',
    value: form.sifre,
    onChange: e => up('sifre', e.target.value),
    placeholder: mevcutAyar ? '••••••••' : 'Şifre giriniz'
  })), React.createElement(FormGroup, {
    label: 'API ANAHTARI'
  }, React.createElement('input', {
    style: S.input,
    value: form.api_key,
    onChange: e => up('api_key', e.target.value),
    placeholder: 'MR_HASAR_2026'
  })), React.createElement(FormGroup, {
    label: 'VARSAYILAN DAHİLİ'
  }, React.createElement('input', {
    style: S.input,
    value: form.varsayilan_dahili,
    onChange: e => up('varsayilan_dahili', e.target.value),
    placeholder: '102'
  })), React.createElement(FormGroup, {
    label: 'GELEN ÇAĞRI YÖNLENDİRME MODU'
  }, React.createElement('select', {
    style: S.select,
    value: form.gelen_cagri_modu,
    onChange: e => up('gelen_cagri_modu', e.target.value)
  }, React.createElement('option', {
    value: 'dinamik_tts'
  }, 'Dinamik - TTS + Dahili Yönlendirme (Önerilen)'), React.createElement('option', {
    value: 'sabit_dahili'
  }, 'Sabit Dahili Yönlendirme'), React.createElement('option', {
    value: 'kuyruk'
  }, 'Kuyruk Yönlendirme'))), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 4
    }
  }, React.createElement('button', {
    style: {
      ...S.btn,
      ...S.btnP,
      flex: 1,
      justifyContent: 'center',
      opacity: saving ? 0.7 : 1
    },
    onClick: kaydet,
    disabled: saving
  }, React.createElement(LIcon, {
    name: 'Save',
    size: 14,
    color: '#fff'
  }), saving ? 'KAYDEDİLİYOR...' : 'AYARLARI KAYDET'), React.createElement('button', {
    style: {
      ...S.btn,
      ...S.btnS,
      justifyContent: 'center',
      opacity: testing ? 0.7 : 1
    },
    onClick: baglantiTest,
    disabled: testing
  }, React.createElement(LIcon, {
    name: testing ? 'Loader' : 'Wifi',
    size: 14,
    color: '#fff'
  }), testing ? 'TEST EDİLİYOR...' : 'BAĞLANTI TESTİ')))), /* SAĞ - DAHİLİ EŞLEŞMELERİ + TOGGLE */
  React.createElement('div', {
    style: S.card
  }, React.createElement('div', {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, React.createElement(LIcon, {
    name: 'Users',
    size: 14,
    color: C.accent
  }), React.createElement('span', {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, 'DAHİLİ - KULLANICI EŞLEŞMESİ')), React.createElement('button', {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 10,
      padding: '6px 12px'
    },
    onClick: dahiliEkle
  }, React.createElement(LIcon, {
    name: 'Plus',
    size: 12,
    color: '#fff'
  }), 'EKLE')), React.createElement('div', {
    style: S.cardBody
  }, form.dahililer.length === 0 ? React.createElement('div', {
    style: {
      textAlign: 'center',
      padding: '30px 0',
      color: C.textMuted,
      fontSize: 12
    }
  }, React.createElement(LIcon, {
    name: 'PhoneOff',
    size: 24,
    color: C.textMuted
  }), React.createElement('div', {
    style: {
      marginTop: 8
    }
  }, 'Henüz dahili eşleşmesi yok'), React.createElement('div', {
    style: {
      fontSize: 10,
      marginTop: 4
    }
  }, '"EKLE" butonuna tıklayarak dahili-kullanıcı eşleşmesi tanımlayın')) : React.createElement('div', {
    style: {
      display: 'grid',
      gap: 8
    }
  }, form.dahililer.map((d, idx) => React.createElement('div', {
    key: idx,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 12px',
      borderRadius: 8,
      border: `1px solid ${C.border}`,
      background: C.bgHover
    }
  }, React.createElement('input', {
    style: {
      ...S.input,
      width: 80,
      flex: 'none'
    },
    value: d.dahili || '',
    placeholder: 'DAHİLİ',
    onChange: e => dahiliGuncelle(idx, 'dahili', e.target.value)
  }), React.createElement('select', {
    style: {
      ...S.select,
      flex: 1
    },
    value: d.kullanici_id || '',
    onChange: e => dahiliGuncelle(idx, 'kullanici_id', e.target.value)
  }, React.createElement('option', {
    value: ''
  }, 'Kullanıcı seçin...'), kullanicilar.filter(u => u.aktif !== 0).map(u => React.createElement('option', {
    key: u.id,
    value: u.id
  }, u.ad_soyad + ' (' + (u.rol || '').toUpperCase() + ')'))), React.createElement('div', {
    onClick: () => dahiliSil(idx),
    style: {
      cursor: 'pointer',
      padding: 6,
      borderRadius: 6
    }
  }, React.createElement(LIcon, {
    name: 'Trash2',
    size: 14,
    color: C.danger
  }))))), /* TOGGLE'LAR */
  React.createElement('div', {
    style: {
      marginTop: 20,
      padding: '16px 0',
      borderTop: `1px solid ${C.border}`,
      display: 'grid',
      gap: 12
    }
  }, React.createElement('div', {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.textSec,
      marginBottom: 4
    }
  }, 'ENTEGRASYON DURUMLARI'), [{
    key: 'webhook_aktif',
    label: 'Webhook Bildirimleri',
    icon: 'Link'
  }, {
    key: 'netsipp_aktif',
    label: 'Netsipp+ Entegrasyonu',
    icon: 'Monitor'
  }].map(t => React.createElement('div', {
    key: t.key,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderRadius: 8,
      border: `1px solid ${C.border}`
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, React.createElement(LIcon, {
    name: t.icon,
    size: 14,
    color: form[t.key] ? C.success : C.textMuted
  }), React.createElement('span', {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, t.label)), React.createElement('div', {
    onClick: () => up(t.key, form[t.key] ? 0 : 1),
    style: {
      width: 40,
      height: 22,
      borderRadius: 11,
      cursor: 'pointer',
      transition: 'all .2s',
      position: 'relative',
      background: form[t.key] ? C.success : C.borderLight
    }
  }, React.createElement('div', {
    style: {
      width: 18,
      height: 18,
      borderRadius: 9,
      background: '#fff',
      position: 'absolute',
      top: 2,
      left: form[t.key] ? 20 : 2,
      transition: 'all .2s'
    }
  }))))))))), /* ─── WEBHOOK & ENTEGRASYON TAB ─── */
  altTab === 'webhook' && React.createElement('div', {
    style: {
      display: 'grid',
      gap: 16
    }
  }, /* WEBHOOK URL */
  React.createElement('div', {
    style: S.card
  }, React.createElement('div', {
    style: S.cardHead
  }, React.createElement(LIcon, {
    name: 'Link',
    size: 14,
    color: C.accent
  }), React.createElement('span', {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, 'WEBHOOK URL (NETGSM PANELİNE GİRİLECEK)')), React.createElement('div', {
    style: S.cardBody
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 16px',
      borderRadius: 8,
      background: C.bgHover,
      border: `1px solid ${C.border}`,
      fontFamily: 'monospace',
      fontSize: 12
    }
  }, React.createElement('span', {
    style: {
      flex: 1,
      color: C.accent,
      wordBreak: 'break-all'
    }
  }, webhookUrl), React.createElement('button', {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 10,
      padding: '6px 12px'
    },
    onClick: () => kopyala(webhookUrl)
  }, React.createElement(LIcon, {
    name: 'Copy',
    size: 12,
    color: '#fff'
  }), 'KOPYALA')), form.api_key && React.createElement('div', {
    style: {
      marginTop: 8,
      fontSize: 10,
      color: C.textMuted
    }
  }, 'API Key ile: ', React.createElement('span', {
    style: {
      color: C.accent,
      fontFamily: 'monospace'
    }
  }, webhookUrl + '?key=' + form.api_key)))), /* NETSİPP+ URL */
  React.createElement('div', {
    style: S.card
  }, React.createElement('div', {
    style: S.cardHead
  }, React.createElement(LIcon, {
    name: 'Monitor',
    size: 14,
    color: C.purple
  }), React.createElement('span', {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, 'NETSİPP+ ENTEGRASYON URL')), React.createElement('div', {
    style: S.cardBody
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 16px',
      borderRadius: 8,
      background: C.bgHover,
      border: `1px solid ${C.border}`,
      fontFamily: 'monospace',
      fontSize: 12
    }
  }, React.createElement('span', {
    style: {
      flex: 1,
      color: C.purple,
      wordBreak: 'break-all'
    }
  }, netsippUrl + '?arayan=%caller%&aranan=%called%&aramaid=%callid%'), React.createElement('button', {
    style: {
      ...S.btn,
      background: C.purple,
      color: '#fff',
      fontSize: 10,
      padding: '6px 12px'
    },
    onClick: () => kopyala(netsippUrl + '?arayan=%caller%&aranan=%called%&aramaid=%callid%')
  }, React.createElement(LIcon, {
    name: 'Copy',
    size: 12,
    color: '#fff'
  }), 'KOPYALA')), React.createElement('div', {
    style: {
      marginTop: 12,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8
    }
  }, [{
    param: '%caller%',
    aciklama: 'arayan',
    label: 'Arayan Numara'
  }, {
    param: '%called%',
    aciklama: 'aranan',
    label: 'Aranan Numara'
  }, {
    param: '%callid%',
    aciklama: 'aramaid',
    label: 'Arama ID'
  }].map(p => React.createElement('div', {
    key: p.param,
    style: {
      padding: '8px 12px',
      borderRadius: 8,
      background: `${C.purple}11`,
      border: `1px solid ${C.purple}22`,
      fontSize: 10
    }
  }, React.createElement('div', {
    style: {
      fontWeight: 700,
      color: C.purple,
      fontFamily: 'monospace'
    }
  }, p.param), React.createElement('div', {
    style: {
      color: C.textMuted,
      marginTop: 2
    }
  }, p.aciklama + ' → ' + p.label)))))), /* KURULUM TALİMATLARI */
  React.createElement('div', {
    style: S.card
  }, React.createElement('div', {
    style: S.cardHead
  }, React.createElement(LIcon, {
    name: 'BookOpen',
    size: 14,
    color: C.warning
  }), React.createElement('span', {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, 'KURULUM TALİMATLARI')), React.createElement('div', {
    style: {
      ...S.cardBody,
      display: 'grid',
      gap: 16
    }
  }, [{
    no: '1',
    baslik: 'NetGSM Paneline Giriş Yapın',
    aciklama: 'netsantral.netgsm.com.tr adresine giderek santral yönetim panelinize giriş yapın.'
  }, {
    no: '2',
    baslik: 'Webhook URL Tanımlayın',
    aciklama: 'Santral Ayarları > Bildirim Ayarları bölümünde yukarıdaki Webhook URL\'sini yapıştırın. Çağrı başlangıç ve bitiş olaylarını seçin.'
  }, {
    no: '3',
    baslik: 'Netsipp+ Uygulamasını Yapılandırın',
    aciklama: 'Netsipp+ masaüstü uygulamasında Entegrasyon ayarlarına gidin. "Tarayıcıda Link Aç" seçeneğini etkinleştirin ve yukarıdaki Netsipp+ URL\'sini yapıştırın.'
  }, {
    no: '4',
    baslik: 'Bağlantıyı Test Edin',
    aciklama: '"Bağlantı Ayarları" sekmesinden "BAĞLANTI TESTİ" butonuna tıklayarak entegrasyonu doğrulayın.'
  }].map(a => React.createElement('div', {
    key: a.no,
    style: {
      display: 'flex',
      gap: 12
    }
  }, React.createElement('div', {
    style: {
      width: 28,
      height: 28,
      borderRadius: 14,
      background: `${C.accent}22`,
      color: C.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 800,
      flex: 'none'
    }
  }, a.no), React.createElement('div', null, React.createElement('div', {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, a.baslik), React.createElement('div', {
    style: {
      fontSize: 11,
      color: C.textSec,
      marginTop: 4
    }
  }, a.aciklama))))))), /* ─── ARAMA GEÇMİŞİ TAB ─── */
  altTab === 'arama_gecmisi' && React.createElement('div', null, React.createElement('div', {
    style: S.card
  }, React.createElement('div', {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, React.createElement(LIcon, {
    name: 'Phone',
    size: 14,
    color: C.accent
  }), React.createElement('span', {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, 'ARAMA GEÇMİŞİ'), React.createElement(Badge, {
    text: aramaTotal + ' KAYIT',
    color: C.accent
  })), React.createElement('button', {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 12px'
    },
    onClick: loadAramalar
  }, React.createElement(LIcon, {
    name: 'RefreshCw',
    size: 12,
    color: C.textSec
  }), 'YENİLE')), aramaLoading ? React.createElement(Loading) : aramaKayitlari.length === 0 ? React.createElement(EmptyState, {
    icon: 'Phone',
    title: 'ARAMA KAYDI BULUNAMADI',
    desc: 'Henüz arama kaydı oluşturulmamış'
  }) : React.createElement('div', {
    style: {
      overflowX: 'auto'
    }
  }, React.createElement('table', {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
      minWidth: 900
    }
  }, React.createElement('thead', null, React.createElement('tr', {
    style: {
      background: C.bgHover
    }
  }, ['TARİH', 'YÖN', 'ARAYAN', 'ARANAN', 'DAHİLİ', 'DURUM', 'SÜRE', 'KAYNAK', 'CRM / DOSYA'].map(h => React.createElement('th', {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 9,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), React.createElement('tbody', null, aramaKayitlari.map((ak, i) => React.createElement('tr', {
    key: ak.id || i,
    style: {
      borderBottom: `1px solid ${C.border}`
    },
    onMouseEnter: e => e.currentTarget.style.background = C.bgHover,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, React.createElement('td', {
    style: {
      padding: '10px 12px',
      fontSize: 10,
      color: C.textMuted,
      whiteSpace: 'nowrap'
    }
  }, ak.baslangic_zamani || ak.created_at || '-'), React.createElement('td', {
    style: {
      padding: '10px 12px'
    }
  }, React.createElement(Badge, {
    text: ak.yon === 'gelen' ? 'GELEN' : 'GİDEN',
    color: ak.yon === 'gelen' ? C.success : C.accent
  })), React.createElement('td', {
    style: {
      padding: '10px 12px',
      fontWeight: 600
    }
  }, ak.arayan || '-'), React.createElement('td', {
    style: {
      padding: '10px 12px',
      color: C.textSec
    }
  }, ak.aranan || '-'), React.createElement('td', {
    style: {
      padding: '10px 12px',
      color: C.textMuted,
      fontFamily: 'monospace'
    }
  }, ak.dahili || '-'), React.createElement('td', {
    style: {
      padding: '10px 12px'
    }
  }, React.createElement(Badge, {
    text: durumLabel(ak.durum),
    color: durumRenk(ak.durum)
  })), React.createElement('td', {
    style: {
      padding: '10px 12px',
      color: C.textSec
    }
  }, ak.sure > 0 ? Math.floor(ak.sure / 60) + ':' + String(ak.sure % 60).padStart(2, '0') : '-'), React.createElement('td', {
    style: {
      padding: '10px 12px'
    }
  }, React.createElement(Badge, {
    text: (ak.kaynak || '').toUpperCase(),
    color: C.purple
  })), React.createElement('td', {
    style: {
      padding: '10px 12px',
      fontSize: 10
    }
  }, ak.crm_adi ? React.createElement('span', {
    style: {
      color: C.cyan
    }
  }, ak.crm_adi) : null, ak.dosya_no ? React.createElement('span', {
    style: {
      color: C.warning,
      marginLeft: ak.crm_adi ? 8 : 0
    }
  }, ak.dosya_no) : null, !ak.crm_adi && !ak.dosya_no ? '-' : null)))))), aramaTotal > 15 && React.createElement('div', {
    style: {
      padding: '14px 20px',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, React.createElement('span', {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, 'TOPLAM ' + aramaTotal + ' KAYIT'), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 4
    }
  }, React.createElement('button', {
    onClick: () => setAramaSayfa(p => Math.max(0, p - 1)),
    disabled: aramaSayfa === 0,
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 10px',
      opacity: aramaSayfa === 0 ? 0.4 : 1
    }
  }, React.createElement(LIcon, {
    name: 'ChevronLeft',
    size: 12,
    color: C.textSec
  }), 'ÖNCEKİ'), React.createElement('button', {
    onClick: () => setAramaSayfa(p => p + 1),
    disabled: (aramaSayfa + 1) * 15 >= aramaTotal,
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 10,
      padding: '6px 10px',
      opacity: (aramaSayfa + 1) * 15 >= aramaTotal ? 0.4 : 1
    }
  }, 'SONRAKİ', React.createElement(LIcon, {
    name: 'ChevronRight',
    size: 12,
    color: C.textSec
  })))))));
};

/* ════════════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ - MR.SistemPage
   ════════════════════════════════════════════════════════════════ */
MR.SistemPage = ({
  setPage,
  user,
  subPage
}) => {
  const {
    C,
    S,
    LIcon,
    SectionTitle
  } = MR;

  /* ─── TAB TANIMLAMALARI ─── */
  const tabs = [{
    key: 'tanimlamalar',
    label: 'TANIMLAMALAR',
    icon: 'Database',
    desc: 'KATEGORİ VE DEĞER YÖNETİMİ'
  }, {
    key: 'kullanici',
    label: 'KULLANICI YÖNETİMİ',
    icon: 'Users',
    desc: 'KULLANICI OLUŞTUR, DÜZENLE, YÖNETİMİ'
  }, {
    key: 'log',
    label: 'LOG KAYITLARI',
    icon: 'Activity',
    desc: 'SİSTEM OLAY GEÇMİŞİ'
  }, {
    key: 'netsantral',
    label: 'NETSANTRAL',
    icon: 'Phone',
    desc: 'SANTRAL & ÇAĞRI YÖNETİMİ'
  }];

  /* ADMİN DEĞİLSE KULLANICI TAB'INI GİZLE */
  const isAdmin = user?.rol === 'admin';
  const gorunenTabs = isAdmin ? tabs : tabs.filter(t => t.key !== 'kullanici');

  /* AKTİF TAB */
  const [aktifTab, setAktifTab] = useState(() => {
    if (subPage && gorunenTabs.some(t => t.key === subPage)) return subPage;
    return gorunenTabs[0]?.key || 'tanimlamalar';
  });

  /* subPage DEĞİŞTİĞİNDE TAB GÜNCELLE */
  useEffect(() => {
    if (subPage && gorunenTabs.some(t => t.key === subPage)) {
      setAktifTab(subPage);
    }
  }, [subPage]);
  const aktifTabInfo = tabs.find(t => t.key === aktifTab);
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: `${C.accent}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Settings",
    size: 20,
    color: C.accent
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800
    }
  }, "S\u0130STEM Y\xD6NET\u0130M\u0130"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted
    }
  }, "TANIMLAMALAR, KULLANICILAR VE S\u0130STEM LOGLARI"))), user && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "User",
    size: 14,
    color: C.textMuted
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.textSec
    }
  }, user.ad_soyad), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.badge(ROL_RENK[user.rol] || C.accent)
    }
  }, ROL_LABEL[user.rol] || (user.rol || '').toUpperCase()))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderBottom: `1px solid ${C.border}`,
      padding: '0 16px'
    }
  }, gorunenTabs.map(tab => {
    const aktif = aktifTab === tab.key;
    return /*#__PURE__*/React.createElement("div", {
      key: tab.key,
      onClick: () => setAktifTab(tab.key),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 20px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all .2s',
        color: aktif ? C.accent : C.textSec,
        fontWeight: aktif ? 700 : 500,
        fontSize: 12,
        borderBottom: aktif ? `2px solid ${C.accent}` : '2px solid transparent'
      },
      onMouseEnter: e => {
        if (!aktif) e.currentTarget.style.color = C.text;
      },
      onMouseLeave: e => {
        if (!aktif) e.currentTarget.style.color = C.textSec;
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: tab.icon,
      size: 15,
      color: aktif ? C.accent : C.textMuted
    }), tab.label);
  }))), /*#__PURE__*/React.createElement("div", {
    key: aktifTab,
    className: "fade-in"
  }, aktifTab === 'tanimlamalar' && /*#__PURE__*/React.createElement(TanimlamalarTab, null), aktifTab === 'kullanici' && isAdmin && /*#__PURE__*/React.createElement(KullaniciTab, null), aktifTab === 'log' && /*#__PURE__*/React.createElement(LogTab, null), aktifTab === 'netsantral' && isAdmin && /*#__PURE__*/React.createElement(NetSantralTab, null)));
};