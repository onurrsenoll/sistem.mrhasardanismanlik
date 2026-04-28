/* ============================================================
   MR HASAR DANIŞMANLIK – VERİ DOSYASI (data.js)
   SABİT VERİ TABLOLARI VE REFERANS LİSTELERİ
   ============================================================ */

const MR = window.MR || (window.MR = {});

/* ---------- ASGARİ ÜCRET TABLOSU ---------- */
MR.ASGARI_UCRET = [{
  bas: '2025-01-01',
  bit: '2025-06-30',
  ucret: 22104.67,
  donem: '2025/1'
}, {
  bas: '2024-07-01',
  bit: '2024-12-31',
  ucret: 17002.12,
  donem: '2024/2'
}, {
  bas: '2024-01-01',
  bit: '2024-06-30',
  ucret: 17002.12,
  donem: '2024/1'
}, {
  bas: '2023-07-01',
  bit: '2023-12-31',
  ucret: 13414.50,
  donem: '2023/2'
}, {
  bas: '2023-01-01',
  bit: '2023-06-30',
  ucret: 10008.00,
  donem: '2023/1'
}, {
  bas: '2022-07-01',
  bit: '2022-12-31',
  ucret: 6471.00,
  donem: '2022/2'
}, {
  bas: '2022-01-01',
  bit: '2022-06-30',
  ucret: 5004.00,
  donem: '2022/1'
}, {
  bas: '2021-01-01',
  bit: '2021-12-31',
  ucret: 3577.50,
  donem: '2021'
}, {
  bas: '2020-01-01',
  bit: '2020-12-31',
  ucret: 2943.00,
  donem: '2020'
}, {
  bas: '2019-01-01',
  bit: '2019-12-31',
  ucret: 2558.40,
  donem: '2019'
}];

/* ---------- PMF YAŞAM TABLOLARI ---------- */
MR.PMF = {
  TRH2010: {
    E: {
      0: 73.9,
      5: 69.33,
      10: 64.43,
      15: 59.51,
      20: 54.65,
      25: 49.82,
      30: 45,
      35: 40.2,
      40: 35.45,
      45: 30.79,
      50: 26.26,
      55: 21.94,
      60: 17.89,
      65: 14.19,
      70: 10.92,
      75: 8.15,
      80: 5.93,
      85: 4.26,
      90: 3.06,
      95: 2.2,
      100: 1.5
    },
    K: {
      0: 78.9,
      5: 74.25,
      10: 69.32,
      15: 64.38,
      20: 59.46,
      25: 54.55,
      30: 49.65,
      35: 44.77,
      40: 39.92,
      45: 35.12,
      50: 30.4,
      55: 25.8,
      60: 21.37,
      65: 17.18,
      70: 13.32,
      75: 9.89,
      80: 7,
      85: 4.78,
      90: 3.24,
      95: 2.18,
      100: 1.5
    }
  },
  CSO1980: {
    E: {
      0: 70.83,
      5: 66.4,
      10: 61.66,
      15: 56.93,
      20: 52.37,
      25: 47.84,
      30: 43.24,
      35: 38.61,
      40: 33.97,
      45: 29.46,
      50: 25.14,
      55: 21.07,
      60: 17.27,
      65: 13.81,
      70: 10.75,
      75: 8.12,
      80: 5.92,
      85: 4.22,
      90: 2.99,
      95: 2.1,
      100: 1.45
    },
    K: {
      0: 75.83,
      5: 71.28,
      10: 66.4,
      15: 61.51,
      20: 56.64,
      25: 51.8,
      30: 46.98,
      35: 42.19,
      40: 37.46,
      45: 32.79,
      50: 28.23,
      55: 23.84,
      60: 19.68,
      65: 15.8,
      70: 12.27,
      75: 9.18,
      80: 6.59,
      85: 4.59,
      90: 3.14,
      95: 2.12,
      100: 1.45
    }
  },
  PMF1931: {
    E: {
      0: 59,
      5: 55.94,
      10: 52.19,
      15: 48.3,
      20: 44.42,
      25: 40.55,
      30: 36.71,
      35: 32.94,
      40: 29.22,
      45: 25.58,
      50: 22.03,
      55: 18.61,
      60: 15.35,
      65: 12.3,
      70: 9.49,
      75: 7,
      80: 4.95,
      85: 3.41,
      90: 2.3,
      95: 1.5,
      100: 1
    },
    K: {
      0: 62,
      5: 58.52,
      10: 54.61,
      15: 50.58,
      20: 46.57,
      25: 42.58,
      30: 38.63,
      35: 34.73,
      40: 30.88,
      45: 27.11,
      50: 23.44,
      55: 19.91,
      60: 16.53,
      65: 13.37,
      70: 10.45,
      75: 7.83,
      80: 5.62,
      85: 3.91,
      90: 2.66,
      95: 1.76,
      100: 1.15
    }
  }
};

