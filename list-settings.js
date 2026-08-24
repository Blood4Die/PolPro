(function () {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const unique = values => [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))];

  const catalog = [
    { key: 'userCategories', title: 'Kullanıcı kategorileri', group: 'Organizasyon', defaults: ['Yönetim', 'Proje Ofisi', 'Teknik Ekip', 'Bilgi Teknolojileri', 'Satın Alma'], refs: [['users', 'category']], special: 'categories' },
    { key: 'taskUnits', title: 'Talep eden birimler', group: 'Organizasyon', defaults: ['Proje Müh.', 'Proje Müh. / Saha', 'Satınalma', 'Satınalma / Atölye', 'İnşaat', 'Montaj', 'Elektrik', 'Otomasyon', 'Devreye Alma', 'Devreye Alma / Müşteri', 'Eğitim', 'Proje Yön.'], refs: [['tasks', 'assignee', record => record.assigneeType === 'unit']] },
    { key: 'supplierGroups', title: 'Tedarikçi grupları', group: 'Organizasyon', defaults: ['Makine / Ekipman', 'Mekanik İmalat', 'Elektrik / Elektronik', 'Otomasyon / Yazılım', 'Hammadde / Malzeme', 'Montaj / Saha Hizmeti', 'Lojistik', 'Danışmanlık / Mühendislik', 'Kalibrasyon / Test', 'Diğer'], refs: [['suppliers', 'supplierGroup'], ['suppliers', 'category']] },
    { key: 'roles', title: 'Kullanıcı rolleri', group: 'Organizasyon', defaults: ['Yönetici', 'Kullanıcı', 'Görüntüleyici'], system: true, note: 'Yetki ve Supabase güvenlik kurallarına bağlıdır.' },
    { key: 'activeStates', title: 'Aktiflik durumları', group: 'Organizasyon', defaults: ['Aktif', 'Pasif'], system: true, note: 'Hesap erişimini belirleyen sabit değerlerdir.' },

    { key: 'workPackages', title: 'Ana iş paketleri', group: 'Proje ve görev', defaults: ['İhtiyaçların Belirlenmesi', 'Konsept Tasarım', 'Mühendislik ve Tasarım', 'Detay Mühendislik', 'Mekanik Tasarım', 'Elektrik ve Otomasyon Tasarımı', 'Malzeme Listesi', 'Satın Alma', 'Saha Hazırlığı ve İnşaat', 'Lazer Kesim', 'Kaynak', 'Talaşlı İmalat', 'Boya ve Yüzey İşlemleri', 'Mekanik Montaj', 'Elektrik Montajı', 'Elektrik ve Otomasyon', 'Yazılım', 'Test ve Devreye Alma', 'Teslim ve Eğitim', 'Müşteri Kabulü'], refs: [['tasks', 'workPackage'], ['manufacturings', 'operation']] },
    { key: 'resourceGroups', title: 'Kaynak / kapasite grupları', group: 'Proje ve görev', defaults: ['Mekanik Tasarım', 'Satın Alma', 'İnşaat / Saha', 'Elektrik Tasarım', 'Elektrik', 'Kaynak Atölyesi', 'CNC', 'Montaj', 'Otomasyon', 'Test Alanı', 'Eğitim', 'Proje Yönetimi'], refs: [['tasks', 'resourceGroup'], ['manufacturings', 'resourceGroup'], ['capacityRecords', 'name']] },
    { key: 'projectStatuses', title: 'Proje durumları', group: 'Proje ve görev', defaults: ['Planlama', 'Tasarım', 'Satın Alma', 'İmalat', 'Montaj', 'Devreye Alma', 'Kabul', 'Tamamlandı', 'Beklemede'], refs: [['projects', 'projectStatus']], protectDefaults: true },
    { key: 'milestoneTypes', title: 'Kilometre taşı türleri', group: 'Proje ve görev', defaults: ['Tasarım Onayı', 'Malzeme Siparişi', 'İmalat Başlangıcı', 'Montaj Başlangıcı', 'FAT', 'SAT', 'Proje Teslimi'], refs: [['tasks', 'milestoneName']] },
    { key: 'taskStatuses', title: 'Görev durumları', group: 'Proje ve görev', defaults: ['Yapılacak', 'Devam ediyor', 'Tamamlandı'], system: true, note: 'todo / doing / done iş akışı ve ilerleme hesabına bağlıdır.' },
    { key: 'priorities', title: 'Öncelikler', group: 'Proje ve görev', defaults: ['Düşük', 'Orta', 'Yüksek'], system: true, note: 'Renk ve öncelik hesaplarına bağlı temel listedir.' },
    { key: 'yesNo', title: 'Evet / hayır seçenekleri', group: 'Proje ve görev', defaults: ['Hayır', 'Evet'], system: true, note: 'Boolean alanların false / true değerlerine bağlıdır.' },

    { key: 'costCategories', title: 'Maliyet kategorileri', group: 'Maliyet', defaults: ['Direkt İşçilik', 'Endirekt İşçilik', 'Araç Kiralama', 'Akaryakıt', 'Otel / Konaklama', 'Danışmanlık', 'Seyahat / Ulaşım', 'Yemek / Temsil', 'Kargo / Lojistik', 'Ofis Gideri', 'Bakım / Servis', 'Ekipman', 'Malzeme', 'Hizmet', 'Yazılım', 'Vergi / Harç', 'Makine / Ekipman', 'Elektrik / Elektronik', 'Otomasyon', 'İnşaat / Saha', 'İmalat', 'Montaj', 'Test / Devreye Alma', 'Eğitim', 'Garanti / Servis', 'Diğer'], refs: [['costs', 'category']] },
    { key: 'costTypes', title: 'Maliyet türleri', group: 'Maliyet', defaults: ['Direkt İşçilik', 'Endirekt İşçilik', 'İşçilik Dışı'], system: true, note: 'Bütçe sınıflandırma kurallarına bağlıdır.' },
    { key: 'currencies', title: 'Para birimleri', group: 'Maliyet', defaults: ['TRY', 'EUR', 'USD'], system: true, note: 'Kur hesabı ve para biçimlendirmesine bağlıdır.' },

    { key: 'quoteRequestStatuses', title: 'Satın alma talep durumları', group: 'Satın alma', defaults: ['Talep Açıldı', 'Teklif Bekleniyor', 'Teklif Alındı', 'Onaylandı', 'Sipariş Verildi', 'İptal'], refs: [['procurements', 'quoteStatus']], protectDefaults: true },
    { key: 'quoteStatuses', title: 'Teklif durumları', group: 'Satın alma', defaults: ['Taslak', 'Gönderildi', 'Değerlendiriliyor', 'Revizyon İstendi', 'Onaylandı', 'Reddedildi'], refs: [['purchaseQuotes', 'status']], protectDefaults: true },
    { key: 'purchaseUnits', title: 'Satın alma birimleri', group: 'Satın alma', defaults: ['Adet', 'Takım', 'Metre', 'Kg', 'Litre', 'Paket', 'Hizmet'], refs: [['procurements', 'unit'], ['purchaseQuotes', 'lines[].unit']] },
    { key: 'procurementStatuses', title: 'Satın alma durumları', group: 'Satın alma', defaults: ['Sipariş verildi', 'Kısmi teslim', 'Gerçekleşti', 'İptal edildi'], refs: [['procurements', 'procurementStatus']], protectDefaults: true },
    { key: 'qualityResults', title: 'Teslim kalite sonuçları', group: 'Satın alma', defaults: ['Bekliyor', 'Uygun', 'Şartlı Kabul', 'Uygun Değil'], refs: [['procurements', 'qualityResult']], protectDefaults: true },

    { key: 'manufacturingStatuses', title: 'İmalat durumları', group: 'Operasyon ve kalite', defaults: ['Planlandı', 'Devam Ediyor', 'Kontrolde', 'Tamamlandı', 'Beklemede'], refs: [['manufacturings', 'status']], protectDefaults: true },
    { key: 'documentTypes', title: 'Doküman türleri', group: 'Operasyon ve kalite', defaults: ['Teknik Şartname', 'Konsept Çizimi', '3D Model', 'İmalat Resmi', 'Elektrik Şeması', 'PLC Yazılımı', 'Malzeme Listesi', 'Kullanım Kılavuzu', 'Test Raporu', 'Kabul Tutanağı'], refs: [['documents', 'documentType']] },
    { key: 'documentStatuses', title: 'Doküman durumları', group: 'Operasyon ve kalite', defaults: ['Taslak', 'Kontrolde', 'Onaylandı', 'İptal'], refs: [['documents', 'approvalStatus']], protectDefaults: true },
    { key: 'qualityTypes', title: 'Test / kalite türleri', group: 'Operasyon ve kalite', defaults: ['Giriş Kalite Kontrol', 'Kaynak Kontrolü', 'Ölçü Kontrolü', 'Boyutsal Rapor', 'Elektrik Güvenlik Testi', 'Basınç Testi', 'Fonksiyon Testi', 'Boşta Çalışma Testi', 'Yük Altında Çalışma Testi', 'FAT', 'SAT', 'Eksik İşler Listesi', 'Müşteri Kabul Tutanağı'], refs: [['qualityRecords', 'controlType']] },
    { key: 'qualityStatuses', title: 'Test / kalite durumları', group: 'Operasyon ve kalite', defaults: ['Planlandı', 'Uygun', 'Şartlı Kabul', 'Uygunsuz', 'Kapandı'], refs: [['qualityRecords', 'status']], protectDefaults: true },
    { key: 'supplierStatuses', title: 'Tedarikçi durumları', group: 'Operasyon ve kalite', defaults: ['Aktif', 'Aday', 'Pasif'], refs: [['suppliers', 'status']], protectDefaults: true },
    { key: 'ratings', title: 'Değerlendirme puanları', group: 'Operasyon ve kalite', defaults: ['0 — Değerlendirilmedi', '1 — Çok zayıf', '2 — Zayıf', '3 — Orta', '4 — İyi', '5 — Çok iyi'], system: true, note: 'Sayısal puanlama ve ortalama hesabına bağlıdır.' },
    { key: 'satisfaction', title: 'Müşteri memnuniyeti puanları', group: 'Operasyon ve kalite', defaults: ['1 — Çok düşük', '2 — Düşük', '3 — Orta', '4 — İyi', '5 — Çok iyi'], system: true, note: 'Kapanış puanı ve sayısal raporlama hesabına bağlıdır.' },

    { key: 'riskLevels', title: 'Proje risk seviyeleri', group: 'Risk ve değişiklik', defaults: ['Düşük', 'Orta', 'Yüksek'], system: true, note: 'Risk puanı çarpanlarına bağlıdır.' },
    { key: 'riskStatuses', title: 'Proje risk durumları', group: 'Risk ve değişiklik', defaults: ['Açık', 'İzleniyor', 'Azaltıldı', 'Gerçekleşti', 'Kapandı'], refs: [['risks', 'status']], protectDefaults: true },
    { key: 'issueStatuses', title: 'Sorun durumları', group: 'Risk ve değişiklik', defaults: ['Açık', 'Devam Ediyor', 'Çözüldü', 'Kapandı'], refs: [['issues', 'status']], protectDefaults: true },
    { key: 'changeStatuses', title: 'Değişiklik durumları', group: 'Risk ve değişiklik', defaults: ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Reddedildi', 'Uygulandı'], refs: [['changes', 'approvalStatus']], protectDefaults: true },
    { key: 'actionStatuses', title: 'Aksiyon durumları', group: 'Risk ve değişiklik', defaults: ['Açık', 'Devam Ediyor', 'Tamamlandı', 'Gecikti', 'İptal'], refs: [['actions', 'status']], protectDefaults: true },

    { key: 'ohsRiskTypes', title: 'İSG / çevre risk alanları', group: 'İSG ve çevre', defaults: ['İSG', 'Çevre', 'İSG ve Çevre'], refs: [['ohsRisks', 'riskType']], protectDefaults: true },
    { key: 'ohsActivityTypes', title: 'İSG faaliyet türleri', group: 'İSG ve çevre', defaults: ['Rutin', 'Rutin dışı', 'Acil durum'], refs: [['ohsRisks', 'activityType']] },
    { key: 'hazardCategories', title: 'Tehlike kategorileri', group: 'İSG ve çevre', defaults: ['Elektrik', 'Mekanik', 'Yüksekte çalışma', 'Kaldırma / taşıma', 'Yangın / patlama', 'Kimyasal', 'Kapalı alan', 'Ergonomi', 'Gürültü / fiziksel etken', 'Diğer'], refs: [['ohsRisks', 'hazardCategory']] },
    { key: 'environmentalFactors', title: 'Çevresel risk faktörleri', group: 'İSG ve çevre', defaults: ['Uygulanmaz', 'Atık oluşumu', 'Kimyasal dökülme / sızıntı', 'Hava emisyonu / toz', 'Atık su / su kirliliği', 'Toprak kirliliği', 'Gürültü / titreşim', 'Enerji tüketimi', 'Su tüketimi', 'Doğal kaynak kullanımı', 'Biyoçeşitlilik', 'Diğer'], refs: [['ohsRisks', 'environmentalFactor']] },
    { key: 'affectedGroups', title: 'Etkilenen kişi / çevresel alıcı', group: 'İSG ve çevre', defaults: ['Çalışanlar', 'Çalışanlar ve taşeronlar', 'Ziyaretçiler', 'Tüm saha personeli', 'Hava', 'Su', 'Toprak', 'Doğal kaynaklar', 'Flora / fauna', 'Çevre halkı', 'Birden fazla alıcı'], refs: [['ohsRisks', 'affectedPeople']] },
    { key: 'controlMethods', title: 'Kontrol yöntemleri', group: 'İSG ve çevre', defaults: ['Tehlikeyi ortadan kaldırma', 'İkame', 'Mühendislik önlemi', 'İdari önlem', 'KKD'], refs: [['ohsRisks', 'controlMethod']] },
    { key: 'ohsActionStatuses', title: 'İSG faaliyet durumları', group: 'İSG ve çevre', defaults: ['Açık', 'Devam ediyor', 'Doğrulama bekliyor'], refs: [['ohsRisks', 'status']], protectDefaults: true },
    { key: 'ohsApprovalStatuses', title: 'İSG onay durumları', group: 'İSG ve çevre', defaults: ['Taslak', 'Onay bekliyor', 'Onaylandı', 'İptal'], system: true, note: 'Onay, kapatma ve arşivleme kurallarına bağlıdır.' },
    { key: 'fineKinneyProbability', title: 'Fine–Kinney olasılık', group: 'İSG ve çevre', defaults: ['0,2 — Pratik olarak imkânsız', '0,5 — Çok düşük', '1 — Olası değil', '3 — Olası', '6 — Yüksek olasılık', '10 — Beklenir'], system: true, note: 'Sayısal risk hesabının sabit katsayılarıdır.' },
    { key: 'fineKinneyFrequency', title: 'Fine–Kinney sıklık', group: 'İSG ve çevre', defaults: ['0,5 — Yılda birkaç kez', '1 — Ayda bir', '2 — Ayda birkaç kez', '3 — Haftalık', '6 — Günlük', '10 — Sürekli'], system: true, note: 'Sayısal risk hesabının sabit katsayılarıdır.' },
    { key: 'fineKinneySeverity', title: 'Fine–Kinney şiddet', group: 'İSG ve çevre', defaults: ['1 — Ramak kala', '3 — Hafif yaralanma', '7 — Ciddi yaralanma', '15 — Kalıcı hasar', '40 — Ölümcül', '100 — Çoklu ölüm'], system: true, note: 'Sayısal risk hesabının sabit katsayılarıdır.' },

    { key: 'activityKinds', title: 'Geçmiş / hareket türleri', group: 'Sistem görünümü', defaults: ['Görev', 'Maliyet', 'Dosya', 'Tedarikçi', 'Güncelleme'], system: true, note: 'Hareket kaydı filtre anahtarlarına bağlıdır.' },
    { key: 'ganttRanges', title: 'Gantt görünüm aralıkları', group: 'Sistem görünümü', defaults: ['Tüm dönem', '6 ay', '1 yıl', '2 yıl'], system: true, note: 'Zaman ölçeği hesaplarının sabit aralıklarıdır.' },

    { key: 'automaticProjects', title: 'Projeler', group: 'Otomatik listeler', defaults: [], automatic: true, note: 'Projeler ekranındaki aktif kayıtlardan oluşur.' },
    { key: 'automaticUsers', title: 'Kullanıcılar / personel', group: 'Otomatik listeler', defaults: [], automatic: true, note: 'Giriş hesapları ve personel kayıtlarından oluşur.' },
    { key: 'automaticSuppliers', title: 'Tedarikçiler', group: 'Otomatik listeler', defaults: [], automatic: true, note: 'Her projenin Tedarikçiler sekmesinden oluşur.' },
    { key: 'automaticTasks', title: 'Görev ve bağımlılık seçenekleri', group: 'Otomatik listeler', defaults: [], automatic: true, note: 'Projenin güncel görev kayıtlarından oluşur.' },
    { key: 'automaticFiles', title: 'Doküman / belge seçenekleri', group: 'Otomatik listeler', defaults: [], automatic: true, note: 'Yüklenmiş proje ve görev belgelerinden oluşur.' }
  ];

  data.listSettings = data.listSettings && typeof data.listSettings === 'object' && !Array.isArray(data.listSettings) ? data.listSettings : {};
  const findDefinition = key => catalog.find(item => item.key === key);
  const valuesFor = definition => {
    if (definition.special === 'categories') return unique(data.categories);
    return unique(data.listSettings[definition.key] || definition.defaults);
  };
  const get = (key, fallback = []) => {
    const definition = findDefinition(key);
    if (definition) return valuesFor(definition);
    return unique(data.listSettings[key] || fallback);
  };

  function targets(definition, value) {
    const found = [];
    (definition.refs || []).forEach(([collection, path, filter]) => {
      (Array.isArray(data[collection]) ? data[collection] : []).forEach(record => {
        if (filter && !filter(record)) return;
        if (path.includes('[].')) {
          const [arrayName, field] = path.split('[].');
          (Array.isArray(record[arrayName]) ? record[arrayName] : []).forEach(child => {
            if (child?.[field] === value) found.push({ record: child, field });
          });
        } else if (record?.[path] === value) found.push({ record, field: path });
      });
    });
    return found;
  }

  function store(definition, values) {
    const cleaned = unique(values);
    if (definition.special === 'categories') data.categories = cleaned;
    data.listSettings[definition.key] = cleaned;
  }

  function assertAdmin() {
    if (currentUser?.role === 'Yönetici') return true;
    toast('Liste ayarlarını yalnızca yöneticiler değiştirebilir.');
    return false;
  }

  function addItem(key) {
    if (!assertAdmin()) return;
    const definition = findDefinition(key);
    if (!definition || definition.system || definition.automatic) return;
    const value = prompt(`${definition.title} için yeni seçenek`)?.trim();
    if (!value) return;
    const values = valuesFor(definition);
    if (values.some(item => item.toLocaleLowerCase('tr') === value.toLocaleLowerCase('tr'))) return toast('Bu seçenek listede zaten var.');
    values.push(value);
    store(definition, values);
    if (definition.key === 'resourceGroups') {
      data.capacityRecords ??= [];
      if (!data.capacityRecords.some(record => record.name === value)) data.capacityRecords.push({ id: Date.now(), name: value, monthlyCapacity: 160 });
    }
    save();
    toast('Liste seçeneği eklendi.');
  }

  function renameItem(key, index) {
    if (!assertAdmin()) return;
    const definition = findDefinition(key), values = definition && valuesFor(definition), oldValue = values?.[index];
    if (!definition || definition.system || definition.automatic || oldValue == null) return;
    if (definition.protectDefaults && definition.defaults.includes(oldValue)) return toast('Bu seçenek iş akışının zorunlu sistem değeridir; adı değiştirilemez.');
    const value = prompt('Yeni seçenek adı', oldValue)?.trim();
    if (!value || value === oldValue) return;
    if (values.some((item, itemIndex) => itemIndex !== index && item.toLocaleLowerCase('tr') === value.toLocaleLowerCase('tr'))) return toast('Bu seçenek listede zaten var.');
    const linked = targets(definition, oldValue);
    if (linked.length && !confirm(`${linked.length} bağlı kayıt da “${value}” olarak güncellenecek. Devam edilsin mi?`)) return;
    linked.forEach(target => { target.record[target.field] = value; });
    values[index] = value;
    store(definition, values);
    save();
    toast(linked.length ? `Seçenek ve ${linked.length} bağlı kayıt güncellendi.` : 'Liste seçeneği güncellendi.');
  }

  function deleteItem(key, index) {
    if (!assertAdmin()) return;
    const definition = findDefinition(key), values = definition && valuesFor(definition), value = values?.[index];
    if (!definition || definition.system || definition.automatic || value == null) return;
    if (definition.protectDefaults && definition.defaults.includes(value)) return toast('Bu seçenek iş akışının zorunlu sistem değeridir; silinemez.');
    const linked = targets(definition, value);
    if (linked.length) return toast(`Bu seçenek ${linked.length} kayıtta kullanılıyor. Önce bağlı kayıtları değiştirin.`);
    if (values.length <= 1) return toast('Listede en az bir seçenek kalmalıdır.');
    if (!confirm(`“${value}” listeden silinsin mi?`)) return;
    values.splice(index, 1);
    store(definition, values);
    save();
    toast('Liste seçeneği silindi.');
  }

  function card(definition) {
    const values = valuesFor(definition);
    const type = definition.automatic ? 'Kaynağından yönetilir' : definition.system ? 'Sistem listesi' : definition.protectDefaults ? 'Korumalı iş akışı' : 'Düzenlenebilir';
    return `<article class="list-setting-card" data-list-card="${definition.key}" data-list-search="${esc(`${definition.group} ${definition.title} ${values.join(' ')}`.toLocaleLowerCase('tr'))}">
      <header><div><span>${esc(definition.group)}</span><h3>${esc(definition.title)}</h3><small>${esc(type)} · ${values.length || 'Otomatik'} seçenek</small></div>${!definition.system && !definition.automatic ? `<button type="button" class="secondary" data-list-add="${definition.key}">+ Ekle</button>` : '<i class="list-lock">◆</i>'}</header>
      ${definition.note ? `<p class="list-setting-note">${esc(definition.note)}</p>` : ''}
      ${definition.automatic ? '<div class="list-source-note">Bu liste burada kopyalanmaz; güncel kayıtlar ilgili çalışma ekranından otomatik gelir.</div>' : `<div class="list-setting-items">${values.map((value, index) => {
        const linked = targets(definition, value).length;
        const protectedItem = definition.system || (definition.protectDefaults && definition.defaults.includes(value));
        return `<div><span title="${esc(value)}">${esc(value)}</span><b>${linked ? `${linked} kullanım` : protectedItem ? 'Zorunlu' : 'Kullanılmıyor'}</b>${protectedItem ? '<em title="Sistem bağlantısı korunuyor">Kilitli</em>' : `<button type="button" class="edit" data-list-edit="${definition.key}" data-list-index="${index}" title="Adını değiştir">✎</button><button type="button" class="delete" data-list-delete="${definition.key}" data-list-index="${index}" title="Sil">×</button>`}</div>`;
      }).join('')}</div>`}
    </article>`;
  }

  function render() {
    const root = document.querySelector('#listSettingsPanel');
    if (!root) return;
    if (currentUser?.role !== 'Yönetici') {
      root.innerHTML = '<div class="empty">Liste ayarlarını yalnızca yöneticiler görüntüleyebilir.</div>';
      return;
    }
    const groups = [...new Set(catalog.map(item => item.group))];
    root.innerHTML = `<div class="list-settings-head"><div><h3>Merkezi liste ayarları</h3><p>Formlardaki gömülü seçim listelerini buradan yönetin. Kullanılan bir seçenek silinemez; ad değişikliği bağlı kayıtlara birlikte uygulanır.</p></div><div class="list-settings-summary"><strong>${catalog.filter(item => !item.automatic).length}</strong><span>tanımlı liste</span></div></div>
      <div class="list-settings-toolbar"><input id="listSettingsSearch" type="search" placeholder="Liste veya seçenek ara..."><select id="listSettingsGroup"><option value="">Tüm bölümler</option>${groups.map(group => `<option>${esc(group)}</option>`).join('')}</select></div>
      <div class="list-settings-legend"><span><i class="editable"></i>Düzenlenebilir</span><span><i class="protected"></i>Zorunlu seçenekleri korumalı</span><span><i class="automatic"></i>Kaynağından otomatik</span></div>
      <div class="list-settings-grid">${catalog.map(card).join('')}</div>`;
    const filter = () => {
      const query = root.querySelector('#listSettingsSearch').value.trim().toLocaleLowerCase('tr');
      const group = root.querySelector('#listSettingsGroup').value;
      root.querySelectorAll('[data-list-card]').forEach(element => {
        const definition = findDefinition(element.dataset.listCard);
        element.hidden = Boolean((group && definition.group !== group) || (query && !element.dataset.listSearch.includes(query)));
      });
    };
    root.querySelector('#listSettingsSearch').oninput = filter;
    root.querySelector('#listSettingsGroup').onchange = filter;
    root.querySelectorAll('[data-list-add]').forEach(button => button.onclick = () => addItem(button.dataset.listAdd));
    root.querySelectorAll('[data-list-edit]').forEach(button => button.onclick = () => renameItem(button.dataset.listEdit, +button.dataset.listIndex));
    root.querySelectorAll('[data-list-delete]').forEach(button => button.onclick = () => deleteItem(button.dataset.listDelete, +button.dataset.listIndex));
    applyPermissions();
  }

  window.PolProLists = { get, catalog: () => catalog.map(definition => ({ ...definition, values: valuesFor(definition) })) };
  window.PolProListSettings = { render };
})();
