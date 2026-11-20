# Türkiye Emlak

[Türkçe](#türkçe) · [English](#english)

![Türkiye Emlak](public/menu-day.png)

## Türkçe

Türkiye Emlak, **2–6 kişi** için özgün bir aile emlak oyunu. Bir bilgisayar oyunu başlatır. Diğer oyuncular aynı Wi-Fi ağına bağlı telefon veya bilgisayarlarının tarayıcısından oda koduyla katılır. Oyun arayüzü Türkçedir.

- 48 kareli tahtada 28 şehir keşfet, mülk al, takas yap ve mülklerini geliştir.
- Konut ve çiftlik yolları, kira, ipotek, krediler ve 50 şans/ödül kartı.
- Yarım kalan maçlara SQLite kayıtlarıyla geri dön.

### Windows’ta oyna

1. [Releases](https://github.com/tursunuz/turkiye-emlak/releases/latest) bölümündeki Windows x64 ZIP’ini indir ve tamamını çıkar.
2. `baslat.cmd` dosyasını çalıştır. Oyun boyunca sunucu penceresini açık tut.
3. Bilgisayarda açılan sayfadan oda kur. Diğer oyuncular oda ekranındaki yerel ağ adresini kendi tarayıcılarında açıp oda kodunu girsin.

### Kaynak koddan çalıştır

Node.js 24 veya üzeriyle `node server.mjs` çalıştır ve `http://localhost:3000` adresini aç. Ek paket kurulumu gerekmez. Testler için `node --test tests/*.test.mjs` komutunu kullan. Sunucu ev veya güvendiğin bir yerel ağ için tasarlandı. Bazı kartlarda yetişkin mizahı bulunur.

Şehir fotoğrafları için [kaynaklar ve lisanslar](design/FOTOGRAF-KAYNAKLARI.md).

## English

Türkiye Emlak is an original **2–6 player** family property-trading game. One computer hosts the game, and players join with a room code from a phone or computer on the same Wi-Fi network. The interface is in Turkish.

- Explore 28 Turkish cities on a 48-space board. Buy, trade, and develop properties.
- Build homes or farms, collect rent, manage loans and mortgages, and draw from 50 chance and reward cards.
- Resume saved matches through local SQLite storage.

### Play on Windows

1. Download and extract the Windows x64 ZIP from [Releases](https://github.com/tursunuz/turkiye-emlak/releases/latest).
2. Run `baslat.cmd` and keep the server window open while playing.
3. Create a room in the browser. Other players open the local address shown in the lobby and enter the room code.

### Run from source

With Node.js 24 or later, run `node server.mjs` and open `http://localhost:3000`. No extra packages are needed. Run `node --test tests/*.test.mjs` for the automated checks. The server is intended for a trusted local network. Some cards contain adult humor.

See the [photo credits and licenses](design/FOTOGRAF-KAYNAKLARI.md) for the city photography.
