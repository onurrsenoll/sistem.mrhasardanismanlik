/* ============================================================
   MR HASAR DANIŞMANLIK – WEBRTC TELEFON MODÜLÜ v2.0
   SIFIRDAN TEMİZ YAPI
   JsSIP İLE TARAYICI İÇİ SOFTPHONE
   wss://sip6.netsantral.com:8089/ws ÜZERİNDEN NETGSM PBX'E BAĞLANIR
   ============================================================ */

const MR = window.MR || (window.MR = {});

MR.webrtcTelefon = {

  /* ═══ DURUM ═══ */
  _ua: null,
  _session: null,
  _kayitli: false,
  _aramaDurumu: 'bos',
  _remoteAudio: null,
  _muteState: false,
  _ringtoneCtx: null,

  /* ═══ YAPILANDIRMA ═══ */
  _config: {
    wssUrl: 'wss://sip6.netsantral.com:8089/ws',
    domain: 'sip6.netsantral.com',
    dahili: '',
    sipSifre: '',
    kullanici: '',
    apiSifre: '',
    santralNo: ''
  },

  /* ═══ BAŞLAT ═══ */
  baslat: function(config) {
    if (this._ua) return;

    if (typeof JsSIP === 'undefined') {
      console.error('[WEBRTC] JsSIP BULUNAMADI');
      this._durumBildir('hata', 'JsSIP KÜTÜPHANESİ BULUNAMADI');
      return;
    }

    if (config) Object.assign(this._config, config);

    if (!this._config.dahili || !this._config.sipSifre) {
      this._durumBildir('hata', 'DAHİLİ VEYA SIP ŞİFRESİ GİRİLMEMİŞ');
      return;
    }

    this._remoteAudioOlustur();

    var santralNo = (this._config.santralNo || '').replace(/^0+/, '');
    var authUser = santralNo ? this._config.dahili + '-' + santralNo : this._config.dahili;
    var sipUri = 'sip:' + authUser + '@' + this._config.domain;
    var self = this;

    console.log('[WEBRTC] OTOMATİK BAŞLATILIYOR - DAHİLİ:', this._config.dahili, '| KULLANICI:', this._config.kullanici, '| SANTRAL:', this._config.santralNo);
    console.log('[WEBRTC] BAĞLANIYOR:', sipUri, '| AUTH:', authUser, '| WSS:', this._config.wssUrl);

    try {
      var socket = new JsSIP.WebSocketInterface(this._config.wssUrl);

      this._ua = new JsSIP.UA({
        sockets: [socket],
        uri: sipUri,
        authorization_user: authUser,
        password: this._config.sipSifre,
        display_name: 'MR HASAR CRM',
        register: true,
        register_expires: 300,
        session_timers: false,
        connection_recovery_min_interval: 4,
        connection_recovery_max_interval: 30
      });

      this._ua.on('registered', function() {
        console.log('[WEBRTC] PBX KAYIT BAŞARILI ✓ AUTH:', authUser);
        self._kayitli = true;
        self._durumBildir('kayitli');
      });

      this._ua.on('unregistered', function() {
        self._kayitli = false;
        self._durumBildir('kayit-kaldirildi');
      });

      this._ua.on('registrationFailed', function(e) {
        console.error('[WEBRTC] KAYIT BAŞARISIZ:', e.cause);
        self._kayitli = false;
        self._durumBildir('hata', 'PBX KAYIT HATASI: ' + (e.cause || ''));
      });

      this._ua.on('connected', function() {
        console.log('[WEBRTC] WEBSOCKET BAĞLANDI');
      });

      this._ua.on('disconnected', function() {
        console.warn('[WEBRTC] WEBSOCKET KOPTU');
        self._kayitli = false;
        self._durumBildir('baglanti-koptu');
      });

      this._ua.on('newRTCSession', function(data) {
        if (data.session.direction === 'incoming') {
          self._gelenCagri(data.session);
        }
      });

      this._ua.start();
      console.log('[WEBRTC] JsSIP BAŞLATILDI');

    } catch(e) {
      console.error('[WEBRTC] BAŞLATMA HATASI:', e);
      this._durumBildir('hata', 'WebRTC BAŞLATILAMADI: ' + (e.message || ''));
    }
  },

  /* ═══ DURDUR ═══ */
  durdur: function() {
    this.kapat();
    if (this._ua) { try { this._ua.stop(); } catch(e) {} }
    this._ua = null;
    this._kayitli = false;
    this._aramaDurumu = 'bos';
    this._durumBildir('durduruldu');
    return Promise.resolve();
  },

  /* ═══ GİDEN ARAMA ═══ */
  ara: function(numara) {
    if (!this._ua || !this._kayitli) {
      this._durumBildir('hata', 'WEBRTC TELEFON PBX\'E KAYITLI DEĞİL');
      return false;
    }
    if (this._session) {
      console.warn('[WEBRTC] ZATEN AKTİF GÖRÜŞME VAR - ARAMA ENGELLENDİ');
      return false;
    }

    var cleanNum = numara.replace(/[\s\-\(\)\+]/g, '');
    if (cleanNum.startsWith('90') && cleanNum.length >= 12) {
      cleanNum = '0' + cleanNum.substring(2);
    } else if (!cleanNum.startsWith('0') && cleanNum.length === 10) {
      cleanNum = '0' + cleanNum;
    }

    var targetUri = 'sip:' + cleanNum + '@' + this._config.domain;
    console.log('[WEBRTC] ARAMA BAŞLATILIYOR:', cleanNum, '| URI:', targetUri);

    this._aramaDurumu = 'araniyor';
    this._durumBildir('araniyor', cleanNum);

    try {
      var session = this._ua.call(targetUri, {
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false }
      });

      this._session = session;
      this._sessionOlaylariBagla(session);
      console.log('[WEBRTC] ÇAĞRI GÖNDERİLDİ:', cleanNum);
      return true;

    } catch(e) {
      console.error('[WEBRTC] ARAMA HATASI:', e);
      this._temizle();
      this._durumBildir('hata', 'ARAMA BAŞLATILAMADI: ' + (e && e.message ? e.message : ''));
      return false;
    }
  },

  /* ═══ GELEN ÇAĞRI ═══ */
  _gelenCagri: function(session) {
    var arayanNum = (session.remote_identity && session.remote_identity.uri) ? session.remote_identity.uri.user : 'BİLİNMEYEN';
    var arayanAdi = session.remote_identity ? (session.remote_identity.display_name || '') : '';

    if (this._session) {
      console.warn('[WEBRTC] AKTİF GÖRÜŞME VAR, GELEN ÇAĞRI REDDEDİLDİ');
      session.terminate();
      return;
    }

    this._session = session;
    this._aramaDurumu = 'gelen';
    this._sessionOlaylariBagla(session);
    this._zilCaldir();

    this._durumBildir('gelen-cagri', { arayan: arayanNum, arayanAdi: arayanAdi });
    window.dispatchEvent(new CustomEvent('mr-webrtc-gelen-cagri', {
      detail: { arayan: arayanNum, arayanAdi: arayanAdi, timestamp: Date.now() }
    }));
  },

  /* ═══ CEVAPLA ═══ */
  cevapla: function() {
    if (!this._session || this._aramaDurumu !== 'gelen') return false;
    this._zilDurdur();
    try {
      this._session.answer({
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });
      this._aramaDurumu = 'gorusmede';
      this._durumBildir('gorusmede');
      return true;
    } catch(e) {
      console.error('[WEBRTC] CEVAPLAMA HATASI:', e);
      return false;
    }
  },

  /* ═══ REDDET ═══ */
  reddet: function() {
    if (!this._session || this._aramaDurumu !== 'gelen') return;
    this._zilDurdur();
    try { this._session.terminate(); } catch(e) {}
    this._temizle();
    this._durumBildir('reddedildi');
  },

  /* ═══ KAPAT ═══ */
  kapat: function() {
    this._zilDurdur();
    if (!this._session) return;
    try { this._session.terminate(); } catch(e) {}
    this._temizle();
    this._durumBildir('kapandi');
  },

  /* ═══ SESSİZ TOGGLE ═══ */
  sesizToggle: function() {
    if (!this._session || this._aramaDurumu !== 'gorusmede') return false;
    try {
      if (this._muteState) {
        this._session.unmute({ audio: true });
        this._muteState = false;
        this._durumBildir('ses-acildi');
      } else {
        this._session.mute({ audio: true });
        this._muteState = true;
        this._durumBildir('sessize-alindi');
      }
      return this._muteState;
    } catch(e) { return false; }
  },

  /* ═══ TRANSFER ═══ */
  transfer: function(hedefDahili) {
    if (!this._session || this._aramaDurumu !== 'gorusmede') return false;
    try {
      this._session.refer('sip:' + hedefDahili + '@' + this._config.domain);
      this._durumBildir('transfer', hedefDahili);
      return true;
    } catch(e) { return false; }
  },

  /* ═══ SESSION OLAYLARI ═══ */
  _sessionOlaylariBagla: function(session) {
    var self = this;
    var _sesAyarlandi = false;

    session.on('progress', function() {
      console.log('[WEBRTC] ÇALIYOR...');
      self._aramaDurumu = 'caliyor';
      self._durumBildir('caliyor');
    });

    session.on('accepted', function() {
      console.log('[WEBRTC] GÖRÜŞME BAŞLADI');
      self._zilDurdur();
      self._aramaDurumu = 'gorusmede';
      if (!_sesAyarlandi) { self._sesAyarla(session); _sesAyarlandi = true; }
      self._durumBildir('gorusmede');
    });

    session.on('confirmed', function() {
      console.log('[WEBRTC] GÖRÜŞME ONAYLANDI');
      if (!_sesAyarlandi) { self._sesAyarla(session); _sesAyarlandi = true; }
    });

    session.on('ended', function() {
      console.log('[WEBRTC] GÖRÜŞME BİTTİ');
      self._zilDurdur();
      self._temizle();
      self._durumBildir('kapandi');
    });

    session.on('failed', function(e) {
      console.error('[WEBRTC] ÇAĞRI BAŞARISIZ:', e && e.cause ? e.cause : '');
      self._zilDurdur();
      self._temizle();
      self._durumBildir('hata', 'ÇAĞRI BAŞARISIZ: ' + (e && e.cause ? e.cause : ''));
    });

    session.on('peerconnection', function(data) {
      data.peerconnection.ontrack = function(event) {
        if (event.track.kind === 'audio' && self._remoteAudio) {
          var stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          self._remoteAudio.srcObject = stream;
          self._remoteAudio.play().catch(function() {});
          _sesAyarlandi = true;
          console.log('[WEBRTC] UZAK SES BAĞLANDI (ontrack)');
        }
      };
    });
  },

  /* ═══ SES AYARLA ═══ */
  _sesAyarla: function(session) {
    try {
      var pc = session.connection;
      if (!pc) return;
      if (this._remoteAudio && this._remoteAudio.srcObject && !this._remoteAudio.paused) return;
      var receivers = pc.getReceivers();
      for (var i = 0; i < receivers.length; i++) {
        if (receivers[i].track && receivers[i].track.kind === 'audio' && this._remoteAudio) {
          this._remoteAudio.srcObject = new MediaStream([receivers[i].track]);
          this._remoteAudio.play().catch(function() {});
          break;
        }
      }
    } catch(e) {}
  },

  /* ═══ TEMİZLE ═══ */
  _temizle: function() {
    this._session = null;
    this._aramaDurumu = 'bos';
    this._muteState = false;
  },

  /* ═══ SES ELEMENTİ ═══ */
  _remoteAudioOlustur: function() {
    if (!this._remoteAudio) {
      this._remoteAudio = document.createElement('audio');
      this._remoteAudio.id = 'mr-webrtc-remote-audio';
      this._remoteAudio.autoplay = true;
      this._remoteAudio.style.display = 'none';
      document.body.appendChild(this._remoteAudio);
    }
  },

  /* ═══ ZİL SESİ ═══ */
  _zilCaldir: function() {
    var self = this;
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var caldir = function() {
        if (self._aramaDurumu !== 'gelen') { ac.close(); return; }
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.frequency.value = 440; gain.gain.value = 0.2;
        osc.start();
        setTimeout(function() { osc.frequency.value = 480; }, 200);
        setTimeout(function() { osc.stop(); }, 400);
        setTimeout(function() { if (self._aramaDurumu === 'gelen') caldir(); }, 2000);
      };
      caldir();
      this._ringtoneCtx = ac;
    } catch(e) {}
  },

  _zilDurdur: function() {
    if (this._ringtoneCtx) {
      try { this._ringtoneCtx.close(); } catch(e) {}
      this._ringtoneCtx = null;
    }
  },

  /* ═══ DURUM BİLDİR ═══ */
  _durumBildir: function(durum, detay) {
    console.log('[WEBRTC] DURUM:', durum, detay || '');
    window.dispatchEvent(new CustomEvent('mr-webrtc-durum', {
      detail: {
        durum: durum, detay: detay,
        kayitli: this._kayitli,
        aramaDurumu: this._aramaDurumu,
        mute: this._muteState,
        timestamp: Date.now()
      }
    }));
  },

  durum: function() {
    return { kayitli: this._kayitli, aramaDurumu: this._aramaDurumu, mute: this._muteState, session: !!this._session };
  }
};
