/* ============================================================
   MR HASAR DANIŞMANLIK – WEBRTC TELEFON MODÜLÜ v3.0
   GELİŞMİŞ SES / MİKROFON / HOPARLÖR YÖNETİMİ
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
  _ringbackCtx: null,
  _ringbackTimer: null,

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
    wssUrl: 'wss://sip6.netsantral.com:8089/ws',
    domain: 'sip6.netsantral.com',
    dahili: '',
    sipSifre: '',
    kullanici: '',
    apiSifre: '',
    santralNo: ''
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
    this.cihazlariListele();

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

  /* ═══ GİDEN ARAMA ═══ */
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
    this._durumBildir('araniyor', cleanNum);

    /* MİKROFON AKIŞINI HAZIRLA */
    var localStream = await this._mikrofonAkisiOlustur();

    try {
      var callOptions = {
        pcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false }
      };

      /* ÖZEL MİKROFON AKIŞI VARSA KULLAN, YOKSA JsSIP KENDİ getUserMedia'SINI KULLANSIN */
      if (localStream) {
        callOptions.mediaStream = localStream;
        callOptions.mediaConstraints = { audio: false, video: false };
      } else {
        callOptions.mediaConstraints = { audio: true, video: false };
      }

      var session = this._ua.call(targetUri, callOptions);

      this._session = session;
      this._sessionOlaylariBagla(session);

      /* GİDEN ARAMA İÇİN ÇALMA SESİ BAŞLAT */
      this._ringbackBaslat();

      console.log('[WEBRTC] ÇAĞRI GÖNDERİLDİ:', cleanNum);
      return true;

    } catch(e) {
      console.error('[WEBRTC] ARAMA HATASI:', e);
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
    this._sessionOlaylariBagla(session);
    this._zilCaldir();

    this._durumBildir('gelen-cagri', { arayan: arayanNum, arayanAdi: arayanAdi });
    window.dispatchEvent(new CustomEvent('mr-webrtc-gelen-cagri', {
      detail: { arayan: arayanNum, arayanAdi: arayanAdi, timestamp: Date.now() }
    }));
  },

  /* ═══ CEVAPLA ═══ */
  cevapla: async function() {
    if (!this._session || this._aramaDurumu !== 'gelen') return false;
    this._zilDurdur();

    /* MİKROFON AKIŞINI HAZIRLA */
    var localStream = await this._mikrofonAkisiOlustur();

    try {
      var answerOptions = {
        pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      };

      /* ÖZEL MİKROFON AKIŞI VARSA KULLAN, YOKSA JsSIP KENDİ getUserMedia'SINI KULLANSIN */
      if (localStream) {
        answerOptions.mediaStream = localStream;
        answerOptions.mediaConstraints = { audio: false, video: false };
      } else {
        answerOptions.mediaConstraints = { audio: true, video: false };
      }

      this._session.answer(answerOptions);
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
    this._ringbackDurdur();
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
      console.log('[WEBRTC] ÇALIYOR...');
      self._aramaDurumu = 'caliyor';
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
    });

    session.on('failed', function(e) {
      console.error('[WEBRTC] ÇAĞRI BAŞARISIZ:', e && e.cause ? e.cause : '');
      self._zilDurdur();
      self._ringbackDurdur();
      self._temizle();
      self._durumBildir('hata', 'ÇAĞRI BAŞARISIZ: ' + (e && e.cause ? e.cause : ''));
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

    session.on('peerconnection', function(data) {
      var pc = data.peerconnection;

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

      /* ICE BAĞLANTI DURUMUNU İZLE */
      pc.oniceconnectionstatechange = function() {
        console.log('[WEBRTC] ICE DURUMU:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          self._ringbackDurdur();
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

    /* YEREL AKIŞI DURDUR */
    if (this._localStream) {
      this._localStream.getTracks().forEach(function(t) { t.stop(); });
      this._localStream = null;
    }
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
  }
};
