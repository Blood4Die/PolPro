(function () {
  const initialDataSnapshot = JSON.stringify(data);
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const daysBetween = (start, end) => {
    if (!start || !end) return 0;
    return Math.max(0, Math.round((new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000) + 1);
  };
  const statusClass = value => String(value || '').toLocaleLowerCase('tr')
    .replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ğ', 'g').replaceAll('ü', 'u').replaceAll('ö', 'o').replaceAll('ç', 'c').replace(/[^a-z0-9]+/g, '-');
  const selectOptions = (name, values, placeholder = '') => `<select name="${name}" ${placeholder ? 'required' : ''}>${placeholder ? `<option value="">${placeholder}</option>` : ''}${values.map(value => `<option>${value}</option>`).join('')}</select>`;

  const workPackages = ['İhtiyaçların Belirlenmesi', 'Konsept Tasarım', 'Mühendislik ve Tasarım', 'Detay Mühendislik', 'Mekanik Tasarım', 'Elektrik ve Otomasyon Tasarımı', 'Malzeme Listesi', 'Satın Alma', 'Saha Hazırlığı ve İnşaat', 'Lazer Kesim', 'Kaynak', 'Talaşlı İmalat', 'Boya ve Yüzey İşlemleri', 'Mekanik Montaj', 'Elektrik Montajı', 'Elektrik ve Otomasyon', 'Yazılım', 'Test ve Devreye Alma', 'Teslim ve Eğitim', 'Müşteri Kabulü'];
  const resourceGroups = ['Mekanik Tasarım', 'Satın Alma', 'İnşaat / Saha', 'Elektrik Tasarım', 'Elektrik', 'Kaynak Atölyesi', 'CNC', 'Montaj', 'Otomasyon', 'Test Alanı', 'Eğitim', 'Proje Yönetimi'];
  const projectStatuses = ['Planlama', 'Tasarım', 'Satın Alma', 'İmalat', 'Montaj', 'Devreye Alma', 'Kabul', 'Tamamlandı', 'Beklemede'];
  const riskLevels = { Düşük: 1, Orta: 2, Yüksek: 3 };
  const costFields = ['amount', 'budgetAmount', 'orderedAmount', 'remainingEstimate', 'costImpact', 'totalCost'];

  ['Hammadde', 'Hazır Satın Alınan Malzemeler', 'Mekanik Ekipman', 'Elektrik ve Otomasyon', 'Dış Hizmet', 'Nakliye', 'Montaj', 'Devreye Alma', 'Seyahat', 'Beklenmeyen Giderler'].forEach(category => {
    if (!costCategories.includes(category)) costCategories.push(category);
  });

  data.procurements ??= [];
  data.manufacturings ??= [];
  data.risks ??= [];
  data.issues ??= [];
  data.changes ??= [];
  data.actions ??= [];
  data.documents ??= [];
  data.qualityRecords ??= [];
  data.closures ??= [];
  data.capacityRecords ??= resourceGroups.map((name, index) => ({ id: 8000 + index, name, monthlyCapacity: index === 2 || index === 3 || index === 4 ? 320 : 160 }));

  data.projects.forEach((record, index) => {
    record.code ??= `PRJ-${String(index + 1).padStart(4, '0')}`;
    record.team ??= [];
    record.scope ??= '';
    record.objective ??= '';
    record.priority ??= 'Orta';
    record.projectStatus ??= progress(record.id) >= 100 ? 'Tamamlandı' : 'Planlama';
    record.completion ??= '';
    record.folderUrl ??= '';
    record.technicalUrl ??= '';
  });
  data.tasks.forEach(record => {
    record.workPackage ??= 'İhtiyaçların Belirlenmesi';
    record.actualStart ??= '';
    record.actualEnd ??= '';
    record.predecessorId ??= '';
    record.completion ??= record.status === 'done' ? 100 : record.status === 'doing' ? 50 : 0;
    record.description ??= '';
    record.delayReason ??= '';
    record.accountable ??= record.assignee;
    record.consulted ??= [];
    record.informed ??= [];
    record.milestone ??= 'false';
    record.milestoneName ??= '';
    record.resourceGroup ??= 'Mekanik Tasarım';
    record.effortHours ??= 8;
  });
  data.costs.forEach(record => {
    record.budgetAmount ??= 0;
    record.orderedAmount ??= 0;
    record.remainingEstimate ??= 0;
  });
  data.files.forEach(record => { record.taskId ??= null; });
  data.actions.forEach(record => {
    record.participants = Array.isArray(record.participants) ? record.participants : [];
    record.externalParticipants ??= '';
  });

  fields.project = [
    ['code', 'Proje kodu', 'text', ''], ['name', 'Proje adı', 'text', ''],
    ['client', 'Müşteri / Talep eden bölüm', 'text', 'full'], ['projectImage', 'Proje kapak görseli', 'projectImage', 'full'],
    ['managers', 'Proje lideri', 'userSelect', 'full'], ['team', 'Proje ekibi', 'userMultiOptional', 'full'],
    ['start', 'Başlangıç tarihi', 'date', ''], ['end', 'Hedef bitiş tarihi', 'date', ''],
    ['priority', 'Öncelik seviyesi', 'priority', ''], ['projectStatus', 'Proje durumu', 'projectStatus', ''],
    ['completion', 'Tamamlanma yüzdesi', 'percentageOptional', ''], ['budget', 'Proje bütçesi', 'number', ''],
    ['scope', 'Proje kapsamı', 'textarea', 'full'], ['objective', 'Proje amacı', 'textarea', 'full'],
    ['folderUrl', 'Proje klasörü bağlantısı', 'urlOptional', ''], ['technicalUrl', 'Teknik doküman bağlantısı', 'urlOptional', '']
  ];
  fields.task = [
    ['title', 'Görev adı', 'text', 'full'], ['projectId', 'Proje', 'project', ''], ['workPackage', 'Ana iş paketi', 'workPackage', ''],
    ['assignee', 'R — İşi yapan kişi / birim', 'taskAssignee', ''], ['accountable', 'A — Sonuçtan sorumlu', 'userSelect', ''],
    ['consulted', 'C — Görüşü alınanlar', 'userMultiOptional', 'full'], ['informed', 'I — Bilgilendirilenler', 'userMultiOptional', 'full'],
    ['status', 'Durum', 'status', ''], ['priority', 'Öncelik', 'priority', ''],
    ['start', 'Planlanan başlangıç', 'date', ''], ['end', 'Planlanan bitiş', 'date', ''],
    ['actualStart', 'Gerçekleşen başlangıç', 'dateOptional', ''], ['actualEnd', 'Gerçekleşen bitiş', 'dateOptional', ''],
    ['predecessorId', 'Önceki göreve bağlılık', 'taskPredecessor', 'full'],
    ['completion', 'Tamamlanma yüzdesi', 'percentage', ''], ['milestone', 'Kilometre taşı', 'yesNo', ''], ['milestoneName', 'Kilometre taşı türü', 'milestoneType', 'full'],
    ['resourceGroup', 'Kaynak / Kapasite grubu', 'resourceGroup', ''], ['effortHours', 'Planlanan efor (saat)', 'number', ''],
    ['description', 'Açıklama', 'textareaOptional', 'full'], ['delayReason', 'Gecikme nedeni', 'textareaOptional', 'full'],
    ['taskFiles', 'Görev belgeleri', 'taskFiles', 'full']
  ];
  fields.cost = [
    ['description', 'Maliyet kalemi', 'text', 'full'], ['projectId', 'Proje bağlantısı', 'projectOptional', ''], ['date', 'Tarih', 'date', ''],
    ['costType', 'Maliyet türü', 'costType', ''], ['category', 'Gider kategorisi', 'category', ''], ['vendor', 'Kayıtlı tedarikçi / Kaynak', 'supplierSelectWithAdd', 'full'],
    ['budgetAmount', 'Kalem bütçesi', 'currencyOptional', ''], ['orderedAmount', 'Sipariş tutarı', 'currencyOptional', ''],
    ['amount', 'Gerçekleşen tutar', 'number', ''], ['remainingEstimate', 'Kalan iş tahmini', 'currencyOptional', '']
  ];
  fields.procurement = [
    ['projectId', 'Proje', 'project', ''], ['materialCode', 'Malzeme kodu', 'text', ''], ['materialDescription', 'Malzeme tanımı', 'text', 'full'],
    ['technicalSpec', 'Teknik özellik', 'textarea', 'full'], ['quantity', 'Miktar', 'number', ''], ['requestDate', 'Talep tarihi', 'date', ''],
    ['quoteStatus', 'Teklif durumu', 'quoteStatus', ''], ['vendor', 'Kayıtlı tedarikçi', 'supplierSelect', ''], ['orderDate', 'Sipariş tarihi', 'dateOptional', ''],
    ['dueDate', 'Termin tarihi', 'date', ''], ['actualDeliveryDate', 'Gerçek teslim tarihi', 'dateOptional', ''],
    ['receivedQuantity', 'Gelen miktar', 'numberOptional', ''], ['qualityResult', 'Kalite kontrol sonucu', 'qualityResult', ''],
    ['owner', 'Satın alma sorumlusu', 'userSelect', ''], ['longLead', 'Uzun terminli ürün', 'yesNo', '']
  ];
  fields.manufacturing = [
    ['projectId', 'Proje', 'project', ''], ['operation', 'İmalat operasyonu', 'workPackage', ''], ['description', 'İş tanımı', 'text', 'full'],
    ['resourceGroup', 'İş merkezi / Kaynak', 'resourceGroup', ''], ['responsible', 'Sorumlu kişi', 'userSelect', ''],
    ['plannedStart', 'Planlanan başlangıç', 'date', ''], ['plannedEnd', 'Planlanan bitiş', 'date', ''],
    ['actualStart', 'Gerçek başlangıç', 'dateOptional', ''], ['actualEnd', 'Gerçek bitiş', 'dateOptional', ''],
    ['plannedQuantity', 'Planlanan miktar', 'number', ''], ['producedQuantity', 'Üretilen miktar', 'numberOptional', ''],
    ['completion', 'Tamamlanma yüzdesi', 'percentage', ''], ['status', 'Durum', 'manufacturingStatus', '']
  ];
  fields.risk = [
    ['projectId', 'Proje', 'project', ''], ['description', 'Risk tanımı', 'textarea', 'full'], ['probability', 'Olasılık', 'riskLevel', ''],
    ['impact', 'Etki', 'riskLevel', ''], ['owner', 'Sorumlu kişi', 'userSelect', ''], ['targetDate', 'Hedef tarih', 'date', ''],
    ['preventiveAction', 'Önleyici faaliyet', 'textarea', 'full'], ['contingencyPlan', 'Alternatif plan', 'textareaOptional', 'full'], ['status', 'Güncel durum', 'riskStatus', 'full']
  ];
  fields.issue = [
    ['projectId', 'Proje', 'project', ''], ['title', 'Sorun başlığı', 'text', ''], ['owner', 'Sorumlu kişi', 'userSelect', ''],
    ['description', 'Sorun tanımı', 'textarea', 'full'], ['correctiveAction', 'Çözüm / Düzeltici faaliyet', 'textarea', 'full'],
    ['targetDate', 'Hedef tarih', 'date', ''], ['status', 'Durum', 'issueStatus', '']
  ];
  fields.change = [
    ['projectId', 'Proje', 'project', ''], ['request', 'Değişiklik talebi', 'textarea', 'full'], ['requestedBy', 'Talep eden kişi', 'userSelect', ''],
    ['reason', 'Gerekçe', 'textarea', 'full'], ['technicalImpact', 'Teknik etkisi', 'textarea', 'full'],
    ['scheduleImpactDays', 'Termin etkisi (gün)', 'numberOptional', ''], ['costImpact', 'Maliyet etkisi', 'currencyOptional', ''],
    ['approvalStatus', 'Onay durumu', 'changeStatus', ''], ['responsible', 'Uygulama sorumlusu', 'userSelect', ''], ['revision', 'Revizyon numarası', 'text', '']
  ];
  fields.action = [
    ['projectId', 'Proje', 'project', ''], ['meetingDate', 'Toplantı tarihi', 'date', ''], ['meetingTitle', 'Toplantı / Konu', 'text', 'full'],
    ['participants', 'Kayıtlı kullanıcı katılımcıları', 'userMultiOptional', 'full'], ['externalParticipants', 'Diğer katılımcılar (manuel)', 'textareaOptional', 'full'],
    ['decision', 'Alınan karar', 'textarea', 'full'], ['action', 'Aksiyon', 'textarea', 'full'], ['owner', 'Sorumlu kişi', 'userSelect', ''],
    ['targetDate', 'Hedef tarih', 'date', ''], ['status', 'Aksiyon durumu', 'actionStatus', ''], ['relatedTaskId', 'İlgili görev', 'taskPredecessor', 'full'],
    ['description', 'Açıklama / Toplantı notu', 'textareaOptional', 'full']
  ];
  fields.document = [
    ['projectId', 'Proje', 'project', ''], ['fileId', 'Yüklenmiş dosya', 'projectFile', ''], ['documentType', 'Doküman türü', 'documentType', ''],
    ['documentNo', 'Doküman numarası', 'text', ''], ['revision', 'Revizyon numarası', 'text', ''], ['revisionDate', 'Revizyon tarihi', 'date', ''],
    ['preparedBy', 'Hazırlayan', 'userSelect', ''], ['checkedBy', 'Kontrol eden', 'userSelect', ''], ['approvedBy', 'Onaylayan', 'userSelect', ''],
    ['approvalStatus', 'Onay durumu', 'documentStatus', ''], ['revisionNote', 'Revizyon açıklaması', 'textarea', 'full']
  ];
  fields.qualityRecord = [
    ['projectId', 'Proje', 'project', ''], ['controlType', 'Kontrol / Test türü', 'qualityType', ''], ['status', 'Sonuç', 'qualityStatus', ''],
    ['nonconformity', 'Uygunsuzluk tanımı', 'textareaOptional', 'full'], ['photoUrl', 'Fotoğraf bağlantısı', 'urlOptional', ''],
    ['department', 'Sorumlu bölüm', 'text', ''], ['correctiveAction', 'Düzeltici faaliyet', 'textareaOptional', 'full'],
    ['closureDate', 'Kapanış tarihi', 'dateOptional', ''], ['approvedBy', 'Onaylayan kişi', 'userSelect', '']
  ];
  fields.closure = [
    ['projectId', 'Proje', 'project', ''], ['actualEnd', 'Gerçek bitiş tarihi', 'date', ''], ['totalCost', 'Toplam maliyet', 'currencyOptional', ''],
    ['openItems', 'Açık kalan işler', 'textareaOptional', 'full'], ['warrantyStart', 'Garanti başlangıcı', 'dateOptional', ''], ['warrantyEnd', 'Garanti bitişi', 'dateOptional', ''],
    ['spareParts', 'Yedek parça listesi', 'textareaOptional', 'full'], ['maintenancePlan', 'Bakım planı', 'textareaOptional', 'full'],
    ['manualUrl', 'Kullanım kılavuzu bağlantısı', 'urlOptional', 'full'], ['lessonsLearned', 'Öğrenilen dersler', 'textarea', 'full'],
    ['customerSatisfaction', 'Müşteri memnuniyeti', 'satisfaction', ''], ['approvedBy', 'Kapanışı onaylayan', 'userSelect', '']
  ];
  fields.capacityRecord = [['name', 'Kaynak / Kapasite grubu', 'text', 'full'], ['monthlyCapacity', 'Aylık kapasite (saat)', 'number', 'full']];

  const baseInput = input;
  input = function (id, type) {
    const activeUsers = data.users.filter(user => user.active);
    if (type === 'textarea') return `<textarea name="${id}" rows="3" required></textarea>`;
    if (type === 'textareaOptional') return `<textarea name="${id}" rows="3"></textarea>`;
    if (type === 'dateOptional') return `<input name="${id}" type="date">`;
    if (type === 'urlOptional') return `<input name="${id}" type="url" placeholder="https:// veya file bağlantısı">`;
    if (type === 'numberOptional' || type === 'currencyOptional') return `<input name="${id}" type="number" min="0" step="0.01">`;
    if (type === 'percentage') return `<input name="${id}" type="number" min="0" max="100" step="1" value="0" required>`;
    if (type === 'percentageOptional') return `<input name="${id}" type="number" min="0" max="100" step="1" placeholder="Görevlerden hesapla">`;
    if (type === 'userMultiOptional') return `<select name="${id}" multiple size="${Math.min(5, Math.max(3, activeUsers.length))}" class="multi-select">${activeUsers.map(user => `<option value="${user.name}">${user.name} · ${user.category}</option>`).join('')}</select><span class="field-hint">Birden fazla kişi için Ctrl tuşunu kullanın.</span>`;
    if (type === 'projectStatus') return selectOptions(id, projectStatuses);
    if (type === 'workPackage') return selectOptions(id, workPackages);
    if (type === 'resourceGroup') return selectOptions(id, resourceGroups);
    if (type === 'taskPredecessor') return `<select name="${id}"><option value="">Bağlantı yok</option>${data.tasks.filter(task => String(task.id) !== String(editingId)).map(task => `<option value="${task.id}">${project(task.projectId)?.code || ''} · ${task.title}</option>`).join('')}</select>`;
    if (type === 'yesNo') return `<select name="${id}"><option value="false">Hayır</option><option value="true">Evet</option></select>`;
    if (type === 'milestoneType') return `<select name="${id}"><option value="">Seçilmedi</option>${['Tasarım Onayı', 'Malzeme Siparişi', 'İmalat Başlangıcı', 'Montaj Başlangıcı', 'FAT', 'SAT', 'Proje Teslimi'].map(value => `<option>${value}</option>`).join('')}</select>`;
    if (type === 'quoteStatus') return selectOptions(id, ['Talep Açıldı', 'Teklif Bekleniyor', 'Teklif Alındı', 'Onaylandı', 'Sipariş Verildi', 'İptal']);
    if (type === 'qualityResult') return selectOptions(id, ['Bekliyor', 'Uygun', 'Şartlı Kabul', 'Uygun Değil']);
    if (type === 'manufacturingStatus') return selectOptions(id, ['Planlandı', 'Devam Ediyor', 'Kontrolde', 'Tamamlandı', 'Beklemede']);
    if (type === 'riskLevel') return selectOptions(id, ['Düşük', 'Orta', 'Yüksek']);
    if (type === 'riskStatus') return selectOptions(id, ['Açık', 'İzleniyor', 'Azaltıldı', 'Gerçekleşti', 'Kapandı']);
    if (type === 'issueStatus') return selectOptions(id, ['Açık', 'Devam Ediyor', 'Çözüldü', 'Kapandı']);
    if (type === 'changeStatus') return selectOptions(id, ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Reddedildi', 'Uygulandı']);
    if (type === 'actionStatus') return selectOptions(id, ['Açık', 'Devam Ediyor', 'Tamamlandı', 'Gecikti', 'İptal']);
    if (type === 'projectFile') { const files = currentDetailId ? data.files.filter(file => file.projectId === currentDetailId) : data.files; return `<select name="${id}" required><option value="">Dosya seçin</option>${files.map(file => `<option value="${file.id}">${project(file.projectId)?.code || ''} · ${esc(file.name)}</option>`).join('')}</select>`; }
    if (type === 'documentType') return selectOptions(id, ['Teknik Şartname', 'Konsept Çizimi', '3D Model', 'İmalat Resmi', 'Elektrik Şeması', 'PLC Yazılımı', 'Malzeme Listesi', 'Kullanım Kılavuzu', 'Test Raporu', 'Kabul Tutanağı']);
    if (type === 'documentStatus') return selectOptions(id, ['Taslak', 'Kontrolde', 'Onaylandı', 'İptal']);
    if (type === 'qualityType') return selectOptions(id, ['Giriş Kalite Kontrol', 'Kaynak Kontrolü', 'Ölçü Kontrolü', 'Boyutsal Rapor', 'Elektrik Güvenlik Testi', 'Basınç Testi', 'Fonksiyon Testi', 'Boşta Çalışma Testi', 'Yük Altında Çalışma Testi', 'FAT', 'SAT', 'Eksik İşler Listesi', 'Müşteri Kabul Tutanağı']);
    if (type === 'qualityStatus') return selectOptions(id, ['Planlandı', 'Uygun', 'Şartlı Kabul', 'Uygunsuz', 'Kapandı']);
    if (type === 'satisfaction') return `<select name="${id}"><option value="1">1 — Çok düşük</option><option value="2">2 — Düşük</option><option value="3">3 — Orta</option><option value="4">4 — İyi</option><option value="5">5 — Çok iyi</option></select>`;
    return baseInput(id, type);
  };

  window.setupSmartTaskForm = function (item = {}, context = {}) {
    const form = $('#formFields');
    if (!form) return;
    const field = name => {
      const control = form.querySelector(`[name="${name}"]`);
      return control?.closest('.form-field') || control?.closest('label');
    };
    const status = form.querySelector('[name="status"]');
    const milestone = form.querySelector('[name="milestone"]');
    const start = form.querySelector('[name="start"]');
    const end = form.querySelector('[name="end"]');
    const projectField = field('projectId');
    const actualStartField = field('actualStart');
    const actualEndField = field('actualEnd');
    const completionField = field('completion');
    const milestoneNameField = field('milestoneName');
    const delayReasonField = field('delayReason');
    const taskFilesField = field('taskFiles');

    if (context.lockProject && projectField) projectField.hidden = true;

    const durationHint = document.createElement('span');
    durationHint.className = 'field-hint task-duration-hint';
    end?.closest('label')?.append(durationHint);
    const syncDuration = () => {
      const duration = daysBetween(start?.value, end?.value);
      durationHint.textContent = duration ? `Planlanan süre otomatik: ${duration} gün` : 'Süre başlangıç ve bitişten otomatik hesaplanır.';
    };
    start?.addEventListener('change', syncDuration);
    end?.addEventListener('change', syncDuration);

    const progressSection = document.createElement('section');
    progressSection.className = 'task-progress-fields full';
    progressSection.innerHTML = '<div class="task-form-section-head"><strong>Gerçekleşen / ilerleme</strong><small>Görev başladığında görünür.</small></div><div class="task-section-grid"></div>';
    const progressGrid = progressSection.querySelector('.task-section-grid');
    [actualStartField, actualEndField, completionField].forEach(node => node && progressGrid.append(node));

    const extraDetails = document.createElement('details');
    extraDetails.className = 'task-extra-fields full';
    extraDetails.innerHTML = '<summary>RACI ve ek ayrıntılar <small>İsteğe bağlı</small></summary><div class="task-section-grid"></div>';
    const extraGrid = extraDetails.querySelector('.task-section-grid');
    ['consulted', 'informed', 'predecessorId', 'milestone', 'milestoneName', 'description', 'delayReason'].forEach(name => {
      const node = field(name);
      if (node) extraGrid.append(node);
    });
    form.insertBefore(progressSection, taskFilesField || null);
    form.insertBefore(extraDetails, taskFilesField || null);

    const hasExtraData = Boolean(
      (item.consulted || []).length || (item.informed || []).length || item.predecessorId ||
      item.milestone === 'true' || item.milestoneName || item.description || item.delayReason
    );
    extraDetails.open = hasExtraData;

    const syncConditionalFields = () => {
      const currentStatus = status?.value || 'todo';
      const hasProgress = currentStatus !== 'todo' || item.actualStart || item.actualEnd;
      progressSection.hidden = !hasProgress;
      if (actualStartField) actualStartField.hidden = currentStatus === 'todo' && !item.actualStart;
      if (actualEndField) actualEndField.hidden = currentStatus !== 'done' && !item.actualEnd;
      if (completionField) completionField.hidden = currentStatus === 'todo';
      if (milestoneNameField) milestoneNameField.hidden = milestone?.value !== 'true';
      const late = end?.value && end.value < todayIso() && currentStatus !== 'done';
      if (delayReasonField) delayReasonField.hidden = !late && !item.delayReason;
    };
    status?.addEventListener('change', syncConditionalFields);
    milestone?.addEventListener('change', syncConditionalFields);
    end?.addEventListener('change', syncConditionalFields);
    syncDuration();
    syncConditionalFields();
  };

  const panelToolbar = (title, description, type, buttonText) => `<div class="file-toolbar"><div><h3>${title}</h3><p>${description}</p></div>${type ? `<button class="primary permission-create" data-enterprise-add="${type}">+ ${buttonText}</button>` : ''}</div>`;
  const recordButtons = (type, id) => `<button class="edit" data-enterprise-edit="${type}:${id}" title="Düzenle">✎</button><button class="delete" data-enterprise-delete="${type}:${id}" title="Sil">×</button>`;
  const taskName = id => data.tasks.find(task => +task.id === +id)?.title || '—';
  const riskScore = record => (riskLevels[record.probability] || 1) * (riskLevels[record.impact] || 1);
  const completionBar = value => `<div class="mini-progress"><i style="width:${Math.max(0, Math.min(100, +value || 0))}%"></i><span>%${Math.round(+value || 0)}</span></div>`;
  const isLate = (end, complete = false) => !complete && end && end < todayIso();

  function bindEnterpriseActions(root, projectId = currentDetailId) {
    root?.querySelectorAll('[data-enterprise-add]').forEach(button => button.onclick = () => openDialog(button.dataset.enterpriseAdd, null, { projectId }));
    root?.querySelectorAll('[data-enterprise-edit]').forEach(button => button.onclick = () => {
      const [type, id] = button.dataset.enterpriseEdit.split(':');
      openDialog(type, id);
    });
    root?.querySelectorAll('[data-enterprise-delete]').forEach(button => button.onclick = () => {
      const [type, id] = button.dataset.enterpriseDelete.split(':'), collection = data[type + 's'];
      const record = collection?.find(item => String(item.id) === id);
      if (!record || !confirm('Bu kayıt silinsin mi?')) return;
      data[type + 's'] = collection.filter(item => String(item.id) !== id);
      addActivity(record.projectId || projectId, 'Kayıt silindi', record.title || record.description || record.materialDescription || record.request || record.nonconformity || type, type === 'document' ? 'file' : 'update');
      save();
      if (currentDetailId && $('#projectDetail').classList.contains('active')) renderProjectDetail();
    });
  }

  function renderProjectMaster(p) {
    const team = p.team?.length ? p.team.join(', ') : 'Ekip seçilmedi';
    const links = [p.folderUrl ? `<a href="${esc(p.folderUrl)}" target="_blank" rel="noopener">Proje klasörünü aç ↗</a>` : '', p.technicalUrl ? `<a href="${esc(p.technicalUrl)}" target="_blank" rel="noopener">Teknik dokümanları aç ↗</a>` : ''].filter(Boolean).join('');
    const master = `<section class="project-master-card panel"><div class="master-top"><div><span class="project-code">${esc(p.code)}</span><h3>${esc(p.name)}</h3><p>${esc(p.client)}</p></div><div class="master-badges"><span class="status-pill ${statusClass(p.projectStatus)}">${esc(p.projectStatus)}</span><span class="priority-pill ${statusClass(p.priority)}">${esc(p.priority)} öncelik</span></div></div><div class="master-grid"><div><span>Proje lideri</span><strong>${esc(managerNames(p))}</strong></div><div><span>Proje ekibi</span><strong>${esc(team)}</strong></div><div><span>Planlanan tarih</span><strong>${date(p.start)} – ${date(p.end)}</strong></div><div><span>Tamamlanma</span><strong>%${progress(p.id)}</strong></div><div class="wide"><span>Proje kapsamı</span><p>${esc(p.scope) || 'Kapsam henüz girilmedi.'}</p></div><div class="wide"><span>Proje amacı</span><p>${esc(p.objective) || 'Amaç henüz girilmedi.'}</p></div></div>${links ? `<div class="master-links">${links}</div>` : ''}</section>`;
    const summary = $('#detailSummary');
    if (summary && !summary.querySelector('.project-master-card')) summary.insertAdjacentHTML('afterbegin', master);
    const hero = $('#projectDetailHead');
    if (hero && !hero.querySelector('.hero-enterprise-meta')) hero.insertAdjacentHTML('beforeend', `<div class="hero-enterprise-meta"><span>${esc(p.code)}</span><b class="status-pill ${statusClass(p.projectStatus)}">${esc(p.projectStatus)}</b><b>${esc(p.priority)} öncelik</b></div>`);
  }

  function renderEnterpriseTasks(p) {
    const tasks = data.tasks.filter(task => task.projectId === p.id).sort((a, b) => a.start.localeCompare(b.start));
    const root = $('#detailTasks');
    root.innerHTML = `${panelToolbar('İş kırılım yapısı ve RACI', 'Ana iş paketleri, sorumluluklar, bağımlılıklar ve planlanan/gerçekleşen süreler.', 'task', 'Görev ekle')}<article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table"><thead><tr><th>İş paketi / Görev</th><th>RACI</th><th>Planlanan</th><th>Gerçekleşen</th><th>Bağlı görev</th><th>İlerleme</th><th>Durum</th><th></th></tr></thead><tbody>${tasks.map(task => {
      const planned = +task.durationDays || daysBetween(task.start, task.end), actual = daysBetween(task.actualStart, task.actualEnd), late = isLate(task.end, task.status === 'done');
      return `<tr class="${late ? 'row-late' : ''}"><td><span class="work-package">${esc(task.workPackage)}</span><strong>${task.milestone === 'true' ? '◆ ' : ''}${esc(task.title)}</strong>${task.milestoneName ? `<small>Kilometre taşı: ${esc(task.milestoneName)}</small>` : ''}${task.description ? `<small>${esc(task.description)}</small>` : ''}${late && task.delayReason ? `<em>Gecikme: ${esc(task.delayReason)}</em>` : ''}</td><td><small><b>R</b> ${esc(taskAssigneeLabel(task))}</small><small><b>A</b> ${esc(task.accountable || taskAssigneeLabel(task))}</small><small><b>C</b> ${esc((task.consulted || []).join(', ') || '—')}</small><small><b>I</b> ${esc((task.informed || []).join(', ') || '—')}</small></td><td>${date(task.start)}<br>${date(task.end)}<small>${planned} gün · ${+task.effortHours || 0} saat</small></td><td>${task.actualStart ? date(task.actualStart) : '—'}<br>${task.actualEnd ? date(task.actualEnd) : '—'}<small>${actual ? `${actual} gün` : 'Devam ediyor / başlamadı'}</small></td><td>${esc(taskName(task.predecessorId))}</td><td>${completionBar(task.completion)}</td><td><span class="status-pill ${statusClass(task.status)}">${task.status === 'todo' ? 'Yapılacak' : task.status === 'doing' ? 'Devam ediyor' : 'Tamamlandı'}</span></td><td>${recordButtons('task', task.id)}</td></tr>`;
    }).join('') || `<tr><td colspan="8">${empty('Bu projeye görev eklenmemiş.')}</td></tr>`}</tbody></table></div></article>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderEnterpriseCosts(p) {
    const costs = data.costs.filter(cost => cost.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date));
    const budget = costs.reduce((sum, cost) => sum + (+cost.budgetAmount || 0), 0) || p.budget;
    const ordered = costs.reduce((sum, cost) => sum + (+cost.orderedAmount || 0), 0);
    const actual = costs.reduce((sum, cost) => sum + (+cost.amount || 0), 0);
    const directLabor = costs.filter(cost => cost.costType === 'Direkt İşçilik').reduce((sum, cost) => sum + (+cost.amount || 0), 0);
    const indirectLabor = costs.filter(cost => cost.costType === 'Endirekt İşçilik').reduce((sum, cost) => sum + (+cost.amount || 0), 0);
    const nonLabor = costs.filter(cost => cost.costType === 'İşçilik Dışı').reduce((sum, cost) => sum + (+cost.amount || 0), 0);
    const remaining = costs.reduce((sum, cost) => sum + (+cost.remainingEstimate || 0), 0);
    const forecast = actual + remaining, deviation = forecast - budget;
    const root = $('#detailCosts');
    root.innerHTML = `${panelToolbar('Bütçe ve maliyet kontrolü', 'Direkt işçilik, endirekt işçilik ve işçilik dışı giderlerin ayrı izlendiği bütçe karşılaştırması.', 'cost', 'Maliyet kalemi ekle')}<div class="detail-cost-summary enterprise-kpis"><article><span>Kalem bütçesi</span><strong class="budget-text">${money(budget)}</strong></article><article class="direct-labor-summary"><span>Direkt işçilik</span><strong>${money(directLabor)}</strong></article><article class="indirect-labor-summary"><span>Endirekt işçilik</span><strong>${money(indirectLabor)}</strong></article><article><span>İşçilik dışı</span><strong class="expense-text">${money(nonLabor)}</strong></article><article><span>Sipariş</span><strong>${money(ordered)}</strong></article><article><span>Gerçekleşen</span><strong class="expense-text">${money(actual)}</strong></article><article><span>Tahmini final</span><strong class="${forecast > budget ? 'expense-text' : 'budget-text'}">${money(forecast)}</strong></article><article><span>Sapma</span><strong class="${deviation > 0 ? 'expense-text' : 'budget-text'}">${deviation > 0 ? '+' : ''}${money(deviation)}</strong></article></div><article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table"><thead><tr><th>Kalem</th><th>Maliyet türü</th><th>Kategori</th><th class="right">Bütçe</th><th class="right">Sipariş</th><th class="right">Gerçekleşen</th><th class="right">Kalan tahmin</th><th class="right">Final</th><th class="right">Sapma</th><th></th></tr></thead><tbody>${costs.map(cost => {
      const final = (+cost.amount || 0) + (+cost.remainingEstimate || 0), variance = final - (+cost.budgetAmount || 0);
      return `<tr><td><strong>${esc(cost.description)}</strong><small>${date(cost.date)} · ${esc(cost.vendor || '—')}</small></td><td><span class="cost-type ${cost.costType === 'Direkt İşçilik' ? 'direct-labor' : cost.costType === 'Endirekt İşçilik' ? 'indirect-labor' : 'non-labor'}">${esc(cost.costType)}</span></td><td><span class="category">${esc(cost.category)}</span></td><td class="right budget-text">${money(cost.budgetAmount)}</td><td class="right">${money(cost.orderedAmount)}</td><td class="right expense-text">${money(cost.amount)}</td><td class="right">${money(cost.remainingEstimate)}</td><td class="right"><strong>${money(final)}</strong></td><td class="right ${variance > 0 ? 'expense-text' : 'budget-text'}">${variance > 0 ? '+' : ''}${money(variance)}</td><td>${recordButtons('cost', cost.id)}</td></tr>`;
    }).join('') || `<tr><td colspan="10">${empty('Bu projeye maliyet kalemi eklenmemiş.')}</td></tr>`}</tbody></table></div></article>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderProcurement(p) {
    const records = data.procurements.filter(item => item.projectId === p.id).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    const root = $('#detailProcurement');
    root.innerHTML = `${panelToolbar('Satın alma ve malzeme takibi', 'Teklif, sipariş, termin, teslimat ve kalite kontrol süreci.', 'procurement', 'Satın alma kaydı')}<div class="module-stats"><article><span>Toplam kalem</span><strong>${records.length}</strong></article><article><span>Uzun terminli</span><strong>${records.filter(item => item.longLead === 'true').length}</strong></article><article><span>Geciken</span><strong class="expense-text">${records.filter(item => isLate(item.dueDate, +item.receivedQuantity >= +item.quantity)).length}</strong></article><article><span>Eksik teslim</span><strong>${records.filter(item => (+item.receivedQuantity || 0) < (+item.quantity || 0)).length}</strong></article></div><article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table procurement-table"><thead><tr><th>Malzeme</th><th>Teknik özellik</th><th>Miktar</th><th>Teklif / Tedarikçi</th><th>Sipariş</th><th>Termin / Teslim</th><th>Gelen / Eksik</th><th>Kalite</th><th>Sorumlu</th><th></th></tr></thead><tbody>${records.map(item => {
      const missing = Math.max(0, (+item.quantity || 0) - (+item.receivedQuantity || 0)), late = isLate(item.dueDate, missing === 0);
      return `<tr class="${late ? 'row-late' : ''} ${item.longLead === 'true' ? 'long-lead-row' : ''}"><td><span class="material-code">${esc(item.materialCode)}</span><strong>${esc(item.materialDescription)}</strong>${item.longLead === 'true' ? '<em>Uzun termin</em>' : ''}</td><td>${esc(item.technicalSpec)}</td><td>${esc(item.quantity)}</td><td><span class="status-pill ${statusClass(item.quoteStatus)}">${esc(item.quoteStatus)}</span><small>${esc(item.vendor)}</small></td><td>${item.orderDate ? date(item.orderDate) : '—'}</td><td><strong class="${late ? 'expense-text' : ''}">${date(item.dueDate)}</strong><small>${item.actualDeliveryDate ? date(item.actualDeliveryDate) : 'Teslim edilmedi'}</small></td><td>${+item.receivedQuantity || 0} / <b class="${missing ? 'expense-text' : 'budget-text'}">${missing} eksik</b></td><td><span class="status-pill ${statusClass(item.qualityResult)}">${esc(item.qualityResult)}</span></td><td>${esc(item.owner)}</td><td>${recordButtons('procurement', item.id)}</td></tr>`;
    }).join('') || `<tr><td colspan="10">${empty('Satın alma kaydı bulunmuyor.')}</td></tr>`}</tbody></table></div></article>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderManufacturing(p) {
    const records = data.manufacturings.filter(item => item.projectId === p.id).sort((a, b) => (a.plannedStart || '').localeCompare(b.plannedStart || ''));
    const root = $('#detailManufacturing');
    root.innerHTML = `${panelToolbar('İmalat takibi', 'İş merkezleri, üretim miktarları, planlanan ve gerçekleşen tarihler.', 'manufacturing', 'İmalat kaydı')}<article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table"><thead><tr><th>Operasyon / İş</th><th>İş merkezi</th><th>Sorumlu</th><th>Planlanan</th><th>Gerçekleşen</th><th>Miktar</th><th>İlerleme</th><th>Durum</th><th></th></tr></thead><tbody>${records.map(item => {
      const late = isLate(item.plannedEnd, item.status === 'Tamamlandı');
      return `<tr class="${late ? 'row-late' : ''}"><td><span class="work-package">${esc(item.operation)}</span><strong>${esc(item.description)}</strong></td><td>${esc(item.resourceGroup)}</td><td>${esc(item.responsible)}</td><td>${date(item.plannedStart)}<br>${date(item.plannedEnd)}</td><td>${item.actualStart ? date(item.actualStart) : '—'}<br>${item.actualEnd ? date(item.actualEnd) : '—'}</td><td>${+item.producedQuantity || 0} / ${+item.plannedQuantity || 0}</td><td>${completionBar(item.completion)}</td><td><span class="status-pill ${statusClass(item.status)}">${esc(item.status)}</span></td><td>${recordButtons('manufacturing', item.id)}</td></tr>`;
    }).join('') || `<tr><td colspan="9">${empty('İmalat kaydı bulunmuyor.')}</td></tr>`}</tbody></table></div></article>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderRisksAndIssues(p) {
    const risks = data.risks.filter(item => item.projectId === p.id).sort((a, b) => riskScore(b) - riskScore(a));
    const issues = data.issues.filter(item => item.projectId === p.id).sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''));
    const root = $('#detailRisks');
    root.innerHTML = `<div class="module-columns"><section>${panelToolbar('Risk kayıtları', 'Olasılık × etki puanı ile önleyici faaliyet takibi.', 'risk', 'Risk ekle')}<div class="risk-grid">${risks.map(item => {
      const score = riskScore(item), severity = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
      return `<article class="risk-card ${severity}"><div class="risk-card-head"><span>Risk puanı <b>${score}</b></span><span class="status-pill ${statusClass(item.status)}">${esc(item.status)}</span></div><h4>${esc(item.description)}</h4><dl><div><dt>Olasılık / Etki</dt><dd>${esc(item.probability)} / ${esc(item.impact)}</dd></div><div><dt>Sorumlu / Hedef</dt><dd>${esc(item.owner)} · ${date(item.targetDate)}</dd></div><div><dt>Önleyici faaliyet</dt><dd>${esc(item.preventiveAction)}</dd></div><div><dt>Alternatif plan</dt><dd>${esc(item.contingencyPlan || '—')}</dd></div></dl><div class="card-actions">${recordButtons('risk', item.id)}</div></article>`;
    }).join('') || empty('Açık risk bulunmuyor.')}</div></section><section>${panelToolbar('Açık konu ve sorunlar', 'Gerçekleşen problemlerin çözüm ve kapanış takibi.', 'issue', 'Sorun ekle')}<div class="issue-list">${issues.map(item => `<article class="issue-card ${isLate(item.targetDate, ['Çözüldü', 'Kapandı'].includes(item.status)) ? 'late' : ''}"><div><span class="status-pill ${statusClass(item.status)}">${esc(item.status)}</span><h4>${esc(item.title)}</h4><p>${esc(item.description)}</p><small>${esc(item.owner)} · ${date(item.targetDate)}</small><b>${esc(item.correctiveAction)}</b></div><div class="card-actions">${recordButtons('issue', item.id)}</div></article>`).join('') || empty('Açık sorun bulunmuyor.')}</div></section></div>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderChanges(p) {
    const records = data.changes.filter(item => item.projectId === p.id).sort((a, b) => String(b.id).localeCompare(String(a.id)));
    const root = $('#detailChanges');
    root.innerHTML = `${panelToolbar('Değişiklik yönetimi', 'Onaylanmadan proje planına alınmayan teknik, termin ve maliyet etkileri.', 'change', 'Değişiklik talebi')}<article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table"><thead><tr><th>Talep / Gerekçe</th><th>Talep eden</th><th>Teknik etki</th><th>Termin etkisi</th><th class="right">Maliyet etkisi</th><th>Onay</th><th>Uygulama / Revizyon</th><th></th></tr></thead><tbody>${records.map(item => `<tr class="${item.approvalStatus === 'Reddedildi' ? 'muted-row' : ''}"><td><strong>${esc(item.request)}</strong><small>${esc(item.reason)}</small></td><td>${esc(item.requestedBy)}</td><td>${esc(item.technicalImpact)}</td><td>${+item.scheduleImpactDays || 0} gün</td><td class="right expense-text">${money(item.costImpact)}</td><td><span class="status-pill ${statusClass(item.approvalStatus)}">${esc(item.approvalStatus)}</span></td><td>${esc(item.responsible)}<small>Rev. ${esc(item.revision)}</small></td><td>${recordButtons('change', item.id)}</td></tr>`).join('') || `<tr><td colspan="8">${empty('Değişiklik talebi bulunmuyor.')}</td></tr>`}</tbody></table></div></article>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderActions(p) {
    const records = data.actions.filter(item => item.projectId === p.id).sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''));
    const root = $('#detailActions');
    root.innerHTML = `${panelToolbar('Toplantı ve aksiyon takibi', 'Kararlar, sorumlular, hedef tarihler ve ilgili görev bağlantıları.', 'action', 'Aksiyon ekle')}<div class="action-board">${records.map(item => {
      const late = isLate(item.targetDate, ['Tamamlandı', 'İptal'].includes(item.status));
      const participants = (item.participants || []).join(', '), participantText = [participants ? `Kullanıcılar: ${participants}` : '', item.externalParticipants ? `Diğer: ${item.externalParticipants}` : ''].filter(Boolean).join(' · ');
      return `<article class="action-card ${late ? 'late' : ''}"><div class="action-card-head"><span>${date(item.meetingDate)} · ${esc(item.meetingTitle)}</span><span class="status-pill ${statusClass(late ? 'Gecikti' : item.status)}">${late ? 'Gecikti' : esc(item.status)}</span></div><h4>${esc(item.action)}</h4>${participantText ? `<p><b>Katılımcılar:</b> ${esc(participantText)}</p>` : ''}<p><b>Karar:</b> ${esc(item.decision)}</p><div class="action-meta"><span>${esc(item.owner)}</span><span>Hedef: ${date(item.targetDate)}</span><span>Görev: ${esc(taskName(item.relatedTaskId))}</span></div>${item.description ? `<small>${esc(item.description)}</small>` : ''}<div class="card-actions">${recordButtons('action', item.id)}</div></article>`;
    }).join('') || empty('Toplantı aksiyonu bulunmuyor.')}</div>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderControlledDocuments(p) {
    const records = data.documents.filter(item => item.projectId === p.id).sort((a, b) => `${a.documentNo}-${b.revisionDate}`.localeCompare(`${b.documentNo}-${a.revisionDate}`));
    const latestByNumber = records.reduce((map, item) => {
      const current = map.get(item.documentNo);
      if (!current || String(item.revisionDate) > String(current.revisionDate)) map.set(item.documentNo, item);
      return map;
    }, new Map());
    const root = $('#detailFiles');
    if (!root) return;
    const registry = `<section class="document-register">${panelToolbar('Doküman ve revizyon kontrolü', 'Yalnızca son onaylı revizyon üretime açık olarak işaretlenir.', 'document', 'Doküman kaydı')}<article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table"><thead><tr><th>Doküman</th><th>Numara / Revizyon</th><th>Revizyon tarihi</th><th>Hazırlayan</th><th>Kontrol / Onay</th><th>Durum</th><th>Açıklama</th><th></th></tr></thead><tbody>${records.map(item => {
      const file = data.files.find(fileRecord => String(fileRecord.id) === String(item.fileId)), latest = latestByNumber.get(item.documentNo)?.id === item.id, released = latest && item.approvalStatus === 'Onaylandı';
      return `<tr class="${released ? 'released-document' : ''}"><td><strong>${esc(item.documentType)}</strong><small>${file?.content ? `<a href="${file.content}" download="${esc(file.name)}">${esc(file.name)} ↓</a>` : esc(file?.name || 'Dosya bulunamadı')}</small></td><td>${esc(item.documentNo)}<br><b>Rev. ${esc(item.revision)}</b></td><td>${date(item.revisionDate)}</td><td>${esc(item.preparedBy)}</td><td>${esc(item.checkedBy)}<small>${esc(item.approvedBy)}</small></td><td><span class="status-pill ${statusClass(item.approvalStatus)}">${released ? 'Üretime Açık' : esc(item.approvalStatus)}</span></td><td>${esc(item.revisionNote)}</td><td>${recordButtons('document', item.id)}</td></tr>`;
    }).join('') || `<tr><td colspan="8">${empty('Kontrollü doküman kaydı bulunmuyor. Önce dosya yükleyin, ardından doküman kaydı oluşturun.')}</td></tr>`}</tbody></table></div></article></section>`;
    root.insertAdjacentHTML('afterbegin', registry);
    const uploadHeading = root.querySelector('.file-toolbar h3:not(.document-register h3)');
    if (uploadHeading) uploadHeading.textContent = 'Ham dosya alanı';
    bindEnterpriseActions(root.querySelector('.document-register'), p.id);
  }

  function renderQuality(p) {
    const records = data.qualityRecords.filter(item => item.projectId === p.id).sort((a, b) => String(b.id).localeCompare(String(a.id)));
    const root = $('#detailQuality');
    root.innerHTML = `${panelToolbar('Kalite, test ve kabul', 'Kontrol sonuçları, uygunsuzluklar ve düzeltici faaliyetler.', 'qualityRecord', 'Kontrol / test ekle')}<div class="quality-grid">${records.map(item => `<article class="quality-card ${item.status === 'Uygunsuz' ? 'nonconforming' : ''}"><div class="quality-head"><span class="quality-icon">${item.status === 'Uygun' || item.status === 'Kapandı' ? '✓' : item.status === 'Uygunsuz' ? '!' : '○'}</span><div><h4>${esc(item.controlType)}</h4><span class="status-pill ${statusClass(item.status)}">${esc(item.status)}</span></div><div class="card-actions">${recordButtons('qualityRecord', item.id)}</div></div><dl><div><dt>Uygunsuzluk</dt><dd>${esc(item.nonconformity || 'Yok')}</dd></div><div><dt>Sorumlu bölüm</dt><dd>${esc(item.department)}</dd></div><div><dt>Düzeltici faaliyet</dt><dd>${esc(item.correctiveAction || '—')}</dd></div><div><dt>Kapanış / Onay</dt><dd>${item.closureDate ? date(item.closureDate) : 'Açık'} · ${esc(item.approvedBy)}</dd></div></dl>${item.photoUrl ? `<a class="quality-photo" href="${esc(item.photoUrl)}" target="_blank" rel="noopener">Fotoğrafı aç ↗</a>` : ''}</article>`).join('') || empty('Kalite veya test kaydı bulunmuyor.')}</div>`;
    bindEnterpriseActions(root, p.id);
  }

  function renderClosure(p) {
    const record = data.closures.find(item => item.projectId === p.id), actualCost = record?.totalCost || spent(p.id), budgetVariance = actualCost - p.budget;
    const scheduleVariance = record?.actualEnd ? Math.round((new Date(record.actualEnd + 'T12:00:00') - new Date(p.end + 'T12:00:00')) / 86400000) : 0;
    const root = $('#detailClosure');
    root.innerHTML = `${panelToolbar('Proje kapanış formu', 'Maliyet, termin, garanti, bakım ve öğrenilen derslerin kalıcı kaydı.', null, '')}<div class="closure-actions"><button class="primary permission-create" data-closure-edit>${record ? 'Kapanış kaydını düzenle' : '+ Kapanış kaydı oluştur'}</button></div>${record ? `<div class="closure-kpis"><article><span>Gerçek bitiş</span><strong>${date(record.actualEnd)}</strong></article><article><span>Toplam maliyet</span><strong class="expense-text">${money(actualCost)}</strong></article><article><span>Bütçe sapması</span><strong class="${budgetVariance > 0 ? 'expense-text' : 'budget-text'}">${budgetVariance > 0 ? '+' : ''}${money(budgetVariance)}</strong></article><article><span>Termin sapması</span><strong class="${scheduleVariance > 0 ? 'expense-text' : 'budget-text'}">${scheduleVariance > 0 ? '+' : ''}${scheduleVariance} gün</strong></article><article><span>Müşteri memnuniyeti</span><strong>${'★'.repeat(+record.customerSatisfaction || 0)}${'☆'.repeat(5 - (+record.customerSatisfaction || 0))}</strong></article></div><div class="closure-grid"><article><h4>Açık kalan işler</h4><p>${esc(record.openItems || 'Yok')}</p></article><article><h4>Garanti dönemi</h4><p>${record.warrantyStart ? date(record.warrantyStart) : '—'} – ${record.warrantyEnd ? date(record.warrantyEnd) : '—'}</p></article><article><h4>Yedek parça listesi</h4><p>${esc(record.spareParts || '—')}</p></article><article><h4>Bakım planı</h4><p>${esc(record.maintenancePlan || '—')}</p></article><article class="wide"><h4>Öğrenilen dersler</h4><p>${esc(record.lessonsLearned)}</p></article>${record.manualUrl ? `<article><h4>Kullanım kılavuzu</h4><a href="${esc(record.manualUrl)}" target="_blank" rel="noopener">Kılavuzu aç ↗</a></article>` : ''}</div>` : empty('Proje kapanış kaydı henüz oluşturulmadı.')}`;
    root.querySelector('[data-closure-edit]').onclick = () => openDialog('closure', record?.id || null, record ? {} : { projectId: p.id, totalCost: spent(p.id) });
  }

  function renderCapacity() {
    const root = $('#capacityGrid');
    if (!root) return;
    const month = todayIso().slice(0, 7), monthTasks = data.tasks.filter(task => (task.start || '').slice(0, 7) === month || (task.end || '').slice(0, 7) === month);
    root.innerHTML = `${panelToolbar('Kaynak ve kapasite planlama', 'Aylık planlanan eforun tanımlı kapasiteye oranı.', 'capacityRecord', 'Kapasite grubu')}<div class="capacity-cards">${data.capacityRecords.map(record => {
      const assigned = monthTasks.filter(task => task.resourceGroup === record.name), load = assigned.reduce((sum, task) => sum + (+task.effortHours || 0), 0), rate = record.monthlyCapacity ? Math.round(load / record.monthlyCapacity * 100) : 0;
      return `<article class="capacity-card ${rate > 100 ? 'over' : rate > 80 ? 'warning' : ''}"><div class="capacity-head"><div><span>Kaynak grubu</span><h3>${esc(record.name)}</h3></div><button class="edit" data-enterprise-edit="capacityRecord:${record.id}">✎</button></div><div class="capacity-rate"><strong>%${rate}</strong><span>${load} / ${record.monthlyCapacity} saat</span></div><div class="capacity-bar"><i style="width:${Math.min(100, rate)}%"></i></div><div class="capacity-tasks">${assigned.map(task => `<div><span>${esc(project(task.projectId)?.code || '')}</span><strong>${esc(task.title)}</strong><b>${+task.effortHours || 0}s</b></div>`).join('') || '<small>Bu ay için planlı yük yok.</small>'}</div></article>`;
    }).join('')}</div>`;
    bindEnterpriseActions(root, null);
  }

  function renderManagementSummary() {
    const root = $('#managementSummary');
    if (!root) return;
    const today = todayIso(), month = today.slice(0, 7), active = data.projects.filter(p => p.projectStatus !== 'Tamamlandı'), delayed = active.filter(p => p.end < today && progress(p.id) < 100), overBudget = data.projects.filter(p => spent(p.id) > p.budget), criticalPurchases = data.procurements.filter(item => item.longLead === 'true' && (+item.receivedQuantity || 0) < (+item.quantity || 0)), openRisks = data.risks.filter(item => !['Kapandı', 'Azaltıldı'].includes(item.status)), openActions = data.actions.filter(item => !['Tamamlandı', 'İptal'].includes(item.status)), dueThisMonth = data.projects.filter(p => (p.end || '').slice(0, 7) === month);
    const cards = [
      ['Zamanında ilerleyen', Math.max(0, active.length - delayed.length), 'good'], ['Geciken projeler', delayed.length, delayed.length ? 'danger' : 'good'],
      ['Bütçeyi aşan', overBudget.length, overBudget.length ? 'danger' : 'good'], ['Kritik satın alma', criticalPurchases.length, criticalPurchases.length ? 'warning' : 'good'],
      ['Açık risk', openRisks.length, openRisks.some(risk => riskScore(risk) >= 6) ? 'danger' : 'warning'], ['Açık aksiyon', openActions.length, openActions.some(action => isLate(action.targetDate)) ? 'danger' : 'warning'],
      ['Bu ay teslim', dueThisMonth.length, 'info'], ['Bekleyen proje', data.projects.filter(p => p.projectStatus === 'Beklemede').length, 'muted']
    ];
    root.innerHTML = cards.map(([label, value, tone]) => `<article class="management-card ${tone}"><span>${label}</span><strong>${value}</strong></article>`).join('');
  }

  function criticalTaskIds(p, tasks) {
    const successors = new Map();
    tasks.forEach(task => { if (task.predecessorId) { const list = successors.get(String(task.predecessorId)) || []; list.push(task); successors.set(String(task.predecessorId), list); } });
    return new Set(tasks.filter(task => {
      const next = successors.get(String(task.id)) || [], latest = next.length ? Math.min(...next.map(item => new Date(item.start + 'T12:00:00'))) : new Date(p.end + 'T12:00:00');
      const slack = Math.round((latest - new Date(task.end + 'T12:00:00')) / 86400000);
      return slack <= 1 && (next.length || task.end >= p.end);
    }).map(task => String(task.id)));
  }

  function enhanceProjectGantt(p, tasks) {
    const panel = $('#detailPlan'), rows = panel?.querySelectorAll('.task-gantt-row');
    if (!panel || !rows?.length) return;
    const sorted = [...tasks].sort((a, b) => a.start.localeCompare(b.start)), critical = criticalTaskIds(p, sorted), start = new Date(p.start + 'T12:00:00'), end = new Date(p.end + 'T12:00:00'), span = Math.max(86400000, end - start), pos = value => Math.max(0, Math.min(100, (new Date(value + 'T12:00:00') - start) / span * 100));
    panel.querySelector('.file-toolbar')?.insertAdjacentHTML('beforeend', '<div class="gantt-enterprise-legend"><span class="planned-key">Plan</span><span class="actual-key">Gerçekleşen</span><span class="critical-key">Kritik yol</span><span class="milestone-key">Kilometre taşı</span></div>');
    rows.forEach((row, index) => {
      const task = sorted[index], bar = row.querySelector('.task-range'), track = row.querySelector('.gantt-track'), label = row.querySelector('.gantt-label small');
      if (!task || !bar || !track) return;
      bar.dataset.ganttTask = task.id;
      if (critical.has(String(task.id))) bar.classList.add('critical-path');
      if (task.milestone === 'true') track.insertAdjacentHTML('beforeend', `<i class="enterprise-milestone" style="left:${pos(task.end)}%" title="Kilometre taşı: ${esc(task.milestoneName || task.title)}"></i>`);
      if (task.actualStart) {
        const actualEnd = task.actualEnd || todayIso(), left = pos(task.actualStart), right = pos(actualEnd);
        track.insertAdjacentHTML('beforeend', `<span class="actual-task-range" style="left:${left}%;width:${Math.max(1, right - left)}%"></span>`);
      }
      const dependency = task.predecessorId ? ` · Bağlı: ${taskName(task.predecessorId)}` : '';
      const actual = task.actualStart ? ` · Gerçek: ${date(task.actualStart)}${task.actualEnd ? `–${date(task.actualEnd)}` : '–devam'}` : '';
      label.textContent += dependency + actual;
    });
  }

  const baseRenderProjects = renderProjects;
  renderProjects = function () {
    baseRenderProjects();
    $$('.project-card').forEach((card, index) => {
      const p = data.projects[index], client = card.querySelector('.project-client');
      if (!p || !client || card.querySelector('.enterprise-card-meta')) return;
      client.insertAdjacentHTML('beforebegin', `<div class="enterprise-card-meta"><span class="project-code">${esc(p.code)}</span><span class="status-pill ${statusClass(p.projectStatus)}">${esc(p.projectStatus)}</span><span class="priority-pill ${statusClass(p.priority)}">${esc(p.priority)}</span></div>`);
      const manager = card.querySelector('.manager');
      if (manager && p.team?.length) manager.textContent = `${managerNames(p)} · ${p.team.length} ekip üyesi · ${date(p.end)} bitiş`;
    });
  };

  const baseRenderProjectPlan = renderProjectPlan;
  renderProjectPlan = function (p, tasks) {
    baseRenderProjectPlan(p, tasks);
    enhanceProjectGantt(p, tasks);
  };

  const baseRenderProjectDetail = renderProjectDetail;
  renderProjectDetail = function () {
    baseRenderProjectDetail();
    const p = project(currentDetailId);
    if (!p) return;
    renderProjectMaster(p);
    renderEnterpriseTasks(p);
    renderEnterpriseCosts(p);
    renderProcurement(p);
    renderManufacturing(p);
    renderRisksAndIssues(p);
    renderChanges(p);
    renderActions(p);
    renderControlledDocuments(p);
    renderQuality(p);
    renderClosure(p);
    applyPermissions();
  };

  const baseRenderMetrics = renderMetrics;
  renderMetrics = function () {
    baseRenderMetrics();
    renderManagementSummary();
  };

  const baseRenderGantt = renderGantt;
  renderGantt = function () {
    baseRenderGantt();
    $$('#gantt .task-range').forEach(bar => {
      const task = data.tasks.find(item => String(item.id) === String(bar.dataset.ganttTask));
      if (!task) return;
      if (task.milestone === 'true') bar.classList.add('milestone-task');
      if (task.predecessorId) bar.classList.add('dependent-task');
    });
  };

  const baseRenderPlanning = renderPlanning;
  renderPlanning = function () {
    baseRenderPlanning();
    renderCapacity();
  };

  $$('[data-plan-tab]').forEach(button => button.onclick = () => {
    $$('[data-plan-tab]').forEach(item => item.classList.toggle('active', item === button));
    $('#ganttPanel').classList.toggle('active', button.dataset.planTab === 'gantt');
    $('#workloadPanel').classList.toggle('active', button.dataset.planTab === 'workload');
    $('#capacityPanel').classList.toggle('active', button.dataset.planTab === 'capacity');
    if (button.dataset.planTab === 'capacity') renderCapacity();
  });

  localStorage.setItem('proje360-data', JSON.stringify(data));
  if (window.PolProCloud?.enabled && JSON.stringify(data) !== initialDataSnapshot) void window.PolProCloud.save(data);
  renderAll();
  if (currentDetailId && $('#projectDetail').classList.contains('active')) renderProjectDetail();
})();
