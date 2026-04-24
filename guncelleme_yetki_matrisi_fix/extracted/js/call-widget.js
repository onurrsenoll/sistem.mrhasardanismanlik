/* ════════════════════════════════════════════════════════════════
   MR HASAR DANIŞMANLIK — GELEN ÇAĞRI WİDGET
   - 'mr-webrtc-gelen-cagri' event'ini dinler
   - Yetki kontrolü yapar (cagri_merkezi/widget-goruntule)
   - Yetkisiz kullanıcıda WIDGET AÇILMAZ
   - Modal içinden CEVAPLA / REDDET butonları sağlar
   ════════════════════════════════════════════════════════════════ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef} = React;

MR.GelenCagriWidget = function() {
  var C = MR.C || {};
  var LIcon = MR.LIcon;

  var _state = useState(null);
  var cagri = _state[0];
  var setCagri = _state[1];

  var _sure = useState(0);
  var sureRef = _sure[0];
  var setSure = _sure[1];

  var _cevaplandi = useState(false);
  var cevaplandi = _cevaplandi[0];
  var setCevaplandi = _cevaplandi[1];

  var sureTimer = useRef(null);

  /* ─── EVENT DİNLEYİCİ ─── */
  useEffect(function() {
    var gelenHandler = function(e) {
      var user = MR._currentUser;
      /* YETKİ KONTROLÜ — Yetkisiz kullanıcılarda widget açılmaz. */
      if (!MR.yetki || !MR.yetki.kontrol(user, 'cagri_merkezi', 'widget-goruntule')) {
        console.log('[CALL-WIDGET] Kullanıcının gelen çağrı widget yetkisi yok — widget gösterilmiyor.');
        return;
      }
      if (!e || !e.detail) return;
      setCagri({
        arayan: e.detail.arayan || 'BİLİNMEYEN',
        arayanAdi: e.detail.arayanAdi || '',
        timestamp: e.detail.timestamp || Date.now()
      });
      setCevaplandi(false);
      setSure(0);
    };

    var sonlandiHandler = function() {
      setCagri(null);
      setCevaplandi(false);
      setSure(0);
      if (sureTimer.current) { clearInterval(sureTimer.current); sureTimer.current = null; }
    };

    var durumHandler = function(e) {
      if (!e || !e.detail) return;
      /* Görüşmede durumuna geçildiyse sayacı başlat */
      if (e.detail.durum === 'gorusmede' && !cevaplandi) {
        setCevaplandi(true);
      }
      if (e.detail.durum === 'kapandi' || e.detail.durum === 'reddedildi' || e.detail.durum === 'hata') {
        setCagri(null);
        setCevaplandi(false);
        if (sureTimer.current) { clearInterval(sureTimer.current); sureTimer.current = null; }
      }
    };

    window.addEventListener('mr-webrtc-gelen-cagri', gelenHandler);
    window.addEventListener('mr-arama-sonlandi', sonlandiHandler);
    window.addEventListener('mr-webrtc-durum', durumHandler);
    return function() {
      window.removeEventListener('mr-webrtc-gelen-cagri', gelenHandler);
      window.removeEventListener('mr-arama-sonlandi', sonlandiHandler);
      window.removeEventListener('mr-webrtc-durum', durumHandler);
      if (sureTimer.current) clearInterval(sureTimer.current);
    };
  }, [cevaplandi]);

  /* ─── GÖRÜŞME SÜRE SAYACI ─── */
  useEffect(function() {
    if (cevaplandi && !sureTimer.current) {
      sureTimer.current = setInterval(function() {
        setSure(function(s) { return s + 1; });
      }, 1000);
    }
    return function() {
      if (sureTimer.current && !cevaplandi) {
        clearInterval(sureTimer.current);
        sureTimer.current = null;
      }
    };
  }, [cevaplandi]);

  if (!cagri) return null;

  var cevaplaTikla = function() {
    if (MR.webrtcTelefon && typeof MR.webrtcTelefon.cevapla === 'function') {
      MR.webrtcTelefon.cevapla();
    }
  };
  var reddetTikla = function() {
    if (MR.webrtcTelefon && typeof MR.webrtcTelefon.reddet === 'function') {
      MR.webrtcTelefon.reddet();
    }
    setCagri(null);
  };
  var kapatTikla = function() {
    if (MR.webrtcTelefon && typeof MR.webrtcTelefon.kapat === 'function') {
      MR.webrtcTelefon.kapat();
    }
    setCagri(null);
  };

  var dakika = Math.floor(sureRef / 60);
  var saniye = sureRef % 60;
  var sureText = (dakika < 10 ? '0' : '') + dakika + ':' + (saniye < 10 ? '0' : '') + saniye;

  return React.createElement('div', {
    style: {
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 340,
      background: C.cardBg || '#fff',
      border: '2px solid ' + (cevaplandi ? (C.success || '#16a34a') : (C.accent || '#1a56db')),
      borderRadius: 16,
      boxShadow: '0 20px 45px rgba(0,0,0,.25)',
      padding: 18,
      zIndex: 9999,
      animation: cevaplandi ? 'none' : 'pulse 1.5s infinite'
    }
  }, [
    React.createElement('div', {
      key: 'h',
      style: {display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12}
    }, [
      LIcon ? React.createElement(LIcon, {
        key: 'i',
        name: cevaplandi ? 'Phone' : 'PhoneIncoming',
        size: 28,
        color: cevaplandi ? (C.success || '#16a34a') : (C.accent || '#1a56db')
      }) : null,
      React.createElement('div', {key: 't', style: {flex: 1}}, [
        React.createElement('div', {
          key: 'l',
          style: {fontSize: 11, color: C.textMuted || '#999', fontWeight: 600, letterSpacing: '.5px'}
        }, cevaplandi ? 'GÖRÜŞME DEVAM EDİYOR' : 'GELEN ÇAĞRI'),
        React.createElement('div', {
          key: 'n',
          style: {fontSize: 20, fontWeight: 800, color: C.text || '#111', marginTop: 2}
        }, cagri.arayan)
      ]),
      cevaplandi ? React.createElement('div', {
        key: 's',
        style: {fontSize: 14, fontWeight: 700, color: C.success || '#16a34a', fontVariantNumeric: 'tabular-nums'}
      }, sureText) : null
    ]),
    cagri.arayanAdi ? React.createElement('div', {
      key: 'ad',
      style: {fontSize: 13, color: C.textSec || '#555', marginBottom: 12, fontStyle: 'italic'}
    }, cagri.arayanAdi) : null,
    React.createElement('div', {
      key: 'btn',
      style: {display: 'flex', gap: 8}
    }, cevaplandi ? [
      React.createElement('button', {
        key: 'kp',
        onClick: kapatTikla,
        style: {
          flex: 1, padding: '10px 14px', borderRadius: 10,
          background: C.danger || '#dc2626', color: '#fff',
          border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer'
        }
      }, [
        LIcon ? React.createElement(LIcon, {key: 'ic', name: 'PhoneOff', size: 14}) : null,
        React.createElement('span', {key: 'tx', style: {marginLeft: 6}}, 'GÖRÜŞMEYİ SONLANDIR')
      ])
    ] : [
      React.createElement('button', {
        key: 'cv',
        onClick: cevaplaTikla,
        style: {
          flex: 1, padding: '10px 14px', borderRadius: 10,
          background: C.success || '#16a34a', color: '#fff',
          border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer'
        }
      }, [
        LIcon ? React.createElement(LIcon, {key: 'ic', name: 'Phone', size: 14}) : null,
        React.createElement('span', {key: 'tx', style: {marginLeft: 6}}, 'CEVAPLA')
      ]),
      React.createElement('button', {
        key: 'rd',
        onClick: reddetTikla,
        style: {
          flex: 1, padding: '10px 14px', borderRadius: 10,
          background: C.danger || '#dc2626', color: '#fff',
          border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer'
        }
      }, [
        LIcon ? React.createElement(LIcon, {key: 'ic', name: 'PhoneOff', size: 14}) : null,
        React.createElement('span', {key: 'tx', style: {marginLeft: 6}}, 'REDDET')
      ])
    ])
  ]);
};

console.log('[CALL-WIDGET] Gelen çağrı widget yüklendi — MR.GelenCagriWidget hazır.');
