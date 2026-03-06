/* ============================================================
   MR HASAR DANIŞMANLIK – WEBRTC TELEFON MODÜLÜ
   SIP.js İLE TARAYICI İÇİ SOFTPHONE
   wss://sip6.netsantral.com:8089/ws ÜZERİNDEN NETGSM PBX'E BAĞLANIR
   ============================================================ */

const MR = window.MR || (window.MR = {});

/* ═══════════════════════════════════════════════════
   SIP.JS WEBRTC TELEFON YÖNETİCİSİ
   - PBX'e WebSocket üzerinden SIP kaydı yapar
   - Giden arama başlatır (CRM'den tıkla → karşı çalar)
   - Gelen arama alır (tarayıcıda çaldırır)
   - Ses tarayıcı mikrofon/hoparlöründen akar
   ═══════════════════════════════════════════════════ */

MR.webrtcTelefon = {
  /* DURUM */
  _ua: null,               /* SIP.js UserAgent */
  _registerer: null,        /* SIP.js Registerer */
  _session: null,           /* Aktif çağrı session */
  _kayitli: false,          /* PBX'e kayıtlı mı */
  _aramaDurumu: 'bos',      /* bos | araniyor | gorusmede | gelen */
  _remoteAudio: null,       /* Ses çalma elementi */
  _ringtoneAudio: null,     /* Zil sesi elementi */
  _localStream: null,       /* Yerel mikrofon stream */
  _muteState: false,        /* Sessiz mi */

  /* YAPILANDIRMA */
  _config: {
    wssUrl: 'wss://sip6.netsantral.com:8089/ws',
    domain: 'sip6.netsantral.com',
    dahili: '',
    sipSifre: '',
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  },

  /* ═══ BAŞLAT ═══ */
  async baslat(config) {
    if (this._ua) {
      console.log('[WEBRTC] ZATEN BAŞLATILMIŞ');
      return;
    }

    /* SIP.js YÜKLÜ MÜ KONTROL ET */
    if (typeof SIP === 'undefined') {
      console.error('[WEBRTC] SIP.js KÜTÜPHANESİ YÜKLENMEMİŞ!');
      this._durumBildir('hata', 'SIP.js KÜTÜPHANESİ BULUNAMADI');
      return;
    }

    /* YAPILANDIRMA BİRLEŞTİR */
    if (config) {
      Object.assign(this._config, config);
    }

    if (!this._config.dahili || !this._config.sipSifre) {
      console.warn('[WEBRTC] DAHİLİ VEYA SIP ŞİFRESİ EKSİK');
      this._durumBildir('hata', 'DAHİLİ NUMARASI VEYA SIP ŞİFRESİ GİRİLMEMİŞ');
      return;
    }

    /* SES ELEMENTLERİ OLUŞTUR */
    this._remoteAudioOlustur();

    const sipUri = `sip:${this._config.dahili}@${this._config.domain}`;
    console.log('[WEBRTC] BAŞLATILIYOR:', sipUri, '| WSS:', this._config.wssUrl);

    try {
      /* SIP.js USER AGENT OLUŞTUR */
      this._ua = new SIP.UserAgent({
        uri: SIP.UserAgent.makeURI(sipUri),
        transportOptions: {
          server: this._config.wssUrl,
          traceSip: false
        },
        authorizationUsername: this._config.dahili,
        authorizationPassword: this._config.sipSifre,
        displayName: 'MR HASAR CRM',
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: this._config.iceServers
          }
        },
        logLevel: 'warn',
        /* GELEN ÇAĞRI İŞLEYİCİ */
        delegate: {
          onInvite: (invitation) => this._gelenCagri(invitation)
        }
      });

      /* TRANSPORT OLAYLARI */
      this._ua.transport.onConnect = () => {
        console.log('[WEBRTC] WEBSOCKET BAĞLANDI');
        this._kayitOl();
      };

      this._ua.transport.onDisconnect = (error) => {
        console.warn('[WEBRTC] WEBSOCKET KOPTU:', error?.message || '');
        this._kayitli = false;
        this._durumBildir('baglanti-koptu');
        /* OTOMATİK YENİDEN BAĞLAN (5 SN SONRA) */
        setTimeout(() => {
          if (this._ua && !this._ua.transport.isConnected()) {
            console.log('[WEBRTC] YENİDEN BAĞLANILIYOR...');
            this._ua.start().catch(() => {});
          }
        }, 5000);
      };

      /* BAŞLAT */
      await this._ua.start();
      console.log('[WEBRTC] USER AGENT BAŞLATILDI');

    } catch(e) {
      console.error('[WEBRTC] BAŞLATMA HATASI:', e);
      this._durumBildir('hata', 'WebRTC BAŞLATILAMADI: ' + (e?.message || ''));
    }
  },

  /* ═══ PBX'E KAYIT OL (REGISTER) ═══ */
  async _kayitOl() {
    if (!this._ua) return;
    try {
      this._registerer = new SIP.Registerer(this._ua, {
        expires: 300,
        extraHeaders: []
      });

      this._registerer.stateChange.addListener((state) => {
        switch(state) {
          case SIP.RegistererState.Registered:
            console.log('[WEBRTC] PBX KAYIT BAŞARILI ✓');
            this._kayitli = true;
            this._durumBildir('kayitli');
            break;
          case SIP.RegistererState.Unregistered:
            console.log('[WEBRTC] PBX KAYIT KALDIRILDI');
            this._kayitli = false;
            this._durumBildir('kayit-kaldirildi');
            break;
          case SIP.RegistererState.Terminated:
            console.log('[WEBRTC] KAYIT SONLANDIRILDI');
            this._kayitli = false;
            this._durumBildir('sonlandirildi');
            break;
        }
      });

      await this._registerer.register();

    } catch(e) {
      console.error('[WEBRTC] KAYIT HATASI:', e);
      this._durumBildir('hata', 'PBX KAYIT HATASI: ' + (e?.message || ''));
    }
  },

  /* ═══ GİDEN ARAMA BAŞLAT ═══ */
  async ara(numara) {
    if (!this._ua || !this._kayitli) {
      const hata = 'WEBRTC TELEFON KAYITLI DEĞİL! SİSTEM AYARLARINDAN SIP BİLGİLERİNİ KONTROL EDİN.';
      console.error('[WEBRTC]', hata);
      this._durumBildir('hata', hata);
      return false;
    }

    if (this._session) {
      console.warn('[WEBRTC] ZATEN AKTİF BİR GÖRÜŞME VAR');
      return false;
    }

    /* NUMARA TEMİZLE */
    let cleanNum = numara.replace(/[\s\-\(\)\+]/g, '');
    /* 0 ile başlamalı - SIP URI için */
    if (cleanNum.startsWith('90') && cleanNum.length >= 12) {
      cleanNum = '0' + cleanNum.substring(2);
    } else if (!cleanNum.startsWith('0') && cleanNum.length === 10) {
      cleanNum = '0' + cleanNum;
    }

    const targetUri = SIP.UserAgent.makeURI(`sip:${cleanNum}@${this._config.domain}`);
    if (!targetUri) {
      this._durumBildir('hata', 'GEÇERSİZ NUMARA: ' + numara);
      return false;
    }

    console.log('[WEBRTC] ARAMA BAŞLATILIYOR:', cleanNum);
    this._aramaDurumu = 'araniyor';
    this._durumBildir('araniyor', cleanNum);

    try {
      const inviter = new SIP.Inviter(this._ua, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });

      this._session = inviter;
      this._sessionOlaylari(inviter);

      await inviter.invite();
      console.log('[WEBRTC] DAVET GÖNDERİLDİ:', cleanNum);
      return true;

    } catch(e) {
      console.error('[WEBRTC] ARAMA HATASI:', e);
      this._session = null;
      this._aramaDurumu = 'bos';
      this._durumBildir('hata', 'ARAMA BAŞLATILAMADI: ' + (e?.message || ''));
      return false;
    }
  },

  /* ═══ GELEN ÇAĞRI İŞLE ═══ */
  _gelenCagri(invitation) {
    const arayanUri = invitation.remoteIdentity?.uri?.toString() || '';
    const arayanNum = invitation.remoteIdentity?.uri?.user || 'BİLİNMEYEN';
    const arayanAdi = invitation.remoteIdentity?.displayName || '';
    console.log('[WEBRTC] GELEN ÇAĞRI:', arayanNum, '|', arayanAdi, '| URI:', arayanUri);

    /* ZATEN AKTİF GÖRÜŞME VARSA REDDET */
    if (this._session) {
      console.warn('[WEBRTC] AKTİF GÖRÜŞME VAR, GELEN ÇAĞRI REDDEDİLDİ');
      invitation.reject();
      return;
    }

    this._session = invitation;
    this._aramaDurumu = 'gelen';
    this._sessionOlaylari(invitation);

    /* ZİL ÇALDIR */
    this._zilCaldir();

    /* CRM'E BİLDİR */
    this._durumBildir('gelen-cagri', {
      arayan: arayanNum,
      arayanAdi: arayanAdi,
      invitation: invitation
    });

    /* CUSTOM EVENT - APP.JS YAKALAR */
    window.dispatchEvent(new CustomEvent('mr-webrtc-gelen-cagri', {
      detail: {
        arayan: arayanNum,
        arayanAdi: arayanAdi,
        timestamp: Date.now()
      }
    }));
  },

  /* ═══ GELEN ÇAĞRIYI CEVAPLA ═══ */
  async cevapla() {
    if (!this._session || this._aramaDurumu !== 'gelen') {
      console.warn('[WEBRTC] CEVAPLANACAK ÇAĞRI YOK');
      return false;
    }

    this._zilDurdur();

    try {
      await this._session.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });
      console.log('[WEBRTC] ÇAĞRI CEVAPLANDI');
      this._aramaDurumu = 'gorusmede';
      this._durumBildir('gorusmede');
      return true;

    } catch(e) {
      console.error('[WEBRTC] CEVAPLAMA HATASI:', e);
      this._durumBildir('hata', 'ÇAĞRI CEVAPLANAMADI');
      return false;
    }
  },

  /* ═══ ÇAĞRI REDDET ═══ */
  reddet() {
    if (!this._session || this._aramaDurumu !== 'gelen') return;
    this._zilDurdur();
    try {
      this._session.reject();
    } catch(e) {}
    this._session = null;
    this._aramaDurumu = 'bos';
    this._durumBildir('reddedildi');
  },

  /* ═══ ÇAĞRIYI KAPAT ═══ */
  kapat() {
    this._zilDurdur();
    if (!this._session) {
      console.warn('[WEBRTC] KAPATILACAK ÇAĞRI YOK');
      return;
    }

    try {
      switch(this._session.state) {
        case SIP.SessionState.Initial:
        case SIP.SessionState.Establishing:
          /* HENÜZ BAĞLANMAMIŞ - İPTAL ET */
          if (this._session instanceof SIP.Inviter) {
            this._session.cancel();
          } else {
            this._session.reject();
          }
          break;
        case SIP.SessionState.Established:
          /* AKTİF GÖRÜŞME - KAPAT */
          this._session.bye();
          break;
        default:
          break;
      }
    } catch(e) {
      console.error('[WEBRTC] KAPATMA HATASI:', e);
    }

    this._session = null;
    this._aramaDurumu = 'bos';
    this._muteState = false;
    this._durumBildir('kapandi');
  },

  /* ═══ SESSİZE AL / AÇ (MUTE/UNMUTE) ═══ */
  sesizToggle() {
    if (!this._session || this._aramaDurumu !== 'gorusmede') return false;

    try {
      const pc = this._session.sessionDescriptionHandler?.peerConnection;
      if (pc) {
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = this._muteState; /* Toggle: mute ise aç, açıksa kapat */
          }
        });
        this._muteState = !this._muteState;
        this._durumBildir(this._muteState ? 'sessize-alindi' : 'ses-acildi');
        console.log('[WEBRTC] MİKROFON:', this._muteState ? 'KAPALI' : 'AÇIK');
        return this._muteState;
      }
    } catch(e) {
      console.error('[WEBRTC] MUTE HATASI:', e);
    }
    return false;
  },

  /* ═══ TRANSFER ═══ */
  async transfer(hedefDahili) {
    if (!this._session || this._aramaDurumu !== 'gorusmede') return false;
    try {
      const targetUri = SIP.UserAgent.makeURI(`sip:${hedefDahili}@${this._config.domain}`);
      if (!targetUri) return false;
      /* BLIND TRANSFER */
      this._session.refer(targetUri);
      console.log('[WEBRTC] TRANSFER:', hedefDahili);
      this._durumBildir('transfer', hedefDahili);
      return true;
    } catch(e) {
      console.error('[WEBRTC] TRANSFER HATASI:', e);
      return false;
    }
  },

  /* ═══ DURDUR / KAPAT ═══ */
  async durdur() {
    this.kapat();
    if (this._registerer) {
      try { await this._registerer.unregister(); } catch(e) {}
    }
    if (this._ua) {
      try { await this._ua.stop(); } catch(e) {}
    }
    this._ua = null;
    this._registerer = null;
    this._kayitli = false;
    this._aramaDurumu = 'bos';
    this._durumBildir('durduruldu');
    console.log('[WEBRTC] TELEFON DURDURULDU');
  },

  /* ═══ SESSION OLAYLARI ═══ */
  _sessionOlaylari(session) {
    session.stateChange.addListener((state) => {
      console.log('[WEBRTC] SESSION DURUM:', state);
      switch(state) {
        case SIP.SessionState.Establishing:
          /* Bağlantı kuruluyor */
          break;
        case SIP.SessionState.Established:
          /* GÖRÜŞME BAŞLADI */
          this._zilDurdur();
          this._aramaDurumu = 'gorusmede';
          this._sesAyarla(session);
          this._durumBildir('gorusmede');
          break;
        case SIP.SessionState.Terminated:
          /* GÖRÜŞME BİTTİ */
          this._zilDurdur();
          this._session = null;
          this._aramaDurumu = 'bos';
          this._muteState = false;
          this._durumBildir('kapandi');
          break;
      }
    });
  },

  /* ═══ UZAK SES AYARLA (KARŞI TARAFIN SESİ) ═══ */
  _sesAyarla(session) {
    try {
      const pc = session.sessionDescriptionHandler?.peerConnection;
      if (!pc) {
        console.warn('[WEBRTC] PeerConnection BULUNAMADI');
        return;
      }

      /* UZAK SES STREAM'İ AL */
      pc.ontrack = (event) => {
        if (event.track.kind === 'audio' && this._remoteAudio) {
          const stream = new MediaStream([event.track]);
          this._remoteAudio.srcObject = stream;
          this._remoteAudio.play().catch(e => console.warn('[WEBRTC] SES ÇALMA HATASI:', e));
          console.log('[WEBRTC] UZAK SES BAĞLANDI');
        }
      };

      /* ZATEN TRACK VARSA */
      const receivers = pc.getReceivers();
      receivers.forEach(receiver => {
        if (receiver.track && receiver.track.kind === 'audio' && this._remoteAudio) {
          const stream = new MediaStream([receiver.track]);
          this._remoteAudio.srcObject = stream;
          this._remoteAudio.play().catch(e => console.warn('[WEBRTC] SES ÇALMA HATASI:', e));
        }
      });

    } catch(e) {
      console.error('[WEBRTC] SES AYARLAMA HATASI:', e);
    }
  },

  /* ═══ SES ELEMENTLERI ═══ */
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
    try {
      /* BASİT ZİL SESİ - AudioContext İLE */
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const zilCaldir = () => {
        if (this._aramaDurumu !== 'gelen') { ac.close(); return; }
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.2;
        osc.start();
        setTimeout(() => { osc.frequency.value = 480; }, 200);
        setTimeout(() => { osc.stop(); }, 400);
        setTimeout(() => {
          if (this._aramaDurumu === 'gelen') zilCaldir();
        }, 2000);
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

  /* ═══ DURUM BİLDİR (EVENT DISPATCH) ═══ */
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

  /* ═══ DURUMU AL ═══ */
  durum() {
    return {
      kayitli: this._kayitli,
      aramaDurumu: this._aramaDurumu,
      mute: this._muteState,
      session: !!this._session
    };
  }
};
