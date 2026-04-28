const MR = window.MR || (window.MR = {});
const {
  useState
} = React;
MR.YeniDosya = ({
  setPage
}) => {
  const {
    C,
    S,
    LIcon,
    Badge,
    SectionTitle,
    FormGroup,
    api,
    ARAC_DB,
    SIGORTA,
    ILLER,
    formatPlaka
  } = MR;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    ad_soyad: '',
    tc_kimlik: '',
    telefon: '',
    iban: '',
    adres: '',
    il: '',
    ilce: '',
    dosya_turu: 'ADK',
    talep_turu: '',
    kaza_tarihi: '',
    haklilik: '100',
    meslek: '',
    komisyon: '',
    ma_plaka: '',
    ma_marka: '',
    ma_model: '',
    ma_yil: '',
    ka_plaka: '',
    ka_marka: '',
    ka_yil: '',
    ka_trafik: '',
    sigorta_sirket: '',
    dosya_kaynak: '',
    notlar: ''
  });
  const u = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const adkTT = ['TRAFİK SİGORTASI BAŞVURUSU', 'KASKO BAŞVURUSU', 'TAHKİM BAŞVURUSU', 'DAVA YOLU'];
  const bhTT = ['MALULİYET TAZMİNATI', 'GEÇİCİ İŞ GÖREMEZLİK', 'DESTEKTEN YOKSUN KALMA', 'BAKICI GİDERİ', 'TEDAVİ GİDERLERİ'];
  const steps = form.dosya_turu === 'ADK' ? ['MAĞDUR BİLGİLERİ', 'DOSYA BİLGİSİ', 'ARAÇ BİLGİLERİ', 'ATAMA'] : ['MAĞDUR BİLGİLERİ', 'DOSYA BİLGİSİ', 'ATAMA'];
  const kaydet = async () => {
    if (!form.ad_soyad) {
      setError('MAĞDUR ADI GEREKLİ');
      return;
    }
    setLoading(true);
    setError('');
    const r = await api.dosyaCreate(form);
    if (r?.success) setResult(r.data);else setError(r?.error || 'HATA');
    setLoading(false);
  };
  if (result) return /*#__PURE__*/React.createElement("div", {
    style: S.card,
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 60,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      borderRadius: '50%',
      background: `${C.success}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Check",
    size: 40,
    color: C.success
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 800,
      color: C.success,
      marginBottom: 8
    }
  }, "DOSYA OLU\u015ETURULDU"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: C.textSec
    }
  }, "DOSYA NO: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: C.accent
    }
  }, result.dosya_no)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP
    },
    onClick: () => setPage('dosya-liste')
  }, "DOSYA L\u0130STES\u0130"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS
    },
    onClick: () => {
      setResult(null);
      setStep(0);
      setForm(p => ({
        ...p,
        ad_soyad: '',
        tc_kimlik: '',
        telefon: ''
      }));
    }
  }, "YEN\u0130 DOSYA"))));
  const renderStep = () => {
    switch (step) {
      case 0:
        return /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }
        }, /*#__PURE__*/React.createElement(FormGroup, {
          label: "ADI SOYADI *"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.ad_soyad,
          onChange: e => u('ad_soyad', e.target.value),
          placeholder: "MA\u011EDUR ADI SOYADI"
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "T.C. K\u0130ML\u0130K NO"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.tc_kimlik,
          onChange: e => u('tc_kimlik', e.target.value),
          maxLength: 11,
          placeholder: "11 HANEL\u0130 TC"
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "TELEFON"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.telefon,
          onChange: e => u('telefon', e.target.value),
          placeholder: "05XX XXX XXXX"
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "IBAN"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.iban,
          onChange: e => u('iban', e.target.value),
          placeholder: "TR00 0000 ..."
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "ADRES",
          full: true
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.adres,
          onChange: e => u('adres', e.target.value),
          placeholder: "A\xC7IK ADRES"
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "\u0130L"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.il,
          onChange: e => u('il', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), ILLER.map(i => /*#__PURE__*/React.createElement("option", {
          key: i,
          value: i
        }, i)))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "\u0130L\xC7E"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.ilce,
          onChange: e => u('ilce', e.target.value),
          placeholder: "\u0130L\xC7E"
        })));
      case 1:
        return /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }
        }, /*#__PURE__*/React.createElement(FormGroup, {
          label: "DOSYA T\xDCR\xDC *"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.dosya_turu,
          onChange: e => {
            u('dosya_turu', e.target.value);
            u('talep_turu', '');
          }
        }, /*#__PURE__*/React.createElement("option", {
          value: "ADK"
        }, "ARA\xC7 DE\u011EER KAYBI (ADK)"), /*#__PURE__*/React.createElement("option", {
          value: "BH"
        }, "BEDEN\u0130 HASAR"))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "TALEP T\xDCR\xDC"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.talep_turu,
          onChange: e => u('talep_turu', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), (form.dosya_turu === 'ADK' ? adkTT : bhTT).map(t => /*#__PURE__*/React.createElement("option", {
          key: t,
          value: t
        }, t)))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "KAZA TAR\u0130H\u0130"
        }, /*#__PURE__*/React.createElement("input", {
          type: "date",
          style: S.input,
          value: form.kaza_tarihi,
          onChange: e => u('kaza_tarihi', e.target.value)
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "HAKLILIK ORANI"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.haklilik,
          onChange: e => u('haklilik', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: "100"
        }, "%100"), /*#__PURE__*/React.createElement("option", {
          value: "75"
        }, "%75"), /*#__PURE__*/React.createElement("option", {
          value: "50"
        }, "%50"), /*#__PURE__*/React.createElement("option", {
          value: "25"
        }, "%25"))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "MESLEK"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.meslek,
          onChange: e => u('meslek', e.target.value),
          placeholder: "MESLEK"
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "KOM\u0130SYON (%)"
        }, /*#__PURE__*/React.createElement("input", {
          type: "number",
          style: S.input,
          value: form.komisyon,
          onChange: e => u('komisyon', e.target.value),
          placeholder: "20"
        })));
      case 2:
        if (form.dosya_turu === 'ADK') return /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: S.card
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            ...S.cardHead,
            background: `${C.accent}11`
          }
        }, /*#__PURE__*/React.createElement(LIcon, {
          name: "Car",
          size: 16,
          color: C.accent
        }), /*#__PURE__*/React.createElement("span", {
          style: {
            fontWeight: 700,
            fontSize: 13
          }
        }, "MA\u011EDUR ARACI")), /*#__PURE__*/React.createElement("div", {
          style: {
            padding: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12
          }
        }, /*#__PURE__*/React.createElement(FormGroup, {
          label: "PLAKA *"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.ma_plaka,
          onChange: e => u('ma_plaka', formatPlaka(e.target.value)),
          placeholder: "55MR001"
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "MARKA"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.ma_marka,
          onChange: e => {
            u('ma_marka', e.target.value);
            u('ma_model', '');
          }
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), Object.keys(ARAC_DB).sort().map(m => /*#__PURE__*/React.createElement("option", {
          key: m,
          value: m
        }, m)))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "MODEL"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.ma_model,
          onChange: e => u('ma_model', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), (ARAC_DB[form.ma_marka]?.modeller || []).map(m => /*#__PURE__*/React.createElement("option", {
          key: m,
          value: m
        }, m)))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "MODEL YILI"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.ma_yil,
          onChange: e => u('ma_yil', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), Array.from({
          length: 30
        }, (_, i) => 2026 - i).map(y => /*#__PURE__*/React.createElement("option", {
          key: y,
          value: y
        }, y)))))), /*#__PURE__*/React.createElement("div", {
          style: S.card
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            ...S.cardHead,
            background: `${C.danger}11`
          }
        }, /*#__PURE__*/React.createElement(LIcon, {
          name: "Car",
          size: 16,
          color: C.danger
        }), /*#__PURE__*/React.createElement("span", {
          style: {
            fontWeight: 700,
            fontSize: 13
          }
        }, "KAR\u015EI ARA\xC7")), /*#__PURE__*/React.createElement("div", {
          style: {
            padding: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12
          }
        }, /*#__PURE__*/React.createElement(FormGroup, {
          label: "PLAKA"
        }, /*#__PURE__*/React.createElement("input", {
          style: S.input,
          value: form.ka_plaka,
          onChange: e => u('ka_plaka', formatPlaka(e.target.value)),
          placeholder: "34XX123"
        })), /*#__PURE__*/React.createElement(FormGroup, {
          label: "TRAF\u0130K S\u0130GORTASI"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.ka_trafik,
          onChange: e => u('ka_trafik', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), SIGORTA.map(s => /*#__PURE__*/React.createElement("option", {
          key: s,
          value: s
        }, s)))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "MARKA"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.ka_marka,
          onChange: e => u('ka_marka', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), Object.keys(ARAC_DB).sort().map(m => /*#__PURE__*/React.createElement("option", {
          key: m,
          value: m
        }, m)))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "MODEL YILI"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.ka_yil,
          onChange: e => u('ka_yil', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), Array.from({
          length: 30
        }, (_, i) => 2026 - i).map(y => /*#__PURE__*/React.createElement("option", {
          key: y,
          value: y
        }, y)))))));
      // BH falls through to default
      default:
        return /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }
        }, /*#__PURE__*/React.createElement(FormGroup, {
          label: "S\u0130GORTA \u015E\u0130RKET\u0130"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.sigorta_sirket,
          onChange: e => u('sigorta_sirket', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), SIGORTA.map(s => /*#__PURE__*/React.createElement("option", {
          key: s,
          value: s
        }, s)))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "DOSYA KAYNA\u011EI"
        }, /*#__PURE__*/React.createElement("select", {
          style: S.select,
          value: form.dosya_kaynak,
          onChange: e => u('dosya_kaynak', e.target.value)
        }, /*#__PURE__*/React.createElement("option", {
          value: ""
        }, "SE\xC7\u0130N\u0130Z"), /*#__PURE__*/React.createElement("option", {
          value: "OF\u0130S CRM"
        }, "OF\u0130S CRM"), /*#__PURE__*/React.createElement("option", {
          value: "Y\xD6NLEND\u0130REN"
        }, "Y\xD6NLEND\u0130REN"), /*#__PURE__*/React.createElement("option", {
          value: "SAHA PERSONEL"
        }, "SAHA PERSONEL"))), /*#__PURE__*/React.createElement(FormGroup, {
          label: "NOTLAR",
          full: true
        }, /*#__PURE__*/React.createElement("textarea", {
          style: {
            ...S.input,
            minHeight: 70
          },
          value: form.notlar,
          onChange: e => u('notlar', e.target.value),
          placeholder: "DOSYA \u0130LE \u0130LG\u0130L\u0130 NOTLAR..."
        })));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: S.card,
    className: "fade-in"
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Plus",
    title: "YEN\u0130 DOSYA OLU\u015ETUR",
    sub: "KADEMEL\u0130 B\u0130LG\u0130 G\u0130R\u0130\u015E\u0130"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 24
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 2,
      background: i <= step ? C.accent : C.border
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: i <= step ? C.accent : C.border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700,
      flexShrink: 0
    }
  }, i < step ? '✓' : i + 1), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 2,
      background: i < step ? C.accent : C.border
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      marginTop: 6,
      color: i <= step ? C.text : C.textMuted,
      fontWeight: i === step ? 700 : 400
    }
  }, s)))), renderStep(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: () => setStep(Math.max(0, step - 1)),
    disabled: step === 0
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowLeft",
    size: 14
  }), " GER\u0130"), step < steps.length - 1 ? /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP
    },
    onClick: () => setStep(step + 1)
  }, "\u0130LER\u0130 ", /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowRight",
    size: 14,
    color: "#fff"
  })) : /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS
    },
    onClick: kaydet,
    disabled: loading
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " ", loading ? 'KAYDEDİLİYOR...' : 'DOSYAYI KAYDET'))));
};