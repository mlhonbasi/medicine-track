# Medicine Track

Aile bireyleri için çoklu profil destekli, bildirimlerle ilaç takibi yapan bir mobil uygulama. Sunucu ya da hesap gerektirmez — tüm veriler cihazda tutulur.

## Özellikler

- **Çoklu profil** — her aile üyesi için ayrı renk/avatar ile ayrı ilaç listesi.
- **İlaç ekleme** — ilaç adı, toplam adet ve günlük doz girilir; kullanım süresi ve bitiş tarihi otomatik hesaplanır.
- **Aktif / Bitenler sekmeleri** — süresi dolan ilaçlar listeden kaybolmak yerine "Bitenler" sekmesinde geçmiş olarak kalır.
- **Renk kodlu ilerleme çubuğu** — kalan güne göre yeşilden kırmızıya değişen görsel uyarı.
- **Bildirimler** — ilaç bitmeden 2 gün önce ve bittiği gün hatırlatma.
- **Tamamen yerel veri** — expo-sqlite ile cihaz üzerinde saklama, internet bağlantısı gerektirmez.

## Teknoloji

- [Expo](https://expo.dev) 54 · React Native 0.81 · React 19 · TypeScript
- [expo-router](https://docs.expo.dev/router/introduction) — dosya tabanlı yönlendirme
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite) — yerel veritabanı
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications) — bildirim zamanlama
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated) — animasyonlar
- [lucide-react-native](https://lucide.dev) — ikonlar

## Geliştirme ortamında çalıştırma

```bash
npm install
npx expo start
```

Bu komut Metro bundler'ı başlatır ve terminalde bir QR kod ile birlikte şu kısayolları gösterir:

- `a` — bağlı bir Android cihazda/emülatörde açar
- `i` — iOS simulator'da açar (yalnızca macOS)
- `w` — web tarayıcısında açar
- QR kodu telefonundan taratmak — Expo Go veya kendi development build'in yüklüyse onu açar

Bu proje `expo-dev-client` kullandığı için, tam özellikli test için (özellikle bildirimler) genel Expo Go yerine aşağıdaki development build'i kurman önerilir.

## Kendi build'ini almak (EAS)

Proje [EAS Build](https://docs.expo.dev/build/introduction/) için hazır (`eas.json`) ve üç profil tanımlı:

| Profil | Ne işe yarar |
|---|---|
| `development` | Cihazına/emülatöre kurup `npx expo start` ile canlı geliştirme yapmanı sağlayan dev client |
| `preview` | Test için paylaşılabilir, kurulabilir APK |
| `production` | Yayın APK'sı (Play Store'a değil, doğrudan kuruluma uygun `.apk`) |

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # geliştirme sırasında kullanılacak build
eas build --profile preview --platform android        # test için paylaşılabilir APK
eas build --profile production --platform android      # yayın APK'sı
```

Build tamamlandığında EAS bir indirme linki verir; APK'yı Android cihazına indirip kurabilirsin (bilinmeyen kaynaklardan yüklemeye izin vermen gerekebilir). iOS build'i için Apple Developer hesabı ve macOS/EAS submit akışı gerekir.

## Proje yapısı

```
app/
  index.tsx          # profil seçimi + ilaç listesi (Aktif/Bitenler)
  add.tsx            # yeni ilaç ekleme ekranı
  _layout.tsx         # kök stack navigasyonu
components/
  medicine-card.tsx  # ilaç kartı: ilerleme çubuğu, durum, silme
hooks/
  use-database.tsx   # SQLite CRUD + bildirim zamanlama
```
