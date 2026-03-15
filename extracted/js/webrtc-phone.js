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
  _reconnectTimer: null,

  /* ═══ ARAMA LOG & KAYIT ═══ */
  _aktifLogId: null,
  _aramaBaslangic: null,
  _aramaCevaplanma: null,
  _aramaYon: null,
  _aramaNumara: null,
  _mediaRecorder: null,
  _recordedChunks: [],
  _kayitAktif: false,

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
    santralNo: ''
  },

  /* ═══ ICE SUNUCULARI (WSS BAĞLANTI - PBX MEDYA RELAY YAPAR) ═══ */
  _getIceServers: function() {
    return [];
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

    this._remoteAudioOlustur();
    this.cihazlariListele();

    var santralNo = (this._config.santralNo || '').replace(/^0+/, '');
    var authUser = santralNo ? this._config.dahili + '-' + santralNo : this._config.dahili;
    var sipUri = 'sip:' + authUser + '@' + this._config.domain;
    var self = this;

    console.log('[WEBRTC] BAŞLATILIYOR - DAHİLİ:', this._config.dahili, '| WSS:', this._config.wssUrl);

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

      /* ARAMA LOGU OLUŞTUR */
      var musteriAdi = (MR._sonAramaBilgi && (MR._sonAramaBilgi.ad || MR._sonAramaBilgi.ad_soyad)) || '';
      this._aramaLogOlustur('giden', cleanNum, musteriAdi);

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

    this._sessionOlaylariBagla(session);
    this._zilCaldir();

    this._durumBildir('gelen-cagri', { arayan: arayanNum, arayanAdi: arayanAdi });
    window.dispatchEvent(new CustomEvent('mr-webrtc-gelen-cagri', {
      detail: { arayan: arayanNum, arayanAdi: arayanAdi, timestamp: Date.now() }
    }));

    /* GELEN ARAMA LOGU OLUŞTUR */
    this._aramaLogOlustur('gelen', arayanNum, arayanAdi);

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
      /* ARAMA LOGU: CEVAPLANDI */
      self._aramaLogGuncelle('cevaplandi');
      /* GÖRÜŞME KAYDI BAŞLAT (1.5sn gecikmeyle - ses bağlantısının oturması için) */
      setTimeout(function() {
        if (self._session === session && self._aramaDurumu === 'gorusmede') {
          self._gorusmeKaydiBaslat(session);
        }
      }, 1500);
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
      /* GÖRÜŞME KAYDINI DURDUR */
      self._gorusmeKaydiDurdur();
      /* ARAMA LOGU: GÖRÜŞME BİTTİ */
      if (self._aramaCevaplanma) {
        self._aramaLogGuncelle('cevaplandi');
      } else {
        self._aramaLogGuncelle('cevapsiz');
      }
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
      /* GÖRÜŞME KAYDINI DURDUR */
      self._gorusmeKaydiDurdur();
      /* ARAMA LOGU: BAŞARISIZ */
      var logDurum = 'hata';
      if (cause === 'Rejected' || cause === 'Busy') logDurum = 'reddedildi';
      else if (cause === 'No Answer' || cause === 'Canceled') logDurum = 'cevapsiz';
      else if (statusCode === 486) logDurum = 'mesgul';
      self._aramaLogGuncelle(logDurum);
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

    session.on('peerconnection', function(data) {
      var pc = data.peerconnection;

      pc.ontrack = function(event) {
        if (event.track.kind === 'audio' && self._remoteAudio) {
          var stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
          self._remoteAudio.srcObject = stream;
          self._remoteAudio.volume = self._sesAyarlari.volume;

          if (self._sesAyarlari.hoparlörId && self._remoteAudio.setSinkId) {
            self._remoteAudio.setSinkId(self._sesAyarlari.hoparlörId).catch(function() {});
          }

          var playPromise = self._remoteAudio.play();
          if (playPromise !== undefined) {
            playPromise.then(function() {
              console.log('[WEBRTC] SES OYNATIYOR ✓');
            }).catch(function(err) {
              console.warn('[WEBRTC] AUTOPLAY ENGELLENDİ:', err);
              var resumePlay = function() {
                self._remoteAudio.play().then(function() {
                  console.log('[WEBRTC] SES BAŞLADI ✓');
                  document.removeEventListener('click', resumePlay);
                  document.removeEventListener('touchstart', resumePlay);
                }).catch(function() {});
              };
              document.addEventListener('click', resumePlay, { once: false });
              document.addEventListener('touchstart', resumePlay, { once: false });
            });
          }

          _sesAyarlandi = true;
          self._ringbackDurdur();
          console.log('[WEBRTC] UZAK SES BAĞLANDI');
        }
      };

      pc.oniceconnectionstatechange = function() {
        console.log('[WEBRTC] ICE DURUMU:', pc.iceConnectionState);

        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          self._ringbackDurdur();
          console.log('[WEBRTC] MEDYA BAĞLANTISI KURULDU ✓');
          if (self._remoteAudio && !self._remoteAudio.srcObject) {
            self._sesAyarla(session);
          }
        }

        if (pc.iceConnectionState === 'failed') {
          console.error('[WEBRTC] MEDYA BAĞLANTISI BAŞARISIZ');
          self._durumBildir('hata', 'MEDYA BAĞLANTISI KURULAMADI');
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
    this._aktifLogId = null;
    this._aramaBaslangic = null;
    this._aramaCevaplanma = null;
    this._aramaYon = null;
    this._aramaNumara = null;

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

  /* ═══ GÖRÜŞME KAYDI BAŞLAT (MediaRecorder) ═══ */
  _gorusmeKaydiBaslat: function(session) {
    if (this._mediaRecorder) return;
    var self = this;

    try {
      var pc = session.connection;
      if (!pc) { console.warn('[WEBRTC] KAYIT: PeerConnection YOK'); return; }

      /* Hem gelen hem giden sesi kaydetmek için AudioContext ile birleştir */
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var dest = ac.createMediaStreamDestination();

      /* UZAK SES (karşı taraf) */
      var receivers = pc.getReceivers();
      for (var i = 0; i < receivers.length; i++) {
        if (receivers[i].track && receivers[i].track.kind === 'audio') {
          var remoteStream = new MediaStream([receivers[i].track]);
          var remoteSource = ac.createMediaStreamSource(remoteStream);
          remoteSource.connect(dest);
        }
      }

      /* YEREL SES (mikrofon) */
      var senders = pc.getSenders();
      for (var j = 0; j < senders.length; j++) {
        if (senders[j].track && senders[j].track.kind === 'audio') {
          var localStream = new MediaStream([senders[j].track]);
          var localSource = ac.createMediaStreamSource(localStream);
          /* Mikrofon seviyesini biraz düşür kayıtta */
          var localGain = ac.createGain();
          localGain.gain.value = 0.7;
          localSource.connect(localGain);
          localGain.connect(dest);
        }
      }

      /* MediaRecorder başlat */
      var mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg;codecs=opus';
        }
      }

      self._recordedChunks = [];
      var recorder = new MediaRecorder(dest.stream, { mimeType: mimeType, audioBitsPerSecond: 64000 });

      recorder.ondataavailable = function(e) {
        if (e.data && e.data.size > 0) {
          self._recordedChunks.push(e.data);
          console.log('[WEBRTC] KAYIT CHUNK:', e.data.size, 'byte - TOPLAM:', self._recordedChunks.length);
        }
      };

      recorder.onstop = function() {
        console.log('[WEBRTC] KAYIT DURDURULDU - PARÇA SAYISI:', self._recordedChunks.length, 'LOG_ID:', self._kayitIcinLogId);
        /* AudioContext'i kapat (sadece onstop'ta, erken kapatma data kaybına neden olur) */
        if (ac && ac.state !== 'closed') {
          try { ac.close(); } catch(e2) {}
        }
        /* Kayıt dosyasını yükle */
        self._gorusmeKaydiYukle();
      };

      recorder.start(1000); /* Her 1 saniyede bir chunk */
      self._mediaRecorder = recorder;
      self._kayitAktif = true;
      self._kayitAudioContext = ac;
      /* LogId'yi kayıt başladığında kaydet - en güvenilir zaman */
      self._kayitIcinLogId = self._aktifLogId;
      console.log('[WEBRTC] GÖRÜŞME KAYDI BAŞLADI ✓ FORMAT:', mimeType, 'LOG_ID:', self._aktifLogId);

    } catch(e) {
      console.error('[WEBRTC] KAYIT BAŞLATMA HATASI:', e);
    }
  },

  /* ═══ GÖRÜŞME KAYDINI DURDUR ═══ */
  _gorusmeKaydiDurdur: function() {
    /* _aktifLogId'yi yedekle - _temizle() null yapacak ama onstop async gelecek */
    if (this._aktifLogId) {
      this._kayitIcinLogId = this._aktifLogId;
    }
    console.log('[WEBRTC] KAYIT DURDURULUYOR - LOG_ID:', this._kayitIcinLogId, 'RECORDER_STATE:', this._mediaRecorder ? this._mediaRecorder.state : 'YOK');

    if (this._mediaRecorder) {
      if (this._mediaRecorder.state === 'recording' || this._mediaRecorder.state === 'paused') {
        try { this._mediaRecorder.stop(); } catch(e) { console.warn('[WEBRTC] RECORDER STOP HATASI:', e); }
      } else if (this._mediaRecorder.state === 'inactive') {
        /* Recorder zaten durmuş (PeerConnection kapandığında otomatik durabilir).
           onstop zaten çalışmış veya sırada olabilir.
           Eğer chunks varsa ve onstop henüz yüklemediyse, manuel yükle. */
        console.log('[WEBRTC] RECORDER ZATEN INACTIVE - CHUNKS:', this._recordedChunks.length);
        if (this._recordedChunks.length > 0) {
          var self = this;
          setTimeout(function() {
            /* onstop zaten çalıştıysa chunks boş olur, tekrar yükleme olmaz */
            if (self._recordedChunks.length > 0) {
              console.log('[WEBRTC] ONSTOP ÇALIŞMADI - MANUEL YÜKLEME');
              self._gorusmeKaydiYukle();
            }
          }, 500);
        }
      }
    }
    this._mediaRecorder = null;
    this._kayitAktif = false;
    /* AudioContext'i KAPATMA - onstop handler kapatacak.
       Erken kapatmak MediaRecorder'ın son veriyi flush etmesini engelleyebilir. */
    /* this._kayitAudioContext burada null yapılmaz, onstop temizler */
  },

  /* ═══ GÖRÜŞME KAYDINI SUNUCUYA YÜKLE ═══ */
  _gorusmeKaydiYukle: function() {
    /* _aktifLogId temizlenmiş olabilir, _kayitIcinLogId'yi kullan */
    var logId = this._kayitIcinLogId || this._aktifLogId;
    console.log('[WEBRTC] KAYIT YÜKLEME BAŞLIYOR - chunks:', this._recordedChunks.length, 'logId:', logId, '_kayitIcinLogId:', this._kayitIcinLogId, '_aktifLogId:', this._aktifLogId);

    if (!this._recordedChunks.length || !logId) {
      console.warn('[WEBRTC] KAYIT YÜKLEME ATLANDI - chunks:', this._recordedChunks.length, 'logId:', logId);
      this._recordedChunks = [];
      /* AudioContext temizle */
      if (this._kayitAudioContext && this._kayitAudioContext.state !== 'closed') {
        try { this._kayitAudioContext.close(); } catch(e) {}
      }
      this._kayitAudioContext = null;
      return;
    }

    var blob = new Blob(this._recordedChunks, { type: 'audio/webm' });
    this._recordedChunks = [];
    console.log('[WEBRTC] KAYIT BLOB BOYUTU:', blob.size, 'byte');

    if (blob.size < 1000) {
      console.log('[WEBRTC] KAYIT ÇOK KISA (' + blob.size + ' byte) - YÜKLEME ATLANDI');
      if (this._kayitAudioContext && this._kayitAudioContext.state !== 'closed') {
        try { this._kayitAudioContext.close(); } catch(e) {}
      }
      this._kayitAudioContext = null;
      return;
    }

    var fd = new FormData();
    fd.append('arama_log_id', logId);
    fd.append('file', blob, 'gorusme_' + logId + '.webm');

    var headers = {};
    if (MR.api && MR.api.token) headers['Authorization'] = 'Bearer ' + MR.api.token;

    var self = this;
    fetch('/api/v1/arama-log/kayit-yukle.php', {
      method: 'POST',
      headers: headers,
      body: fd
    }).then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        console.log('[WEBRTC] GÖRÜŞME KAYDI YÜKLENDİ ✓ ID:', res.data.id, 'DOSYA:', res.data.kayit_dosya, 'BOYUT:', res.data.kayit_boyut);
      } else {
        console.error('[WEBRTC] KAYIT YÜKLEME HATASI:', JSON.stringify(res));
      }
      self._kayitIcinLogId = null;
      /* AudioContext temizle */
      if (self._kayitAudioContext && self._kayitAudioContext.state !== 'closed') {
        try { self._kayitAudioContext.close(); } catch(e) {}
      }
      self._kayitAudioContext = null;
    }).catch(function(e) {
      console.error('[WEBRTC] KAYIT YÜKLEME BAĞLANTI HATASI:', e);
      self._kayitIcinLogId = null;
      if (self._kayitAudioContext && self._kayitAudioContext.state !== 'closed') {
        try { self._kayitAudioContext.close(); } catch(e2) {}
      }
      self._kayitAudioContext = null;
    });
  },

  /* ═══ ARAMA LOGU OLUŞTUR ═══ */
  _aramaLogOlustur: function(yon, numara, musteriAdi) {
    var self = this;
    self._aramaBaslangic = new Date();
    self._aramaCevaplanma = null;
    self._aramaYon = yon;
    self._aramaNumara = numara;
    self._aktifLogId = null;

    if (!MR.api || !MR.api.token) return;

    var body = {
      yon: yon,
      numara: numara,
      musteri_adi: musteriAdi || '',
      durum: 'cevapsiz',
      baslangic_zamani: self._aramaBaslangic.toISOString().replace('T', ' ').substring(0, 19)
    };

    /* Müşteri eşleştirme bilgisi */
    if (MR._sonAramaBilgi) {
      body.musteri_adi = MR._sonAramaBilgi.ad || MR._sonAramaBilgi.ad_soyad || musteriAdi || '';
      body.musteri_kaynak = MR._sonAramaBilgi.kaynak || '';
      body.musteri_kaynak_id = MR._sonAramaBilgi.id || null;
    }

    console.log('[WEBRTC] ARAMA LOG CREATE GÖNDERİLİYOR:', JSON.stringify(body));
    MR.api.req('/arama-log/create.php', {
      method: 'POST',
      body: JSON.stringify(body)
    }).then(function(res) {
      if (res && res.success && res.data) {
        self._aktifLogId = res.data.id;
        console.log('[WEBRTC] ARAMA LOGU OLUŞTURULDU ID:', res.data.id);
      } else {
        console.error('[WEBRTC] ARAMA LOG CREATE HATA YANITI:', JSON.stringify(res));
      }
    }).catch(function(e) {
      console.error('[WEBRTC] ARAMA LOG OLUŞTURMA HATASI:', e);
    });
  },

  /* ═══ ARAMA LOGUNU GÜNCELLE ═══ */
  _aramaLogGuncelle: function(durum) {
    var self = this;
    if (!self._aktifLogId || !MR.api) return;

    var now = new Date();
    var body = { id: self._aktifLogId, durum: durum };

    if (durum === 'cevaplandi' && !self._aramaCevaplanma) {
      self._aramaCevaplanma = now;
      body.cevaplanma_zamani = now.toISOString().replace('T', ' ').substring(0, 19);
    }

    if (durum === 'cevaplandi' || durum === 'cevapsiz' || durum === 'reddedildi') {
      body.bitis_zamani = now.toISOString().replace('T', ' ').substring(0, 19);
      if (self._aramaCevaplanma) {
        body.sure_saniye = Math.round((now - self._aramaCevaplanma) / 1000);
      }
    }

    MR.api.req('/arama-log/update.php', {
      method: 'PUT',
      body: JSON.stringify(body)
    }).then(function(res) {
      if (res && res.success) {
        console.log('[WEBRTC] ARAMA LOGU GÜNCELLENDİ:', durum, 'ID:', self._aktifLogId);
      }
    }).catch(function(e) {
      console.error('[WEBRTC] ARAMA LOG GÜNCELLEME HATASI:', e);
    });

    /* Cevapsız gelen arama bildirimi */
    if (durum === 'cevapsiz' && self._aramaYon === 'gelen') {
      self._cevapsizBildirimGonder(self._aramaNumara);
    }
  },

  /* ═══ CEVAPSIZ ÇAĞRI BİLDİRİMİ ═══ */
  _cevapsizBildirimGonder: function(numara) {
    /* Tarayıcı bildirimi */
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('CEVAPSIZ ÇAĞRI', {
          body: 'Cevapsız çağrı: ' + (numara || 'BİLİNMEYEN'),
          icon: 'favicon.svg',
          tag: 'cevapsiz-' + Date.now(),
          requireInteraction: true
        });
      } catch(e) {}
    }

    /* Sistem bildirimi (veritabanına) */
    if (MR.api && MR.api.token) {
      /* Kendi kullanıcısına bildirim gönder */
      try {
        MR.api.me().then(function(res) {
          if (res && res.success && res.data) {
            MR.api.bildirimCreate({
              hedef_id: res.data.id,
              baslik: 'CEVAPSIZ ÇAĞRI: ' + (numara || 'BİLİNMEYEN'),
              mesaj: new Date().toLocaleString('tr-TR') + ' tarihinde ' + (numara || 'bilinmeyen numara') + ' numarasından cevapsız çağrı',
              tur: 'uyari'
            });
          }
        });
      } catch(e) {}
    }

    /* Dispatch event - widget gösterebilsin */
    window.dispatchEvent(new CustomEvent('mr-cevapsiz-cagri', {
      detail: { numara: numara, zaman: Date.now() }
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
