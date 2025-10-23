# Emeklilik CRM SaaS

Emeklilik fonu müşteri temsilcilerinin portföylerini yönetmeleri için hazırlanmış web tabanlı CRM. Arayüz tamamen Türkçe, tüm parasal değerler Türk Lirası (₺) cinsinden gösterilir ve raporlanır.

## Stack

- [Next.js 14](https://nextjs.org/) with the App Router
- TypeScript
- Supabase Postgres (barındırılan veritabanı & RLS için hazır)
- [NextAuth](https://next-auth.js.org/) (credentials provider)
- [Nodemailer](https://nodemailer.com/) for outbound email

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and update values as needed. The demo uses SQLite locally.

   ```bash
   cp .env.example .env
   ```

   | Variable | Purpose |
   | --- | --- |
| `SUPABASE_URL` | Supabase projenizin API URL'i. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sunucu tarafı sorgular için service role anahtarı. |
| `SUPABASE_ANON_KEY` | (Opsiyonel) İstemci tarafında kullanmak isterseniz anonim anahtar. |
| `NEXTAUTH_SECRET` | Any random string used to sign NextAuth JWTs. |
| `NEXTAUTH_URL` | Base URL for NextAuth callbacks (e.g. `http://localhost:3000`). |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | Birikim özeti e-postalarını göndermek için SMTP bilgileri. |
| `OPENAI_API_KEY` (opsiyonel) | Yapay zeka destekli e-posta taslakları oluşturmak için OpenAI API anahtarı. |
| `OPENAI_MODEL` (opsiyonel) | Varsayılan olarak `gpt-4o-mini`. Dilerseniz farklı OpenAI model adını tanımlayabilirsiniz. |

3. **Supabase tablolarını oluşturun**

   `supabase` SQL editöründe proje tablolarını ve örnek verileri oluşturmak için `docs/database.sql` (veya paylaşılan seed sorgularını) çalıştırın.

   > Profil fotoğrafları için Supabase Storage üzerinde `avatars` isimli, public erişimli bir bucket oluşturmayı unutmayın:
   >
   > ```sql
   > select storage.create_bucket('avatars', public => true);
   > ```

5. **Start the app**

   ```bash
   npm run dev
   ```

   http://localhost:3000 adresine gidip demo bilgileriyle giriş yapın.

## Özellikler

- **Güvenli kimlik doğrulama** — NextAuth ile kullanıcı adı/parola tabanlı oturum açma.
- **Müşteri yönetimi** — Müşteri ekleme, güncelleme, silme; TL bazında bakiyeleri ve büyümeleri görüntüleme.
- **Toplu içe aktarma** — CSV şablonu ile müşteri verilerini yükleme; mevcut kayıtlar e-posta ile eşleştirilir.
- **Kontrol paneli** — Yönetilen müşteri sayısı, toplam varlık, büyüme ve son iletişim özetleri.
- **Tasarruf özeti e-postaları** — Tüm müşterilere güncel tasarruf durumunu tek seferde iletme ve gönderim kayıtlarını tutma.
- **Bireysel fon özeti** — İletişimler sayfasından seçilen müşterilere kişiselleştirilmiş e-postalar gönderme.
- **Yapay zeka destekli taslak** — İletişim sayfasında prompt yazarak toplantı tonu ve içerik önerilerini otomatik oluşturma.
- **Aktivite kaydı** — Son yüklemeleri ve iletişim loglarını kullanıcı bazında izleme.
- **Geri alma destekli silme** — Müşteriler soft delete ile işaretlenir; liste üzerinde “Geri al” butonu ile kayıtları geri yükleyebilirsiniz. Toplu silme de aynı yöntemi kullanır.
- **Kişisel profil yönetimi** — Danışmanlar kendi iletişim bilgilerini düzenleyip profil fotoğrafı yükleyebilir.

## CSV şablonu

Yükleme formu `public/sample-clients.csv` dosyasına bağlantı verir. Dosya Türkçe başlıklar içerir ve `;` ile ayrılmıştır:

```
Ad Soyad;E-posta;Telefon;İlk Tasarruf;Güncel Tasarruf;Aktarım Tarihi
```

Başlıklar büyük/küçük harf duyarlı değildir; `,` veya `;` ayraçları desteklenir. Tutar değerleri `1.250.500`, `82.750,50` gibi Türkçe formatta veya `82750.5` gibi standart formatta yazılabilir. Müşteriler e-posta adresi üzerinden eşleştirilerek güncellenir. `Aktarım Tarihi` gibi ek sütunlar örnek dosyada bulunur fakat içe aktarma sırasında yoksayılır.

## SMTP configuration

E-postalar Nodemailer ile gönderilir. `EMAIL_*` değişkenlerini SMTP servis sağlayıcınızın bilgileriyle doldurun. Geliştirme ortamında [Mailtrap](https://mailtrap.io/) gibi test servislerini kullanabilirsiniz. Bilgiler eksikse gönderim isteği açıklayıcı hata döndürür.

## Geliştirilebilecek noktalar

- Kullanıcı daveti ve çoklu danışman yönetimi.
- Tasarruf özetlerinin otomatik gönderimi için zamanlayıcı (cron/queue) altyapısı.
- Toplu yüklemelerde geriye alma / denetim kaydı.
- Müşteri bazında geçmiş tasarruf eğilimlerini grafiğe dökme.
- Rol tabanlı yetkilendirme ve alt kullanıcı yönetimi.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm start` | Run the app in production mode. |
| `npm run lint` | Lint the project with ESLint. |