/* ---------- TAHKİM EMSAL KARARLARI ---------- */
MR.TAHKIM_EMSALLERI = [{
  dosyaNo: "K-2022/64863",
  aracTipi: "ORTA",
  aracYasi: 2,
  kmOrtalama: 45000,
  onarimBedeli: 35432,
  rayicDeger: 450000,
  degerKaybi: 20000,
  kusurOrani: 100,
  oncekiHasar: 0,
  hasarBolgesi: "ÖN",
  yontem: "PİYASA RAYİÇ ARAŞTIRMASI"
}, {
  dosyaNo: "K-2019/79355",
  aracTipi: "EKONOMİK",
  aracYasi: 5,
  kmOrtalama: 80000,
  onarimBedeli: 45000,
  rayicDeger: 98000,
  degerKaybi: 18000,
  kusurOrani: 100,
  oncekiHasar: 0,
  hasarBolgesi: "ARKA",
  yontem: "PERT FARKI"
}, {
  dosyaNo: "K-2024/317761",
  aracTipi: "ORTA",
  aracYasi: 4,
  kmOrtalama: 75000,
  onarimBedeli: 120000,
  rayicDeger: 1050000,
  degerKaybi: 50000,
  kusurOrani: 100,
  oncekiHasar: 0,
  hasarBolgesi: "YAN",
  yontem: "PERT TOTAL"
}, {
  dosyaNo: "K-2024/333216",
  aracTipi: "ORTA",
  aracYasi: 5,
  kmOrtalama: 85000,
  onarimBedeli: 95000,
  rayicDeger: 725000,
  degerKaybi: 35000,
  kusurOrani: 100,
  oncekiHasar: 1,
  hasarBolgesi: "ARKA",
  yontem: "PERT TOTAL"
}, {
  dosyaNo: "K-2024/286826",
  aracTipi: "EKONOMİK",
  aracYasi: 6,
  kmOrtalama: 110000,
  onarimBedeli: 36697,
  rayicDeger: 380000,
  degerKaybi: 34747,
  kusurOrani: 100,
  oncekiHasar: 0,
  hasarBolgesi: "ÖN",
  yontem: "GENEL HASAR"
}, {
  dosyaNo: "80K-EMSAL-2025",
  aracTipi: "ORTA",
  aracYasi: 3,
  kmOrtalama: 50000,
  onarimBedeli: 220000,
  rayicDeger: 1500000,
  degerKaybi: 80000,
  kusurOrani: 100,
  oncekiHasar: 0,
  hasarBolgesi: "ÖN",
  yontem: "PİYASA KARŞILAŞTIRMA"
}, {
  dosyaNo: "2025-BMW-KARAR",
  aracTipi: "PREMİUM",
  aracYasi: 2,
  kmOrtalama: 20000,
  onarimBedeli: 450000,
  rayicDeger: 3000000,
  degerKaybi: 300000,
  kusurOrani: 100,
  oncekiHasar: 0,
  hasarBolgesi: "ÖN",
  yontem: "PİYASA KARŞILAŞTIRMA"
}, {
  dosyaNo: "GETZ-2006",
  aracTipi: "EKONOMİK",
  aracYasi: 19,
  kmOrtalama: 324468,
  onarimBedeli: 13742,
  rayicDeger: 403333,
  degerKaybi: 4000,
  kusurOrani: 100,
  oncekiHasar: 4,
  hasarBolgesi: "ÖN",
  yontem: "NİSBİ YÖNTEM"
}];

