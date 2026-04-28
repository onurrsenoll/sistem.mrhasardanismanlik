/* ============================================================
   MR HASAR DANIŞMANLIK – BH HESAPLAMA SAYFASI (hesap-bh.js)
   BEDENİ HASAR (MALULİYET) TAZMİNATI HESAPLAYICI
   ============================================================ */

const MR = window.MR || (window.MR = {});
const {
  useState,
  useMemo,
  useRef
} = React;
MR.HesapBHPage = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    Badge,
    SectionTitle,
    FormGroup,
    EmptyState,
    fmt,
    fmtK,
    parseNum,
    fmtInput,
    BH_EMSAL,
    yasHesapla,
    asgariUcretBul,
    pmfDeger,
    progresifRant
  } = MR;

  /* ---------- SABİTLER ---------- */
  const EMEKLILIK_YASI = 65;
  const PMF_TABLOLARI = ['TRH2010', 'CSO1980', 'PMF1931'];

  /* ---------- FORM STATE ---------- */
  const [form, setForm] = useState({
    magdurAdi: '',
    dogumTarihi: '',
    cinsiyet: '',
    kazaTarihi: '',
    maluliyetOrani: '',
    meslek: '',
    aylikGelir: '',
    asgariUcretKullan: false,
    pmfTablosu: 'TRH2010',
    teknikFaiz: '10',
    kusurOrani: '100'
  });
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const sonucRef = useRef(null);
  const u = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));

  /* ---------- ASGARİ ÜCRET BİLGİSİ ---------- */
  const asgariUcretBilgi = useMemo(() => {
    if (form.kazaTarihi) return asgariUcretBul(form.kazaTarihi);
    return asgariUcretBul(MR.today());
  }, [form.kazaTarihi]);

  /* ---------- HESAPLAMA ---------- */
  const hesapla = () => {
    setHata('');
    setSonuc(null);

    /* VALİDASYON */
    if (!form.magdurAdi.trim()) {
      setHata('MAĞDUR ADI SOYADI GİRİNİZ');
      return;
    }
    if (!form.dogumTarihi) {
      setHata('DOĞUM TARİHİ GİRİNİZ');
      return;
    }
    if (!form.cinsiyet) {
      setHata('CİNSİYET SEÇİNİZ');
      return;
    }
    if (!form.kazaTarihi) {
      setHata('KAZA TARİHİ GİRİNİZ');
      return;
    }
    const maluliyet = Number(form.maluliyetOrani);
    if (!maluliyet || maluliyet < 1 || maluliyet > 100) {
      setHata('MALULİYET ORANI 1-100 ARASI OLMAILIDIR');
      return;
    }
    const teknikFaiz = Number(form.teknikFaiz);
    if (isNaN(teknikFaiz) || teknikFaiz < 0) {
      setHata('TEKNİK FAİZ ORANI GEÇERSİZ');
      return;
    }
    const kusur = Number(form.kusurOrani) || 100;

    /* GELİR BELİRLEME */
    let aylikGelir = 0;
    let gelirKaynagi = '';
    if (form.asgariUcretKullan) {
      const au = asgariUcretBul(form.kazaTarihi);
      if (au) {
        aylikGelir = au.ucret;
        gelirKaynagi = 'ASGARİ ÜCRET (' + au.donem + ')';
      } else {
        setHata('ASGARİ ÜCRET BİLGİSİ BULUNAMADI');
        return;
      }
    } else {
      aylikGelir = parseNum(form.aylikGelir);
      if (aylikGelir <= 0) {
        setHata('AYLIK GELİR GİRİNİZ VEYA ASGARİ ÜCRET SEÇİNİZ');
        return;
      }
      gelirKaynagi = 'BEYAN EDİLEN GELİR';
    }

    /* YAŞ HESAPLAMA */
    const yas = yasHesapla(form.dogumTarihi, form.kazaTarihi);
    if (yas <= 0) {
      setHata('YAŞ HESAPLANAMADI - TARİHLERİ KONTROL EDİNİZ');
      return;
    }

    /* PMF - KALAN ÖMÜR */
    const cinsiyetKod = form.cinsiyet === 'ERKEK' ? 'E' : 'K';
    const kalanOmur = pmfDeger(form.pmfTablosu, cinsiyetKod, yas);
    if (kalanOmur <= 0) {
      setHata('PMF TABLOSUNDAN DEĞER ALINAMADI');
      return;
    }

    /* AKTİF DÖNEM (ŞİMDİDEN EMEKLİLİĞE KADAR) */
    const aktifKalanYil = Math.max(0, EMEKLILIK_YASI - yas);

    /* PASİF DÖNEM (EMEKLİLİKTEN SONRA) */
    const pasifKalanYil = Math.max(0, kalanOmur - aktifKalanYil);

    /* RANT KATSAYILARI */
    const faizOrani = teknikFaiz / 100;
    const aktifRant = progresifRant(aktifKalanYil, faizOrani);
    const pasifRant = progresifRant(pasifKalanYil, faizOrani);

    /* PASİF DÖNEM İÇİN İSKONTO FAKTÖRÜ (AKTİF DÖNEM SONRASINA ERTELENMİŞ) */
    const pasifIskonto = aktifKalanYil > 0 ? 1 / Math.pow(1 + faizOrani, aktifKalanYil) : 1;

    /* AKTİF DÖNEM GELİR KAYBI */
    const yillikGelir = aylikGelir * 12;
    const aktifGelirKaybi = yillikGelir * (maluliyet / 100) * aktifRant;

    /* PASİF DÖNEM GELİR KAYBI (ASGARİ ÜCRET ÜZERİNDEN) */
    const pasifAylikGelir = asgariUcretBilgi ? asgariUcretBilgi.ucret : aylikGelir;
    const pasifYillikGelir = pasifAylikGelir * 12;
    const pasifGelirKaybi = pasifYillikGelir * (maluliyet / 100) * pasifRant * pasifIskonto;

    /* TOPLAM */
    const toplamGelirKaybi = aktifGelirKaybi + pasifGelirKaybi;

    /* KUSUR ORANI UYGULA */
    const aktifKusurlu = aktifGelirKaybi * (kusur / 100);
    const pasifKusurlu = pasifGelirKaybi * (kusur / 100);
    const toplamKusurlu = Math.round(aktifKusurlu + pasifKusurlu);
    const sonucObj = {
      magdurAdi: form.magdurAdi,
      dogumTarihi: form.dogumTarihi,
      cinsiyet: form.cinsiyet,
      cinsiyetKod,
      kazaTarihi: form.kazaTarihi,
      yas,
      maluliyet,
      meslek: form.meslek || '-',
      aylikGelir,
      gelirKaynagi,
      yillikGelir,
      pmfTablosu: form.pmfTablosu,
      teknikFaiz,
      kalanOmur,
      aktifKalanYil,
      pasifKalanYil,
      aktifRant: Math.round(aktifRant * 10000) / 10000,
      pasifRant: Math.round(pasifRant * 10000) / 10000,
      pasifIskonto: Math.round(pasifIskonto * 10000) / 10000,
      aktifGelirKaybi: Math.round(aktifGelirKaybi),
      pasifGelirKaybi: Math.round(pasifGelirKaybi),
      pasifAylikGelir,
      toplamGelirKaybi: Math.round(toplamGelirKaybi),
      kusurOrani: kusur,
      aktifKusurlu: Math.round(aktifKusurlu),
      pasifKusurlu: Math.round(pasifKusurlu),
      toplamKusurlu
    };
    setSonuc(sonucObj);

    /* SONUÇ ALANINA KAYDIRMA */
    setTimeout(() => {
      if (sonucRef.current) sonucRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  /* ---------- TEMİZLE ---------- */
  const temizle = () => {
    setForm({
      magdurAdi: '',
      dogumTarihi: '',
      cinsiyet: '',
      kazaTarihi: '',
      maluliyetOrani: '',
      meslek: '',
      aylikGelir: '',
      asgariUcretKullan: false,
      pmfTablosu: 'TRH2010',
      teknikFaiz: '10',
      kusurOrani: '100'
    });
    setSonuc(null);
    setHata('');
  };

  /* ---------- PDF ÇIKTI ---------- */
  const pdfCikti = () => {
    alert('PDF ÇIKTI FONKSİYONU YAKINDA AKTİF OLACAKTIR.\nHESAPLAMA SONUÇLARI PDF OLARAK İNDİRİLEBİLECEKTİR.');
  };

  /* ---------- DOSYAYA KAYDET ---------- */
  const dosyayaKaydet = async () => {
    if (!sonuc) return;
    const urlParts = (window.location.hash || '').split('dosya_id=');
    const dosyaId = urlParts.length > 1 ? urlParts[1] : null;
    if (!dosyaId) {
      alert('BU HESAPLAMAYI BİR DOSYAYA KAYDETMEK İÇİN DOSYA DETAY SAYFASINDAN ERİŞİNİZ.');
      return;
    }
    try {
      const r = await MR.api.req('/dosya/hesaplama-kaydet.php', {
        method: 'POST',
        body: JSON.stringify({
          dosya_id: dosyaId,
          hesap_turu: 'BH',
          sonuc: sonuc
        })
      });
      if (r?.success) alert('HESAPLAMA DOSYAYA KAYDEDİLDİ');else alert(r?.error || 'KAYDETME HATASI');
    } catch (e) {
      alert('BAĞLANTI HATASI');
    }
  };

  /* ---------- TABLO STİLLERİ ---------- */
  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    color: C.textMuted,
    fontWeight: 600,
    fontSize: 10,
    borderBottom: `1px solid ${C.border}`
  };
  const tdStyle = {
    padding: '10px 12px',
    fontSize: 12,
    borderBottom: `1px solid ${C.border}`
  };

  /* ---------- TOGGLE STİLİ ---------- */
  const toggleStyle = aktif => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    background: aktif ? C.success : C.borderLight,
    cursor: 'pointer',
    transition: 'all .2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: aktif ? 'flex-end' : 'flex-start'
  });
  const toggleDot = {
    width: 20,
    height: 20,
    borderRadius: 10,
    background: '#fff',
    transition: 'all .2s'
  };

  /* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: `${C.purple}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Heart",
    size: 22,
    color: C.purple
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800
    }
  }, "BEDEN\u0130 HASAR HESAPLAMA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      letterSpacing: 1
    }
  }, "MALUL\u0130YET TAZM\u0130NATI HESAPLAYICI"))), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: () => setPage('home')
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowLeft",
    size: 14
  }), " ANA SAYFA")), hata && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      background: `${C.danger}22`,
      border: `1px solid ${C.danger}44`,
      borderRadius: 10,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "AlertCircle",
    size: 16,
    color: C.danger
  }), " ", hata), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: sonuc ? '1fr 1fr' : '1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Stethoscope",
    title: "MA\u011EDUR VE HESAPLAMA B\u0130LG\u0130LER\u0130",
    sub: "BEDEN\u0130 HASAR PARAMETRELER\u0130N\u0130 G\u0130R\u0130N\u0130Z"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "MA\u011EDUR ADI SOYADI *",
    full: true
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.magdurAdi,
    placeholder: "ADI SOYADI G\u0130R\u0130N\u0130Z",
    onChange: e => u('magdurAdi', e.target.value.toUpperCase())
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "DO\u011EUM TAR\u0130H\u0130 *"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: S.input,
    value: form.dogumTarihi,
    onChange: e => u('dogumTarihi', e.target.value)
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "C\u0130NS\u0130YET *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.cinsiyet,
    onChange: e => u('cinsiyet', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "C\u0130NS\u0130YET SE\xC7\u0130N\u0130Z"), /*#__PURE__*/React.createElement("option", {
    value: "ERKEK"
  }, "ERKEK"), /*#__PURE__*/React.createElement("option", {
    value: "KADIN"
  }, "KADIN"))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "KAZA TAR\u0130H\u0130 *"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: S.input,
    value: form.kazaTarihi,
    onChange: e => u('kazaTarihi', e.target.value)
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "MALUL\u0130YET ORANI (%) *"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: S.input,
    value: form.maluliyetOrani,
    min: "1",
    max: "100",
    onChange: e => u('maluliyetOrani', e.target.value),
    placeholder: "\xD6RN: 15"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "MESLEK"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.meslek,
    placeholder: "MESLEK G\u0130R\u0130N\u0130Z",
    onChange: e => u('meslek', e.target.value.toUpperCase())
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "ASGAR\u0130 \xDCCRET KULLAN",
    full: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: toggleStyle(form.asgariUcretKullan),
    onClick: () => u('asgariUcretKullan', !form.asgariUcretKullan)
  }, /*#__PURE__*/React.createElement("div", {
    style: toggleDot
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: form.asgariUcretKullan ? C.success : C.textMuted,
      fontWeight: 600
    }
  }, form.asgariUcretKullan ? 'AKTİF' : 'PASİF', form.asgariUcretKullan && asgariUcretBilgi && /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textSec,
      fontWeight: 400
    }
  }, " - ", fmtK(asgariUcretBilgi.ucret), " (", asgariUcretBilgi.donem, ")")))), !form.asgariUcretKullan && /*#__PURE__*/React.createElement(FormGroup, {
    label: "AYLIK GEL\u0130R (\u20BA) *",
    full: true
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.aylikGelir,
    placeholder: "\xD6RN: 25.000",
    onChange: e => u('aylikGelir', fmtInput(e.target.value))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      padding: '16px',
      background: `${C.accent}08`,
      borderRadius: 10,
      border: `1px solid ${C.accent}22`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.accent,
      marginBottom: 12,
      letterSpacing: 0.5
    }
  }, "HESAPLAMA PARAMETRELER\u0130"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "PMF TABLOSU"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.pmfTablosu,
    onChange: e => u('pmfTablosu', e.target.value)
  }, PMF_TABLOLARI.map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, t)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "TEKN\u0130K FA\u0130Z (%)"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: S.input,
    value: form.teknikFaiz,
    min: "0",
    max: "30",
    onChange: e => u('teknikFaiz', e.target.value),
    placeholder: "10"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "KUSUR ORANI (%)"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: S.input,
    value: form.kusurOrani,
    min: "0",
    max: "100",
    onChange: e => u('kusurOrani', e.target.value),
    placeholder: "100"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      flex: 1,
      justifyContent: 'center'
    },
    onClick: hesapla
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Calculator",
    size: 16,
    color: "#fff"
  }), " HESAPLA"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: temizle
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "RefreshCw",
    size: 14
  }), " TEM\u0130ZLE"), sonuc && /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnW
    },
    onClick: pdfCikti
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Printer",
    size: 14
  }), " PDF \xC7IKTI")))), sonuc && /*#__PURE__*/React.createElement("div", {
    ref: sonucRef
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginBottom: 16,
      border: `1px solid ${C.purple}44`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      background: `${C.purple}11`
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Heart",
    size: 18,
    color: C.purple
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: C.purple
    }
  }, "TAZM\u0130NAT HESABI SONUCU")), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '20px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      letterSpacing: 1,
      marginBottom: 6
    }
  }, "TOPLAM TAZM\u0130NAT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      fontWeight: 900,
      color: C.purple,
      letterSpacing: -1
    }
  }, fmtK(sonuc.toplamKusurlu)), sonuc.kusurOrani < 100 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 4
    }
  }, "TAM TUTAR: ", fmtK(sonuc.toplamGelirKaybi), " | KUSUR: %", sonuc.kusurOrani)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px',
      background: `${C.success}11`,
      borderRadius: 10,
      border: `1px solid ${C.success}22`,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      letterSpacing: 0.5,
      marginBottom: 4
    }
  }, "AKT\u0130F D\xD6NEM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: C.success
    }
  }, fmtK(sonuc.aktifKusurlu)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 4
    }
  }, sonuc.aktifKalanYil, " YIL")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px',
      background: `${C.cyan}11`,
      borderRadius: 10,
      border: `1px solid ${C.cyan}22`,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      letterSpacing: 0.5,
      marginBottom: 4
    }
  }, "PAS\u0130F D\xD6NEM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: C.cyan
    }
  }, fmtK(sonuc.pasifKusurlu)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 4
    }
  }, sonuc.pasifKalanYil.toFixed(1), " YIL"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      background: `${C.accent}11`,
      borderRadius: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "User",
    size: 16,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, sonuc.magdurAdi), /*#__PURE__*/React.createElement(Badge, {
    text: sonuc.cinsiyet,
    color: sonuc.cinsiyet === 'ERKEK' ? C.accent : C.pink
  }), /*#__PURE__*/React.createElement(Badge, {
    text: '%' + sonuc.maluliyet + ' MALULİYET',
    color: C.danger
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted
    }
  }, sonuc.yas, " YA\u015E | MESLEK: ", sonuc.meslek, " | KAZA: ", sonuc.kazaTarihi)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.textMuted,
      marginBottom: 10,
      letterSpacing: 0.5
    }
  }, "HESAPLAMA DETAYLARI"), [{
    label: 'KAZA ANI YAŞI',
    value: sonuc.yas + ' YAŞ',
    icon: 'User',
    color: C.accent
  }, {
    label: 'MALULİYET ORANI',
    value: '%' + sonuc.maluliyet,
    icon: 'Heart',
    color: C.danger
  }, {
    label: 'AYLIK GELİR (' + sonuc.gelirKaynagi + ')',
    value: fmtK(sonuc.aylikGelir),
    icon: 'DollarSign',
    color: C.success
  }, {
    label: 'YILLIK GELİR',
    value: fmtK(sonuc.yillikGelir),
    icon: 'TrendingUp',
    color: C.success
  }, {
    label: 'PMF TABLOSU',
    value: sonuc.pmfTablosu,
    icon: 'Database',
    color: C.purple
  }, {
    label: 'KALAN ÖMÜR (PMF)',
    value: sonuc.kalanOmur.toFixed(2) + ' YIL',
    icon: 'Clock',
    color: C.cyan
  }, {
    label: 'TEKNİK FAİZ',
    value: '%' + sonuc.teknikFaiz,
    icon: 'Percent',
    color: C.warning
  }, {
    label: 'AKTİF DÖNEM KALAN YIL',
    value: sonuc.aktifKalanYil + ' YIL (EMEKLİLİK YAŞI: ' + EMEKLILIK_YASI + ')',
    icon: 'Activity',
    color: C.success
  }, {
    label: 'AKTİF DÖNEM RANT KATSAYISI',
    value: sonuc.aktifRant.toFixed(4),
    icon: 'BarChart3',
    color: C.success
  }, {
    label: 'PASİF DÖNEM KALAN YIL',
    value: sonuc.pasifKalanYil.toFixed(1) + ' YIL',
    icon: 'Clock',
    color: C.cyan
  }, {
    label: 'PASİF DÖNEM RANT KATSAYISI',
    value: sonuc.pasifRant.toFixed(4),
    icon: 'BarChart3',
    color: C.cyan
  }, {
    label: 'PASİF DÖNEM İSKONTO',
    value: 'x' + sonuc.pasifIskonto.toFixed(4),
    icon: 'TrendingDown',
    color: C.warning
  }, {
    label: 'PASİF DÖNEM GELİRİ (ASGARİ ÜCRET)',
    value: fmtK(sonuc.pasifAylikGelir) + '/AY',
    icon: 'Wallet',
    color: C.cyan
  }].map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 0',
      borderBottom: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: row.icon,
    size: 13,
    color: row.color
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textSec,
      fontSize: 11
    }
  }, row.label)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 12
    }
  }, row.value))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      background: `${C.success}11`,
      borderRadius: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: C.success,
      fontSize: 12
    }
  }, "AKT\u0130F D\xD6NEM GEL\u0130R KAYBI"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: C.success
    }
  }, fmtK(sonuc.aktifKusurlu))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      background: `${C.cyan}11`,
      borderRadius: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: C.cyan,
      fontSize: 12
    }
  }, "PAS\u0130F D\xD6NEM GEL\u0130R KAYBI"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: C.cyan
    }
  }, fmtK(sonuc.pasifKusurlu))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: `${C.purple}15`,
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      color: C.purple
    }
  }, "TOPLAM TAZM\u0130NAT"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 900,
      fontSize: 18,
      color: C.purple
    }
  }, fmtK(sonuc.toplamKusurlu)))), sonuc.kusurOrani < 100 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 14px',
      background: `${C.warning}15`,
      border: `1px solid ${C.warning}33`,
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.warning,
      marginBottom: 4
    }
  }, "KUSUR \u0130ND\u0130R\u0130M\u0130 UYGULANMI\u015ETIR"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec
    }
  }, "TAM TUTAR: ", fmtK(sonuc.toplamGelirKaybi), " | KUSUR ORANI: %", sonuc.kusurOrani, " | \u0130ND\u0130R\u0130M: ", fmtK(sonuc.toplamGelirKaybi - sonuc.toplamKusurlu)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      flex: 1,
      justifyContent: 'center'
    },
    onClick: dosyayaKaydet
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " DOSYAYA KAYDET"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnW
    },
    onClick: pdfCikti
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Printer",
    size: 14
  }), " PDF \xC7IKTI")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Gavel",
    title: "BEDEN\u0130 HASAR EMSAL KARARLARI",
    sub: "TAHK\u0130M KOM\u0130SYONU VE YARGITAY KARARLARI"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, BH_EMSAL && BH_EMSAL.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ['KAYNAK', 'YIL', 'MALULİYET', 'TAZMİNAT TUTARI', 'DETAY'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: thStyle
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, BH_EMSAL.map((e, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      transition: 'background .2s'
    },
    onMouseEnter: ev => ev.currentTarget.style.background = C.bgHover,
    onMouseLeave: ev => ev.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: tdStyle
  }, /*#__PURE__*/React.createElement(Badge, {
    text: e.kaynak,
    color: e.kaynak === 'YARGITAY' ? C.danger : C.accent
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      fontWeight: 600
    }
  }, e.yil), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: '%' + e.maluliyet,
    color: C.purple
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      fontWeight: 700,
      color: C.success
    }
  }, fmtK(e.tutar)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      color: C.textSec
    }
  }, e.detay)))))) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Gavel",
    title: "EMSAL BULUNAMADI",
    desc: "BEDEN\u0130 HASAR EMSAL KARARLARI BULUNAMAMI\u015ETIR"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: '12px 16px',
      background: `${C.purple}11`,
      borderRadius: 8,
      border: `1px solid ${C.purple}22`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.purple,
      marginBottom: 6
    }
  }, "PMF TABLOSU B\u0130LG\u0130LER\u0130"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec,
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("strong", null, "TRH2010:"), " T\xDCRK\u0130YE HAYAT TABLOLARI 2010 - EN G\xDCNCEL VE YAYGIN KULLANILAN TABLO. YARGITAY VE TAHK\u0130M KOM\u0130SYONU TARAFINDAN TERC\u0130H ED\u0130LMEKTED\u0130R."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec,
      lineHeight: 1.6,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("strong", null, "CSO1980:"), " COMMISSIONERS STANDARD ORDINARY 1980 - ULUSLARARASI STANDART TABLO."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec,
      lineHeight: 1.6,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("strong", null, "PMF1931:"), " POPULATION MASCULINE ET FEMININE 1931 - EN ESK\u0130 TABLO. BAZI MAHKEMELER HALA KULLANMAKTADIR.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '12px 16px',
      background: `${C.accent}08`,
      borderRadius: 8,
      border: `1px solid ${C.accent}22`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.accent,
      marginBottom: 6
    }
  }, "HESAPLAMA Y\xD6NTEM\u0130"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec,
      lineHeight: 1.6
    }
  }, "BEDEN\u0130 HASAR TAZM\u0130NATI PROGRES\u0130F RANT (1/LN) METODU \u0130LE HESAPLANMAKTADIR. AKT\u0130F D\xD6NEM (KAZA YA\u015EINDAN EMEKL\u0130L\u0130K YA\u015EINA KADAR) VE PAS\u0130F D\xD6NEM (EMEKL\u0130L\u0130KTEN PMF TABLONUNA G\xD6RE BEKLENEN \xD6M\xDCR SONUNA KADAR) AYRI AYRI HESAPLANARAK TOPLANIR. PAS\u0130F D\xD6NEM ASGAR\u0130 \xDCCRET \xDCZER\u0130NDEN DE\u011EERLEND\u0130R\u0130L\u0130R.")))));
};