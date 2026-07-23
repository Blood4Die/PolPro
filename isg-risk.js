(function () {
  if (window.PolProOhs) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const formatDate = value => value ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value + 'T12:00:00')) : '—';
  const probabilityOptions = [
    ['0.2', '0,2 — Pratik olarak imkânsız'], ['0.5', '0,5 — Çok düşük'], ['1', '1 — Olası değil'],
    ['3', '3 — Olası'], ['6', '6 — Yüksek olasılık'], ['10', '10 — Beklenir']
  ];
  const frequencyOptions = [
    ['0.5', '0,5 — Yılda birkaç kez'], ['1', '1 — Ayda bir'], ['2', '2 — Ayda birkaç kez'],
    ['3', '3 — Haftalık'], ['6', '6 — Günlük'], ['10', '10 — Sürekli']
  ];
  const severityOptions = [
    ['1', '1 — Ramak kala / ihmal edilebilir etki'], ['3', '3 — Hafif yaralanma / sınırlı çevresel etki'], ['7', '7 — Ciddi yaralanma / yerel çevresel etki'],
    ['15', '15 — Kalıcı hasar / ciddi çevresel etki'], ['40', '40 — Ölümcül / geniş çevresel zarar'], ['100', '100 — Çoklu ölüm / kalıcı ve yaygın çevresel zarar']
  ];
  const riskTypes = ['İSG', 'Çevre', 'İSG ve Çevre'];
  const hazardCategories = ['Elektrik', 'Mekanik', 'Yüksekte çalışma', 'Kaldırma / taşıma', 'Yangın / patlama', 'Kimyasal', 'Kapalı alan', 'Ergonomi', 'Gürültü / fiziksel etken', 'Diğer'];
  const environmentalFactors = ['Uygulanmaz', 'Atık oluşumu', 'Kimyasal dökülme / sızıntı', 'Hava emisyonu / toz', 'Atık su / su kirliliği', 'Toprak kirliliği', 'Gürültü / titreşim', 'Enerji tüketimi', 'Su tüketimi', 'Doğal kaynak kullanımı', 'Biyoçeşitlilik', 'Diğer'];
  const activityTypes = ['Rutin', 'Rutin dışı', 'Acil durum'];
  const controlMethods = ['Tehlikeyi ortadan kaldırma', 'İkame', 'Mühendislik önlemi', 'İdari önlem', 'KKD'];
  const actionStatuses = ['Açık', 'Devam ediyor', 'Doğrulama bekliyor'];

  data.ohsRisks = Array.isArray(data.ohsRisks) ? data.ohsRisks.filter(record => record && typeof record === 'object') : [];
  data.ohsRisks.forEach((record, index) => {
    record.id ??= Date.now() + index;
    record.projectId = +record.projectId;
    record.revision ??= 'Rev. 0';
    record.riskType ??= 'İSG';
    record.environmentalFactor ??= 'Uygulanmaz';
    record.approvalStatus ??= 'Taslak';
    record.status ??= 'Açık';
    record.evidenceFileIds = Array.isArray(record.evidenceFileIds) ? record.evidenceFileIds : (record.evidenceFileId ? [record.evidenceFileId] : []);
    record.createdAt ??= new Date().toISOString();
    record.updatedAt ??= record.createdAt;
  });

  const baseSave = save;
  save = function () {
    const projectIds = new Set(data.projects.map(record => +record.id));
    data.ohsRisks = data.ohsRisks.filter(record => projectIds.has(+record.projectId));
    baseSave();
  };

  const optionList = (values, selected = '', placeholder = '') => `${placeholder ? `<option value="">${esc(placeholder)}</option>` : ''}${values.map(([value, label]) => `<option value="${esc(value)}" ${String(selected) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('')}`;
  const textOptions = (values, selected = '', placeholder = '') => optionList(values.map(value => [value, value]), selected, placeholder);
  const scoreOf = (probability, frequency, severity) => {
    const values = [probability, frequency, severity].map(Number);
    return values.every(value => Number.isFinite(value) && value > 0) ? values.reduce((total, value) => total * value, 1) : 0;
  };
  const scoreText = score => Number.isInteger(score) ? String(score) : score.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  const riskBand = score => {
    if (score > 400) return { key: 'critical', label: 'Çok yüksek', rule: 'Çalışma başlatılmamalı / durdurulmalı' };
    if (score >= 200) return { key: 'high', label: 'Yüksek', rule: 'Önlem tamamlanmadan çalışma yapılmamalı' };
    if (score >= 70) return { key: 'important', label: 'Önemli', rule: 'Kısa sürede iyileştirme gerekli' };
    if (score >= 20) return { key: 'possible', label: 'Olası risk', rule: 'Önlem planlanmalı ve izlenmeli' };
    return { key: 'acceptable', label: 'Kabul edilebilir', rule: 'Kontroller sürdürülmeli' };
  };
  const taskLabel = taskId => data.tasks.find(task => +task.id === +taskId)?.title || 'Göreve bağlanmadı';
  const evidenceFiles = record => {
    const ids = Array.isArray(record.evidenceFileIds) ? record.evidenceFileIds : (record.evidenceFileId ? [record.evidenceFileId] : []);
    return data.files.filter(file => ids.some(id => String(id) === String(file.id)));
  };
  const activeUsers = () => data.users.filter(user => user.active).map(user => user.name).filter(Boolean);
  const defaultTeam = () => ['İşveren vekili', 'İSG uzmanı', 'Çevre sorumlusu', 'Çalışan temsilcisi'].join(', ');

  let editingId = null;
  let step = 0;
  let draft = {};

  function defaults(projectId) {
    return {
      projectId: +projectId,
      taskId: '',
      area: '',
      activityType: 'Rutin dışı',
      riskType: 'İSG',
      hazardCategory: 'Elektrik',
      environmentalFactor: 'Uygulanmaz',
      hazardDescription: '',
      affectedPeople: 'Çalışanlar ve taşeronlar',
      evaluationDate: todayIso(),
      revision: 'Rev. 0',
      existingControls: '',
      probability: '6',
      frequency: '2',
      severity: '40',
      controlMethod: 'Mühendislik önlemi',
      preventiveAction: '',
      owner: currentUser?.name || activeUsers()[0] || '',
      targetDate: todayIso(),
      status: 'Açık',
      residualProbability: '',
      residualFrequency: '',
      residualSeverity: '',
      verifier: '',
      evaluationTeam: defaultTeam(),
      approvalStatus: 'Taslak'
    };
  }

  function collectVisibleStep() {
    const panel = $('#ohsRiskFields');
    if (!panel) return;
    panel.querySelectorAll('[name]').forEach(field => {
      if (field.type === 'file') return;
      draft[field.name] = field.value;
    });
    draft.initialScore = scoreOf(draft.probability, draft.frequency, draft.severity);
    draft.residualScore = scoreOf(draft.residualProbability, draft.residualFrequency, draft.residualSeverity);
  }

  function fieldValue(name) {
    return esc(draft[name] ?? '');
  }

  function taskOptions() {
    const tasks = data.tasks.filter(task => +task.projectId === +draft.projectId).sort((a, b) => a.start.localeCompare(b.start));
    return `<option value="">Göreve bağlanmadı</option>${tasks.map(task => `<option value="${task.id}" ${String(draft.taskId) === String(task.id) ? 'selected' : ''}>${esc(task.title)}</option>`).join('')}`;
  }

  function userOptions(selected = '', placeholder = 'Kişi seçin') {
    return `<option value="">${esc(placeholder)}</option>${activeUsers().map(name => `<option ${name === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}`;
  }

  function renderStep() {
    const titles = ['Tehlike / çevresel boyut', 'İlk risk', 'Önlem', 'Artık risk ve onay'];
    const initialScore = scoreOf(draft.probability, draft.frequency, draft.severity);
    const residualScore = scoreOf(draft.residualProbability, draft.residualFrequency, draft.residualSeverity);
    const initialBand = riskBand(initialScore);
    const residualBand = riskBand(residualScore);
    const existingEvidence = editingId ? evidenceFiles(draft) : [];
    let html = '';

    if (step === 0) {
      html = `<div class="ohs-form-grid">
        <label>Bağlı görev / iş adımı<select name="taskId">${taskOptions()}</select></label>
        <label>Çalışma alanı<input name="area" type="text" value="${fieldValue('area')}" placeholder="Örn. Ana elektrik odası" required></label>
        <label>Risk alanı<select name="riskType" id="ohsRiskType">${textOptions(riskTypes, draft.riskType)}</select></label>
        <label>Faaliyet türü<select name="activityType">${textOptions(activityTypes, draft.activityType)}</select></label>
        <label>Tehlike kategorisi<select name="hazardCategory">${textOptions(hazardCategories, draft.hazardCategory)}</select></label>
        <label>Çevresel risk faktörü<select name="environmentalFactor" id="ohsEnvironmentalFactor">${textOptions(environmentalFactors, draft.environmentalFactor)}</select></label>
        <label class="full">Tehlike / çevresel boyut ve olası sonuç<textarea name="hazardDescription" rows="3" required>${fieldValue('hazardDescription')}</textarea></label>
        <label>Etkilenen kişi / çevresel alıcı<select name="affectedPeople">${textOptions(['Çalışanlar', 'Çalışanlar ve taşeronlar', 'Ziyaretçiler', 'Tüm saha personeli', 'Hava', 'Su', 'Toprak', 'Doğal kaynaklar', 'Flora / fauna', 'Çevre halkı', 'Birden fazla alıcı'], draft.affectedPeople)}</select></label>
        <label>Değerlendirme tarihi<input name="evaluationDate" type="date" value="${fieldValue('evaluationDate')}" required></label>
        <label>Revizyon<input class="ohs-revision" name="revision" type="text" value="${fieldValue('revision')}" required></label>
        <label class="full">Mevcut önlemler / çevresel kontroller<textarea name="existingControls" rows="3" required>${fieldValue('existingControls')}</textarea></label>
      </div>`;
    } else if (step === 1) {
      html = `<div class="ohs-form-grid">
        <label>Olasılık<select name="probability" data-ohs-score-input>${optionList(probabilityOptions, draft.probability)}</select></label>
        <label>Maruziyet sıklığı<select name="frequency" data-ohs-score-input>${optionList(frequencyOptions, draft.frequency)}</select></label>
        <label>Şiddet<select name="severity" data-ohs-score-input>${optionList(severityOptions, draft.severity)}</select></label>
        <label>Yöntem<input type="text" value="Fine–Kinney" readonly></label>
        <div class="ohs-score-summary"><div><span>İlk risk puanı</span><strong id="ohsInitialScore">${scoreText(initialScore)} · ${initialBand.label}</strong></div><div class="ohs-rule" id="ohsInitialRule">${initialBand.rule}</div></div>
      </div>`;
    } else if (step === 2) {
      html = `<div class="ohs-form-grid">
        <label>Kontrol yöntemi<select name="controlMethod">${textOptions(controlMethods, draft.controlMethod)}</select></label>
        <label>Faaliyet sorumlusu<select name="owner">${userOptions(draft.owner, 'Sorumlu seçin')}</select></label>
        <label class="full">Alınacak önlem<textarea name="preventiveAction" rows="4" required>${fieldValue('preventiveAction')}</textarea></label>
        <label>Hedef tarih<input name="targetDate" type="date" value="${fieldValue('targetDate')}" required></label>
        <label>Faaliyet durumu<select name="status">${textOptions(actionStatuses, draft.status)}</select></label>
      </div>`;
    } else {
      html = `<div class="ohs-form-grid">
        <label>Artık risk: olasılık<select name="residualProbability" data-ohs-residual-input>${optionList(probabilityOptions, draft.residualProbability, 'Seçin')}</select></label>
        <label>Artık risk: sıklık<select name="residualFrequency" data-ohs-residual-input>${optionList(frequencyOptions, draft.residualFrequency, 'Seçin')}</select></label>
        <label>Artık risk: şiddet<select name="residualSeverity" data-ohs-residual-input>${optionList(severityOptions, draft.residualSeverity, 'Seçin')}</select></label>
        <label>Doğrulayan<select name="verifier">${userOptions(draft.verifier, 'Doğrulayan kişiyi seçin')}</select></label>
        <div class="ohs-score-summary"><div><span>Artık risk puanı</span><strong id="ohsResidualScore">${residualScore ? `${scoreText(residualScore)} · ${residualBand.label}` : 'Henüz hesaplanmadı'}</strong></div><div class="ohs-rule" id="ohsResidualRule">${residualScore ? residualBand.rule : 'Üç değeri de seçin'}</div></div>
        <label class="full">Değerlendirme ekibi<input name="evaluationTeam" type="text" value="${fieldValue('evaluationTeam')}" required></label>
        <label class="ohs-evidence">Belge ekle / kanıt yükle<input id="ohsEvidenceFile" name="evidenceFile" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"><small>${existingEvidence.length ? `Mevcut belgeler: ${existingEvidence.map(file => esc(file.name)).join(', ')}` : 'Birden fazla fotoğraf veya belge eklenebilir. Her dosya en fazla 15 MB.'}</small></label>
      </div>`;
    }

    $('#ohsRiskFields').innerHTML = html;
    if (step === 0) {
      const syncEnvironmentalFactor = () => {
        const type = $('#ohsRiskType')?.value || 'İSG';
        const factor = $('#ohsEnvironmentalFactor');
        if (!factor) return;
        factor.disabled = type === 'İSG';
        if (type === 'İSG') factor.value = 'Uygulanmaz';
      };
      $('#ohsRiskType').onchange = syncEnvironmentalFactor;
      syncEnvironmentalFactor();
    }
    $('#ohsStepText').textContent = `${step + 1} / 4 · ${titles[step]}`;
    $$('[data-ohs-step]').forEach((button, index) => button.classList.toggle('active', index === step));
    $('#ohsPrevious').disabled = step === 0;
    $('#ohsNext').textContent = step === 3 ? 'Onaya gönder' : 'İleri';
    $('#ohsRiskFields').querySelectorAll('[data-ohs-score-input],[data-ohs-residual-input]').forEach(field => field.onchange = () => {
      collectVisibleStep();
      const first = scoreOf(draft.probability, draft.frequency, draft.severity);
      const remaining = scoreOf(draft.residualProbability, draft.residualFrequency, draft.residualSeverity);
      const firstBand = riskBand(first), remainingBand = riskBand(remaining);
      if ($('#ohsInitialScore')) $('#ohsInitialScore').textContent = `${scoreText(first)} · ${firstBand.label}`;
      if ($('#ohsInitialRule')) $('#ohsInitialRule').textContent = firstBand.rule;
      if ($('#ohsResidualScore')) $('#ohsResidualScore').textContent = remaining ? `${scoreText(remaining)} · ${remainingBand.label}` : 'Henüz hesaplanmadı';
      if ($('#ohsResidualRule')) $('#ohsResidualRule').textContent = remaining ? remainingBand.rule : 'Üç değeri de seçin';
    });
  }

  function validateStep(stepIndex, finalSubmission = false) {
    collectVisibleStep();
    if (stepIndex === 0 && draft.riskType !== 'İSG' && (!draft.environmentalFactor || draft.environmentalFactor === 'Uygulanmaz')) {
      toast('Çevre riski için çevresel risk faktörünü seçin.');
      return false;
    }
    if (stepIndex === 0 && (!draft.area?.trim() || !draft.hazardDescription?.trim() || !draft.existingControls?.trim() || !draft.evaluationDate || !draft.revision?.trim())) {
      toast('Çalışma alanı, tehlike / çevresel boyut, mevcut kontroller, tarih ve revizyon bilgileri zorunludur.');
      return false;
    }
    if (stepIndex === 1 && !draft.initialScore) {
      toast('İlk risk değerlerini seçin.');
      return false;
    }
    if (stepIndex === 2 && (!draft.preventiveAction?.trim() || !draft.owner || !draft.targetDate)) {
      toast('Alınacak önlem, sorumlu ve hedef tarih zorunludur.');
      return false;
    }
    if (finalSubmission) {
      const files = [...($('#ohsEvidenceFile')?.files || [])];
      if (draft.riskType !== 'İSG' && (!draft.environmentalFactor || draft.environmentalFactor === 'Uygulanmaz')) {
        toast('Çevre riski için çevresel risk faktörünü seçin.');
        return false;
      }
      if (!draft.area?.trim() || !draft.hazardDescription?.trim() || !draft.existingControls?.trim() || !draft.evaluationDate || !draft.revision?.trim() || !draft.initialScore) {
        toast('Tehlike / çevresel boyut bilgileri ve ilk risk değerlendirmesi tamamlanmalıdır.');
        return false;
      }
      if (!draft.preventiveAction?.trim() || !draft.owner || !draft.targetDate) {
        toast('Önlem, faaliyet sorumlusu ve hedef tarih tamamlanmalıdır.');
        return false;
      }
      if (!draft.residualScore || !draft.verifier || !draft.evaluationTeam?.trim()) {
        toast('Artık risk, doğrulayan kişi ve değerlendirme ekibi zorunludur.');
        return false;
      }
      if (!evidenceFiles(draft).length && !files.length) {
        toast('Onaya göndermek için kanıt fotoğrafı veya belgesi yükleyin.');
        return false;
      }
      if (files.some(file => file.size > 15 * 1024 * 1024)) {
        toast('Her kanıt dosyası en fazla 15 MB olabilir.');
        return false;
      }
    }
    return true;
  }

  async function persistDraft(sendForApproval = false) {
    collectVisibleStep();
    if (!draft.hazardDescription?.trim()) return toast('Taslak için en az tehlike açıklaması girin.');
    if (sendForApproval && !validateStep(3, true)) return;
    const selectedFiles = [...($('#ohsEvidenceFile')?.files || [])];
    if (selectedFiles.some(file => file.size > 15 * 1024 * 1024)) return toast('Her kanıt dosyası en fazla 15 MB olabilir.');
    draft.evidenceFileIds = Array.isArray(draft.evidenceFileIds) ? [...draft.evidenceFileIds] : (draft.evidenceFileId ? [draft.evidenceFileId] : []);
    for (const file of selectedFiles) {
      try {
        toast(`${file.name} yükleniyor...`);
        const fileRecord = await createFileRecord(draft.projectId, file);
        data.files.push(fileRecord);
        draft.evidenceFileIds.push(fileRecord.id);
        addActivity(draft.projectId, 'İSG / çevre kanıtı yüklendi', file.name, 'file');
      } catch (error) {
        return toast(`Kanıt yüklenemedi: ${error.message}`);
      }
    }

    const existing = editingId ? data.ohsRisks.find(record => String(record.id) === String(editingId)) : null;
    const now = new Date().toISOString();
    const payload = {
      ...draft,
      projectId: +draft.projectId,
      taskId: draft.taskId ? +draft.taskId : null,
      probability: Number(draft.probability) || 0,
      frequency: Number(draft.frequency) || 0,
      severity: Number(draft.severity) || 0,
      initialScore: scoreOf(draft.probability, draft.frequency, draft.severity),
      residualProbability: Number(draft.residualProbability) || 0,
      residualFrequency: Number(draft.residualFrequency) || 0,
      residualSeverity: Number(draft.residualSeverity) || 0,
      residualScore: scoreOf(draft.residualProbability, draft.residualFrequency, draft.residualSeverity),
      workBlocked: scoreOf(draft.probability, draft.frequency, draft.severity) > 400,
      approvalStatus: sendForApproval ? 'Onay bekliyor' : (draft.approvalStatus === 'Onaylandı' ? 'Onaylandı' : 'Taslak'),
      updatedAt: now,
      updatedBy: currentUser?.name || 'Kullanıcı'
    };

    if (existing) {
      payload.createdAt = existing.createdAt;
      payload.createdBy = existing.createdBy;
      Object.assign(existing, payload);
    } else {
      payload.id = Date.now();
      payload.createdAt = now;
      payload.createdBy = currentUser?.name || 'Kullanıcı';
      data.ohsRisks.push(payload);
      editingId = payload.id;
    }

    addActivity(payload.projectId, sendForApproval ? 'İSG / çevre riski onaya gönderildi' : `İSG / çevre riski ${existing ? 'güncellendi' : 'eklendi'}`, payload.hazardDescription, 'update');
    save();
    $('#ohsRiskDialog').close();
    renderProjectDetail();
    toast(sendForApproval ? 'İSG / çevre risk kaydı onaya gönderildi.' : 'İSG / çevre risk taslağı kaydedildi.');
  }

  function openOhsRisk(recordId = null) {
    if (!currentUser || currentUser.role === 'Görüntüleyici') return toast('Bu işlem için düzenleme yetkisi gerekiyor.');
    const existing = recordId ? data.ohsRisks.find(record => String(record.id) === String(recordId)) : null;
    if (existing?.approvalStatus === 'Onaylandı' && currentUser.role !== 'Yönetici') return toast('Onaylanmış kaydı yalnızca yönetici revize edebilir.');
    editingId = existing?.id ?? null;
    draft = existing ? { ...existing } : defaults(currentDetailId);
    step = 0;
    $('#ohsRiskTitle').textContent = existing ? `İSG / çevre riskini düzenle · ${existing.revision || 'Rev. 0'}` : 'Yeni İSG / çevre risk kaydı';
    renderStep();
    $('#ohsRiskDialog').showModal();
  }

  function renderOhs(p) {
    const root = $('#detailOhs');
    if (!root) return;
    const allRecords = data.ohsRisks.filter(record => +record.projectId === +p.id).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const activeRecords = allRecords.filter(record => record.status !== 'İptal');
    const highRecords = activeRecords.filter(record => +record.initialScore >= 200 && record.approvalStatus !== 'Onaylandı');
    const awaitingApproval = activeRecords.filter(record => record.approvalStatus === 'Onay bekliyor');
    const canAdmin = currentUser?.role === 'Yönetici';

    root.innerHTML = `<div class="ohs-toolbar"><div><h3>İSG ve Çevre Risk Analizi</h3><p>İSG tehlikeleri ve çevresel risk faktörleri için Fine–Kinney puanı, önlem, artık risk ve doğrulama kayıtları.</p></div><button class="primary permission-create" id="addOhsRisk">+ Yeni risk kaydı</button></div>
      <div class="ohs-stats"><article><span>Toplam risk</span><strong>${activeRecords.length}</strong><small>Bu proje</small></article><article><span>Yüksek / çok yüksek</span><strong class="danger">${highRecords.length}</strong><small>Önlem veya onay bekliyor</small></article><article><span>Doğrulama bekleyen</span><strong>${awaitingApproval.length}</strong><small>Yönetici onayı gerekli</small></article></div>
      <div class="ohs-filterbar"><input id="ohsRiskSearch" type="search" placeholder="Faaliyet, tehlike, çevre faktörü veya sorumlu ara..."><select id="ohsRiskTypeFilter"><option value="">Tüm risk alanları</option>${textOptions(riskTypes)}</select><select id="ohsRiskStatus"><option value="">Tüm durumlar</option>${textOptions(['Taslak', 'Onay bekliyor', 'Onaylandı', 'İptal'])}</select></div>
      <article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table ohs-table"><thead><tr><th>No / Tür</th><th>Faaliyet / Tehlike / Çevresel boyut</th><th>İlk risk</th><th>Önlem ve sorumlu</th><th>Artık risk</th><th>Durum</th><th></th></tr></thead><tbody id="ohsRiskRows"></tbody></table></div></article>`;

    const renderRows = () => {
      const query = $('#ohsRiskSearch').value.toLocaleLowerCase('tr');
      const selectedType = $('#ohsRiskTypeFilter').value;
      const selectedStatus = $('#ohsRiskStatus').value;
      const records = allRecords.filter(record => (!selectedType || record.riskType === selectedType) && (!selectedStatus || record.approvalStatus === selectedStatus) && (!query || `${record.area} ${record.riskType} ${record.hazardCategory} ${record.environmentalFactor} ${record.hazardDescription} ${record.preventiveAction} ${record.owner} ${taskLabel(record.taskId)}`.toLocaleLowerCase('tr').includes(query)));
      $('#ohsRiskRows').innerHTML = records.map((record, index) => {
        const initialBand = riskBand(+record.initialScore || 0), residualBand = riskBand(+record.residualScore || 0);
        const evidence = evidenceFiles(record);
        const overdue = record.status !== 'Kapalı' && record.status !== 'İptal' && record.targetDate && record.targetDate < todayIso();
        const canEdit = currentUser?.role !== 'Görüntüleyici' && (record.approvalStatus !== 'Onaylandı' || canAdmin);
        const canApprove = canAdmin && record.approvalStatus === 'Onay bekliyor' && record.residualScore && evidence.length && record.verifier && record.evaluationTeam;
        return `<tr class="${record.status === 'İptal' ? 'record-cancelled' : ''}">
          <td><strong>RİSK-${String(index + 1).padStart(3, '0')}</strong><small class="ohs-risk-type ${record.riskType === 'Çevre' ? 'environment' : ''}">${esc(record.riskType || 'İSG')}</small><small class="ohs-revision">${esc(record.revision || 'Rev. 0')}</small></td>
          <td><strong>${esc(taskLabel(record.taskId))}</strong><small>${esc(record.area || 'Alan belirtilmedi')} · ${esc(record.hazardCategory || 'Diğer')}</small>${record.riskType !== 'İSG' ? `<small class="ohs-environment-factor">Çevre: ${esc(record.environmentalFactor || 'Belirtilmedi')}</small>` : ''}<small>${esc(record.hazardDescription)}</small>${record.workBlocked && record.approvalStatus !== 'Onaylandı' ? '<em class="ohs-blocked">Çalışma / faaliyet başlatılmamalı</em>' : ''}</td>
          <td><span class="ohs-score ${initialBand.key}">${scoreText(+record.initialScore || 0)}</span><small>${initialBand.label}</small></td>
          <td><strong>${esc(record.preventiveAction || 'Önlem girilmedi')}</strong><small>${esc(record.owner || 'Sorumlu yok')} · <span class="${overdue ? 'ohs-overdue' : ''}">${formatDate(record.targetDate)}</span></small></td>
          <td>${record.residualScore ? `<span class="ohs-score ${residualBand.key}">${scoreText(+record.residualScore)}</span><small>${residualBand.label}</small>` : '<span class="ohs-status">Bekliyor</span>'}${evidence.length ? `<small>📎 ${evidence.length} belge · ${evidence.map(file => file.content ? `<a href="${esc(file.content)}" download="${esc(file.name)}">${esc(file.name)}</a>` : esc(file.name)).join(', ')}</small>` : ''}</td>
          <td><span class="ohs-status ${record.approvalStatus === 'Onaylandı' ? 'approved' : ''}">${esc(record.approvalStatus)}</span><small>${esc(record.status || 'Açık')}</small>${record.approvedBy ? `<small>${esc(record.approvedBy)} · ${formatDate((record.approvedAt || '').slice(0, 10))}</small>` : ''}</td>
          <td><div class="ohs-row-actions">${canApprove ? `<button class="secondary ohs-approve" data-ohs-approve="${record.id}">Onayla</button>` : ''}${canEdit ? `<button class="edit" data-ohs-edit="${record.id}" title="Düzenle">✎</button>` : ''}${canAdmin && record.status !== 'İptal' ? `<button class="delete" data-ohs-cancel="${record.id}" title="İptal et">×</button>` : ''}</div></td>
        </tr>`;
      }).join('') || `<tr><td colspan="7"><div class="ohs-empty">Bu projede İSG risk kaydı bulunmuyor.</div></td></tr>`;

      $$('[data-ohs-edit]').forEach(button => button.onclick = () => openOhsRisk(button.dataset.ohsEdit));
      $$('[data-ohs-approve]').forEach(button => button.onclick = () => approveOhsRisk(button.dataset.ohsApprove));
      $$('[data-ohs-cancel]').forEach(button => button.onclick = () => cancelOhsRisk(button.dataset.ohsCancel));
      applyPermissions();
    };

    $('#addOhsRisk').onclick = () => openOhsRisk();
    $('#ohsRiskSearch').oninput = renderRows;
    $('#ohsRiskTypeFilter').onchange = renderRows;
    $('#ohsRiskStatus').onchange = renderRows;
    renderRows();
  }

  function approveOhsRisk(recordId) {
    if (currentUser?.role !== 'Yönetici') return toast('İSG / çevre doğrulamasını yalnızca yönetici tamamlayabilir.');
    const record = data.ohsRisks.find(item => String(item.id) === String(recordId));
    if (!record) return;
    if (!record.residualScore || !evidenceFiles(record).length || !record.verifier || !record.evaluationTeam) return toast('Artık risk, kanıt, doğrulayan ve değerlendirme ekibi tamamlanmalıdır.');
    if (!confirm('İSG / çevre risk kaydı doğrulanıp kapatılsın mı?')) return;
    record.approvalStatus = 'Onaylandı';
    record.status = 'Kapalı';
    record.approvedBy = currentUser.name;
    record.approvedAt = new Date().toISOString();
    record.updatedAt = record.approvedAt;
    addActivity(record.projectId, 'İSG / çevre riski doğrulandı', record.hazardDescription, 'update');
    save();
    renderProjectDetail();
    toast('İSG / çevre risk kaydı onaylandı.');
  }

  function cancelOhsRisk(recordId) {
    if (currentUser?.role !== 'Yönetici') return toast('İSG / çevre kaydını yalnızca yönetici iptal edebilir.');
    const record = data.ohsRisks.find(item => String(item.id) === String(recordId));
    if (!record || !confirm('Kayıt silinmeyecek; iptal edildi olarak arşivlenecek. Devam edilsin mi?')) return;
    record.status = 'İptal';
    record.approvalStatus = 'İptal';
    record.cancelledBy = currentUser.name;
    record.cancelledAt = new Date().toISOString();
    record.updatedAt = record.cancelledAt;
    addActivity(record.projectId, 'İSG / çevre riski iptal edildi', record.hazardDescription, 'update');
    save();
    renderProjectDetail();
    toast('İSG / çevre risk kaydı iptal edilerek arşivlendi.');
  }

  const baseRenderProjectDetail = renderProjectDetail;
  renderProjectDetail = function () {
    baseRenderProjectDetail();
    const p = project(currentDetailId);
    if (p) renderOhs(p);
  };

  $$('[data-ohs-step]').forEach(button => button.onclick = () => {
    collectVisibleStep();
    step = +button.dataset.ohsStep;
    renderStep();
  });
  $('#ohsPrevious').onclick = () => {
    collectVisibleStep();
    step = Math.max(0, step - 1);
    renderStep();
  };
  $('#ohsNext').onclick = async () => {
    if (step < 3) {
      if (!validateStep(step)) return;
      step += 1;
      renderStep();
      return;
    }
    await persistDraft(true);
  };
  $('#saveOhsDraft').onclick = () => persistDraft(false);
  $('#closeOhsRisk').onclick = () => $('#ohsRiskDialog').close();
  $('#ohsRiskDialog').addEventListener('cancel', event => {
    if ($('#ohsRiskDialog').open && !confirm('Kaydedilmemiş değişiklikler kapatılsın mı?')) event.preventDefault();
  });

  window.PolProOhs = { render: renderOhs, open: openOhsRisk };
  if (currentDetailId && $('#projectDetail').classList.contains('active')) renderProjectDetail();
})();