/* ---------- BEDENİ HASAR EMSAL KARARLARI ---------- */
MR.BH_EMSAL = [{
  kaynak: 'STK',
  yil: '2024',
  maluliyet: 15,
  tutar: 285000,
  detay: '%15 MALULİYET, 32 YAŞ'
}, {
  kaynak: 'YARGITAY',
  yil: '2023',
  maluliyet: 20,
  tutar: 420000,
  detay: '%20 MALULİYET, 28 YAŞ'
}, {
  kaynak: 'STK',
  yil: '2024',
  maluliyet: 10,
  tutar: 165000,
  detay: '%10 MALULİYET, 45 YAŞ'
}, {
  kaynak: 'YARGITAY',
  yil: '2023',
  maluliyet: 25,
  tutar: 580000,
  detay: '%25 MALULİYET, 35 YAŞ'
}, {
  kaynak: 'STK',
  yil: '2024',
  maluliyet: 30,
  tutar: 720000,
  detay: '%30 MALULİYET, 40 YAŞ'
}, {
  kaynak: 'YARGITAY',
  yil: '2023',
  maluliyet: 5,
  tutar: 85000,
  detay: '%5 MALULİYET, 50 YAŞ'
}];

/* ---------- ARAÇ VERİ TABANI ---------- */
MR.ARAC_DB = {
  "VOLKSWAGEN": {
    premium: false,
    modeller: ["GOLF", "PASSAT", "POLO", "TIGUAN", "T-ROC", "CADDY", "ARTEON", "ID.4", "JETTA"]
  },
  "RENAULT": {
    premium: false,
    modeller: ["CLIO", "MEGANE", "CAPTUR", "KADJAR", "TALISMAN", "SYMBOL", "KANGOO"]
  },
  "FIAT": {
    premium: false,
    modeller: ["EGEA", "EGEA CROSS", "DOBLO", "500", "PANDA", "TIPO", "LINEA"]
  },
  "FORD": {
    premium: false,
    modeller: ["FOCUS", "FIESTA", "KUGA", "PUMA", "COURIER", "RANGER", "MONDEO"]
  },
  "TOYOTA": {
    premium: false,
    modeller: ["COROLLA", "C-HR", "RAV4", "YARIS", "CAMRY", "HILUX"]
  },
  "HYUNDAI": {
    premium: false,
    modeller: ["I20", "TUCSON", "BAYON", "KONA", "I10", "I30", "ELANTRA", "GETZ"]
  },
  "HONDA": {
    premium: false,
    modeller: ["CIVIC", "CR-V", "HR-V", "JAZZ", "ACCORD"]
  },
  "KIA": {
    premium: false,
    modeller: ["SPORTAGE", "CEED", "STONIC", "PICANTO", "NIRO", "SORENTO"]
  },
  "OPEL": {
    premium: false,
    modeller: ["ASTRA", "CORSA", "MOKKA", "GRANDLAND", "CROSSLAND"]
  },
  "PEUGEOT": {
    premium: false,
    modeller: ["208", "2008", "308", "3008", "508", "5008", "301"]
  },
  "BMW": {
    premium: true,
    modeller: ["1 SERİSİ", "3 SERİSİ", "5 SERİSİ", "X1", "X3", "X5", "4 SERİSİ", "7 SERİSİ"]
  },
  "MERCEDES-BENZ": {
    premium: true,
    modeller: ["A SERİSİ", "C SERİSİ", "E SERİSİ", "S SERİSİ", "CLA", "GLA", "GLC", "GLE"]
  },
  "AUDI": {
    premium: true,
    modeller: ["A3", "A4", "A6", "Q3", "Q5", "Q7", "A1", "A5", "TT"]
  },
  "VOLVO": {
    premium: true,
    modeller: ["XC40", "XC60", "XC90", "S60", "S90", "V40"]
  },
  "PORSCHE": {
    premium: true,
    modeller: ["CAYENNE", "MACAN", "911", "TAYCAN", "PANAMERA"]
  },
  "TESLA": {
    premium: true,
    modeller: ["MODEL 3", "MODEL Y", "MODEL S", "MODEL X"]
  },
  "DACIA": {
    premium: false,
    modeller: ["DUSTER", "SANDERO", "JOGGER", "SPRING", "LOGAN"]
  },
  "SKODA": {
    premium: false,
    modeller: ["OCTAVIA", "SUPERB", "KAMIQ", "KAROQ", "KODIAQ", "FABIA"]
  },
  "SEAT": {
    premium: false,
    modeller: ["LEON", "IBIZA", "ARONA", "ATECA"]
  },
  "LEXUS": {
    premium: true,
    modeller: ["NX", "RX", "UX", "ES", "IS"]
  }
};

