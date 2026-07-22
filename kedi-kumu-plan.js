(function () {
  const plan = [
    ['1.1', 'Detay mühendislik ve proses akış onayı', 'Proje Müh.', 1, 2, '2026-07-27', '2026-08-09', 'FAZ 1 — MÜHENDİSLİK VE TASARIM', 'Mühendislik ve Tasarım', 14],
    ['1.2', 'Saha ölçümü ve final yerleşim (layout) onayı', 'Proje Müh. / Saha', 1, 2, '2026-07-27', '2026-08-09', 'FAZ 1 — MÜHENDİSLİK VE TASARIM', 'Mühendislik ve Tasarım', 14],
    ['1.3', 'Ekipman teknik şartname ve teklif toplama', 'Satınalma', 1, 2, '2026-07-27', '2026-08-09', 'FAZ 1 — MÜHENDİSLİK VE TASARIM', 'Mühendislik ve Tasarım', 14],
    ['2.1', 'Kuru ürün hattı ekipmanları (BB-01, BK-01, DE-01, LV-01/02/03, DK-01, KE-01/02/03, AB-01/02)', 'Satınalma', 2, 5, '2026-08-03', '2026-08-30', 'FAZ 2 — SATINALMA', 'Satın Alma', 28],
    ['2.2', 'Karıştırma/kaplama ekipmanları (MX-01, MX-02, BK-03)', 'Satınalma', 2, 5, '2026-08-03', '2026-08-30', 'FAZ 2 — SATINALMA', 'Satın Alma', 28],
    ['2.3', 'Tozsuzlaştırma sistemi (TF-01, RV-01, FF-01)', 'Satınalma', 2, 4, '2026-08-03', '2026-08-23', 'FAZ 2 — SATINALMA', 'Satın Alma', 21],
    ['2.4', 'Guar gum dozaj sistemi (BT-01, RC-01, RV-02, SB-01, KF-01, KT-01)', 'Satınalma', 2, 4, '2026-08-03', '2026-08-23', 'FAZ 2 — SATINALMA', 'Satın Alma', 21],
    ['2.5', 'Yağ depolama ve dozaj sistemi (SD-01, YT-01/02, PP-01)', 'Satınalma', 2, 4, '2026-08-03', '2026-08-23', 'FAZ 2 — SATINALMA', 'Satın Alma', 21],
    ['2.6', 'Paketleme hattı ve robot (elevatör, dolum, kutulama, paletleme, streç)', 'Satınalma', 2, 6, '2026-08-03', '2026-09-06', 'FAZ 2 — SATINALMA', 'Satın Alma', 35],
    ['2.7', 'Çelik yapı, platform, merdiven, ayak imalatı', 'Satınalma / Atölye', 3, 6, '2026-08-10', '2026-09-06', 'FAZ 2 — SATINALMA', 'Satın Alma', 28],
    ['2.8', 'Elektrik pano, kablo, otomasyon donanımı satınalma', 'Satınalma', 3, 5, '2026-08-10', '2026-08-30', 'FAZ 2 — SATINALMA', 'Satın Alma', 21],
    ['3.1', 'Temel, zemin ve ankraj işleri', 'İnşaat', 1, 4, '2026-07-27', '2026-08-23', 'FAZ 3 — SAHA HAZIRLIĞI VE İNŞAAT', 'Saha Hazırlığı ve İnşaat', 28],
    ['3.2', 'Bacalar, kanal altyapısı ve geçiş delikleri', 'İnşaat', 3, 5, '2026-08-10', '2026-08-30', 'FAZ 3 — SAHA HAZIRLIĞI VE İNŞAAT', 'Saha Hazırlığı ve İnşaat', 21],
    ['3.3', 'Saha altyapısı kabul kontrolü', 'Proje Müh.', 5, 5, '2026-08-24', '2026-08-30', 'FAZ 3 — SAHA HAZIRLIĞI VE İNŞAAT', 'Saha Hazırlığı ve İnşaat', 7],
    ['4.1', 'Kuru ürün işleme hattı montajı (Big Bag → Kovalı Elevatör → Ara Bunker)', 'Montaj', 5, 7, '2026-08-24', '2026-09-13', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 21],
    ['4.2', 'Tozsuzlaştırma sistemi montajı', 'Montaj', 6, 7, '2026-08-31', '2026-09-13', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 14],
    ['4.3', 'Guar gum dozaj sistemi montajı', 'Montaj', 6, 8, '2026-08-31', '2026-09-20', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 21],
    ['4.4', 'Kaplanmış ürün elleçleme / karıştırıcı hattı montajı (MX, KE-02, BK-03)', 'Montaj', 7, 9, '2026-09-07', '2026-09-27', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 21],
    ['4.5', 'Yağ depolama ve dozaj sistemi montajı', 'Montaj', 7, 8, '2026-09-07', '2026-09-20', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 14],
    ['4.6', 'Boru tesisatı, diverter valf, kanal ve baca montajı', 'Montaj', 7, 9, '2026-09-07', '2026-09-27', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 21],
    ['4.7', 'Paketleme hattı montajı (elevatör, dolum, kutu kapatma, paletleme, streç)', 'Montaj', 8, 11, '2026-09-14', '2026-10-11', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 28],
    ['4.8', 'Robot montajı ve mekanik entegrasyonu', 'Montaj', 10, 11, '2026-09-28', '2026-10-11', 'FAZ 4 — MEKANİK MONTAJ', 'Mekanik Montaj', 14],
    ['5.1', 'Elektrik kablolama, bağlantı kutuları ve pano montajı', 'Elektrik', 6, 10, '2026-08-31', '2026-10-04', 'FAZ 5 — ELEKTRİK VE OTOMASYON', 'Elektrik ve Otomasyon', 35],
    ['5.2', 'Otomasyon yazılımı geliştirme (PLC / SCADA / reçete)', 'Otomasyon', 5, 10, '2026-08-24', '2026-10-04', 'FAZ 5 — ELEKTRİK VE OTOMASYON', 'Elektrik ve Otomasyon', 42],
    ['5.3', 'Saha entegrasyonu, sensör/aktüatör devreye alma', 'Otomasyon', 10, 12, '2026-09-28', '2026-10-18', 'FAZ 5 — ELEKTRİK VE OTOMASYON', 'Elektrik ve Otomasyon', 21],
    ['6.1', 'Mekanik kuru (yüksüz) fonksiyon testleri', 'Devreye Alma', 12, 13, '2026-10-12', '2026-10-25', 'FAZ 6 — DEVREYE ALMA VE TEST', 'Test ve Devreye Alma', 14],
    ['6.2', 'Yüklü test / prova üretim çalışması', 'Devreye Alma', 13, 14, '2026-10-19', '2026-11-01', 'FAZ 6 — DEVREYE ALMA VE TEST', 'Test ve Devreye Alma', 14],
    ['6.3', 'Robot ve paketleme hattı entegrasyon testi', 'Devreye Alma', 13, 14, '2026-10-19', '2026-11-01', 'FAZ 6 — DEVREYE ALMA VE TEST', 'Test ve Devreye Alma', 14],
    ['6.4', 'Performans testi (FAT/SAT) ve kapasite doğrulama', 'Devreye Alma / Müşteri', 14, 15, '2026-10-26', '2026-11-08', 'FAZ 6 — DEVREYE ALMA VE TEST', 'Test ve Devreye Alma', 14],
    ['7.1', 'Operatör ve bakım ekibi eğitimi', 'Eğitim', 15, 15, '2026-11-02', '2026-11-08', 'FAZ 7 — TESLİM', 'Teslim ve Eğitim', 7],
    ['7.2', 'Dokümantasyon (as-built, manüel, sertifikalar) teslimi', 'Proje Müh.', 15, 15, '2026-11-02', '2026-11-08', 'FAZ 7 — TESLİM', 'Teslim ve Eğitim', 7],
    ['7.3', 'Nihai kabul ve devir teslim', 'Proje Yön.', 16, 16, '2026-11-09', '2026-11-15', 'FAZ 7 — TESLİM', 'Teslim ve Eğitim', 7]
  ];

  const resourceByUnit = {
    'Proje Müh.': 'Mekanik Tasarım', 'Proje Müh. / Saha': 'İnşaat / Saha', Satınalma: 'Satın Alma',
    'Satınalma / Atölye': 'Satın Alma', İnşaat: 'İnşaat / Saha', Montaj: 'Montaj', Elektrik: 'Elektrik',
    Otomasyon: 'Otomasyon', 'Devreye Alma': 'Test Alanı', 'Devreye Alma / Müşteri': 'Test Alanı',
    Eğitim: 'Eğitim', 'Proje Yön.': 'Proje Yönetimi'
  };

  const normalizeTitle = value => String(value || '')
    .replace(/^\d+(?:\.\d+)?\s*(?:—|-)\s*/, '')
    .toLocaleLowerCase('tr')
    .replace(/[^a-z0-9çğıöşü]+/g, '');

  function apply(data) {
    if (!data || !Array.isArray(data.projects) || !Array.isArray(data.tasks)) return { changed: false, reason: 'invalid-data' };
    data.migrations = data.migrations && typeof data.migrations === 'object' ? data.migrations : {};
    if (data.migrations.kediKumuTaskPlanV2) return { changed: false, reason: 'already-applied' };
    const project = data.projects.find(item => String(item.name).toLocaleLowerCase('tr').includes('kedi kumu'));
    if (!project) return { changed: false, reason: 'project-not-found' };

    let nextId = Math.max(Date.now(), ...data.tasks.map(task => +task.id || 0)) + 1;
    let added = 0, updated = 0;
    plan.forEach(([wbsCode, title, assignee, planWeekStart, planWeekEnd, start, end, phase, workPackage, durationDays]) => {
      const existing = data.tasks.find(task => task.projectId === project.id && (task.wbsCode === wbsCode || normalizeTitle(task.title) === normalizeTitle(title)));
      const milestoneName = wbsCode === '1.1' ? 'Tasarım Onayı' : wbsCode === '6.4' ? 'FAT' : wbsCode === '7.3' ? 'Proje Teslimi' : '';
      const values = {
        projectId: project.id,
        wbsCode,
        title: `${wbsCode} — ${title}`,
        assignee,
        assigneeType: 'unit',
        accountable: project.manager || project.managers?.[0] || '',
        consulted: [],
        informed: [],
        priority: 'Orta',
        start,
        end,
        predecessorId: '',
        milestone: milestoneName ? 'true' : 'false',
        milestoneName,
        workPackage,
        resourceGroup: resourceByUnit[assignee] || 'Proje Yönetimi',
        effortHours: 0,
        durationDays,
        planWeekStart,
        planWeekEnd,
        phase,
        description: `${phase} · Plan haftası ${planWeekStart}–${planWeekEnd} · Süre: ${durationDays} gün · Sorumlu birim: ${assignee}`,
        delayReason: ''
      };
      if (existing) {
        Object.assign(existing, values);
        existing.status ||= 'todo';
        existing.completion = Number(existing.completion) || 0;
        existing.actualStart ||= '';
        existing.actualEnd ||= '';
        updated++;
      } else {
        data.tasks.push({ id: nextId++, status: 'todo', completion: 0, actualStart: '', actualEnd: '', ...values });
        added++;
      }
    });

    data.activities = Array.isArray(data.activities) ? data.activities : [];
    data.activities.unshift({
      id: Math.max(Date.now(), ...data.activities.map(item => +item.id || 0)) + 1,
      projectId: project.id,
      at: new Date().toISOString(),
      actor: 'PolPro Plan Aktarımı',
      action: 'Proje görev planı içe aktarıldı',
      detail: `${plan.length} plan satırı işlendi: ${added} görev eklendi, ${updated} görev güncellendi.`,
      kind: 'task'
    });
    data.migrations.kediKumuTaskPlanV2 = true;
    return { changed: true, projectId: project.id, projectName: project.name, total: plan.length, added, updated };
  }

  const api = { plan, apply };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof data !== 'undefined') {
    const result = apply(data);
    if (result.changed) {
      if (typeof save === 'function') save();
      if (typeof currentDetailId !== 'undefined' && currentDetailId === result.projectId && typeof renderProjectDetail === 'function') renderProjectDetail();
      if (typeof toast === 'function') setTimeout(() => toast(`${result.projectName}: ${result.added} görev eklendi, ${result.updated} görev güncellendi.`), 50);
    }
  }
})();
