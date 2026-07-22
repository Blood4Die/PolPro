# PolPro canlı kurulum

GitHub Pages ile otomatik yayın için ayrıca `GITHUB-SUPABASE-KURULUM.md` dosyasını izleyin. Güncel sürüm, ortak uygulama verisini `public.app_state` tablosunda sürüm kontrollü JSONB olarak saklar.

## Gerekenler

1. Supabase üzerinde yeni bir proje oluşturun.
2. SQL Editor bölümünde `supabase-schema.sql` dosyasını çalıştırın.
3. Authentication > Users bölümünden ilk yönetici hesabını oluşturun.
4. SQL Editor'da ilk kullanıcıya yönetici rolü verin:

```sql
update public.profiles
set full_name = 'Ad Soyad', role = 'Yönetici'
where id = (select id from auth.users where email = 'yonetici@firma.com');
```

5. Project Settings > API bölümündeki proje URL'sini ve anon/publishable anahtarını `config.js` dosyasına yazın.
6. Uygulamayı HTTPS kullanan bir web sunucusuna yayınlayın.

## Güvenlik

- `service_role` anahtarını hiçbir zaman `config.js` veya tarayıcı koduna koymayın.
- `project-files` alanı özeldir; dosyalar süreli bağlantılar üzerinden açılır.
- Dosya başına üst sınır 15 MB'dir.
- Uygulamanın gerçek kullanıcı girişi ve tüm CRUD işlemleri canlı backend'e taşınmadan demo hesaplarını kullanıma açmayın.
