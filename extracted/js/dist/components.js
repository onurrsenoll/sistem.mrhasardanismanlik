const MR = window.MR || (window.MR = {});
const {
  useState
} = React;
MR.StatCard = ({
  icon,
  label,
  value,
  color = MR.C.accent
}) => /*#__PURE__*/React.createElement("div", {
  style: MR.S.stat
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: `${color}22`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}, /*#__PURE__*/React.createElement(MR.LIcon, {
  name: icon,
  size: 18,
  color: color
})), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: 800
  }
}, value), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: MR.C.textMuted,
    marginTop: 2
  }
}, label));
MR.Badge = ({
  text,
  color
}) => /*#__PURE__*/React.createElement("span", {
  style: MR.S.badge(color)
}, text);
MR.SectionTitle = ({
  icon,
  title,
  sub,
  right
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    ...MR.S.cardHead,
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: `${MR.C.accent}22`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}, /*#__PURE__*/React.createElement(MR.LIcon, {
  name: icon,
  size: 16,
  color: MR.C.accent
})), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 700
  }
}, title), sub && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: MR.C.textMuted
  }
}, sub))), right && /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 8
  }
}, right));
MR.EmptyState = ({
  icon,
  title,
  desc
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    padding: 60,
    color: MR.C.textMuted
  }
}, /*#__PURE__*/React.createElement(MR.LIcon, {
  name: icon,
  size: 48,
  color: MR.C.textMuted,
  style: {
    opacity: 0.3,
    marginBottom: 16
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 6,
    color: MR.C.textSec
  }
}, title), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13
  }
}, desc));
MR.Modal = ({
  open,
  onClose,
  title,
  width = '66vw',
  children
}) => {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,.7)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      maxWidth: 1000,
      maxHeight: '90vh',
      background: MR.C.bgCard,
      borderRadius: 16,
      border: `1px solid ${MR.C.border}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: `1px solid ${MR.C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, title), /*#__PURE__*/React.createElement(MR.LIcon, {
    name: "X",
    size: 18,
    color: MR.C.textMuted,
    style: {
      cursor: 'pointer'
    },
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 20
    }
  }, children)));
};
MR.FormGroup = ({
  label,
  children,
  full
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    gridColumn: full ? 'span 2' : 'span 1'
  }
}, /*#__PURE__*/React.createElement("label", {
  style: MR.S.label
}, label), children);
MR.Loading = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 40,
    height: 40,
    border: '3px solid ' + MR.C.border,
    borderTop: '3px solid ' + MR.C.accent,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
}));
MR.SkeletonPage = ({
  title,
  icon,
  desc,
  children
}) => /*#__PURE__*/React.createElement("div", {
  style: MR.S.card,
  className: "fade-in"
}, /*#__PURE__*/React.createElement(MR.SectionTitle, {
  icon: icon,
  title: title,
  sub: desc
}), /*#__PURE__*/React.createElement("div", {
  style: MR.S.cardBody
}, children || /*#__PURE__*/React.createElement(MR.EmptyState, {
  icon: icon,
  title: title,
  desc: "BU MOD\xDCL GEL\u0130\u015ET\u0130R\u0130LME A\u015EAMASINDADIR."
})));
MR.Confirm = ({
  open,
  message,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,.7)'
    },
    onClick: onCancel
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 400,
      background: MR.C.bgCard,
      borderRadius: 16,
      border: `1px solid ${MR.C.border}`,
      padding: 30
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      marginBottom: 20,
      textAlign: 'center'
    }
  }, message), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...MR.S.btn,
      ...MR.S.btnG
    },
    onClick: onCancel
  }, "\u0130PTAL"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...MR.S.btn,
      ...MR.S.btnD
    },
    onClick: onConfirm
  }, "ONAYLA"))));
};
MR.LoginScreen = ({
  onLogin
}) => {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const go = async e => {
    e.preventDefault();
    if (!email || !sifre) {
      setError('E-POSTA VE ŞİFRE GEREKLİ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await MR.api.login(email, sifre);
      if (r && r.success) {
        MR.api.setToken(r.data.token, r.data.refresh_token || null);
        onLogin(r.data.user);
      } else setError(r?.error || 'GİRİŞ BAŞARISIZ');
    } catch (e) {
      setError('BAĞLANTI HATASI');
    }
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: MR.C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 420,
      padding: 40,
      background: MR.C.bgCard,
      borderRadius: 20,
      border: `1px solid ${MR.C.border}`,
      boxShadow: '0 20px 60px rgba(0,0,0,.5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 16,
      background: `${MR.C.accent}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      fontSize: 24,
      fontWeight: 900,
      color: MR.C.accent
    }
  }, "MR"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: MR.C.accent,
      letterSpacing: 2
    }
  }, "MR HASAR DANI\u015EMANLIK"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: MR.C.textMuted,
      letterSpacing: 4,
      marginTop: 4
    }
  }, "DOSYA TAK\u0130P S\u0130STEM\u0130")), /*#__PURE__*/React.createElement("form", {
    onSubmit: go
  }, error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: `${MR.C.danger}22`,
      border: `1px solid ${MR.C.danger}44`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: MR.C.danger
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: MR.S.label
  }, "E-POSTA"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    placeholder: "ADMIN@MRHASAR.COM",
    style: MR.S.input,
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: MR.S.label
  }, "\u015E\u0130FRE"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: sifre,
    onChange: e => setSifre(e.target.value),
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    style: MR.S.input
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    style: {
      ...MR.S.btn,
      ...MR.S.btnP,
      width: '100%',
      justifyContent: 'center',
      padding: '14px',
      fontSize: 14,
      opacity: loading ? 0.7 : 1
    }
  }, loading ? 'GİRİŞ YAPILIYOR...' : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(MR.LIcon, {
    name: "Lock",
    size: 16,
    color: "#fff"
  }), " G\u0130R\u0130\u015E YAP"))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 24,
      fontSize: 13,
      fontWeight: 700,
      color: MR.C.accent,
      letterSpacing: 4
    }
  }, "HER ZAMAN FARK EDER")));
};