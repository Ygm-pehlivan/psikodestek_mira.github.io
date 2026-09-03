# Psikodestek Mira

Mira adlı yapay zekâ destekli psikodestek sohbet uygulaması.

## Mevcut durum

Bu depo Groq API ile çalışan Node.js backend temelini içerir. Frontend dosyaları `public/` klasörüne eklendiğinde Express tarafından servis edilir.

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` dosyasına gerçek Groq API anahtarınızı ekleyin:

```env
GROQ_API_KEY=gsk_buraya_gercek_anahtarinizi_yazin
GROQ_MODEL=openai/gpt-oss-20b
PORT=3000
```

Sunucuyu başlatın:

```bash
npm start
```

Uygulama `http://localhost:3000` adresinde çalışır.

## Güvenlik

`.env` dosyasını GitHub’a yüklemeyin. API anahtarı yalnızca backend sunucusunun ortam değişkenlerinde tutulmalıdır. GitHub Pages yalnızca frontend’i barındırabilir; `/api/chat` için bu Node.js backend’inin ayrıca yayınlanması gerekir.
