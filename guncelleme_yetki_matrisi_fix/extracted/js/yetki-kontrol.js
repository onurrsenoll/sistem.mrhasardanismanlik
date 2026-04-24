/* ════════════════════════════════════════════════════════════════
   MR HASAR DANIŞMANLIK — MERKEZİ YETKİ KONTROL KÜTÜPHANESİ
   Tüm modüllerde tutarlı frontend yetki kontrolü sağlar.
   Admin kullanıcılar tüm yetkilere otomatik sahiptir.
   DB'deki yetki matrisi ile 1:1 uyumludur.
   ════════════════════════════════════════════════════════════════ */
const MR = window.MR || (window.MR = {});

MR.yetki = {
  /**
   * Belirli bir kullanıcının verilen modül+işlem için yetkisi var mı?
   * @param {Object} user - Kullanıcı objesi (rol, yetkiler içerir).
   * @param {string} modul - Yetki modülü ('crm', 'cagri_merkezi', 'sistem', vb.)
   * @param {string} islem - İşlem anahtarı ('crm-arama', 'widget-goruntule', vb.)
   * @returns {boolean}
   */
  kontrol: function(user, modul, islem) {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    if (!user.yetkiler || typeof user.yetkiler !== 'object') return false;
    var anahtar = modul + '_' + islem;
    return user.yetkiler[anahtar] === 1;
  },

  /**
   * Birden fazla izinden en az BİRİNE sahip mi?
   */
  herhangiBiri: function(user, izinler) {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    if (!Array.isArray(izinler)) return false;
    for (var i = 0; i < izinler.length; i++) {
      var p = izinler[i];
      if (this.kontrol(user, p.modul, p.islem)) return true;
    }
    return false;
  },

  /**
   * Kullanıcı admin mi? (Admin her yetkiye sahiptir.)
   */
  adminMi: function(user) {
    return !!(user && user.rol === 'admin');
  },

  /**
   * Mevcut global kullanıcıyı döndürür (MR._currentUser app.js'te set ediliyor).
   */
  kullanici: function() {
    return MR._currentUser || null;
  },

  /**
   * React component: yetkisi yoksa "Yetkisiz Erişim" ekranı gösterir.
   * Kullanım: <MR.yetki.YetkisizEkran /> veya yetki.YetkiKapisi(user, 'crm', 'crm-arama', content)
   */
  YetkisizEkran: function(props) {
    var C = (MR && MR.C) || {};
    var LIcon = (MR && MR.LIcon) || null;
    var msg = (props && props.mesaj) || 'BU SAYFAYI GÖRÜNTÜLEME YETKİNİZ BULUNMAMAKTADIR';
    var ayrinti = (props && props.ayrinti) || 'Yöneticinizden yetki matrisi üzerinden izin talep edin.';
    return React.createElement('div', {
      style: {
        padding: '60px 20px',
        textAlign: 'center',
        color: C.danger || '#dc2626',
        fontWeight: 700
      }
    }, [
      LIcon ? React.createElement(LIcon, {key: 'i', name: 'ShieldAlert', size: 64, color: C.danger || '#dc2626'}) : null,
      React.createElement('div', {key: 'm', style: {marginTop: 16, fontSize: 18, letterSpacing: '.5px'}}, msg),
      React.createElement('div', {key: 'a', style: {marginTop: 8, fontSize: 12, color: C.textMuted || '#999', fontWeight: 500}}, ayrinti)
    ]);
  },

  /**
   * Koruma kapısı: yetkisi yoksa YetkisizEkran, yetkisi varsa children döner.
   * Kullanım: return MR.yetki.YetkiKapisi(user, 'crm', 'crm-arama', <Icerik/>);
   */
  YetkiKapisi: function(user, modul, islem, icerik) {
    if (this.kontrol(user, modul, islem)) return icerik;
    return React.createElement(this.YetkisizEkran, {
      mesaj: 'BU SAYFAYI GÖRÜNTÜLEME YETKİNİZ BULUNMAMAKTADIR',
      ayrinti: 'Modül: ' + modul + ' / İşlem: ' + islem + ' — Yöneticinizden bu izni talep edin.'
    });
  }
};

console.log('[YETKI] Merkezi yetki kütüphanesi yüklendi — MR.yetki hazır.');
