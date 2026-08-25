(function () {
  const DAY = 86400000;
  const nowIso = () => new Date().toISOString().slice(0, 10);
  const escOverview = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const normalizeOverviewStatus = value => String(value || '').toLocaleLowerCase('tr').replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ğ', 'g').replaceAll('ü', 'u').replaceAll('ö', 'o').replaceAll('ç', 'c').replace(/[^a-z0-9]+/g, '-');
  const parseDay = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? new Date(`${value}T12:00:00`) : null;
  const addDays = (value, amount) => { const next = parseDay(value) || new Date(); next.setDate(next.getDate() + amount); return next.toISOString().slice(0, 10); };
  const dayDiff = (from, to) => { const a = parseDay(from), b = parseDay(to); return a && b ? Math.round((b - a) / DAY) : 0; };
  const displayDay = value => parseDay(value)?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) || '—';
  const closedProject = record => ['Tamamlandı', 'Kapandı'].includes(record?.projectStatus) || progress(record?.id) >= 100;
  const scopeProjects = () => dashboardFilterId ? data.projects.filter(record => +record.id === +dashboardFilterId) : data.projects;
  const scopeIds = () => new Set(scopeProjects().map(record => +record.id));
  const inScope = record => scopeIds().has(+record.projectId);
  const openProcurement = record => !['Gerçekleşti', 'İptal edildi'].includes(record?.procurementStatus);
  const businessRiskScore = record => ({ Düşük: 1, Orta: 2, Yüksek: 3 }[record?.probability] || 1) * ({ Düşük: 1, Orta: 2, Yüksek: 3 }[record?.impact] || 1);
  const businessRiskOpen = record => !['Kapandı', 'Azaltıldı', 'İptal'].includes(record?.status);
  const ohsRiskOpen = record => !['Kapalı', 'İptal'].includes(record?.status);
  const quoteBaseAmount = record => {
    const amount = +record?.total || 0, currency = String(record?.currency || 'TRY').toUpperCase();
    return currency === 'TRY' ? amount : amount * (+fxRates[currency] || 1);
  };

  let attentionFilter = 'all';
  let ganttRange = '90';
  let ganttFilter = 'all';
  let ganttCollapsed = localStorage.getItem('polpro-dashboard-gantt-collapsed') === 'true';
  const expandedProjects = new Set();

  function healthOf(record) {
    const today = nowIso(), used = budgetUsed(record.id), budgetRatio = record.budget > 0 ? used / record.budget : 0;
    const tasks = data.tasks.filter(task => +task.projectId === +record.id && task.status !== 'done');
    const lateTasks = tasks.filter(task => task.end && task.end < today).length;
    const latePurchases = (data.procurements || []).filter(item => +item.projectId === +record.id && openProcurement(item) && item.dueDate && item.dueDate < today && (+item.receivedQuantity || 0) < (+item.quantity || 0)).length;
    const criticalRisks = (data.risks || []).filter(item => +item.projectId === +record.id && businessRiskOpen(item) && businessRiskScore(item) >= 6).length;
    const highOhs = (data.ohsRisks || []).filter(item => +item.projectId === +record.id && ohsRiskOpen(item) && (+item.residualScore || +item.initialScore || 0) >= 200).length;
    const delayed = !closedProject(record) && record.end && record.end < today;
    const reasons = [];
    if (delayed) reasons.push('Termin geçti');
    if (budgetRatio > 1) reasons.push('Bütçe aşıldı'); else if (budgetRatio >= .85) reasons.push('Bütçe %85+');
    if (lateTasks) reasons.push(`${lateTasks} geciken görev`);
    if (latePurchases) reasons.push(`${latePurchases} geciken teslim`);
    if (criticalRisks + highOhs) reasons.push(`${criticalRisks + highOhs} kritik risk`);
    const critical = delayed || budgetRatio > 1 || highOhs > 0 || latePurchases > 1 || (lateTasks > 1 && criticalRisks > 0);
    return { tone: critical ? 'critical' : reasons.length ? 'warning' : 'good', reasons: reasons.length ? reasons : ['Planla uyumlu'], used, budgetRatio, lateTasks, latePurchases, criticalRisks: criticalRisks + highOhs };
  }

  function calendarEvents() {
    const ids = scopeIds(), start = nowIso(), end = addDays(start, 30), events = [];
    const push = (record, value, type, title, tab) => { if (ids.has(+record.projectId) && value && value >= start && value <= end) events.push({ projectId: +record.projectId, date: value, type, title, tab }); };
    data.tasks.filter(task => task.status !== 'done').forEach(task => push(task, task.end, 'Görev', task.title, 'tasks'));
    scopeProjects().filter(record => !closedProject(record)).forEach(record => {
      if (record.end >= start && record.end <= end) events.push({ projectId: +record.id, date: record.end, type: 'Proje teslimi', title: record.name, tab: 'summary' });
    });
    (data.procurements || []).filter(openProcurement).forEach(record => push(record, record.dueDate, 'Satın alma', record.materialDescription, 'procurement'));
    (data.purchaseQuotes || []).filter(record => !record.convertedAt && !['Reddedildi', 'İptal'].includes(record.status)).forEach(record => push(record, record.validUntil, 'Teklif', `${record.quoteNo || 'Teklif'} · ${record.supplier}`, 'procurement'));
    (data.actions || []).filter(record => !['Tamamlandı', 'İptal'].includes(record.status)).forEach(record => push(record, record.targetDate, 'Aksiyon', record.action, 'actions'));
    (data.qualityRecords || []).filter(record => !['Uygun', 'Kapandı', 'Tamamlandı'].includes(record.status)).forEach(record => push(record, record.testDate || record.controlDate || record.date, 'Test / kabul', record.controlType || record.nonconformity, 'quality'));
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  function attentionItems() {
    const today = nowIso(), items = [], ids = scopeIds();
    const add = item => { if (ids.has(+item.projectId)) items.push(item); };
    scopeProjects().filter(record => !closedProject(record)).forEach(record => {
      const health = healthOf(record), activity = data.activities.filter(item => +item.projectId === +record.id).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))[0];
      if (record.end && record.end < today) add({ projectId: record.id, tab: 'summary', kind: 'overdue', tone: 'critical', title: `${record.name} hedef tarihi geçti`, detail: `%${progress(record.id)} ilerleme · Proje lideri ${managerNames(record)}`, date: record.end });
      if (record.budget > 0 && health.budgetRatio >= .85) add({ projectId: record.id, tab: 'costs', kind: 'budget', tone: health.budgetRatio > 1 ? 'critical' : 'warning', title: health.budgetRatio > 1 ? `${record.name} bütçeyi aştı` : `${record.name} bütçe sınırına yaklaştı`, detail: `${money(health.used)} / ${money(record.budget)} · %${Math.round(health.budgetRatio * 100)}`, date: today });
      if (!activity || dayDiff(String(activity.at || '').slice(0, 10), today) > 30) add({ projectId: record.id, tab: 'activity', kind: 'stale', tone: 'warning', title: `${record.name} uzun süredir güncellenmedi`, detail: activity ? `Son hareket: ${displayDay(String(activity.at).slice(0, 10))}` : 'Henüz hareket kaydı yok', date: activity ? String(activity.at).slice(0, 10) : record.start });
    });
    data.tasks.filter(task => ids.has(+task.projectId) && task.status !== 'done').forEach(task => {
      if (task.end && task.end < today) add({ projectId: task.projectId, tab: 'tasks', kind: 'overdue', tone: 'critical', title: task.title, detail: `Görev gecikti · ${taskAssigneeLabel(task)}`, date: task.end });
      if (!task.assignee || task.assignee === 'Atanmadı') add({ projectId: task.projectId, tab: 'tasks', kind: 'assignment', tone: 'warning', title: task.title, detail: 'Görev sorumlusu atanmamış', date: task.end || today });
    });
    (data.procurements || []).filter(record => ids.has(+record.projectId) && openProcurement(record) && record.dueDate && record.dueDate < today && (+record.receivedQuantity || 0) < (+record.quantity || 0)).forEach(record => add({ projectId: record.projectId, tab: 'procurement', kind: 'procurement', tone: 'critical', title: record.materialDescription, detail: `${record.vendor} · ${(+record.quantity || 0) - (+record.receivedQuantity || 0)} ${record.unit || ''} eksik`, date: record.dueDate }));
    (data.purchaseQuotes || []).filter(record => ids.has(+record.projectId) && !record.convertedAt && !['Reddedildi', 'İptal'].includes(record.status) && record.validUntil && dayDiff(today, record.validUntil) <= 14).forEach(record => add({ projectId: record.projectId, tab: 'procurement', kind: 'deadline', tone: record.validUntil < today ? 'critical' : 'warning', title: `${record.quoteNo || 'Teklif'} geçerlilik tarihi`, detail: `${record.supplier} · ${record.validUntil < today ? 'Süresi doldu' : `${dayDiff(today, record.validUntil)} gün kaldı`}`, date: record.validUntil }));
    (data.risks || []).filter(record => ids.has(+record.projectId) && businessRiskOpen(record) && businessRiskScore(record) >= 6).forEach(record => add({ projectId: record.projectId, tab: 'risks', kind: 'risk', tone: 'critical', title: record.description, detail: `Risk puanı ${businessRiskScore(record)} · ${record.owner || 'Sorumlu yok'}`, date: record.targetDate || today }));
    (data.ohsRisks || []).filter(record => ids.has(+record.projectId) && ohsRiskOpen(record) && (+record.residualScore || +record.initialScore || 0) >= 200).forEach(record => add({ projectId: record.projectId, tab: 'ohs', kind: 'risk', tone: 'critical', title: record.hazardDescription || 'İSG / çevre riski', detail: `Risk puanı ${+record.residualScore || +record.initialScore} · ${record.owner || 'Sorumlu yok'}`, date: record.targetDate || today }));
    (data.actions || []).filter(record => ids.has(+record.projectId) && !['Tamamlandı', 'İptal'].includes(record.status) && record.targetDate && record.targetDate < today).forEach(record => add({ projectId: record.projectId, tab: 'actions', kind: 'overdue', tone: 'critical', title: record.action, detail: `Aksiyon gecikti · ${record.owner || 'Sorumlu yok'}`, date: record.targetDate }));
    const weight = { critical: 0, warning: 1, info: 2, good: 3 };
    return items.sort((a, b) => weight[a.tone] - weight[b.tone] || String(a.date || '').localeCompare(String(b.date || '')));
  }

  function renderTopMetrics() {
    const projects = scopeProjects(), active = projects.filter(record => !closedProject(record)), delayed = active.filter(record => record.end && record.end < nowIso()), totalBudget = projects.reduce((sum, record) => sum + (+record.budget || 0), 0), actual = projects.reduce((sum, record) => sum + spent(record.id), 0), average = projects.length ? Math.round(projects.reduce((sum, record) => sum + progress(record.id), 0) / projects.length) : 0;
    const criticalRisk = (data.risks || []).filter(record => inScope(record) && businessRiskOpen(record) && businessRiskScore(record) >= 6).length + (data.ohsRisks || []).filter(record => inScope(record) && ohsRiskOpen(record) && (+record.residualScore || +record.initialScore || 0) >= 200).length;
    const upcoming = calendarEvents().length;
    const cards = [
      { label: 'Aktif proje', value: active.length, note: `${projects.length} toplam proje`, tone: 'info', section: 'health' },
      { label: 'Geciken proje', value: delayed.length, note: delayed.length ? 'Müdahale gerekiyor' : 'Terminler normal', tone: delayed.length ? 'danger' : 'good', focus: 'overdue' },
      { label: '30 gün içinde', value: upcoming, note: 'Görev, teslim ve aksiyon', tone: upcoming ? 'warning' : 'good', section: 'calendar' },
      { label: 'Ortalama ilerleme', value: `%${average}`, note: 'Proje portföyü', tone: 'info', section: 'health' },
      { label: 'Gerçekleşen gider', value: money(actual), note: `${money(totalBudget)} bütçe`, tone: actual > totalBudget && totalBudget ? 'danger' : 'good', section: 'budget' },
      { label: 'Kritik risk', value: criticalRisk, note: 'Proje + İSG / çevre', tone: criticalRisk ? 'danger' : 'good', focus: 'risk' }
    ];
    $('#metrics').innerHTML = cards.map((item, index) => `<article class="metric metric-${item.tone}" tabindex="0" role="button" data-overview-metric="${index}" ${item.focus ? `data-attention-focus="${item.focus}"` : ''} ${item.section ? `data-overview-section="${item.section}"` : ''}><div class="metric-icon">${['▦', '!', '◷', '%', '₺', '◆'][index]}</div><div><span>${item.label}</span><strong>${item.value}</strong><small>${item.note}</small></div></article>`).join('');
  }

  function renderAttention() {
    const all = attentionItems(), shown = attentionFilter === 'all' ? all : all.filter(item => item.kind === attentionFilter), counts = all.reduce((result, item) => { result[item.kind] = (result[item.kind] || 0) + 1; return result; }, {});
    const labels = { all: 'Tümü', overdue: 'Gecikme', budget: 'Bütçe', procurement: 'Satın alma', deadline: 'Yaklaşan tarih', risk: 'Risk', assignment: 'Atama', stale: 'Güncellik' };
    $('#attentionSummary').innerHTML = Object.entries(labels).filter(([key]) => key === 'all' || counts[key]).map(([key, label]) => `<button type="button" class="${attentionFilter === key ? 'active' : ''}" data-attention-filter="${key}">${label} <b>${key === 'all' ? all.length : counts[key]}</b></button>`).join('');
    $('#clearAttentionFilter').hidden = attentionFilter === 'all';
    $('#attentionList').innerHTML = shown.slice(0, 12).map(item => `<button type="button" class="attention-item ${item.tone}" data-dashboard-target="${item.projectId}:${item.tab}"><i></i><span><strong>${escOverview(item.title)}</strong><small>${escOverview(project(item.projectId)?.name || '')} · ${escOverview(item.detail)}</small></span><time>${displayDay(item.date)}</time></button>`).join('') || '<div class="attention-empty">Seçili kapsamda müdahale gerektiren kayıt bulunmuyor.</div>';
    $$('[data-attention-filter]').forEach(button => button.onclick = () => { attentionFilter = button.dataset.attentionFilter; renderAttention(); });
    $('#clearAttentionFilter').onclick = () => { attentionFilter = 'all'; renderAttention(); };
    bindDashboardTargets($('#attentionList'));
  }

  function renderHealth() {
    const projects = scopeProjects().sort((a, b) => ({ critical: 0, warning: 1, good: 2 }[healthOf(a).tone] - ({ critical: 0, warning: 1, good: 2 }[healthOf(b).tone])));
    $('#projectOverview').innerHTML = projects.map(record => {
      const health = healthOf(record), pc = progress(record.id), budgetPercent = record.budget > 0 ? Math.round(health.used / record.budget * 100) : 0;
      return `<article class="project-health-row" data-dashboard-target="${record.id}:summary" tabindex="0" role="button"><span class="health-dot ${health.tone}" title="${health.tone === 'good' ? 'İyi' : health.tone === 'warning' ? 'Dikkat' : 'Kritik'}">${health.tone === 'good' ? '✓' : health.tone === 'warning' ? '!' : '×'}</span><div class="health-main"><strong>${escOverview(record.name)}</strong><small>${escOverview(managerNames(record))} · ${displayDay(record.end)}</small><span class="health-reasons">${health.reasons.slice(0, 3).map(reason => `<em>${escOverview(reason)}</em>`).join('')}</span></div><div class="health-stat"><span>İlerleme</span><b>%${pc}</b><div class="bar"><i style="width:${pc}%;background:${health.tone === 'critical' ? '#c94e4e' : health.tone === 'warning' ? '#d19a32' : '#318963'}"></i></div></div><div class="health-stat"><span>Bütçe kullanımı</span><b>%${budgetPercent}</b><div class="bar"><i style="width:${Math.min(100, budgetPercent)}%;background:${budgetPercent > 100 ? '#c94e4e' : budgetPercent >= 85 ? '#d19a32' : '#318963'}"></i></div></div></article>`;
    }).join('') || '<div class="attention-empty">Proje bulunmuyor.</div>';
    bindDashboardTargets($('#projectOverview'));
  }

  function renderBudgetFlow() {
    const projects = scopeProjects(), budget = projects.reduce((sum, record) => sum + (+record.budget || 0), 0), actual = projects.reduce((sum, record) => sum + spent(record.id), 0), commitments = projects.reduce((sum, record) => sum + committed(record.id), 0), remaining = budget - actual - commitments;
    const pendingQuotes = (data.purchaseQuotes || []).filter(record => inScope(record) && !record.convertedAt && !['Reddedildi', 'İptal'].includes(record.status)), quoteTotal = pendingQuotes.reduce((sum, record) => sum + quoteBaseAmount(record), 0), basis = Math.max(budget, actual + commitments, 1), actualPct = Math.min(100, actual / basis * 100), commitmentPct = Math.min(100 - actualPct, commitments / basis * 100), remainingPct = Math.max(0, 100 - actualPct - commitmentPct);
    $('#budgetFlow').innerHTML = `<div class="budget-flow-cards"><article><span>Planlanan bütçe</span><strong>${money(budget)}</strong></article><article><span>Gerçekleşen gider</span><strong class="expense-text">${money(actual)}</strong></article><article><span>Açık taahhüt</span><strong>${money(commitments)}</strong></article><article><span>Kullanılabilir</span><strong class="${remaining < 0 ? 'expense-text' : 'budget-text'}">${money(remaining)}</strong></article></div><div class="budget-flow-track ${remaining < 0 ? 'over' : ''}" title="Bütçe kullanımı"><i class="actual" style="width:${actualPct}%"></i><i class="commitment" style="width:${commitmentPct}%"></i><i class="remaining" style="width:${remainingPct}%"></i></div><div class="budget-flow-legend"><span>Gerçekleşen</span><span class="commitment">Taahhüt</span><span class="remaining">Kalan</span></div><div class="quote-note"><strong>${pendingQuotes.length} bekleyen teklif · ${money(quoteTotal)}</strong><br>Teklifler bütçeye gider veya taahhüt olarak eklenmez; satın almaya aktarıldığında taahhüt hesabına girer.</div>`;
  }

  function renderCalendar() {
    const events = calendarEvents();
    $('#upcomingCalendar').innerHTML = events.slice(0, 9).map(item => { const value = parseDay(item.date); return `<article class="calendar-item" data-dashboard-target="${item.projectId}:${item.tab}" tabindex="0" role="button"><span class="calendar-date"><b>${value?.getDate() || '—'}</b><span>${value?.toLocaleDateString('tr-TR', { month: 'short' }) || ''}</span></span><div><strong>${escOverview(item.title)}</strong><small>${escOverview(project(item.projectId)?.name || '')} · ${displayDay(item.date)}</small></div><span class="calendar-type">${escOverview(item.type)}</span></article>`; }).join('') || '<div class="attention-empty">Önümüzdeki 30 gün için tarihli kayıt bulunmuyor.</div>';
    bindDashboardTargets($('#upcomingCalendar'));
  }

  function renderRecentActivity() {
    const ids = scopeIds(), rows = data.activities.filter(item => ids.has(+item.projectId)).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 10), icons = { task: '✓', cost: '₺', file: '▤', supplier: '◆', update: '↻' };
    $('#activityScopeLabel').textContent = dashboardFilterId ? project(dashboardFilterId)?.name || '' : 'Tüm projeler';
    $('#recentActivity').innerHTML = rows.map(item => `<article class="activity-item" data-dashboard-target="${item.projectId}:activity" tabindex="0" role="button"><span class="activity-icon">${icons[item.kind] || '•'}</span><div><strong>${escOverview(item.action)}</strong><small>${escOverview(item.actor || 'Kullanıcı')} · ${escOverview(item.detail || '')}</small></div><time>${item.at ? new Date(item.at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</time></article>`).join('') || '<div class="attention-empty">Hareket kaydı bulunmuyor.</div>';
    bindDashboardTargets($('#recentActivity'));
  }

  function bindDashboardTargets(root) {
    root?.querySelectorAll('[data-dashboard-target]').forEach(element => {
      const open = () => { const [projectId, tab] = element.dataset.dashboardTarget.split(':'); openProjectDetail(+projectId); requestAnimationFrame(() => $(`[data-detail-tab="${tab}"]`)?.click()); };
      element.onclick = open;
      element.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
    });
  }

  function criticalTaskSet(record, tasks) {
    const successors = new Map();
    tasks.forEach(task => { if (task.predecessorId) { const list = successors.get(String(task.predecessorId)) || []; list.push(task); successors.set(String(task.predecessorId), list); } });
    return new Set(tasks.filter(task => { const next = successors.get(String(task.id)) || [], latest = next.length ? Math.min(...next.map(item => parseDay(item.start))) : parseDay(record.end), taskEnd = parseDay(task.end); return taskEnd && latest && Math.round((latest - taskEnd) / DAY) <= 1 && (next.length || task.end >= record.end); }).map(task => String(task.id)));
  }

  function ganttBounds(projects, tasks) {
    const today = parseDay(nowIso()), all = [...projects.flatMap(record => [record.start, record.end]), ...tasks.flatMap(task => [task.start, task.end])].filter(value => parseDay(value)).sort();
    if (ganttRange === 'month') return { start: new Date(today.getFullYear(), today.getMonth(), 1, 12), end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 12) };
    if (ganttRange !== 'fit') { const start = new Date(today); start.setDate(start.getDate() - 7); const end = new Date(start); end.setDate(end.getDate() + (+ganttRange || 90)); return { start, end }; }
    const start = all.length ? parseDay(all[0]) : new Date(today), end = all.length ? parseDay(all.at(-1)) : new Date(today);
    start.setDate(start.getDate() - 14); end.setDate(end.getDate() + 14); return { start, end: end > start ? end : new Date(start.getTime() + 90 * DAY) };
  }

  renderDashboardGantt = function () {
    const root = $('#dashboardGantt');
    if (!root) return;
    const projects = scopeProjects(), ids = new Set(projects.map(record => +record.id)), allTasks = data.tasks.filter(task => ids.has(+task.projectId)), criticalByProject = new Map(projects.map(record => [record.id, criticalTaskSet(record, allTasks.filter(task => +task.projectId === +record.id))]));
    const today = nowIso(), matches = task => ganttFilter === 'late' ? task.status !== 'done' && task.end < today : ganttFilter === 'critical' ? criticalByProject.get(task.projectId)?.has(String(task.id)) : true;
    const visibleProjects = ganttFilter === 'all' ? projects : projects.filter(record => allTasks.some(task => +task.projectId === +record.id && matches(task))), bounds = ganttBounds(visibleProjects, allTasks.filter(matches)), total = Math.max(DAY, bounds.end - bounds.start), pos = value => Math.max(0, Math.min(100, (parseDay(value) - bounds.start) / total * 100));
    const monthCount = Math.max(1, (bounds.end.getFullYear() - bounds.start.getFullYear()) * 12 + bounds.end.getMonth() - bounds.start.getMonth() + 1), width = Math.max(820, 255 + monthCount * 95), months = [];
    for (let cursor = new Date(bounds.start.getFullYear(), bounds.start.getMonth(), 1, 12); cursor < bounds.end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12)) { const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12), left = Math.max(0, (cursor - bounds.start) / total * 100), right = Math.min(100, (next - bounds.start) / total * 100); months.push(`<span style="left:${left}%;width:${Math.max(0, right - left)}%">${cursor.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })}</span>`); }
    const todayPosition = parseDay(today) >= bounds.start && parseDay(today) <= bounds.end ? `<i class="overview-gantt-today" style="left:${pos(today)}%"></i>` : '';
    let rows = '';
    visibleProjects.forEach(record => {
      const projectTasks = allTasks.filter(task => +task.projectId === +record.id && matches(task)).sort((a, b) => (Number.isFinite(+a.ganttOrder) ? +a.ganttOrder : 9999) - (Number.isFinite(+b.ganttOrder) ? +b.ganttOrder : 9999) || String(a.start).localeCompare(String(b.start))), expanded = ganttFilter !== 'all' || expandedProjects.has(+record.id), left = pos(record.start), right = pos(record.end);
      rows += `<div class="overview-gantt-row project" data-dashboard-expand="${record.id}"><div class="overview-gantt-label"><strong><span class="overview-gantt-toggle">${expanded ? '▾' : '▸'}</span>${escOverview(record.name)}</strong><small>${displayDay(record.start)} – ${displayDay(record.end)}</small></div><div class="overview-gantt-track">${todayPosition}<span class="overview-gantt-bar project" style="left:${left}%;width:${Math.max(.4, right - left)}%"><b>%${progress(record.id)}</b></span></div></div>`;
      if (expanded) projectTasks.forEach(task => { const taskLeft = pos(task.start), taskRight = pos(task.end), late = task.status !== 'done' && task.end < today, critical = criticalByProject.get(record.id)?.has(String(task.id)), actualEnd = task.actualEnd || (task.actualStart ? today : ''); rows += `<div class="overview-gantt-row task"><div class="overview-gantt-label"><strong>${escOverview(task.title)}</strong><small>${escOverview(task.assignee || 'Atanmadı')} · ${displayDay(task.start)} – ${displayDay(task.end)}</small></div><div class="overview-gantt-track">${todayPosition}<button type="button" class="overview-gantt-bar ${late ? 'late' : ''} ${critical ? 'critical' : ''}" data-dashboard-task="${task.id}" style="left:${taskLeft}%;width:${Math.max(.4, taskRight - taskLeft)}%" title="${escOverview(task.title)}"><b>${task.completion || 0}%</b></button>${task.actualStart && actualEnd ? `<i class="overview-actual-bar" style="left:${pos(task.actualStart)}%;width:${Math.max(.25, pos(actualEnd) - pos(task.actualStart))}%"></i>` : ''}</div></div>`; });
    });
    root.innerHTML = `<div class="overview-gantt" style="width:${width}px"><div class="overview-gantt-head-row"><div>Proje / görev</div><div class="overview-gantt-months">${months.join('')}${todayPosition}</div></div>${rows || '<div class="overview-gantt-empty">Seçili filtreye uygun plan kaydı bulunmuyor.</div>'}</div>`;
    root.querySelectorAll('[data-dashboard-expand]').forEach(row => row.onclick = () => { const id = +row.dataset.dashboardExpand; if (expandedProjects.has(id)) expandedProjects.delete(id); else expandedProjects.add(id); renderDashboardGantt(); });
    root.querySelectorAll('[data-dashboard-task]').forEach(button => button.onclick = event => { event.stopPropagation(); openDialog('task', button.dataset.dashboardTask); });
    const card = root.closest('.overview-gantt-card');
    card?.classList.toggle('collapsed', ganttCollapsed);
    $('#dashboardGanttCollapse').textContent = ganttCollapsed ? 'Genişlet' : 'Daralt';
  };

  function bindDashboardControls() {
    const filter = $('#dashboardProjectFilter');
    if (filter) { filter.innerHTML = '<option value="">Tüm projeler</option>' + data.projects.map(record => `<option value="${record.id}">${escOverview(record.name)}</option>`).join(''); filter.value = dashboardFilterId || ''; filter.onchange = () => { attentionFilter = 'all'; setDashboardFilter(+filter.value); }; }
    $$('#dashboard [data-overview-metric]').forEach(card => {
      const activate = () => { const focus = card.dataset.attentionFocus, section = card.dataset.overviewSection; if (focus) { attentionFilter = focus; renderAttention(); $('.overview-attention-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else if (section) $(`.overview-${section}-card`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      card.onclick = activate; card.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } };
    });
    $$('#dashboardGanttRange [data-dashboard-range]').forEach(button => { button.classList.toggle('active', button.dataset.dashboardRange === ganttRange); button.onclick = () => { ganttRange = button.dataset.dashboardRange; $$('#dashboardGanttRange [data-dashboard-range]').forEach(item => item.classList.toggle('active', item === button)); renderDashboardGantt(); }; });
    const ganttSelect = $('#dashboardGanttFilter'); if (ganttSelect) { ganttSelect.value = ganttFilter; ganttSelect.onchange = () => { ganttFilter = ganttSelect.value; renderDashboardGantt(); }; }
    const collapse = $('#dashboardGanttCollapse'); if (collapse) collapse.onclick = () => { ganttCollapsed = !ganttCollapsed; localStorage.setItem('polpro-dashboard-gantt-collapsed', String(ganttCollapsed)); renderDashboardGantt(); };
  }

  renderMetrics = function () {
    renderTopMetrics();
    renderAttention();
    renderHealth();
    renderBudgetFlow();
    renderCalendar();
    renderRecentActivity();
    bindDashboardControls();
  };

  renderMetrics();
  renderDashboardGantt();
})();
