# PolPro — Supabase ve GitHub Pages kurulumu

## 1. Supabase projesi

1. Supabase'de ücretsiz bir proje oluşturun.
2. **SQL Editor** bölümünde `supabase-schema.sql` dosyasının tamamını çalıştırın.
3. **Authentication > Users** bölümünden ilk kullanıcıyı oluşturun.
4. SQL Editor'da bu kullanıcıya yönetici rolü verin:

```sql
update public.profiles
set full_name = 'Ad Soyad', role = 'Yönetici', active = true
where id = (select id from auth.users where email = 'yonetici@firma.com');
```

Diğer kullanıcıları Supabase Authentication ekranından oluşturup `profiles` tablosundaki rollerini `Kullanıcı` veya `Görüntüleyici` yapın.

## 2. GitHub repository

1. Boş bir repository oluşturun.
2. Kodları `main` dalına yükleyin.
3. **Settings > Secrets and variables > Actions** bölümünde iki repository secret ekleyin:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. `SUPABASE_ANON_KEY` için yalnızca Supabase publishable/anon anahtarını kullanın. `service_role` kullanmayın.
5. **Settings > Pages > Build and deployment > Source** alanında **GitHub Actions** seçin.
6. **Actions** sekmesindeki `PolPro GitHub Pages` iş akışı tamamlandığında site adresi oluşur.

## 3. İlk veri

`app_state` ilk başta boştur. İlk yönetici oturumu açıldığında uygulamadaki başlangıç verisi SQL'e bir defa yazılır. Mevcut JSON yedeğini aktarmak için yönetici hesabıyla **Veri dosyası seç** işlemini kullanın.

## 4. Yetkiler

- `Yönetici`: okuma, ekleme, güncelleme, silme ve veri içe aktarma.
- `Kullanıcı`: okuma, ekleme ve güncelleme.
- `Görüntüleyici`: yalnızca okuma.

Eşzamanlı kayıtlarda sürüm kontrolü uygulanır. Başka bir kullanıcı önce kaydederse ikinci değişiklik sessizce ezilmez; uygulama yedek alıp yenileme uyarısı verir.

## Güvenlik

- `config.js`, `data/` ve `backups/` GitHub'a gönderilmez.
- Yayın sırasında `config.js` GitHub Actions secret değerlerinden üretilir.
- Parolalar PolPro verisine veya JSON yedeklerine yazılmaz; Supabase Auth tarafından yönetilir.
- Tarayıcıya `service_role` anahtarı koymayın.
