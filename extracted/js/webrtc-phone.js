/* ============================================================
   MR HASAR DANIŞMANLIK – WEBRTC TELEFON MODÜLÜ
   JsSIP İLE TARAYICI İÇİ SOFTPHONE
   wss://sip6.netsantral.com:8089/ws ÜZERİNDEN NETGSM PBX'E BAĞLANIR
   JsSIP LOKAL BUNDLE (jssip.bundle.min.js) - CDN BAĞIMLILIĞI YOK
   ============================================================ */

const MR = window.MR || (window.MR = {});

MR.webrtcTelefon = {
  /* DURUM */
  _ua: null,
  _session: null,
  _kayitli: false,
  _aramaDurumu: 'bos',
  _remoteAudio: null,
  _muteState: false,
  _ringtoneCtx: null,

  /* YAPILANDIRMA */
  _config: {
    wssUrl: 'wss://sip6.netsantral.com:8089/ws',
    domain: 'sip6.netsantral.com',
    dahili: '',
    sipSifre: ''
  },

  /* ═══ BAŞLAT ═══ */
  baslat(config) {
    if (this._ua) {
      console.log('[WEBRTC] ZATEN BAŞLATILMIŞ');
      return;
    }

    /* JsSIP LOKAL BUNDLE YÜKLÜ MÜ KONTROL */
    if (typeof JsSIP === 'undefined') {
      console.error('[WEBRTC] JsSIP KÜTÜPHANESİ BULUNAMADI! js/jssip.bundle.min.js YÜKLÜ MÜ KONTROL EDİN.');
      this._durumBildir('hata', 'JsSIP KÜTÜPHANESİ BULUNAMADI - jssip.bundle.min.js EKSİK');
      return;
    }

    if (config) Object.assign(this._config, config);

    if (!this._config.dahili || !this._config.sipSifre) {
      console.warn('[WEBRTC] DAHİLİ VEYA SIP ŞİFRESİ EKSİK');
      this._durumBildir('hata', 'DAHİLİ VEYA SIP ŞİFRESİ GİRİLMEMİŞ');
      return;
    }

    /* SES ELEMENTİ */
    this._remoteAudioOlustur();

    const sipUri = 'sip:' + this._config.dahili + '@' + this._config.domain;
    console.log('[WEBRTC] JsSIP BAŞLATILIYOR:', sipUri, '| WSS:', this._config.wssUrl);

    try {
      /* WEBSOCKET BAĞLANTISI */
      var socket = new JsSIP.WebSocketInterface(this._config.wssUrl);

      /* JsSIP USER AGENT */
      var uaConfig = {
        sockets: [socket],
        uri: sipUri,
        password: this._config.sipSifre,
        display_name: 'MR HASAR CRM',
        register: true,
        register_expires: 300,
        session_timers: false,
        connection_recovery_min_interval: 4,
        connection_recovery_max_interval: 30
      };

      this._ua = new JsSIP.UA(uaConfig);

      /* OLAYLAR */
      this._ua.on('registered', () => {
        console.log('[WEBRTC] PBX KAYIT BAŞARILI ✓');
        this._kayitli = true;
        this._durumBildir('kayitli');
      });

      this._ua.on('unregistered', () => {
        console.log('[WEBRTC] PBX KAYIT KALDIRILDI');
        this._kayitli = false;
        this._durumBildir('kayit-kaldirildi');
      });

      this._ua.on('registrationFailed', (e) => {
        console.error('[WEBRTC] KAYIT BAŞARISIZ:', e.cause);
        console.error('[WEBRTC] KAYIT DETAY:', JSON.stringify({
          cause: e.cause,
          status_code: e.response ? e.response.status_code : 'YOK',
          reason_phrase: e.response ? e.response.reason_phrase : 'YOK',
          dahili: this._config.dahili,
          domain: this._config.domain,
          sifre_uzunluk: this._config.sipSifre ? this._config.sipSifre.length : 0,
          sifre_ilk2: this._config.sipSifre ? this._config.sipSifre.substring(0, 2) + '***' : 'BOŞ'
        }));
        if (e.cause === 'Authentication Error') {
          console.error('[WEBRTC] ════════════════════════════════════════');
          console.error('[WEBRTC] SIP ŞİFRESİ YANLIŞ! ÇÖZÜM:');
          console.error('[WEBRTC] 1. NETSANTRAL PANELİ → AYARLAR → DAHİLİ LİSTESİ → DAHİLİ', this._config.dahili);
          console.error('[WEBRTC] 2. "ŞİFRE" ALANINI KONTROL EDİN VEYA DEĞİŞTİRİN');
          console.error('[WEBRTC] 3. CRM → SİSTEM → NETSANTRAL → SIP ŞİFRESİ ALANINA GİRİN');
          console.error('[WEBRTC] 4. NOT: NETSİPP+ MOBİL UYGULAMA ŞİFRESİ İLE AYNIDIR');
          console.error('[WEBRTC] TANI ÇALIŞTIR: /api/v1/netsantral/test-webhook.php?mode=sip-debug');
          console.error('[WEBRTC] ════════════════════════════════════════');
        }
        this._kayitli = false;
        this._durumBildir('hata', 'PBX KAYIT HATASI: ' + (e.cause || ''));
      });

      this._ua.on('connected', () => {
        console.log('[WEBRTC] WEBSOCKET BAĞLANDI');
      });

      this._ua.on('disconnected', () => {
        console.warn('[WEBRTC] WEBSOCKET KOPTU');
        this._kayitli = false;
        this._durumBildir('baglanti-koptu');
      });

      /* GELEN ÇAĞRI */
      this._ua.on('newRTCSession', (data) => {
        var session = data.session;
        if (session.direction === 'incoming') {
          this._gelenCagri(session);
        }
      });

      /* BAŞLAT */
      this._ua.start();
      console.log('[WEBRTC] JsSIP USER AGENT BAŞLATILDI');

    } catch(e) {
      console.error('[WEBRTC] BAŞLATMA HATASI:', e);
      this._durumBildir('hata', 'WebRTC BAŞLATILAMADI: ' + (e && e.message ? e.message : ''));
    }
  },

  /* ═══ GİDEN ARAMA ═══ */
  ara(numara) {
    if (!this._ua || !this._kayitli) {
      console.error('[WEBRTC] TELEFON KAYITLI DEĞİL');
      this._durumBildir('hata', 'WEBRTC TELEFON PBX\'E KAYITLI DEĞİL');
      return false;
    }

    if (this._session) {
      console.warn('[WEBRTC] ZATEN AKTİF GÖRÜŞME VAR');
      return false;
    }

    /* NUMARA TEMİZLE */
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
      var callOptions = {
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        },
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        }
      };

      var session = this._ua.call(targetUri, callOptions);
      this._session = session;
      this._sessionOlaylari(session);

      console.log('[WEBRTC] ÇAĞRI GÖNDERİLDİ:', cleanNum);
      return true;

    } catch(e) {
      console.error('[WEBRTC] ARAMA HATASI:', e);
      this._session = null;
      this._aramaDurumu = 'bos';
      this._durumBildir('hata', 'ARAMA BAŞLATILAMADI: ' + (e && e.message ? e.message : ''));
      return false;
    }
  },

  /* ═══ GELEN ÇAĞRI ═══ */
  _gelenCagri(session) {
    var arayanNum = (session.remote_identity && session.remote_identity.uri) ? session.remote_identity.uri.user : 'BİLİNMEYEN';
    var arayanAdi = (session.remote_identity) ? session.remote_identity.display_name || '' : '';
    console.log('[WEBRTC] GELEN ÇAĞRI:', arayanNum, '|', arayanAdi);

    if (this._session) {
      console.warn('[WEBRTC] AKTİF GÖRÜŞME VAR, GELEN ÇAĞRI REDDEDİLDİ');
      session.terminate();
      return;
    }

    this._session = session;
    this._aramaDurumu = 'gelen';
    this._sessionOlaylari(session);
    this._zilCaldir();

    this._durumBildir('gelen-cagri', { arayan: arayanNum, arayanAdi: arayanAdi });

    window.dispatchEvent(new CustomEvent('mr-webrtc-gelen-cagri', {
      detail: { arayan: arayanNum, arayanAdi: arayanAdi, timestamp: Date.now() }
    }));
  },

  /* ═══ CEVAPLA ═══ */
  cevapla() {
    if (!this._session || this._aramaDurumu !== 'gelen') {
      console.warn('[WEBRTC] CEVAPLANACAK ÇAĞRI YOK');
      return false;
    }

    this._zilDurdur();

    try {
      this._session.answer({
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        }
      });
      console.log('[WEBRTC] ÇAĞRI CEVAPLANDI');
      this._aramaDurumu = 'gorusmede';
      this._durumBildir('gorusmede');
      return true;
    } catch(e) {
      console.error('[WEBRTC] CEVAPLAMA HATASI:', e);
      return false;
    }
  },

  /* ═══ REDDET ═══ */
  reddet() {
    if (!this._session || this._aramaDurumu !== 'gelen') return;
    this._zilDurdur();
    try { this._session.terminate(); } catch(e) {}
    this._session = null;
    this._aramaDurumu = 'bos';
    this._durumBildir('reddedildi');
  },

  /* ═══ KAPAT ═══ */
  kapat() {
    this._zilDurdur();
    if (!this._session) return;
    try { this._session.terminate(); } catch(e) {}
    this._session = null;
    this._aramaDurumu = 'bos';
    this._muteState = false;
    this._durumBildir('kapandi');
  },

  /* ═══ MUTE ═══ */
  sesizToggle() {
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
      console.log('[WEBRTC] MİKROFON:', this._muteState ? 'KAPALI' : 'AÇIK');
      return this._muteState;
    } catch(e) {
      console.error('[WEBRTC] MUTE HATASI:', e);
      return false;
    }
  },

  /* ═══ TRANSFER ═══ */
  transfer(hedefDahili) {
    if (!this._session || this._aramaDurumu !== 'gorusmede') return false;
    try {
      var targetUri = 'sip:' + hedefDahili + '@' + this._config.domain;
      this._session.refer(targetUri);
      console.log('[WEBRTC] TRANSFER:', hedefDahili);
      this._durumBildir('transfer', hedefDahili);
      return true;
    } catch(e) {
      console.error('[WEBRTC] TRANSFER HATASI:', e);
      return false;
    }
  },

  /* ═══ DURDUR ═══ */
  durdur() {
    this.kapat();
    if (this._ua) {
      try { this._ua.stop(); } catch(e) {}
    }
    this._ua = null;
    this._kayitli = false;
    this._aramaDurumu = 'bos';
    this._durumBildir('durduruldu');
    console.log('[WEBRTC] TELEFON DURDURULDU');
    return Promise.resolve();
  },

  /* ═══ SESSION OLAYLARI ═══ */
  _sessionOlaylari(session) {
    var self = this;

    session.on('progress', function() {
      console.log('[WEBRTC] ÇALIYOR...');
      self._durumBildir('caliyor');
    });

    session.on('accepted', function() {
      console.log('[WEBRTC] GÖRÜŞME BAŞLADI');
      self._zilDurdur();
      self._aramaDurumu = 'gorusmede';
      self._sesAyarla(session);
      self._durumBildir('gorusmede');
    });

    session.on('confirmed', function() {
      console.log('[WEBRTC] GÖRÜŞME ONAYLANDI');
      self._sesAyarla(session);
    });

    session.on('ended', function() {
      console.log('[WEBRTC] GÖRÜŞME BİTTİ');
      self._zilDurdur();
      self._session = null;
      self._aramaDurumu = 'bos';
      self._muteState = false;
      self._durumBildir('kapandi');
    });

    session.on('failed', function(e) {
      console.error('[WEBRTC] ÇAĞRI BAŞARISIZ:', e && e.cause ? e.cause : '');
      self._zilDurdur();
      self._session = null;
      self._aramaDurumu = 'bos';
      self._muteState = false;
      self._durumBildir('hata', 'ÇAĞRI BAŞARISIZ: ' + (e && e.cause ? e.cause : ''));
    });

    /* SES STREAM YAKALAMA */
    session.on('peerconnection', function(data) {
      var pc = data.peerconnection;
      pc.ontrack = function(event) {
        if (event.track.kind === 'audio' && self._remoteAudio) {
          var stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          self._remoteAudio.srcObject = stream;
          self._remoteAudio.play().catch(function(e) { console.warn('[WEBRTC] SES ÇALMA HATASI:', e); });
          console.log('[WEBRTC] UZAK SES BAĞLANDI');
        }
      };
    });
  },

  /* ═══ SES AYARLA ═══ */
  _sesAyarla(session) {
    try {
      var pc = session.connection;
      if (!pc) return;
      var receivers = pc.getReceivers();
      for (var i = 0; i < receivers.length; i++) {
        if (receivers[i].track && receivers[i].track.kind === 'audio' && this._remoteAudio) {
          var stream = new MediaStream([receivers[i].track]);
          this._remoteAudio.srcObject = stream;
          this._remoteAudio.play().catch(function(e) { console.warn('[WEBRTC] SES:', e); });
        }
      }
    } catch(e) {}
  },

  /* ═══ SES ELEMENTİ ═══ */
  _remoteAudioOlustur() {
    if (!this._remoteAudio) {
      this._remoteAudio = document.createElement('audio');
      this._remoteAudio.id = 'mr-webrtc-remote-audio';
      this._remoteAudio.autoplay = true;
      this._remoteAudio.style.display = 'none';
      document.body.appendChild(this._remoteAudio);
    }
  },

  _zilCaldir() {
    var self = this;
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var zilCaldir = function() {
        if (self._aramaDurumu !== 'gelen') { ac.close(); return; }
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.2;
        osc.start();
        setTimeout(function() { osc.frequency.value = 480; }, 200);
        setTimeout(function() { osc.stop(); }, 400);
        setTimeout(function() { if (self._aramaDurumu === 'gelen') zilCaldir(); }, 2000);
      };
      zilCaldir();
      this._ringtoneCtx = ac;
    } catch(e) {}
  },

  _zilDurdur() {
    if (this._ringtoneCtx) {
      try { this._ringtoneCtx.close(); } catch(e) {}
      this._ringtoneCtx = null;
    }
  },

  /* ═══ DURUM BİLDİR ═══ */
  _durumBildir(durum, detay) {
    console.log('[WEBRTC] DURUM:', durum, detay || '');
    window.dispatchEvent(new CustomEvent('mr-webrtc-durum', {
      detail: {
        durum: durum,
        detay: detay,
        kayitli: this._kayitli,
        aramaDurumu: this._aramaDurumu,
        mute: this._muteState,
        timestamp: Date.now()
      }
    }));
  },

  durum() {
    return {
      kayitli: this._kayitli,
      aramaDurumu: this._aramaDurumu,
      mute: this._muteState,
      session: !!this._session
    };
  }
};
