/* ============================================================
   MR HASAR DANIŞMANLIK – WEBRTC TELEFON MODÜLÜ v7.0
   JsSIP 3.10.0 İLE TARAYICI İÇİ SOFTPHONE

   v7.0 - DİREKT SIP ARAMA:
   - ARA → direkt SIP üzerinden arar (tek tıkla)
   - KAPAT → direkt kapatır
   - GELEN ÇAĞRI → cevapla/reddet
   - getUserMedia ÖN-ALINIR (JsSIP hatasını önler)
   - DAHİLİ WSS MODUNDA BAĞLI OLMALI (Netsantral panelinden)
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
  _ringbackCtx: null,
  _ringbackTimer: null,
  _iceRestartCount: 0,
  _iceMaxRestart: 3,
  _iceGatherTimer: null,
  _iceConnectTimer: null,
  _relayCandidateFound: false,
  _reconnectTimer: null,
  _turnCachedCreds: null,

  /* ═══ SES YÖNETİMİ ═══ */
  _sesAyarlari: {
    volume: parseFloat(localStorage.getItem('mr_webrtc_volume') || '1.0'),
    ringtoneVolume: parseFloat(localStorage.getItem('mr_webrtc_ringtone_vol') || '0.5'),
    ringbackVolume: parseFloat(localStorage.getItem('mr_webrtc_ringback_vol') || '0.3'),
    mikrofonId: localStorage.getItem('mr_webrtc_mikrofon') || '',
    hoparlörId: localStorage.getItem('mr_webrtc_hoparlor') || '',
    mikrofonGain: parseFloat(localStorage.getItem('mr_webrtc_mic_gain') || '1.0'),
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },

  /* ═══ SES CİHAZLARI ═══ */
  _cihazlar: { mikrofonlar: [], hoparlorler: [] },
  _localStream: null,
  _audioContext: null,
  _gainNode: null,

  /* ═══ YAPILANDIRMA ═══ */
  _config: {
    wssUrl: '',
    domain: '',
    dahili: '',
    sipSifre: '',
    kullanici: '',
    apiSifre: '',
    santralNo: '',
    turnUrl: '',
    turnUser: '',
    turnPass: '',
    meteredApiKey: '' /* metered.ca ücretsiz TURN API anahtarı */
  },

  /* ═══ TURN KİMLİK BİLGİLERİ OLUŞTUR ═══ */
  _turnKimlikOlustur: async function() {
    /* 1. Metered.ca API ile dinamik TURN credentials al */
    /* localStorage'dan API key kontrolü (config'de yoksa) */
    if (!this._config.meteredApiKey) {
      this._config.meteredApiKey = localStorage.getItem('mr_metered_api_key') || '';
    }
    if (this._config.meteredApiKey) {
      try {
        var resp = await fetch('https://mrhasar.metered.live/api/v1/turn/credentials?apiKey=' + this._config.meteredApiKey);
        if (resp.ok) {
          var creds = await resp.json();
          if (Array.isArray(creds) && creds.length > 0) {
            this._meteredServers = creds;
            console.log('[WEBRTC] TURN: Metered API BAŞARILI ✓', creds.length, 'sunucu alındı');
            return true;
          }
        }
        console.warn('[WEBRTC] TURN: Metered API yanıt hatası:', resp.status);
      } catch(e) {
        console.warn('[WEBRTC] TURN: Metered API erişilemedi:', e.message);
      }
    }

    /* 2. Metered.ca static auth (yedek) */
    try {
      var secret = 'openrelayproject';
      var timestamp = Math.floor(Date.now() / 1000) + 86400;
      var username = timestamp.toString();
      var enc = new TextEncoder();
      var key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
      var sig = await crypto.subtle.sign('HMAC', key, enc.encode(username));
      var credential = btoa(String.fromCharCode.apply(null, new Uint8Array(sig)));
      this._turnCachedCreds = { username: username, credential: credential };
    } catch(e) {
      this._turnCachedCreds = { username: 'openrelayproject', credential: 'openrelayproject' };
    }
    return false;
  },

  /* ═══ TURN BAĞLANTI TESTİ ═══ */
  _turnTest: function(turnUrl, username, credential, timeout) {
    timeout = timeout || 5000;
    return new Promise(function(resolve) {
      try {
        var pc = new RTCPeerConnection({
          iceServers: [{ urls: turnUrl, username: username, credential: credential }],
          iceTransportPolicy: 'relay'
        });
        var found = false;
        var timer = setTimeout(function() { if (!found) { pc.close(); resolve(false); } }, timeout);
        pc.onicecandidate = function(e) {
          if (e.candidate && e.candidate.type === 'relay') {
            found = true; clearTimeout(timer); pc.close(); resolve(true);
          }
          if (!e.candidate && !found) {
            clearTimeout(timer); pc.close(); resolve(false);
          }
        };
        pc.createDataChannel('t');
        pc.createOffer().then(function(o) { return pc.setLocalDescription(o); }).catch(function() { clearTimeout(timer); pc.close(); resolve(false); });
      } catch(e) { resolve(false); }
    });
  },

  /* ═══ ICE SUNUCULARI ═══ */
  _getIceServers: function() {
    var servers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];

    /* 1. KULLANICI TURN SUNUCUSU (EN YÜKSEK ÖNCELİK) */
    if (this._config.turnUrl) {
      servers.push({
        urls: this._config.turnUrl,
        username: this._config.turnUser || '',
        credential: this._config.turnPass || ''
      });
      if (this._config.turnUrl.indexOf('?transport=') === -1) {
        servers.push({
          urls: this._config.turnUrl + '?transport=tcp',
          username: this._config.turnUser || '',
          credential: this._config.turnPass || ''
        });
      }
      console.log('[WEBRTC] TURN: Kullanıcı TURN sunucusu eklendi:', this._config.turnUrl);
    }

    /* 2. METERED API TURN SUNUCULARI (dinamik credentials) */
    if (this._meteredServers && this._meteredServers.length > 0) {
      var self = this;
      this._meteredServers.forEach(function(s) {
        servers.push({
          urls: s.urls || s.url,
          username: s.username || '',
          credential: s.credential || ''
        });
      });
      console.log('[WEBRTC] TURN: Metered API sunucuları eklendi (' + this._meteredServers.length + ' adet)');
    }

    /* 3. ÇALIŞAN TURN (test sonucu) */
    if (this._workingTurnUrl) {
      var wtUrl = this._workingTurnUrl;
      var exists = servers.some(function(s) { return s.urls === wtUrl.urls; });
      if (!exists) servers.push(this._workingTurnUrl);
    }

    /* 4. METERED STATIC AUTH YEDEK */
    if (this._turnCachedCreds && !this._meteredServers) {
      var u = this._turnCachedCreds.username;
      var c = this._turnCachedCreds.credential;
      servers.push(
        { urls: 'turn:openrelay.metered.ca:443', username: u, credential: c },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: u, credential: c },
        { urls: 'turns:openrelay.metered.ca:443', username: u, credential: c },
        { urls: 'turn:openrelay.metered.ca:80', username: u, credential: c },
        { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: u, credential: c }
      );
    }

    var turnCount = servers.filter(function(s) { return (s.urls || '').indexOf('turn') === 0; }).length;
    console.log('[WEBRTC] ICE SUNUCU SAYISI:', servers.length, '(TURN:', turnCount, ')');
    return servers;
  },

  /* ═══ TURN SUNUCU TESTİ (ARKA PLAN) ═══ */
  _turnTestBaslat: async function() {
    var self = this;
    var servers = this._getIceServers();
    var turnServers = servers.filter(function(s) { return (s.urls || '').indexOf('turn') === 0; });

    if (turnServers.length === 0) {
      console.warn('[WEBRTC] TURN TEST: Hiç TURN sunucusu yok!');
      return;
    }

    console.log('[WEBRTC] TURN TEST: ' + turnServers.length + ' TURN sunucusu test ediliyor...');

    var testPromises = turnServers.map(function(srv) {
      return self._turnTest(srv.urls, srv.username, srv.credential, 5000).then(function(ok) {
        return { urls: srv.urls, username: srv.username, credential: srv.credential, ok: ok };
      });
    });

    try {
      var results = await Promise.all(testPromises);
      var working = results.filter(function(r) { return r.ok; });
      var failed = results.filter(function(r) { return !r.ok; });

      if (working.length > 0) {
        console.log('%c[WEBRTC] TURN TEST: ✓ ' + working.length + ' ÇALIŞIYOR', 'color: lime; font-weight: bold');
        working.forEach(function(r) { console.log('[WEBRTC] TURN ✓', r.urls); });
        self._workingTurnUrl = working[0];
      } else {
        console.error('[WEBRTC] ═══════════════════════════════════════════════════');
        console.error('[WEBRTC] ⚠ HİÇBİR TURN SUNUCUSU ÇALIŞMIYOR! (' + failed.length + ' test edildi)');
        console.error('[WEBRTC] ═══════════════════════════════════════════════════');
        console.error('[WEBRTC] ÇÖZÜM 1: Metered.ca API key ayarlayın (50GB/ay ücretsiz):');
        console.error('[WEBRTC]   → Konsolda: MR.webrtcTelefon.setTurnApiKey("API_KEY_BURAYA")');
        console.error('[WEBRTC]   → API key almak için: https://www.metered.ca/stun-turn');
        console.error('[WEBRTC] ÇÖZÜM 2: Cloudflare WARP / VPN kapatın');
        console.error('[WEBRTC] ÇÖZÜM 3: Docker Desktop kapatıp tekrar deneyin');
        console.error('[WEBRTC] ⚠ TURN OLMADAN SİMETRİK NAT ARKASINDA ARAMALAR BAŞARISIZ OLACAKTIR');
        console.error('[WEBRTC] ═══════════════════════════════════════════════════');
      }
    } catch(e) {
      console.warn('[WEBRTC] TURN TEST HATASI:', e.message);
    }
  },

  /* ═══ CİHAZLARI LİSTELE ═══ */
  cihazlariListele: async function() {
    try {
      /* MİKROFON İZNİ OLMADAN CİHAZLAR GELMEYEBİLİR */
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        stream.getTracks().forEach(function(t) { t.stop(); });
      }).catch(function() {});

      var devices = await navigator.mediaDevices.enumerateDevices();
      this._cihazlar.mikrofonlar = devices.filter(function(d) { return d.kind === 'audioinput'; });
      this._cihazlar.hoparlorler = devices.filter(function(d) { return d.kind === 'audiooutput'; });

      console.log('[WEBRTC] CİHAZLAR LİSTELENDİ - MİKROFON:', this._cihazlar.mikrofonlar.length, '| HOPARLÖR:', this._cihazlar.hoparlorler.length);
      return this._cihazlar;
    } catch(e) {
      console.error('[WEBRTC] CİHAZ LİSTELEME HATASI:', e);
      return this._cihazlar;
    }
  },

  /* ═══ SES AYARLARINI GÜNCELLE ═══ */
  sesAyarla: function(ayar, deger) {
    this._sesAyarlari[ayar] = deger;

    switch(ayar) {
      case 'volume':
        localStorage.setItem('mr_webrtc_volume', deger);
        if (this._remoteAudio) this._remoteAudio.volume = deger;
        break;
      case 'ringtoneVolume':
        localStorage.setItem('mr_webrtc_ringtone_vol', deger);
        break;
      case 'ringbackVolume':
        localStorage.setItem('mr_webrtc_ringback_vol', deger);
        break;
      case 'mikrofonId':
        localStorage.setItem('mr_webrtc_mikrofon', deger);
        break;
      case 'hoparlörId':
        localStorage.setItem('mr_webrtc_hoparlor', deger);
        if (this._remoteAudio && this._remoteAudio.setSinkId) {
          this._remoteAudio.setSinkId(deger).catch(function(e) {
            console.warn('[WEBRTC] HOPARLÖR DEĞİŞTİRME HATASI:', e);
          });
        }
        break;
      case 'mikrofonGain':
        localStorage.setItem('mr_webrtc_mic_gain', deger);
        if (this._gainNode) this._gainNode.gain.value = deger;
        break;
    }
    console.log('[WEBRTC] SES AYARI DEĞİŞTİ:', ayar, '=', deger);
  },

  /* ═══ SES AYARLARINI GETİR ═══ */
  getSesAyarlari: function() {
    return Object.assign({}, this._sesAyarlari);
  },

  /* ═══ BAŞLAT ═══ */
  baslat: async function(config) {
    if (this._ua) {
      console.log('[WEBRTC] ZATEN BAŞLATILMIŞ - ATLANIYOR');
      return;
    }

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

    /* TURN KİMLİK BİLGİLERİNİ ÖN-OLUŞTUR */
    await this._turnKimlikOlustur();

    this._remoteAudioOlustur();
    this.cihazlariListele();

    var santralNo = (this._config.santralNo || '').replace(/^0+/, '');
    var authUser = santralNo ? this._config.dahili + '-' + santralNo : this._config.dahili;
    var sipUri = 'sip:' + authUser + '@' + this._config.domain;
    var self = this;

    console.log('[WEBRTC] OTOMATİK BAŞLATILIYOR - DAHİLİ:', this._config.dahili, '| KULLANICI:', this._config.kullanici, '| SANTRAL:', this._config.santralNo);
    console.log('[WEBRTC] BAĞLANIYOR:', sipUri, '| AUTH:', authUser, '| WSS:', this._config.wssUrl);
    console.log('[WEBRTC] TURN DURUMU:', this._turnSipCreds ? 'SIP TURN + Metered Yedek' : (this._config.turnUrl ? 'KULLANICI TURN' : 'Sadece Metered'));

    /* ARKA PLANDA TURN SUNUCULARINI TEST ET */
    this._turnTestBaslat();

    /* JsSIP SIP MESAJLARINI GÖRMEK İÇİN DEBUG MODU */
    try { JsSIP.debug.enable('JsSIP:RTCSession*'); } catch(e) { console.log('[WEBRTC] JsSIP debug etkinleştirilemedi (normal)'); }

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
        no_answer_timeout: 60,
        connection_recovery_min_interval: 2,
        connection_recovery_max_interval: 15
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
        /* RECONNECT TIMER'I İPTAL ET - BAĞLANTI BAŞARILI */
        if (self._reconnectTimer) { clearTimeout(self._reconnectTimer); self._reconnectTimer = null; }
      });

      this._ua.on('disconnected', function() {
        console.warn('[WEBRTC] WEBSOCKET KOPTU - OTOMATİK YENİDEN BAĞLANMA DENENİYOR...');
        self._kayitli = false;
        self._durumBildir('baglanti-koptu');

        /* JsSIP KENDİ RECONNECT MEKANİZMASI BAŞARISIZ OLURSA YEDEK OLARAK MANUEL BAĞLAN */
        if (self._reconnectTimer) clearTimeout(self._reconnectTimer);
        self._reconnectTimer = setTimeout(function() {
          if (self._ua && !self._kayitli) {
            console.log('[WEBRTC] YEDEK YENİDEN BAĞLANMA DENİYOR...');
            try {
              self._ua.stop();
              setTimeout(function() {
                if (self._ua) {
                  self._ua.start();
                  console.log('[WEBRTC] UA YENİDEN BAŞLATILDI');
                }
              }, 2000);
            } catch(e) {
              console.error('[WEBRTC] YENİDEN BAĞLANMA HATASI:', e);
            }
          }
        }, 20000); /* 20 SANİYE SONRA - JsSIP'İN KENDİ RECOVERY'SİNE FIRSAT VER */
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
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    if (this._ua) { try { this._ua.stop(); } catch(e) {} }
    this._ua = null;
    this._kayitli = false;
    this._aramaDurumu = 'bos';
    this._audioContextKapat();
    this._durumBildir('durduruldu');
    return Promise.resolve();
  },

  /* ═══ MİKROFON AKIŞI OLUŞTUR (GELİŞMİŞ) ═══ */
  _mikrofonAkisiOlustur: async function() {
    var constraints = {
      audio: {
        echoCancellation: this._sesAyarlari.echoCancellation,
        noiseSuppression: this._sesAyarlari.noiseSuppression,
        autoGainControl: this._sesAyarlari.autoGainControl,
        sampleRate: 48000,
        channelCount: 1
      },
      video: false
    };

    /* SEÇİLİ MİKROFON VARSA KULLAN */
    if (this._sesAyarlari.mikrofonId) {
      constraints.audio.deviceId = { exact: this._sesAyarlari.mikrofonId };
    }

    try {
      var stream = await navigator.mediaDevices.getUserMedia(constraints);
      this._localStream = stream;

      /* MİKROFON GAIN KONTROLÜ - AudioContext İLE */
      if (this._sesAyarlari.mikrofonGain !== 1.0) {
        try {
          this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
          var source = this._audioContext.createMediaStreamSource(stream);
          this._gainNode = this._audioContext.createGain();
          this._gainNode.gain.value = this._sesAyarlari.mikrofonGain;
          var destination = this._audioContext.createMediaStreamDestination();
          source.connect(this._gainNode);
          this._gainNode.connect(destination);
          this._localStream = destination.stream;
          console.log('[WEBRTC] MİKROFON GAIN AYARLANDI:', this._sesAyarlari.mikrofonGain);
        } catch(e) {
          console.warn('[WEBRTC] GAIN AYAR HATASI:', e);
        }
      }

      console.log('[WEBRTC] MİKROFON AKIŞI OLUŞTURULDU');
      return this._localStream;
    } catch(e) {
      console.error('[WEBRTC] MİKROFON ERİŞİM HATASI:', e);
      alert('MİKROFON ERİŞİMİ BAŞARISIZ! TARAYICI AYARLARINDAN MİKROFON İZNİ VERDİĞİNİZDEN EMİN OLUN.\n\nHata: ' + (e.message || e.name || ''));
      return null;
    }
  },

  /* ═══ GİDEN ARAMA (DİREKT SIP) ═══ */
  ara: async function(numara) {
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
    this._iceRestartCount = 0;
    this._durumBildir('araniyor', cleanNum);

    try {
      /* MİKROFON AKIŞI AL */
      console.log('[WEBRTC] getUserMedia ÇAĞRILIYOR...');
      var stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('[WEBRTC] getUserMedia BAŞARILI ✓ track:', stream.getAudioTracks().length);
      } catch(mediaErr) {
        console.error('[WEBRTC] getUserMedia HATASI:', mediaErr.name, mediaErr.message);
        this._temizle();
        this._durumBildir('hata', 'MİKROFON ERİŞİMİ BAŞARISIZ: ' + (mediaErr.name || '') + ' - ' + (mediaErr.message || ''));
        return false;
      }

      var iceServers = this._getIceServers();
      var self = this;

      var callOptions = {
        mediaStream: stream,
        pcConfig: {
          iceServers: iceServers,
          iceTransportPolicy: 'all'
        },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false }
      };

      console.log('[WEBRTC] SIP ARAMA GÖNDERİLİYOR... ICE:', iceServers.length);
      var session = this._ua.call(targetUri, callOptions);

      this._session = session;
      this._sessionOlaylariBagla(session);
      this._ringbackBaslat();

      console.log('[WEBRTC] ÇAĞRI GÖNDERİLDİ:', cleanNum);
      return true;

    } catch(e) {
      console.error('[WEBRTC] ARAMA HATASI:', e, e.stack || '');
      this._ringbackDurdur();
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
    this._iceRestartCount = 0;
    this._sessionOlaylariBagla(session);
    this._zilCaldir();

    this._durumBildir('gelen-cagri', { arayan: arayanNum, arayanAdi: arayanAdi });
    window.dispatchEvent(new CustomEvent('mr-webrtc-gelen-cagri', {
      detail: { arayan: arayanNum, arayanAdi: arayanAdi, timestamp: Date.now() }
    }));
    console.log('[WEBRTC] GELEN ÇAĞRI:', arayanNum, arayanAdi);
  },

  /* ═══ CEVAPLA ═══ */
  cevapla: async function() {
    var session = this._session;
    if (!session) {
      console.error('[WEBRTC] CEVAPLA: SESSION YOK');
      return false;
    }
    if (session.direction !== 'incoming') {
      console.error('[WEBRTC] CEVAPLA: BU GELEN ÇAĞRI DEĞİL, direction:', session.direction);
      return false;
    }
    if (session.isEnded && session.isEnded()) {
      console.error('[WEBRTC] CEVAPLA: SESSION ZATEN SONLANMIŞ');
      this._zilDurdur();
      this._temizle();
      this._durumBildir('hata', 'ÇAĞRI ZATEN SONLANMIŞ');
      return false;
    }

    console.log('[WEBRTC] CEVAPLA: ÇAĞRI CEVAPLANMAYA BAŞLANIYOR...');
    this._zilDurdur();

    try {
      /* ÖNCELİKLE MİKROFON AKIŞI AL - JsSIP'E BIRAKMIYORUZ (GERÇEK HATAYI GÖRMEK İÇİN) */
      console.log('[WEBRTC] CEVAPLA: getUserMedia ÇAĞRILIYOR...');
      var stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('[WEBRTC] CEVAPLA: getUserMedia BAŞARILI ✓ track:', stream.getAudioTracks().length);
      } catch(mediaErr) {
        console.error('[WEBRTC] CEVAPLA: getUserMedia HATASI:', mediaErr.name, '-', mediaErr.message);
        this._durumBildir('hata', 'MİKROFON ERİŞİMİ BAŞARISIZ: ' + (mediaErr.name || '') + ' - ' + (mediaErr.message || ''));
        return false;
      }

      var iceServers = this._getIceServers();
      this._iceRestartCount = 0;

      /* MEDIASTREAM OLARAK GEÇ - JsSIP getUserMedia ÇAĞIRMASIN */
      var answerOptions = {
        mediaStream: stream,
        pcConfig: {
          iceServers: iceServers
        }
      };

      console.log('[WEBRTC] CEVAPLA: session.answer() ÇAĞRILIYOR... iceServerCount:', iceServers.length, 'status:', session.status);
      session.answer(answerOptions);
      this._aramaDurumu = 'gorusmede';
      this._durumBildir('gorusmede');
      console.log('[WEBRTC] CEVAPLA: ÇAĞRI CEVAPLANDI ✓');

      /* CEVAPLAMA SONRASI SES KONTROLÜ */
      var self2 = this;
      setTimeout(function() {
        if (self2._session === session) self2._sesAyarla(session);
      }, 1500);
      setTimeout(function() {
        if (self2._session === session) self2._sesAyarla(session);
      }, 3000);

      return true;
    } catch(e) {
      console.error('[WEBRTC] CEVAPLAMA HATASI:', e);
      this._durumBildir('hata', 'CEVAPLAMA HATASI: ' + (e && e.message ? e.message : ''));
      return false;
    }
  },

  /* ═══ REDDET ═══ */
  reddet: function() {
    if (!this._session) return;
    console.log('[WEBRTC] REDDET: ÇAĞRI REDDEDİLİYOR... direction:', this._session.direction, 'durum:', this._aramaDurumu);
    this._zilDurdur();
    this._ringbackDurdur();
    try {
      this._session.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
    } catch(e) {
      console.error('[WEBRTC] REDDET HATASI:', e);
    }
    this._temizle();
    this._durumBildir('reddedildi');
    window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
  },

  /* ═══ KAPAT ═══ */
  kapat: function() {
    this._zilDurdur();
    this._ringbackDurdur();
    if (!this._session) {
      if (this._aramaDurumu !== 'bos') {
        this._temizle();
        this._durumBildir('kapandi');
      }
      return;
    }
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
    var self = this;
    try {
      var eskiSession = this._session;
      this._session.refer('sip:' + hedefDahili + '@' + this._config.domain);
      console.log('[WEBRTC] TRANSFER GÖNDERİLDİ:', hedefDahili);
      this._durumBildir('transfer', hedefDahili);

      setTimeout(function() {
        if (self._session === eskiSession) {
          console.log('[WEBRTC] TRANSFER SONRASI SESSION TEMİZLENDİ');
          try { eskiSession.terminate(); } catch(e) {}
          self._temizle();
          self._durumBildir('kapandi');
        }
      }, 2000);

      return true;
    } catch(e) {
      console.error('[WEBRTC] TRANSFER HATASI:', e);
      return false;
    }
  },

  /* ═══ SESSION OLAYLARI ═══ */
  _sessionOlaylariBagla: function(session) {
    var self = this;
    var _sesAyarlandi = false;

    session.on('progress', function() {
      console.log('[WEBRTC] ÇALIYOR... direction:', session.direction, 'mevcut durum:', self._aramaDurumu);
      if (session.direction === 'incoming') {
        /* GELEN ÇAĞRI: ZATEN CEVAPLANMIŞSA DURUMU DEĞİŞTİRME */
        if (self._aramaDurumu !== 'gorusmede') {
          self._aramaDurumu = 'gelen';
        }
      } else {
        self._aramaDurumu = 'caliyor';
      }
      self._durumBildir('caliyor');
    });

    session.on('accepted', function() {
      console.log('[WEBRTC] GÖRÜŞME BAŞLADI');
      self._zilDurdur();
      self._ringbackDurdur();
      self._aramaDurumu = 'gorusmede';
      if (!_sesAyarlandi) { self._sesAyarla(session); _sesAyarlandi = true; }
      self._durumBildir('gorusmede');
    });

    session.on('confirmed', function() {
      console.log('[WEBRTC] GÖRÜŞME ONAYLANDI');
      self._ringbackDurdur();
      if (!_sesAyarlandi) { self._sesAyarla(session); _sesAyarlandi = true; }
    });

    session.on('ended', function() {
      console.log('[WEBRTC] GÖRÜŞME BİTTİ');
      self._zilDurdur();
      self._ringbackDurdur();
      self._temizle();
      self._durumBildir('kapandi');
      /* TÜM DİNLEYİCİLERİ BİLGİLENDİR (SOL PANEL, WİDGET vs.) */
      window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
    });

    session.on('failed', function(e) {
      var cause = e && e.cause ? e.cause : '';
      var originator = e && e.originator ? e.originator : 'bilinmiyor';
      var statusCode = (e && e.message && e.message.status_code) ? e.message.status_code : '';
      console.error('[WEBRTC] ÇAĞRI BAŞARISIZ:', cause, '| KİM:', originator, '| KOD:', statusCode);
      console.error('[WEBRTC] DETAY:', JSON.stringify({
        cause: cause,
        originator: originator,
        statusCode: statusCode,
        direction: session.direction,
        status: session.status
      }));
      self._zilDurdur();
      self._ringbackDurdur();
      self._temizle();
      self._durumBildir('hata', 'ÇAĞRI BAŞARISIZ: ' + cause + ' (' + originator + ')');
      window.dispatchEvent(new CustomEvent('mr-arama-sonlandi'));
    });

    session.on('refer', function() {
      console.log('[WEBRTC] REFER OLAYI - TRANSFER İŞLENİYOR');
    });

    session.on('replaces', function(data) {
      console.log('[WEBRTC] SESSION DEĞİŞTİRİLİYOR (REPLACES)');
      if (data && data.accept) {
        var newSession = data.accept();
        self._session = newSession;
        self._sessionOlaylariBagla(newSession);
        self._aramaDurumu = 'gorusmede';
        self._durumBildir('gorusmede');
      }
    });

    /* SDP FİLTRE - DOCKER/WSL ADAYLARINI SDP'DEN ÇIKAR */
    session.on('sdp', function(event) {
      if (event.originator === 'local') {
        var originalLines = event.sdp.split('\r\n');
        var filteredLines = [];
        var removedCount = 0;
        for (var i = 0; i < originalLines.length; i++) {
          var line = originalLines[i];
          /* Docker/WSL 172.16-31.x.x adreslerini içeren candidate satırlarını çıkar */
          if (line.indexOf('a=candidate:') === 0 && /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(line)) {
            removedCount++;
            continue;
          }
          filteredLines.push(line);
        }
        if (removedCount > 0) {
          event.sdp = filteredLines.join('\r\n');
          console.log('[WEBRTC] SDP FİLTRE: ' + removedCount + ' Docker/WSL aday çıkarıldı');
        }
      }
    });

    session.on('peerconnection', function(data) {
      var pc = data.peerconnection;
      self._relayCandidateFound = false;
      var _hostCount = 0, _srflxCount = 0, _relayCount = 0;

      pc.ontrack = function(event) {
        if (event.track.kind === 'audio' && self._remoteAudio) {
          var stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          self._remoteAudio.srcObject = stream;
          self._remoteAudio.volume = self._sesAyarlari.volume;

          /* HOPARLÖR SEÇİMİ UYGULA */
          if (self._sesAyarlari.hoparlörId && self._remoteAudio.setSinkId) {
            self._remoteAudio.setSinkId(self._sesAyarlari.hoparlörId).catch(function() {});
          }

          /* TARAYICI AUTOPLAY KISITLAMASINI AŞMAK İÇİN KULLANICI ETKİLEŞİMİNDEN SONRA OYNAT */
          var playPromise = self._remoteAudio.play();
          if (playPromise !== undefined) {
            playPromise.then(function() {
              console.log('[WEBRTC] UZAK SES OYNATIYOR ✓ VOLUME:', self._sesAyarlari.volume);
            }).catch(function(err) {
              console.warn('[WEBRTC] AUTOPLAY ENGELLENDİ - KULLANICI ETKİLEŞİMİ BEKLENİYOR:', err);
              /* KULLANICI ETKİLEŞİMİNDE TEKRAR DENE */
              var resumePlay = function() {
                self._remoteAudio.play().then(function() {
                  console.log('[WEBRTC] SES ETKİLEŞİM SONRASI BAŞLADI ✓');
                  document.removeEventListener('click', resumePlay);
                  document.removeEventListener('touchstart', resumePlay);
                  document.removeEventListener('keydown', resumePlay);
                }).catch(function() {});
              };
              document.addEventListener('click', resumePlay, { once: false });
              document.addEventListener('touchstart', resumePlay, { once: false });
              document.addEventListener('keydown', resumePlay, { once: false });
            });
          }

          _sesAyarlandi = true;
          self._ringbackDurdur();
          console.log('[WEBRTC] UZAK SES BAĞLANDI (ontrack) | VOLUME:', self._sesAyarlari.volume);
        }
      };

      /* ICE ADAYLARINI LOGLA VE FİLTRELE */
      pc.onicecandidate = function(event) {
        if (event.candidate) {
          var c = event.candidate;
          var addr = c.address || c.ip || '';

          /* İSTATİSTİK */
          if (c.type === 'host') _hostCount++;
          else if (c.type === 'srflx') _srflxCount++;
          else if (c.type === 'relay') {
            _relayCount++;
            self._relayCandidateFound = true;
            console.log('[WEBRTC] ✓ RELAY (TURN) ADAY BULUNDU:', c.protocol, addr);
          }

          /* DOCKER/WSL/SANAL AĞ ADAYLARINI FİLTRELE (172.16-31.x.x) */
          if (addr && /^172\.(1[6-9]|2\d|3[01])\./.test(addr)) {
            console.log('[WEBRTC] ICE ADAY FİLTRELENDİ (Docker/WSL):', c.type, c.protocol, addr);
            return; /* BU ADAYI GÖNDERMİYORUZ - ICE karışıklığı önlenir */
          }

          console.log('[WEBRTC] ICE ADAY:', c.type, c.protocol, addr);
        } else {
          /* ICE TOPLAMA TAMAMLANDI */
          if (self._iceGatherTimer) { clearTimeout(self._iceGatherTimer); self._iceGatherTimer = null; }
          console.log('[WEBRTC] ICE ADAY TOPLAMA TAMAMLANDI - host:', _hostCount, 'srflx:', _srflxCount, 'relay:', _relayCount);
          if (_relayCount === 0) {
            console.warn('[WEBRTC] ⚠ RELAY (TURN) ADAY BULUNAMADI! NAT/VPN/GÜVENLIK DUVARI SORUNU OLABİLİR.');
            console.warn('[WEBRTC] ⚠ Cloudflare WARP veya VPN kullanıyorsanız DEVRE DIŞI BIRAKIN.');
            console.warn('[WEBRTC] ⚠ Sadece STUN srflx adayları var (' + _srflxCount + ' adet) - simetrik NAT varsa çalışmaz.');
          }
        }
      };

      /* ICE TOPLAMA ZAMANAŞIMI - 8 SANİYE İÇİNDE TAMAMLANMAZSA UYAR */
      self._iceGatherTimer = setTimeout(function() {
        if (pc.iceGatheringState === 'gathering') {
          console.warn('[WEBRTC] ⚠ ICE TOPLAMA 8 SANİYEDİR DEVAM EDİYOR - TURN sunucularına erişilemiyor olabilir');
          console.log('[WEBRTC] Mevcut adaylar - host:', _hostCount, 'srflx:', _srflxCount, 'relay:', _relayCount);
        }
      }, 8000);

      /* ICE TOPLAMA DURUMUNU İZLE */
      pc.onicegatheringstatechange = function() {
        console.log('[WEBRTC] ICE TOPLAMA DURUMU:', pc.iceGatheringState);
      };

      /* ICE BAĞLANTI ZAMANAŞIMI - 15 SANİYE İÇİNDE BAĞLANMAZSA UYAR */
      self._iceConnectTimer = setTimeout(function() {
        if (pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'new') {
          console.error('[WEBRTC] ⚠ ICE BAĞLANTISI 15 SANİYEDİR KURULAMIYOR!');
          console.error('[WEBRTC] ⚠ MUHTEMEL NEDENLER:');
          console.error('[WEBRTC]   1. Cloudflare WARP / VPN aktif → DEVRE DIŞI BIRAKIN');
          console.error('[WEBRTC]   2. Güvenlik duvarı UDP trafiğini engelliyor');
          console.error('[WEBRTC]   3. Simetrik NAT - TURN relay gerekli ama TURN sunucusu çalışmıyor');
          console.error('[WEBRTC]   4. Docker Desktop / WSL ağ arayüzleri karışıklık yaratıyor');
          self._durumBildir('hata', 'MEDYA BAĞLANTISI KURULAMIYOR - VPN/WARP KAPATIN VEYA FARKLI AĞ DENEYİN');
        }
      }, 15000);

      /* ICE BAĞLANTI DURUMUNU İZLE */
      pc.oniceconnectionstatechange = function() {
        console.log('[WEBRTC] ICE DURUMU:', pc.iceConnectionState);

        if (pc.iceConnectionState === 'disconnected') {
          /* DISCONNECTED DURUMU - HEMEN ÖLMEDEN ÖNCE BİRAZ BEKLE, RECOVER OLABİLİR */
          console.warn('[WEBRTC] ICE DISCONNECTED - 3 SANİYE SONRA KONTROL EDİLECEK...');
          setTimeout(function() {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
              if (self._iceRestartCount < self._iceMaxRestart) {
                self._iceRestartCount++;
                console.log('[WEBRTC] ICE RESTART DENENİYOR (' + self._iceRestartCount + '/' + self._iceMaxRestart + ')');
                try {
                  pc.restartIce();
                } catch(e) {
                  console.error('[WEBRTC] ICE RESTART HATASI:', e);
                }
              } else {
                console.error('[WEBRTC] ICE RESTART LİMİTİNE ULAŞILDI - MEDYA BAĞLANTISI KURULAMADI');
                self._durumBildir('hata', 'MEDYA BAĞLANTISI KOPTU - VPN/WARP KAPATIN');
              }
            } else {
              console.log('[WEBRTC] ICE KENDILIĞINDEN DÜZELDI:', pc.iceConnectionState);
            }
          }, 3000);
        }

        if (pc.iceConnectionState === 'failed') {
          console.error('[WEBRTC] ICE TAMAMEN BAŞARISIZ! relay aday:', self._relayCandidateFound ? 'VAR' : 'YOK');
          if (self._iceRestartCount < self._iceMaxRestart) {
            self._iceRestartCount++;
            console.log('[WEBRTC] ICE FAILED - RESTART DENENİYOR (' + self._iceRestartCount + '/' + self._iceMaxRestart + ')');
            try {
              pc.restartIce();
            } catch(e) {
              console.error('[WEBRTC] ICE RESTART HATASI:', e);
            }
          } else {
            console.error('[WEBRTC] ICE TAMAMEN BAŞARISIZ - TURN SUNUCUSU GEREKLİ VEYA AĞ SORUNU VAR.');
            if (!self._relayCandidateFound) {
              console.error('[WEBRTC] ⚠ HİÇ RELAY ADAY BULUNAMADI - TURN SUNUCUSU ÇALIŞMIYOR VEYA KİMLİK DOĞRULAMA HATASI');
            }
            self._durumBildir('hata', 'MEDYA BAĞLANTISI KURULAMADI - AĞ SORUNU (VPN/WARP KAPATIN)');
          }
        }

        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          /* BAŞARILI - ZAMANAŞIMI SAYAÇLARINI TEMİZLE */
          if (self._iceConnectTimer) { clearTimeout(self._iceConnectTimer); self._iceConnectTimer = null; }
          if (self._iceGatherTimer) { clearTimeout(self._iceGatherTimer); self._iceGatherTimer = null; }
          self._iceRestartCount = 0;
          self._ringbackDurdur();
          console.log('[WEBRTC] ICE BAĞLANTI BAŞARILI ✓ (relay kullanıldı:', self._relayCandidateFound, ')');
          /* BAĞLANTI BAŞARILI - SES AKIŞINI TEKRAR KONTROL ET */
          if (self._remoteAudio && !self._remoteAudio.srcObject) {
            self._sesAyarla(session);
          }
        }
      };
    });
  },

  /* ═══ SES AYARLA ═══ */
  _sesAyarla: function(session) {
    try {
      if (!session) return;
      var pc = session.connection;
      if (!pc) return;
      if (typeof pc.getReceivers !== 'function') return;
      if (this._remoteAudio && this._remoteAudio.srcObject && !this._remoteAudio.paused) return;
      var receivers = pc.getReceivers();
      for (var i = 0; i < receivers.length; i++) {
        if (receivers[i].track && receivers[i].track.kind === 'audio' && this._remoteAudio) {
          this._remoteAudio.srcObject = new MediaStream([receivers[i].track]);
          this._remoteAudio.volume = this._sesAyarlari.volume;

          /* HOPARLÖR SEÇİMİ */
          if (this._sesAyarlari.hoparlörId && this._remoteAudio.setSinkId) {
            this._remoteAudio.setSinkId(this._sesAyarlari.hoparlörId).catch(function() {});
          }

          this._remoteAudio.play().then(function() {
            console.log('[WEBRTC] SES BAŞLADI (sesAyarla) ✓');
          }).catch(function() {});
          break;
        }
      }
    } catch(e) {
      console.error('[WEBRTC] SES AYAR HATASI:', e);
    }
  },

  /* ═══ TEMİZLE ═══ */
  _temizle: function() {
    this._session = null;
    this._aramaDurumu = 'bos';
    this._muteState = false;
    this._iceRestartCount = 0;
    this._relayCandidateFound = false;

    /* ICE ZAMANAŞIMI SAYAÇLARINI TEMİZLE */
    if (this._iceGatherTimer) { clearTimeout(this._iceGatherTimer); this._iceGatherTimer = null; }
    if (this._iceConnectTimer) { clearTimeout(this._iceConnectTimer); this._iceConnectTimer = null; }

    /* ÖN-HAZIRLANMIŞ MİKROFON AKIŞINI DURDUR */
    if (this._preStream) {
      this._preStream.getTracks().forEach(function(t) { t.stop(); });
      this._preStream = null;
    }

    /* YEREL AKIŞI DURDUR */
    if (this._localStream) {
      this._localStream.getTracks().forEach(function(t) { t.stop(); });
      this._localStream = null;
    }

    /* UZAK SES ELEMENTİNİ TEMİZLE - ESKİ AKIŞIN ÇALMAYA DEVAM ETMESİNİ ENGELLE */
    if (this._remoteAudio) {
      this._remoteAudio.pause();
      this._remoteAudio.srcObject = null;
    }

    /* MİKROFON AudioContext TEMİZLE */
    this._audioContextKapat();
  },

  /* ═══ SES ELEMENTİ (GELİŞMİŞ) ═══ */
  _remoteAudioOlustur: function() {
    if (!this._remoteAudio) {
      var audio = document.createElement('audio');
      audio.id = 'mr-webrtc-remote-audio';
      audio.autoplay = true;
      audio.playsInline = true;
      audio.volume = this._sesAyarlari.volume;

      /* GİZLEME YAPMA - TARAYICI BAZEN display:none İLE SESİ KAPATIYOR */
      audio.style.position = 'fixed';
      audio.style.top = '-9999px';
      audio.style.left = '-9999px';
      audio.style.width = '1px';
      audio.style.height = '1px';
      audio.style.opacity = '0.01';

      document.body.appendChild(audio);
      this._remoteAudio = audio;

      /* HOPARLÖR SEÇİMİ UYGULA */
      if (this._sesAyarlari.hoparlörId && audio.setSinkId) {
        audio.setSinkId(this._sesAyarlari.hoparlörId).catch(function() {});
      }

      console.log('[WEBRTC] UZAK SES ELEMENTİ OLUŞTURULDU | VOLUME:', this._sesAyarlari.volume);
    }
  },

  /* ═══ GİDEN ARAMA ÇALMA SESİ (RINGBACK TONE) ═══ */
  _ringbackBaslat: function() {
    this._ringbackDurdur();
    var self = this;
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      /* TARAYICI AUTOPLAY POLİTİKASI: AudioContext suspended OLABİLİR - RESUME ET */
      if (ac.state === 'suspended') {
        ac.resume().catch(function() {});
      }
      this._ringbackCtx = ac;
      var vol = this._sesAyarlari.ringbackVolume;

      /* TÜRK TELEKOM ÇALMA SESİ PATERNİ: 1sn çal - 4sn sessiz */
      var caldir = function() {
        if (self._aramaDurumu !== 'araniyor' && self._aramaDurumu !== 'caliyor') {
          if (ac.state !== 'closed') ac.close().catch(function(){});
          return;
        }

        try {
          /* 425Hz TON - STANDART ÇALMA SESİ */
          var osc1 = ac.createOscillator();
          var gainNode = ac.createGain();
          osc1.type = 'sine';
          osc1.frequency.value = 425;
          gainNode.gain.value = vol;

          /* YUMUŞAK BAŞLAMA / BİTİŞ */
          gainNode.gain.setValueAtTime(0, ac.currentTime);
          gainNode.gain.linearRampToValueAtTime(vol, ac.currentTime + 0.05);
          gainNode.gain.setValueAtTime(vol, ac.currentTime + 0.95);
          gainNode.gain.linearRampToValueAtTime(0, ac.currentTime + 1.0);

          osc1.connect(gainNode);
          gainNode.connect(ac.destination);
          osc1.start(ac.currentTime);
          osc1.stop(ac.currentTime + 1.0);

          /* 5 SANİYE SONRA TEKRARLA (1sn ses + 4sn sessiz) */
          self._ringbackTimer = setTimeout(function() {
            if (self._aramaDurumu === 'araniyor' || self._aramaDurumu === 'caliyor') {
              caldir();
            }
          }, 5000);
        } catch(e) {
          /* AudioContext kapatılmış olabilir */
        }
      };

      caldir();
      console.log('[WEBRTC] ÇALMA SESİ BAŞLADI (RINGBACK) | VOLUME:', vol);

    } catch(e) {
      console.warn('[WEBRTC] ÇALMA SESİ BAŞLATILAMADI:', e);
    }
  },

  _ringbackDurdur: function() {
    if (this._ringbackTimer) {
      clearTimeout(this._ringbackTimer);
      this._ringbackTimer = null;
    }
    if (this._ringbackCtx) {
      try { this._ringbackCtx.close(); } catch(e) {}
      this._ringbackCtx = null;
    }
  },

  /* ═══ ZİL SESİ (GELEN ÇAĞRI) ═══ */
  _zilCaldir: function() {
    var self = this;
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      /* TARAYICI AUTOPLAY POLİTİKASI: AudioContext suspended OLABİLİR - RESUME ET */
      if (ac.state === 'suspended') {
        ac.resume().catch(function() {});
      }
      var vol = this._sesAyarlari.ringtoneVolume;

      var caldir = function() {
        if (self._aramaDurumu !== 'gelen') {
          if (ac.state !== 'closed') ac.close().catch(function(){});
          return;
        }
        try {
          /* ÇALAN TELEFON SESİ: 440Hz + 480Hz (USA RING) */
          var osc1 = ac.createOscillator();
          var osc2 = ac.createOscillator();
          var gain = ac.createGain();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          gain.gain.value = vol;

          /* YUMUŞAK BAŞLAMA */
          gain.gain.setValueAtTime(0, ac.currentTime);
          gain.gain.linearRampToValueAtTime(vol, ac.currentTime + 0.02);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ac.destination);
          osc1.start();
          osc2.start();

          /* 1 SANİYE SONRA DURDUR */
          setTimeout(function() {
            gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.05);
            setTimeout(function() {
              try { osc1.stop(); osc2.stop(); } catch(e) {}
            }, 60);
          }, 1000);

          /* 3 SANİYE SONRA TEKRARLA (1sn çal - 2sn sessiz) */
          setTimeout(function() {
            if (self._aramaDurumu === 'gelen') caldir();
          }, 3000);
        } catch(e) {}
      };

      caldir();
      this._ringtoneCtx = ac;
      console.log('[WEBRTC] ZİL SESİ BAŞLADI | VOLUME:', vol);

    } catch(e) {}
  },

  _zilDurdur: function() {
    if (this._ringtoneCtx) {
      try { this._ringtoneCtx.close(); } catch(e) {}
      this._ringtoneCtx = null;
    }
  },

  /* ═══ AudioContext KAPAT ═══ */
  _audioContextKapat: function() {
    if (this._audioContext) {
      try { this._audioContext.close(); } catch(e) {}
      this._audioContext = null;
      this._gainNode = null;
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
    return {
      kayitli: this._kayitli,
      aramaDurumu: this._aramaDurumu,
      mute: this._muteState,
      session: !!this._session,
      sesAyarlari: this.getSesAyarlari(),
      cihazlar: this._cihazlar
    };
  },

  /* ═══ TURN API KEY AYARLA (KONSOL YARDIMCISI) ═══ */
  setTurnApiKey: function(apiKey) {
    if (!apiKey) {
      console.error('[WEBRTC] API key boş olamaz! Metered.ca hesabınızdan API key alın.');
      console.log('[WEBRTC] → https://www.metered.ca/stun-turn → Hesap açın → API Key kopyalayın');
      return;
    }
    localStorage.setItem('mr_metered_api_key', apiKey);
    this._config.meteredApiKey = apiKey;
    console.log('[WEBRTC] ✓ Metered API key kaydedildi. Sayfa yenilenince aktif olacak.');
    console.log('[WEBRTC] Hemen test etmek için: MR.webrtcTelefon.turnTesti()');
  },

  /* ═══ TURN TESTİ (KONSOL YARDIMCISI) ═══ */
  turnTesti: async function() {
    console.log('[WEBRTC] TURN TESTİ BAŞLATILIYOR...');

    /* Metered API credentials yenile */
    if (this._config.meteredApiKey) {
      try {
        var resp = await fetch('https://mrhasar.metered.live/api/v1/turn/credentials?apiKey=' + this._config.meteredApiKey);
        if (resp.ok) {
          var creds = await resp.json();
          if (Array.isArray(creds) && creds.length > 0) {
            this._meteredServers = creds;
            console.log('[WEBRTC] ✓ Metered API: ' + creds.length + ' sunucu alındı');
          }
        } else {
          console.error('[WEBRTC] ✗ Metered API hatası:', resp.status, '- API key geçersiz olabilir');
        }
      } catch(e) {
        console.error('[WEBRTC] ✗ Metered API erişilemedi:', e.message);
      }
    } else {
      console.warn('[WEBRTC] Metered API key ayarlanmamış. Ayarlamak için: MR.webrtcTelefon.setTurnApiKey("KEY")');
    }

    /* TURN testini çalıştır */
    await this._turnTestBaslat();
  }
};