/* ---------- SİGORTA ŞİRKETLERİ ---------- */
MR.SIGORTA = ['AXA SİGORTA', 'ALLİANZ SİGORTA', 'MAPFRE SİGORTA', 'HDI SİGORTA', 'SOMPO SİGORTA', 'ANADOLU SİGORTA', 'AK SİGORTA', 'ZURİCH SİGORTA', 'GROUPAMA SİGORTA', 'TÜRK NİPPON SİGORTA', 'HALK SİGORTA', 'GÜNEŞ SİGORTA', 'UNİCO SİGORTA', 'QUİCK SİGORTA', 'GENERALİ SİGORTA', 'DOĞA SİGORTA', 'MAGDEBURGER SİGORTA', 'BEREKET SİGORTA', 'RAY SİGORTA', 'NEOVA SİGORTA', 'EUREKO SİGORTA', 'KORU SİGORTA'];

/* ---------- İLLER LİSTESİ (81 İL) ---------- */
MR.ILLER = ['ADANA', 'ADIYAMAN', 'AFYON', 'AĞRI', 'AKSARAY', 'AMASYA', 'ANKARA', 'ANTALYA', 'ARDAHAN', 'ARTVİN', 'AYDIN', 'BALIKESİR', 'BARTIN', 'BATMAN', 'BAYBURT', 'BİLECİK', 'BİNGÖL', 'BİTLİS', 'BOLU', 'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI', 'ÇORUM', 'DENİZLİ', 'DİYARBAKIR', 'DÜZCE', 'EDİRNE', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM', 'ESKİŞEHİR', 'GAZİANTEP', 'GİRESUN', 'GÜMÜŞHANE', 'HAKKARİ', 'HATAY', 'IĞDIR', 'ISPARTA', 'İSTANBUL', 'İZMİR', 'KAHRAMANMARAŞ', 'KARABÜK', 'KARAMAN', 'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRIKKALE', 'KIRKLARELİ', 'KIRŞEHİR', 'KİLİS', 'KOCAELİ', 'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA', 'MARDİN', 'MERSİN', 'MUĞLA', 'MUŞ', 'NEVŞEHİR', 'NİĞDE', 'ORDU', 'OSMANİYE', 'RİZE', 'SAKARYA', 'SAMSUN', 'ŞANLIURFA', 'SİİRT', 'SİNOP', 'SİVAS', 'ŞIRNAK', 'TEKİRDAĞ', 'TOKAT', 'TRABZON', 'TUNCELİ', 'UŞAK', 'VAN', 'YALOVA', 'YOZGAT', 'ZONGULDAK'];

/* ---------- MASRAF KALEMLERİ ---------- */
MR.MASRAF_K = ['VEKALET HARCI', 'BAŞVURU HARCI', 'TEBLİGAT GİDERİ', 'BİLİRKİŞİ ÜCRETİ', 'KEŞİF GİDERİ', 'POSTA GİDERİ', 'DOSYA MASRAFI', 'FOTOKOPİ / BASKI', 'ULAŞIM GİDERİ', 'YEMEK / KONAKLAMA', 'EKSPERTİZ ÜCRETİ', 'TERCÜME ÜCRETİ', 'DAVA HARCI', 'İCRA HARCI', 'ARAÇ ÇEKİCİ', 'OTOPARK ÜCRETİ', 'DİĞER'];

/* ---------- EVRAK TÜRLERİ ---------- */
MR.EVRAK_T = ['KAZA TESPİT TUTANAĞI', 'VEKALETNAME', 'TRAFİK POLİÇESİ', 'KASKO POLİÇESİ', 'RUHSAT FOTOKOPİSİ', 'EHLİYET FOTOKOPİSİ', 'NÜFUS CÜZDANI', 'EKSPER RAPORU', 'FATURA / ONARIM', 'BİLİRKİŞİ RAPORU', 'SAĞLIK RAPORU', 'MALULİYET RAPORU', 'MAHKEME KARARI', 'DİLEKÇE', 'DİĞER'];