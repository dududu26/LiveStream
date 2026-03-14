# 🔴 LiveStream Server — Panduan Setup UserLand

## 📦 Struktur Folder

```
server/
├── server.js          ← Server utama (Socket.io, WebRTC signaling)
├── package.json       ← Dependensi Node.js
└── public/
    ├── index.html     ← Beranda (daftar stream aktif)
    ├── host.html      ← Halaman host siaran (/host)
    └── watch.html     ← Halaman penonton (/watch?id=STREAM_ID)
```

---

## 🛠️ Langkah Install di UserLand (Android)

### 1. Install UserLand & Pilih Ubuntu
Download UserLand dari Play Store → pilih **Ubuntu** → buat username & password

### 2. Update & Install Node.js
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # Harus muncul v20.x.x
```

### 3. Clone Repository
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME/server
```

### 4. Install Dependensi
```bash
npm install
```

### 5. Jalankan Server
```bash
node server.js
```

Output yang muncul:
```
╔══════════════════════════════════════╗
║  LiveStream Server aktif di port 8226 ║
╠══════════════════════════════════════╣
║  Host  → http://localhost:8226/host  ║
║  Watch → http://localhost:8226/watch ║
╚══════════════════════════════════════╝
```

---

## 🌐 Setup ngrok (Akses dari Internet)

### Install ngrok
```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.deb -o ngrok.deb
sudo dpkg -i ngrok.deb
```

### Daftarkan authtoken ngrok
```bash
ngrok config add-authtoken TOKEN_KAMU
```
> Dapatkan token gratis di: https://dashboard.ngrok.com/auth/your-authtoken

### Jalankan ngrok
```bash
ngrok http 8226
```

Kamu akan mendapat URL seperti:
```
https://abc123.ngrok-free.app  ← Bagikan URL ini ke penonton
```

---

## 🚀 Cara Pakai

### Sebagai Host (Siaran):
1. Buka `https://URL_NGROK/host` di browser HP atau laptop
2. Klik **Buka Kamera** → izinkan akses kamera & mikrofon
3. Isi nama dan judul siaran
4. Klik **Mulai Siaran**
5. Bagikan **Stream ID** (8 karakter) atau link `/watch?id=XXXXXXXX` ke penonton

### Sebagai Penonton:
1. Buka `https://URL_NGROK/watch?id=STREAM_ID`
2. Masukkan nama (opsional) → klik **Tonton Sekarang**
3. Fitur: chat, like (ketuk layar 2x), emoji rain, bagikan link

---

## ⚡ Tips Produksi

### Jalankan di Background (agar tidak mati saat terminal ditutup)
```bash
npm install -g pm2
pm2 start server.js --name livestream
pm2 save
pm2 startup  # agar otomatis start saat reboot
```

### Lihat Log
```bash
pm2 logs livestream
```

### Restart Server
```bash
pm2 restart livestream
```

---

## 🔧 Konfigurasi (Opsional)

Ubah port di `server.js` baris:
```js
const PORT = process.env.PORT || 8226;
```

Atau jalankan dengan port custom:
```bash
PORT=3000 node server.js
```

---

## 📡 Teknologi yang Digunakan

| Komponen | Library |
|---|---|
| Server HTTP | Express.js |
| Real-time | Socket.io |
| Video P2P | Simple-Peer (WebRTC) |
| ID Unik | UUID |

**P2P artinya:** Video mengalir langsung dari browser host ke browser penonton — server hanya relay sinyal WebRTC & chat, tidak memproses video, sehingga **sangat ringan** untuk UserLand.

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---|---|
| Kamera tidak bisa dibuka | Pastikan buka via HTTPS (ngrok URL), bukan localhost |
| Penonton tidak dapat video | Pastikan host & penonton terhubung ke server yang sama (cek ngrok URL) |
| WebSocket disconnect terus | Pastikan ngrok masih berjalan (`ngrok http 8226`) |
| Port 8226 sudah dipakai | Ganti port di server.js atau `PORT=9000 node server.js` |
