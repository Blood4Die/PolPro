# PolPro

Proje, görev, bütçe ve gerçekleşen maliyetleri tek yerde takip etmek için hazırlanmış Türkçe web MVP'si.

## Çalıştırma

`index.html` dosyasını güncel bir tarayıcıda açın. Kurulum veya sunucu gerekmez.

Bu yöntem yalnızca yerel demo modu içindir. Çok kullanıcılı kullanımda Supabase Auth ve ortak PostgreSQL durumu etkinleştirilmelidir. Ayrıntılı kurulum için `GITHUB-SUPABASE-KURULUM.md` dosyasına bakın.

## Çalışma modları

- `config.js` boşsa uygulama yerel demo modunda ve `localStorage` ile çalışır.
- Geçerli Supabase URL ve publishable/anon anahtarı varsa uygulama yalnızca Supabase Auth oturumuyla açılır.
- Canlı modda ortak veri `public.app_state` tablosunda JSONB olarak ve iyimser sürüm kontrolüyle saklanır.
- Canlı modda dosyalar özel `project-files` Storage alanında tutulur.
- GitHub Pages yayını `.github/workflows/pages.yml` iş akışıyla gerçekleşir.

## Özellikler

- Proje oluşturma, ilerleme ve bütçe takibi
- Kanban görev panosu ve durum değiştirme
- Proje ve görev tarihleri için Gantt görünümü
- Kişi bazlı görev dağılımı, iş yükü ve gecikme takibi
- Kullanıcı ekleme, düzenleme, aktifleştirme ve pasifleştirme
- Düzenlenebilir kullanıcı kategorileri ve sistem rolleri
- Proje, görev ve maliyet kayıtlarını sonradan düzenleme
- Şifreli oturum açma ve oturum kapatma
- Yönetici, Kullanıcı ve Görüntüleyici için rol bazlı yetkilendirme
- Proje bazında geçmiş hareket ve denetim zaman çizelgesi
- Projeye bağlı dosya, doküman ve görsel yükleme
- Görev bazında belge ekleme, indirme ve kaldırma
- Tedarikçi iletişimleri ve proje bazlı harcama takibi
- Proje sayfasında görev, plan ve maliyet yönetimi
- Genel bakış ekranında portföy Gantt şeması
- Görevlerde başlangıç ve bitiş tarihi, tarih doğrulaması ve süre bazlı Gantt çubukları
- Canlı depolamada dosya başına 15 MB yükleme sınırı
- Supabase PostgreSQL, Auth, Storage ve rol politikaları için üretim şeması
- Kullanıcılardan çoklu proje yöneticisi seçimi ve kullanıcıdan görev atama
- Gantt üzerinden görev düzenleme ve atanan kişi gösterimi
- Genel Bakış proje filtresi
- Bütçe aşımı ve termin gecikmesi uyarıları
- Geçmiş hareketlerde kullanıcı, işlem, tarih ve metin filtresi
- TL, EUR ve USD gösterim ve giriş para birimi seçimi
- Antrasit ve beyaz ağırlıklı kurumsal arayüz
- Proje kartlarında yüklenebilir ve otomatik küçültülen kapak görseli
- Proje görselinde sürükleyerek konumlandırma, yakınlaştırma ve ortalama
- Proje kodu, kapsam, amaç, ekip, öncelik, aşama, yüzde ve klasör bağlantıları içeren proje ana kartı
- Görevlerde iş paketi, gerçekleşen tarihler, bağımlılık, RACI, efor, kilometre taşı ve gecikme nedeni
- Gantt üzerinde planlanan/gerçekleşen tarihler, kritik yol, bağımlı işler ve kilometre taşı vurguları
- Bütçe, sipariş, gerçekleşen, kalan tahmin, tahmini final ve sapma karşılaştırması
- Satın alma ve uzun terminli malzeme takibi
- İmalat operasyonu, iş merkezi, üretim miktarı ve kapasite takibi
- Risk, açık sorun, değişiklik talebi, toplantı ve aksiyon modülleri
- Kontrollü doküman ve revizyon yönetimi
- Kalite, uygunsuzluk, FAT/SAT, test ve kabul kayıtları
- Proje kapanışı, garanti, bakım, yedek parça ve öğrenilen dersler formu
- Yönetim dashboardunda kritik satın alma, risk, aksiyon ve aylık teslim göstergeleri

- Proje bazlı maliyet ve proje dışı şirket genel gideri kaydı
- Araç kiralama, konaklama, danışmanlık, seyahat ve benzeri gider kategorileri
- Planlanan / gerçekleşen / kalan bütçe özeti
- Arama ve proje filtresi
- Mobil uyumlu arayüz
- Verilerin tarayıcıda kalıcı saklanması (`localStorage`)

Bu sürüm rol ve giriş akışını gösteren bir ön yüz prototipidir. Üretim kullanımında parolalar tarayıcıda değil, sunucuda güçlü parola özetiyle saklanmalı; merkezi veritabanı, HTTPS, güvenli oturum çerezleri, parola sıfırlama, denetim kayıtları, yedekleme ve sunucu tarafı yetki kontrolleri eklenmelidir.
