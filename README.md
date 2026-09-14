# Jarvis Assistant (Capacitor + Android)

Aplikasi asisten AI bergaya "Jarvis" untuk Android, dibangun dengan Capacitor. Bisa mengobrol
(teks & suara) dan mengontrol beberapa fungsi perangkat: senter, volume, membuka aplikasi lain,
serta membaca notifikasi masuk (jika izin diberikan).

## Struktur proyek

```
jarvis-assistant/
├── src/main.js          # Sumber logic JS (di-bundle jadi www/app.js)
├── www/                 # Web assets (HTML/CSS/JS) yang dijalankan di WebView
├── android/             # Project Android native (buka ini di Android Studio)
│   └── app/src/main/java/com/example/jarvis/
│       ├── MainActivity.java
│       ├── DeviceControlPlugin.java      # Plugin native: senter, volume, buka app
│       └── JarvisNotificationListener.java # Membaca notifikasi masuk
├── capacitor.config.json
└── package.json
```

## Cara menjalankan

1. **Install dependency** (butuh Node.js + internet):
   ```bash
   npm install
   ```

2. **Build & sync ke Android**:
   ```bash
   npm run sync
   ```
   Perintah ini akan meng-compile `src/main.js` → `www/app.js`, lalu menyalin web assets
   ke `android/app/src/main/assets/public` dan menyinkronkan plugin native.

3. **Buka di Android Studio**:
   ```bash
   npm run open:android
   ```
   atau buka folder `android/` secara manual di Android Studio. Jalankan (Run ▶) ke
   emulator/perangkat fisik seperti project Android biasa. Anda perlu Android Studio +
   Android SDK terpasang di komputer Anda (proses build APK tidak bisa dilakukan di
   lingkungan pembuatan file ini karena tidak ada akses ke Android SDK/Google Maven).

4. Kalau Anda ubah kode di `src/main.js`, `www/index.html`, atau `www/style.css`, ulangi
   langkah 2 (`npm run sync`) sebelum run ulang di Android Studio.

## Build APK otomatis lewat GitHub Actions (tanpa install apapun di laptop)

Project ini sudah berisi `.github/workflows/build-android.yml` yang otomatis meng-compile APK
debug di server GitHub setiap kali Anda push ke branch `main`/`master`.

Langkah-langkah:

1. Buat repository baru di GitHub (bisa privat), misalnya `jarvis-assistant`.
2. Push isi folder project ini ke repo tersebut:
   ```bash
   cd jarvis-assistant
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/jarvis-assistant.git
   git push -u origin main
   ```
3. Buka tab **Actions** di halaman repo GitHub Anda — workflow "Build Android Debug APK" akan
   otomatis berjalan (± 3–6 menit).
4. Setelah selesai (centang hijau ✅), klik run tersebut → scroll ke bagian **Artifacts** →
   download **jarvis-assistant-debug-apk** (berupa file `.zip` berisi `app-debug.apk`).
5. Extract, lalu install APK-nya ke HP Android (aktifkan dulu "Izinkan instalasi dari sumber
   tidak dikenal" di pengaturan HP jika muncul peringatan, karena ini bukan dari Play Store).

Anda juga bisa memicu build manual kapan saja lewat tab Actions → pilih workflow ini →
**Run workflow** (tombol di kanan atas), tanpa perlu push commit baru.

> Catatan: ini menghasilkan APK **debug** (untuk testing), belum ditandatangani untuk rilis ke
> Play Store. Untuk rilis publik, perlu langkah signing APK/AAB tambahan (keystore rahasia) yang
> sebaiknya tidak disimpan di repo publik.

## Konfigurasi di dalam aplikasi

Buka ikon ⚙ di kanan atas aplikasi:

- **Penyedia AI**: pilih Claude (Anthropic) atau OpenAI.
- **API Key**: masukkan API key Anda sendiri. Disimpan hanya secara lokal di `localStorage`
  perangkat (tidak dikirim ke server manapun selain endpoint resmi Anthropic/OpenAI saat chat).
  ⚠️ Untuk versi produksi/publik, sebaiknya API key TIDAK ditaruh langsung di app (bisa
  diekstrak dari APK) — buat backend proxy sederhana yang menyimpan key di server dan app
  memanggil backend itu, bukan API AI langsung.
- **Akses Notifikasi**: tombol untuk membuka pengaturan Android agar Jarvis diizinkan membaca
  notifikasi masuk (tidak bisa diminta lewat dialog izin biasa — harus diaktifkan manual oleh
  pengguna di Settings > Notification access).
- **Overlay**: izin untuk suatu saat menampilkan UI di atas aplikasi lain (mis. bubble asisten).

## Cara kerja kontrol perangkat

AI diinstruksikan (via system prompt) untuk SELALU membalas dalam JSON:
```json
{"reply": "teks balasan", "action": {"type": "flashlight", "value": "on"}}
```
Tipe `action` yang didukung saat ini:
- `flashlight` → `value`: `"on"` / `"off"`
- `volume` → `value`: angka 0–100
- `open_app` → `query`: nama aplikasi yang disebut user (dicocokkan otomatis ke aplikasi terpasang)

`app.js` mem-parsing JSON tersebut lalu memanggil plugin native `DeviceControl` di Android untuk
benar-benar menjalankan aksinya. Anda bisa menambah tipe aksi baru dengan: (1) menambah instruksi
di `SYSTEM_PROMPT` pada `src/main.js`, (2) menangani tipe itu di fungsi `runAction()`, dan
(3) menambah method baru di `DeviceControlPlugin.java`.

## Keterbatasan & catatan penting

- Ini **bukan** kontrol perangkat tanpa batas seperti di film — Android membatasi aplikasi pihak
  ketiga secara ketat demi keamanan & privasi pengguna. Fitur seperti membaca SMS, melakukan
  panggilan otomatis, atau mengontrol aplikasi lain sepenuhnya memerlukan izin sensitif tambahan
  dan pada beberapa kasus ditolak kebijakan Google Play untuk app non-default-handler.
- Fitur "baca notifikasi" hanya membaca judul & isi notifikasi yang lewat setelah izin
  diaktifkan (`getRecentNotifications` di plugin) — belum ada fitur "balas otomatis" karena itu
  butuh integrasi `RemoteInput` per-aplikasi yang jauh lebih kompleks & rentan disalahgunakan.
- Voice recognition menggunakan plugin `@capacitor-community/speech-recognition` (STT bawaan
  Android/Google), dan TTS menggunakan `@capacitor-community/text-to-speech`.
- Untuk publikasi ke Play Store, izin sensitif (notification access, overlay, dsb.) akan
  memerlukan justifikasi & privacy policy sesuai kebijakan Google.
