(function () {
  data.purchaseQuotes = Array.isArray(data.purchaseQuotes) ? data.purchaseQuotes : [];
  data.procurements = Array.isArray(data.procurements) ? data.procurements : [];

  const todayIso = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const normalizeStatus = value => String(value || '').toLocaleLowerCase('tr')
    .replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ğ', 'g')
    .replaceAll('ü', 'u').replaceAll('ö', 'o').replaceAll('ç', 'c')
    .replace(/[^a-z0-9]+/g, '-');
  const makeId = () => Date.now() * 100 + Math.floor(Math.random() * 100);
  const addDays = (isoDate, dayCount) => {
    const dateValue = new Date((isoDate || todayIso()) + 'T12:00:00');
    dateValue.setDate(dateValue.getDate() + Math.max(0, +dayCount || 0));
    return dateValue.toISOString().slice(0, 10);
  };
  const quoteMoney = (value, currency = 'TRY') => new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: ['TRY', 'EUR', 'USD'].includes(currency) ? currency : 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(+value || 0);
  const calculateQuote = (lines, vatRate) => {
    const gross = lines.reduce((sum, line) => sum + ((+line.quantity || 0) * (+line.unitPrice || 0)), 0);
    const net = lines.reduce((sum, line) => {
      const rowGross = (+line.quantity || 0) * (+line.unitPrice || 0);
      return sum + rowGross * (1 - Math.min(100, Math.max(0, +line.discountRate || 0)) / 100);
    }, 0);
    const discountTotal = gross - net;
    const taxTotal = net * (Math.max(0, +vatRate || 0) / 100);
    return { subtotal: gross, discountTotal, taxTotal, total: net + taxTotal };
  };

  data.purchaseQuotes.forEach(quote => {
    quote.lines = Array.isArray(quote.lines) ? quote.lines : [];
    quote.currency = ['TRY', 'EUR', 'USD'].includes(quote.currency) ? quote.currency : 'TRY';
    quote.vatRate = Math.max(0, +quote.vatRate || 0);
    quote.deliveryDays = Math.max(0, +quote.deliveryDays || 0);
    quote.warrantyMonths = Math.max(0, +quote.warrantyMonths || 0);
    quote.documentFileIds = Array.isArray(quote.documentFileIds) ? quote.documentFileIds : [];
    quote.status ||= 'Taslak';
    quote.lines.forEach(line => {
      line.id ||= makeId();
      line.quantity = Math.max(0, +line.quantity || 0);
      line.unitPrice = Math.max(0, +line.unitPrice || 0);
      line.discountRate = Math.min(100, Math.max(0, +line.discountRate || 0));
      line.unit ||= 'Adet';
    });
    Object.assign(quote, calculateQuote(quote.lines, quote.vatRate));
  });

  data.procurements.forEach(record => {
    record.receivedQuantity = Math.max(0, +record.receivedQuantity || 0);
    record.unit ||= 'Adet';
    record.procurementStatus ||= record.quoteStatus === 'İptal'
      ? 'İptal edildi'
      : record.receivedQuantity > 0 && record.receivedQuantity < (+record.quantity || 0)
        ? 'Kısmi teslim'
        : 'Sipariş verildi';
    record.costId ||= '';
    record.invoiceNo ||= '';
    record.statusNote ||= '';
  });

  const quoteProcurementRecords = quote => data.procurements.filter(record =>
    String(record.quoteId || '') === String(quote.id) && record.procurementStatus !== 'İptal edildi'
  );
  const quoteTransferState = quote => {
    const lineIds = new Set(quote.lines.map(line => String(line.id)));
    const records = quoteProcurementRecords(quote);
    const linkedLineIds = new Set(records
      .map(record => String(record.quoteLineId || ''))
      .filter(lineId => lineIds.has(lineId)));
    const missingLines = quote.lines.filter(line => !linkedLineIds.has(String(line.id)));
    const linkedCount = linkedLineIds.size;
    const totalCount = quote.lines.length;
    return {
      records,
      missingLines,
      linkedCount,
      totalCount,
      state: linkedCount === 0 ? 'none' : linkedCount >= totalCount ? 'full' : 'partial'
    };
  };
  const syncQuoteTransferMetadata = quote => {
    const transfer = quoteTransferState(quote);
    if (transfer.state === 'none') {
      quote.convertedAt = '';
      quote.convertedBy = '';
    } else {
      quote.convertedAt ||= new Date().toISOString();
    }
    return transfer;
  };
  const quoteProcurementChangeActivity = quote => (Array.isArray(data.activities) ? data.activities : [])
    .find(activity =>
      +activity.projectId === +quote.projectId &&
      activity.action === 'Satın alma kaydı silindi' &&
      String(activity.detail || '').split(' · ').includes(String(quote.quoteNo))
    );
  data.purchaseQuotes.forEach(quote => {
    const transfer = syncQuoteTransferMetadata(quote);
    if (transfer.state !== 'none' || quote.procurementChangedAt) return;
    const changeActivity = quoteProcurementChangeActivity(quote);
    if (!changeActivity) return;
    quote.procurementChangedAt = changeActivity.at || new Date().toISOString();
    quote.procurementChangedBy = changeActivity.actor || '';
  });

  let activePurchaseView = 'quotes';
  let editingQuoteId = null;
  let draftLines = [];
  let draftDocumentFileIds = [];
  let pendingDocumentFiles = [];
  const quoteDocuments = quote => (quote.documentFileIds || [])
    .map(id => data.files.find(file => String(file.id) === String(id)))
    .filter(Boolean);

  function ensureQuoteDialog() {
    if ($('#purchaseQuoteDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="purchaseQuoteDialog" class="purchase-quote-dialog">
        <form id="purchaseQuoteForm">
          <header class="quote-dialog-head">
            <div><p class="kicker">SATIN ALMA VE TEKLİFLER</p><h2 id="purchaseQuoteTitle">Yeni teklif</h2></div>
            <button type="button" class="dialog-close" id="closePurchaseQuote" aria-label="Teklif formunu kapat">×</button>
          </header>
          <input type="hidden" name="projectId">
          <section class="quote-form-section">
            <div class="quote-form-grid quote-supplier-grid">
              <label class="full">Kayıtlı tedarikçi
              <span class="quote-supplier-field">
                <select name="supplier" required></select>
                <button type="button" class="secondary" id="addSupplierFromQuote">+ Yeni tedarikçi ekle</button>
              </span>
              </label>
            </div>
            <div class="quote-form-grid quote-primary-meta">
              <label>Teklif no<input name="quoteNo" maxlength="80" required></label>
              <label>Teklif tarihi<input name="quoteDate" type="date" required></label>
              <label>Para birimi<select name="currency"><option value="TRY">₺ TL</option><option value="EUR">€ EUR</option><option value="USD">$ USD</option></select></label>
              <label>KDV (%)<input name="vatRate" type="number" min="0" max="100" step="0.01" value="20"></label>
            </div>
          </section>
          <div class="quote-lines-head">
            <div><h3>Malzeme kalemleri</h3><p id="quoteLineCount">0 kalem</p></div>
            <button type="button" class="secondary" id="addQuoteLine">+ Malzeme satırı ekle</button>
          </div>
          <div class="quote-lines-wrap">
            <table class="quote-lines-table">
              <thead><tr><th>Malzeme kodu</th><th>Malzeme / teknik özellik</th><th>Miktar</th><th>Birim</th><th>Birim fiyat</th><th>İskonto (%)</th><th class="right">Satır toplamı</th><th></th></tr></thead>
              <tbody id="quoteLinesBody"></tbody>
            </table>
          </div>
          <div class="quote-totals" aria-live="polite">
            <div><span>Ara toplam</span><strong id="quoteSubtotal">₺0,00</strong></div>
            <div><span>Satır iskontoları</span><strong id="quoteDiscount">₺0,00</strong></div>
            <div><span>KDV</span><strong id="quoteTax">₺0,00</strong></div>
            <div class="grand-total"><span>Genel toplam</span><strong id="quoteGrandTotal">₺0,00</strong></div>
          </div>
          <section class="quote-form-section quote-commercial-section">
            <div class="quote-form-grid quote-commercial-grid">
              <label>Genel termin (gün)<input name="deliveryDays" type="number" min="0" step="1" value="0"></label>
              <label>Ödeme koşulu<input name="paymentTerms" maxlength="180" placeholder="%30 sipariş / %70 teslim"></label>
              <label>Garanti (ay)<input name="warrantyMonths" type="number" min="0" step="1" value="0"></label>
              <div class="quote-document-field">
                <span class="quote-field-label">Teklif belgesi</span>
                <label class="quote-file-picker">+ Belge seç<input id="quoteDocumentInput" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"></label>
                <small>Birden fazla belge seçilebilir · Her belge en fazla 15 MB</small>
              </div>
            </div>
            <div id="quoteDocumentList" class="quote-document-list"></div>
          </section>
          <details class="quote-extra-details">
            <summary>Ek teklif bilgileri</summary>
            <div class="quote-form-grid">
              <label>Geçerlilik tarihi<input name="validUntil" type="date"></label>
              <label>Durum<select name="status"><option>Taslak</option><option>Gönderildi</option><option>Değerlendiriliyor</option><option>Revizyon İstendi</option><option>Onaylandı</option><option>Reddedildi</option></select></label>
              <label class="full">Harici belge bağlantısı<input name="documentUrl" type="url" placeholder="https://..."></label>
              <label class="full">Notlar<textarea name="notes" rows="2"></textarea></label>
            </div>
          </details>
          <footer class="quote-dialog-actions">
            <p>Kalem tutarları miktar, fiyat ve iskonto değiştikçe otomatik hesaplanır.</p>
            <button type="button" class="secondary" id="cancelPurchaseQuote">Vazgeç</button>
            <button type="submit" class="primary">Teklifi kaydet</button>
          </footer>
        </form>
      </dialog>`);

    $('#closePurchaseQuote').onclick = $('#cancelPurchaseQuote').onclick = () => $('#purchaseQuoteDialog').close();
    $('#addQuoteLine').onclick = () => {
      draftLines.push({
        id: makeId(), materialCode: '', description: '', technicalSpec: '',
        quantity: 1, unit: 'Adet', unitPrice: 0, discountRate: 0
      });
      renderQuoteLines();
      $('#quoteLinesBody tr:last-child [data-line-field="materialCode"]')?.focus();
    };
    $('#addSupplierFromQuote').onclick = () => {
      const projectId = +$('#purchaseQuoteForm').elements.projectId.value;
      if (!projectId) return toast('Önce proje seçilmelidir.');
      if (!confirm('Kaydedilmemiş teklif bilgileri kapanacak. Tedarikçi ekleme ekranına geçilsin mi?')) return;
      $('#purchaseQuoteDialog').close();
      currentDetailId = projectId;
      go('projectDetail');
      renderProjectDetail();
      $('[data-detail-tab="suppliers"]')?.click();
      setTimeout(() => openDialog('supplier', null, { projectId, rating: 0, status: 'Aday' }), 0);
    };
    $('#quoteDocumentInput').onchange = event => {
      const selected = [...event.currentTarget.files];
      selected.forEach(file => {
        if (file.size > 15 * 1024 * 1024) toast(`${file.name}: belge sınırı 15 MB.`);
        else pendingDocumentFiles.push(file);
      });
      event.currentTarget.value = '';
      renderQuoteDocuments();
    };
    $('#purchaseQuoteForm').onsubmit = saveQuoteForm;
  }

  function ensureProcurementStatusDialog() {
    if ($('#procurementStatusDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="procurementStatusDialog" class="procurement-status-dialog">
        <form id="procurementStatusForm">
          <header class="quote-dialog-head">
            <div><p class="kicker">SATIN ALMA DURUMU</p><h2 id="procurementStatusTitle">Satın alma durumunu güncelle</h2></div>
            <button type="button" class="dialog-close" id="closeProcurementStatus" aria-label="Durum formunu kapat">×</button>
          </header>
          <input type="hidden" name="recordId"><input type="hidden" name="targetStatus">
          <div class="procurement-status-summary" id="procurementStatusSummary"></div>
          <div class="procurement-status-fields" data-status-fields="receipt">
            <label>İşlem tarihi<input name="transactionDate" type="date" required></label>
            <label>Toplam gelen miktar<input name="receivedQuantity" type="number" min="0" step="0.01" required></label>
          </div>
          <div class="procurement-status-fields" data-status-fields="realized">
            <label>Gerçekleşen tutar <span id="procurementActualCurrency"></span><input name="actualAmount" type="number" min="0" step="0.01"></label>
            <label>Fatura numarası<input name="invoiceNo" maxlength="100"></label>
          </div>
          <label class="procurement-status-note">Açıklama / iptal gerekçesi<textarea name="statusNote" rows="3" maxlength="500"></textarea></label>
          <footer class="quote-dialog-actions">
            <p id="procurementStatusHint"></p>
            <button type="button" class="secondary" id="cancelProcurementStatus">Vazgeç</button>
            <button type="submit" class="primary" id="saveProcurementStatus">Durumu kaydet</button>
          </footer>
        </form>
      </dialog>`);
    $('#closeProcurementStatus').onclick = $('#cancelProcurementStatus').onclick = () => $('#procurementStatusDialog').close();
    $('#procurementStatusForm').onsubmit = saveProcurementStatus;
  }

  const procurementDisplayCurrency = record => record.currency || displayCurrency || 'TRY';
  const procurementInputAmount = record => record.currency
    ? (+record.orderedAmount || 0)
    : fromBaseCurrency(+record.orderedAmount || 0);
  const procurementAmountToBase = (record, amount) => record.currency
    ? (+amount || 0) * (+fxRates[record.currency] || 1)
    : toBaseCurrency(+amount || 0);
  const procurementOrderedBase = record => record.currency
    ? (+record.orderedAmount || 0) * (+fxRates[record.currency] || 1)
    : (+record.orderedAmount || 0);
  const procurementDisplayMoney = record => record.currency
    ? quoteMoney(record.orderedAmount, record.currency)
    : money(record.orderedAmount);

  function openProcurementStatusDialog(recordId, targetStatus) {
    ensureProcurementStatusDialog();
    const record = data.procurements.find(item => String(item.id) === String(recordId));
    if (!record || targetStatus === record.procurementStatus) return renderProjectDetail();
    if (targetStatus === 'Sipariş verildi') return reopenProcurement(record);
    if (record.procurementStatus === 'Gerçekleşti') {
      toast('Gerçekleşen kayıt önce yeniden açılmalıdır.');
      return renderProjectDetail();
    }
    const form = $('#procurementStatusForm');
    form.reset();
    form.elements.recordId.value = record.id;
    form.elements.targetStatus.value = targetStatus;
    form.elements.transactionDate.value = todayIso();
    form.elements.receivedQuantity.value = targetStatus === 'Gerçekleşti'
      ? (+record.quantity || 0)
      : Math.max(0, +record.receivedQuantity || 0);
    form.elements.actualAmount.value = procurementInputAmount(record);
    form.elements.invoiceNo.value = record.invoiceNo || '';
    form.elements.statusNote.value = record.statusNote || '';
    $('[data-status-fields="receipt"]').hidden = targetStatus === 'İptal edildi';
    $('[data-status-fields="realized"]').hidden = targetStatus !== 'Gerçekleşti';
    $('#procurementActualCurrency').textContent = `(${procurementDisplayCurrency(record)})`;
    $('#procurementStatusTitle').textContent = targetStatus === 'Gerçekleşti'
      ? 'Satın almayı gerçekleştir'
      : targetStatus === 'Kısmi teslim'
        ? 'Kısmi teslim kaydet'
        : 'Satın almayı iptal et';
    $('#procurementStatusSummary').innerHTML = `<strong>${escapeHtml(record.materialDescription)}</strong><small>${escapeHtml(record.vendor)} · ${escapeHtml(record.quantity)} ${escapeHtml(record.unit)}</small><span>${procurementDisplayMoney(record)}</span>`;
    $('#procurementStatusHint').textContent = targetStatus === 'Gerçekleşti'
      ? 'Taahhüt gerçekleşen gidere dönüştürülecek.'
      : targetStatus === 'İptal edildi'
        ? 'İptal edilen kayıt bütçe taahhüdünden çıkarılacak, silinmeyecek.'
        : 'Kayıt açık satın almalarda kalacak.';
    $('#saveProcurementStatus').textContent = targetStatus === 'Gerçekleşti' ? 'Gerçekleştir' : targetStatus === 'İptal edildi' ? 'İptal et' : 'Teslimi kaydet';
    $('#procurementStatusDialog').showModal();
  }

  function reopenProcurement(record) {
    const duplicate = record.quoteId && record.quoteLineId && data.procurements.some(item =>
      String(item.id) !== String(record.id) &&
      String(item.quoteId) === String(record.quoteId) &&
      String(item.quoteLineId) === String(record.quoteLineId) &&
      item.procurementStatus !== 'İptal edildi'
    );
    if (duplicate) {
      toast('Bu teklif kalemi için başka bir açık satın alma kaydı bulunduğundan eski kayıt yeniden açılamaz.');
      return renderProjectDetail();
    }
    if (!confirm(`${record.materialDescription} yeniden açık satın alma durumuna alınsın mı?`)) return renderProjectDetail();
    if (record.costId) data.costs = data.costs.filter(cost => String(cost.id) !== String(record.costId));
    record.procurementStatus = 'Sipariş verildi';
    record.receivedQuantity = 0;
    record.actualDeliveryDate = '';
    record.lastReceiptDate = '';
    record.actualAmountBase = 0;
    record.invoiceNo = '';
    record.costId = '';
    record.realizedAt = '';
    record.realizedBy = '';
    record.cancelledAt = '';
    record.cancelledBy = '';
    record.statusNote = '';
    addActivity(record.projectId, 'Satın alma yeniden açıldı', record.materialDescription, 'update');
    save();
    renderProjectDetail();
    toast('Satın alma kaydı yeniden açıldı.');
  }

  function saveProcurementStatus(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const record = data.procurements.find(item => String(item.id) === String(form.elements.recordId.value));
    if (!record) return;
    const targetStatus = form.elements.targetStatus.value;
    const note = form.elements.statusNote.value.trim();
    if (targetStatus === 'İptal edildi') {
      if (!note) return toast('İptal gerekçesi yazılmalıdır.');
      record.procurementStatus = 'İptal edildi';
      record.statusNote = note;
      record.cancelledAt = new Date().toISOString();
      record.cancelledBy = currentUser?.name || 'Kullanıcı';
      const linkedQuote = record.quoteId ? data.purchaseQuotes.find(quote => String(quote.id) === String(record.quoteId)) : null;
      if (linkedQuote) {
        linkedQuote.procurementChangedAt = new Date().toISOString();
        linkedQuote.procurementChangedBy = currentUser?.name || 'Kullanıcı';
        syncQuoteTransferMetadata(linkedQuote);
      }
      addActivity(record.projectId, 'Satın alma iptal edildi', `${record.materialDescription} · ${note}`, 'update');
    } else {
      const receivedQuantity = Math.max(0, +form.elements.receivedQuantity.value || 0);
      const totalQuantity = Math.max(0, +record.quantity || 0);
      if (receivedQuantity <= 0) return toast('Gelen miktar sıfırdan büyük olmalıdır.');
      if (receivedQuantity > totalQuantity) return toast('Gelen miktar sipariş miktarını aşamaz.');
      if (targetStatus === 'Kısmi teslim' && receivedQuantity >= totalQuantity) return toast('Tam miktar geldiyse Gerçekleşti durumunu seçin.');
      record.receivedQuantity = receivedQuantity;
      record.lastReceiptDate = form.elements.transactionDate.value || todayIso();
      record.statusNote = note;
      if (targetStatus === 'Kısmi teslim') {
        record.procurementStatus = 'Kısmi teslim';
        addActivity(record.projectId, 'Kısmi satın alma teslimi kaydedildi', `${record.materialDescription} · ${receivedQuantity}/${totalQuantity} ${record.unit}`, 'update');
      } else {
        if (receivedQuantity < totalQuantity) return toast('Gerçekleşen kayıt için sipariş miktarının tamamı teslim alınmalıdır.');
        const actualAmount = Math.max(0, +form.elements.actualAmount.value || 0);
        if (!actualAmount) return toast('Gerçekleşen tutar sıfırdan büyük olmalıdır.');
        const actualBase = procurementAmountToBase(record, actualAmount);
        const orderedBase = procurementOrderedBase(record);
        let cost = data.costs.find(item => String(item.id) === String(record.costId) || String(item.procurementId) === String(record.id));
        const costData = {
          projectId: +record.projectId,
          procurementId: record.id,
          description: `Satın alma · ${record.materialDescription}`,
          date: form.elements.transactionDate.value || todayIso(),
          costType: 'İşçilik Dışı',
          category: 'Malzeme',
          vendor: record.vendor || '',
          budgetAmount: 0,
          orderedAmount: orderedBase,
          amount: actualBase,
          remainingEstimate: 0,
          commitmentClosed: true,
          originalAmount: actualAmount,
          inputCurrency: procurementDisplayCurrency(record),
          invoiceNo: form.elements.invoiceNo.value.trim()
        };
        if (cost) Object.assign(cost, costData);
        else {
          cost = { id: makeId(), ...costData };
          data.costs.push(cost);
        }
        record.procurementStatus = 'Gerçekleşti';
        record.actualDeliveryDate = costData.date;
        record.actualAmountBase = actualBase;
        record.invoiceNo = costData.invoiceNo;
        record.costId = cost.id;
        record.realizedAt = new Date().toISOString();
        record.realizedBy = currentUser?.name || 'Kullanıcı';
        addActivity(record.projectId, 'Satın alma gerçekleşti', `${record.materialDescription} · ${money(actualBase)}${costData.invoiceNo ? ` · Fatura ${costData.invoiceNo}` : ''}`, 'cost');
      }
    }
    $('#procurementStatusDialog').close();
    save();
    renderProjectDetail();
    toast(targetStatus === 'Gerçekleşti' ? 'Satın alma gerçekleşen gidere aktarıldı.' : targetStatus === 'İptal edildi' ? 'Satın alma iptal edildi.' : 'Kısmi teslim kaydedildi.');
  }

  function fillQuoteSuppliers(projectId, selectedSupplier = '') {
    const select = $('#purchaseQuoteForm').elements.supplier;
    const suppliers = data.suppliers
      .filter(item => +item.projectId === +projectId && item.status !== 'Pasif')
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    const unique = suppliers.filter((supplier, index) =>
      suppliers.findIndex(item => item.name.toLocaleLowerCase('tr') === supplier.name.toLocaleLowerCase('tr')) === index);
    const selectedExists = unique.some(item => item.name === selectedSupplier);
    select.innerHTML = `<option value="">${unique.length ? 'Kayıtlı tedarikçi seçin' : 'Önce Tedarikçiler sekmesine firma ekleyin'}</option>${unique.map(item =>
      `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} · ${escapeHtml(item.supplierGroup || 'Diğer')}</option>`).join('')}${selectedSupplier && !selectedExists ?
      `<option value="${escapeHtml(selectedSupplier)}">${escapeHtml(selectedSupplier)} · Eski kayıt</option>` : ''}`;
    select.value = selectedSupplier;
  }

  function openQuoteDialog(quoteId = null, projectId = currentDetailId) {
    ensureQuoteDialog();
    const quote = quoteId ? data.purchaseQuotes.find(item => String(item.id) === String(quoteId)) : null;
    if (quote && quoteTransferState(quote).linkedCount > 0) {
      return toast('Satın alma kaydı bulunan teklif değiştirilemez. Önce bağlı satın alma kalemlerini kaldırın.');
    }
    editingQuoteId = quote?.id || null;
    draftDocumentFileIds = Array.isArray(quote?.documentFileIds) ? [...quote.documentFileIds] : [];
    pendingDocumentFiles = [];
    draftLines = (quote?.lines?.length ? quote.lines : [{
      id: makeId(), materialCode: '', description: '', technicalSpec: '',
      quantity: 1, unit: 'Adet', unitPrice: 0, discountRate: 0
    }]).map(line => ({ ...line }));
    const form = $('#purchaseQuoteForm');
    form.reset();
    $('#purchaseQuoteTitle').textContent = quote ? 'Teklifi düzenle' : 'Yeni teklif';
    form.elements.projectId.value = quote?.projectId || projectId;
    fillQuoteSuppliers(form.elements.projectId.value, quote?.supplier || '');
    form.elements.quoteNo.value = quote?.quoteNo || '';
    form.elements.quoteDate.value = quote?.quoteDate || todayIso();
    form.elements.validUntil.value = quote?.validUntil || '';
    form.elements.status.value = quote?.status || 'Taslak';
    form.elements.currency.value = quote?.currency || 'TRY';
    form.elements.vatRate.value = quote?.vatRate ?? 20;
    form.elements.deliveryDays.value = quote?.deliveryDays ?? 0;
    form.elements.warrantyMonths.value = quote?.warrantyMonths ?? 0;
    form.elements.paymentTerms.value = quote?.paymentTerms || '';
    form.elements.documentUrl.value = quote?.documentUrl || '';
    form.elements.notes.value = quote?.notes || '';
    renderQuoteLines();
    renderQuoteDocuments();
    $('#purchaseQuoteDialog').showModal();
  }

  function renderQuoteDocuments() {
    const list = $('#quoteDocumentList');
    if (!list) return;
    const existing = draftDocumentFileIds
      .map(id => data.files.find(file => String(file.id) === String(id)))
      .filter(Boolean);
    list.innerHTML = [
      ...existing.map(file => `<div class="quote-document-item">
        <span>▤</span><div><strong>${escapeHtml(file.name)}</strong><small>${formatSize(file.size)} · Yüklendi</small></div>
        ${file.content ? `<a href="${escapeHtml(file.content)}" download="${escapeHtml(file.name)}" title="İndir">↓</a>` : ''}
        <button type="button" class="delete" data-remove-quote-document="${file.id}" title="Tekliften kaldır">×</button>
      </div>`),
      ...pendingDocumentFiles.map((file, index) => `<div class="quote-document-item pending">
        <span>+</span><div><strong>${escapeHtml(file.name)}</strong><small>${formatSize(file.size)} · Kaydedilmeyi bekliyor</small></div>
        <button type="button" class="delete" data-remove-pending-quote-document="${index}" title="Seçimi kaldır">×</button>
      </div>`)
    ].join('') || '<div class="quote-document-empty">Bu teklife henüz belge eklenmemiş.</div>';
    list.querySelectorAll('[data-remove-quote-document]').forEach(button => {
      button.onclick = () => {
        draftDocumentFileIds = draftDocumentFileIds.filter(id => String(id) !== button.dataset.removeQuoteDocument);
        renderQuoteDocuments();
      };
    });
    list.querySelectorAll('[data-remove-pending-quote-document]').forEach(button => {
      button.onclick = () => {
        pendingDocumentFiles.splice(+button.dataset.removePendingQuoteDocument, 1);
        renderQuoteDocuments();
      };
    });
  }

  function renderQuoteLines() {
    const form = $('#purchaseQuoteForm');
    const currency = form.elements.currency.value || 'TRY';
    const body = $('#quoteLinesBody');
    body.innerHTML = draftLines.map(line => {
      const net = (+line.quantity || 0) * (+line.unitPrice || 0) * (1 - (+line.discountRate || 0) / 100);
      return `<tr data-quote-line="${line.id}">
        <td><input data-line-field="materialCode" value="${escapeHtml(line.materialCode)}" maxlength="80" placeholder="Kod"></td>
        <td><input data-line-field="description" value="${escapeHtml(line.description)}" maxlength="180" placeholder="Malzeme tanımı" required><textarea data-line-field="technicalSpec" rows="2" placeholder="Teknik özellik">${escapeHtml(line.technicalSpec)}</textarea></td>
        <td><input data-line-field="quantity" type="number" min="0.01" step="0.01" value="${+line.quantity || 1}" required></td>
        <td><select data-line-field="unit">${['Adet', 'Takım', 'Metre', 'Kg', 'Litre', 'Paket', 'Hizmet'].map(unit => `<option ${line.unit === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select></td>
        <td><input data-line-field="unitPrice" type="number" min="0" step="0.01" value="${+line.unitPrice || 0}" required></td>
        <td><input data-line-field="discountRate" type="number" min="0" max="100" step="0.01" value="${+line.discountRate || 0}"></td>
        <td class="right quote-line-total">${quoteMoney(net, currency)}</td>
        <td><button type="button" class="delete" data-remove-quote-line="${line.id}" aria-label="Malzeme satırını sil">×</button></td>
      </tr>`;
    }).join('');
    $('#quoteLineCount').textContent = `${draftLines.length} kalem`;
    body.querySelectorAll('[data-line-field]').forEach(input => {
      input.oninput = () => {
        const row = input.closest('[data-quote-line]');
        const line = draftLines.find(item => String(item.id) === row.dataset.quoteLine);
        const field = input.dataset.lineField;
        line[field] = ['quantity', 'unitPrice', 'discountRate'].includes(field) ? Math.max(0, +input.value || 0) : input.value;
        refreshQuoteTotals();
      };
    });
    body.querySelectorAll('[data-remove-quote-line]').forEach(button => {
      button.onclick = () => {
        if (draftLines.length <= 1) return toast('Teklifte en az bir malzeme kalemi bulunmalıdır.');
        draftLines = draftLines.filter(line => String(line.id) !== button.dataset.removeQuoteLine);
        renderQuoteLines();
      };
    });
    form.elements.currency.onchange = () => {
      renderQuoteLines();
      refreshQuoteTotals();
    };
    form.elements.vatRate.oninput = refreshQuoteTotals;
    refreshQuoteTotals();
  }

  function refreshQuoteTotals() {
    const form = $('#purchaseQuoteForm');
    const currency = form.elements.currency.value || 'TRY';
    const totals = calculateQuote(draftLines, form.elements.vatRate.value);
    $('#quoteSubtotal').textContent = quoteMoney(totals.subtotal, currency);
    $('#quoteDiscount').textContent = '−' + quoteMoney(totals.discountTotal, currency);
    $('#quoteTax').textContent = quoteMoney(totals.taxTotal, currency);
    $('#quoteGrandTotal').textContent = quoteMoney(totals.total, currency);
    $('#quoteLinesBody')?.querySelectorAll('[data-quote-line]').forEach(row => {
      const line = draftLines.find(item => String(item.id) === row.dataset.quoteLine);
      const net = (+line.quantity || 0) * (+line.unitPrice || 0) * (1 - (+line.discountRate || 0) / 100);
      row.querySelector('.quote-line-total').textContent = quoteMoney(net, currency);
    });
  }

  async function saveQuoteForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!draftLines.length) return toast('En az bir malzeme kalemi eklenmelidir.');
    if (draftLines.some(line => !String(line.description || '').trim() || !(+line.quantity > 0))) {
      return toast('Her malzeme satırında tanım ve sıfırdan büyük miktar bulunmalıdır.');
    }
    const values = Object.fromEntries(new FormData(form));
    const existing = editingQuoteId ? data.purchaseQuotes.find(item => String(item.id) === String(editingQuoteId)) : null;
    const totals = calculateQuote(draftLines, values.vatRate);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Kaydediliyor...';
    for (const file of pendingDocumentFiles) {
      try {
        toast(`${file.name} yükleniyor...`);
        const fileRecord = await createFileRecord(+values.projectId, file);
        data.files.push(fileRecord);
        draftDocumentFileIds.push(fileRecord.id);
        addActivity(+values.projectId, 'Teklif belgesi yüklendi', file.name, 'file');
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = 'Teklifi kaydet';
        return toast(`Belge yüklenemedi: ${error.message}`);
      }
    }
    const quote = {
      id: existing?.id || makeId(),
      projectId: +values.projectId,
      supplier: values.supplier,
      quoteNo: values.quoteNo.trim(),
      quoteDate: values.quoteDate,
      validUntil: values.validUntil,
      status: values.status,
      currency: values.currency,
      vatRate: Math.max(0, +values.vatRate || 0),
      deliveryDays: Math.max(0, +values.deliveryDays || 0),
      warrantyMonths: Math.max(0, +values.warrantyMonths || 0),
      paymentTerms: values.paymentTerms.trim(),
      documentUrl: values.documentUrl.trim(),
      documentFileIds: [...draftDocumentFileIds],
      notes: values.notes.trim(),
      lines: draftLines.map(line => ({ ...line })),
      ...totals,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: existing?.createdBy || currentUser?.name || 'Kullanıcı',
      convertedAt: existing?.convertedAt || '',
      convertedBy: existing?.convertedBy || ''
    };
    if (existing) Object.assign(existing, quote);
    else data.purchaseQuotes.push(quote);
    addActivity(quote.projectId, `Teklif ${existing ? 'güncellendi' : 'eklendi'}`, `${quote.quoteNo} · ${quote.supplier} · ${quote.lines.length} kalem`, 'update');
    $('#purchaseQuoteDialog').close();
    submitButton.disabled = false;
    submitButton.textContent = 'Teklifi kaydet';
    editingQuoteId = null;
    pendingDocumentFiles = [];
    save();
    renderProjectDetail();
    toast('Teklif başarıyla kaydedildi.');
  }

  function convertQuoteToProcurement(quoteId) {
    const quote = data.purchaseQuotes.find(item => String(item.id) === String(quoteId));
    if (!quote) return;
    if (!quote.lines.length) return toast('Aktarılacak malzeme kalemi bulunamadı.');
    const transfer = quoteTransferState(quote);
    if (!transfer.missingLines.length) return toast('Bu teklifin tüm kalemleri satın alma kayıtlarında bulunuyor.');
    const transferLabel = transfer.state === 'partial'
      ? `${transfer.missingLines.length} eksik kalemi`
      : `${transfer.missingLines.length} kalemi`;
    if (!confirm(`${quote.quoteNo} numaralı teklifin ${transferLabel} satın alma kayıtlarına aktarılsın mı?`)) return;
    const orderDate = todayIso();
    const dueDate = addDays(orderDate, quote.deliveryDays);
    transfer.missingLines.forEach((line, index) => {
      const rowNet = (+line.quantity || 0) * (+line.unitPrice || 0) * (1 - (+line.discountRate || 0) / 100);
      data.procurements.push({
        id: Date.now() * 100 + index,
        projectId: +quote.projectId,
        quoteId: quote.id,
        quoteLineId: line.id,
        materialCode: line.materialCode,
        materialDescription: line.description,
        technicalSpec: line.technicalSpec,
        quantity: +line.quantity || 0,
        unit: line.unit,
        unitPrice: +line.unitPrice || 0,
        discountRate: +line.discountRate || 0,
        orderedAmount: rowNet,
        currency: quote.currency,
        requestDate: quote.quoteDate,
        quoteStatus: 'Onaylandı',
        vendor: quote.supplier,
        orderDate,
        dueDate,
        actualDeliveryDate: '',
        receivedQuantity: 0,
        procurementStatus: 'Sipariş verildi',
        qualityResult: 'Bekliyor',
        owner: currentUser?.name || 'Satın Alma',
        longLead: quote.deliveryDays >= 30 ? 'true' : 'false'
      });
    });
    quote.status = 'Onaylandı';
    quote.convertedAt ||= new Date().toISOString();
    quote.convertedBy = currentUser?.name || 'Kullanıcı';
    quote.procurementChangedAt = '';
    quote.procurementChangedBy = '';
    activePurchaseView = 'open';
    addActivity(quote.projectId, transfer.state === 'partial' ? 'Eksik teklif kalemleri satın almaya aktarıldı' : 'Teklif satın almaya aktarıldı', `${quote.quoteNo} · ${quote.supplier} · ${transfer.missingLines.length} kalem`, 'update');
    save();
    renderProjectDetail();
    toast(`${transfer.missingLines.length} malzeme kalemi satın alma kayıtlarına aktarıldı.`);
  }

  function quoteTable(quotes) {
    return `<article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table purchase-quotes-table">
      <thead><tr><th>Teklif / Tedarikçi</th><th>Kalemler</th><th class="right">Ara toplam</th><th class="right">İskonto</th><th class="right">KDV</th><th class="right">Genel toplam</th><th>Termin / Ödeme</th><th>Durum</th><th>Belge</th><th></th></tr></thead>
      <tbody>${quotes.map(quote => {
        const transfer = quoteTransferState(quote);
        const displayedStatus = transfer.state === 'none' && quote.procurementChangedAt
          ? 'Satın alma kalem değişikliği yapıldı'
          : transfer.state === 'none' && quote.status === 'Onaylandı'
            ? 'Aktarıma hazır'
            : quote.status;
        const transferText = transfer.state === 'full'
          ? `Tam aktarıldı · ${transfer.linkedCount}/${transfer.totalCount} kalem`
          : transfer.state === 'partial'
            ? `Kısmen aktarıldı · ${transfer.linkedCount}/${transfer.totalCount} kalem`
            : 'Satın almaya aktarılmadı';
        const actions = transfer.state === 'full'
          ? `<button class="secondary" type="button" data-view-purchase-records>Satın almada görüntüle</button>`
          : transfer.state === 'partial'
            ? `<button class="secondary" type="button" data-view-purchase-records>Bağlı kalemleri gör</button>
               <button class="secondary permission-create" type="button" data-convert-quote="${quote.id}">Eksik ${transfer.missingLines.length} kalemi aktar</button>`
            : `<button class="edit" type="button" data-edit-quote="${quote.id}" title="Teklifi düzenle">✎</button>
               <button class="secondary permission-create" type="button" data-convert-quote="${quote.id}">Satın almaya aktar</button>
               <button class="delete" type="button" data-delete-quote="${quote.id}" title="Teklifi sil">×</button>`;
        return `<tr class="${transfer.state === 'full' ? 'converted-quote' : transfer.state === 'partial' ? 'partially-converted-quote' : ''}">
        <td><strong>${escapeHtml(quote.quoteNo)}</strong><small>${escapeHtml(quote.supplier)} · ${date(quote.quoteDate)}</small></td>
        <td><strong>${quote.lines.length} kalem</strong><small>${quote.lines.slice(0, 2).map(line => escapeHtml(line.description)).join(' · ')}${quote.lines.length > 2 ? ' …' : ''}</small></td>
        <td class="right">${quoteMoney(quote.subtotal, quote.currency)}</td>
        <td class="right">${quoteMoney(quote.discountTotal, quote.currency)}</td>
        <td class="right">${quoteMoney(quote.taxTotal, quote.currency)}</td>
        <td class="right"><strong>${quoteMoney(quote.total, quote.currency)}</strong></td>
        <td>${quote.deliveryDays || 0} gün<small>${escapeHtml(quote.paymentTerms || 'Ödeme koşulu yok')} · ${quote.warrantyMonths || 0} ay garanti</small></td>
        <td><span class="status-pill ${normalizeStatus(displayedStatus)}">${escapeHtml(displayedStatus)}</span><small>${transferText}</small></td>
        <td>${quoteDocuments(quote).map(file => `<a href="${escapeHtml(file.content || '#')}" ${file.content ? `download="${escapeHtml(file.name)}"` : ''}>${escapeHtml(file.name)}${file.content ? ' ↓' : ''}</a>`).join('') ||
          (quote.documentUrl ? `<a href="${escapeHtml(quote.documentUrl)}" target="_blank" rel="noopener">Belgeyi aç ↗</a>` : '—')}</td>
        <td class="quote-row-actions">${actions}</td>
      </tr>`;
      }).join('') || `<tr><td colspan="10">${empty('Bu proje için teklif kaydı bulunmuyor.')}</td></tr>`}</tbody>
    </table></div></article>`;
  }

  function procurementTable(records, emptyMessage = 'Satın alma kaydı bulunmuyor.') {
    return `<article class="panel table-panel"><div class="table-wrap"><table class="enterprise-table procurement-table">
      <thead><tr><th>Malzeme</th><th>Teknik özellik</th><th>Miktar</th><th>Teklif / Tedarikçi</th><th>Sipariş</th><th>Termin / Teslim</th><th>Gelen / Eksik</th><th>Durum</th><th>Kalite</th><th>Sorumlu</th><th></th></tr></thead>
      <tbody>${records.map(item => {
        const missing = Math.max(0, (+item.quantity || 0) - (+item.receivedQuantity || 0));
        const isClosed = ['Gerçekleşti', 'İptal edildi'].includes(item.procurementStatus);
        const late = !isClosed && item.dueDate && item.dueDate < todayIso() && missing > 0;
        const statusOptions = ['Sipariş verildi', 'Kısmi teslim', 'Gerçekleşti', 'İptal edildi']
          .map(status => `<option ${item.procurementStatus === status ? 'selected' : ''}>${status}</option>`).join('');
        const action = !isClosed
          ? `<button class="edit permission-edit" type="button" data-edit-procurement="${item.id}" title="Satın alma bilgilerini düzenle">✎</button>`
          : item.procurementStatus === 'Gerçekleşti'
            ? `<button class="secondary permission-edit" type="button" data-reopen-procurement="${item.id}">Geri aç</button>`
            : `<button class="secondary permission-edit" type="button" data-reopen-procurement="${item.id}">Yeniden aç</button>`;
        return `<tr class="${late ? 'row-late' : ''} ${item.longLead === 'true' && !isClosed ? 'long-lead-row' : ''} ${item.procurementStatus === 'İptal edildi' ? 'cancelled-procurement-row' : ''}">
          <td><span class="material-code">${escapeHtml(item.materialCode)}</span><strong>${escapeHtml(item.materialDescription)}</strong>${item.longLead === 'true' ? '<em>Uzun termin</em>' : ''}</td>
          <td>${escapeHtml(item.technicalSpec)}</td>
          <td>${escapeHtml(item.quantity)} ${escapeHtml(item.unit || '')}</td>
          <td><span class="status-pill ${normalizeStatus(item.quoteStatus)}">${escapeHtml(item.quoteStatus)}</span><small>${escapeHtml(item.vendor)}</small></td>
          <td>${item.orderDate ? date(item.orderDate) : '—'}${item.orderedAmount ? `<small>${procurementDisplayMoney(item)}</small>` : ''}${item.procurementStatus === 'Gerçekleşti' && item.actualAmountBase ? `<small>Gerçekleşen: ${money(item.actualAmountBase)}</small>` : ''}</td>
          <td><strong class="${late ? 'expense-text' : ''}">${item.dueDate ? date(item.dueDate) : '—'}</strong><small>${item.actualDeliveryDate ? date(item.actualDeliveryDate) : 'Teslim edilmedi'}</small></td>
          <td>${+item.receivedQuantity || 0} / <b class="${missing ? 'expense-text' : 'budget-text'}">${missing} eksik</b></td>
          <td>${isClosed
            ? `<span class="status-pill ${normalizeStatus(item.procurementStatus)}">${escapeHtml(item.procurementStatus)}</span>`
            : `<select class="procurement-status-select permission-edit ${normalizeStatus(item.procurementStatus)}" data-change-procurement-status="${item.id}" aria-label="Satın alma durumunu değiştir">${statusOptions}</select>`}${item.invoiceNo ? `<small>Fatura: ${escapeHtml(item.invoiceNo)}</small>` : ''}${item.statusNote ? `<small>${escapeHtml(item.statusNote)}</small>` : ''}</td>
          <td><span class="status-pill ${normalizeStatus(item.qualityResult)}">${escapeHtml(item.qualityResult)}</span></td>
          <td>${escapeHtml(item.owner)}</td>
          <td class="procurement-row-actions">${action}</td>
        </tr>`;
      }).join('') || `<tr><td colspan="11">${empty(emptyMessage)}</td></tr>`}</tbody>
    </table></div></article>`;
  }

  function renderPurchaseQuotes(p) {
    const root = $('#detailProcurement');
    if (!root) return;
    const quotes = data.purchaseQuotes.filter(item => +item.projectId === +p.id)
      .sort((a, b) => String(b.quoteDate || '').localeCompare(String(a.quoteDate || '')));
    const records = data.procurements.filter(item => +item.projectId === +p.id)
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
    if (activePurchaseView === 'records') activePurchaseView = 'open';
    const openRecords = records.filter(item => !['Gerçekleşti', 'İptal edildi'].includes(item.procurementStatus));
    const realizedRecords = records.filter(item => item.procurementStatus === 'Gerçekleşti');
    const cancelledRecords = records.filter(item => item.procurementStatus === 'İptal edildi');
    const lateCount = openRecords.filter(item => item.dueDate && item.dueDate < todayIso() && (+item.receivedQuantity || 0) < (+item.quantity || 0)).length;
    const openQuotes = quotes.filter(item => !['Onaylandı', 'Reddedildi'].includes(item.status)).length;
    const quoteLines = quotes.reduce((sum, quote) => sum + quote.lines.length, 0);
    root.innerHTML = `
      <div class="purchase-main-toolbar">
        <div><h3>Satın Alma ve Teklifler</h3><p>İhtiyaçtan teklif karşılaştırmasına, siparişten teslimata kadar tek akış.</p></div>
        <div class="purchase-main-actions">
          <button class="secondary permission-create" type="button" id="addDirectProcurement">+ Doğrudan satın alma kaydı</button>
          <button class="primary permission-create" type="button" id="addPurchaseQuote">+ Teklif ekle</button>
        </div>
      </div>
      <div class="purchase-subtabs" role="tablist" aria-label="Satın alma bölümleri">
        <button type="button" role="tab" data-purchase-view="quotes" class="${activePurchaseView === 'quotes' ? 'active' : ''}" aria-selected="${activePurchaseView === 'quotes'}">Teklifler <span>${quotes.length}</span></button>
        <button type="button" role="tab" data-purchase-view="open" class="${activePurchaseView === 'open' ? 'active' : ''}" aria-selected="${activePurchaseView === 'open'}">Açık Satın Almalar <span>${openRecords.length}</span></button>
        <button type="button" role="tab" data-purchase-view="realized" class="${activePurchaseView === 'realized' ? 'active' : ''}" aria-selected="${activePurchaseView === 'realized'}">Gerçekleşen <span>${realizedRecords.length}</span></button>
        <button type="button" role="tab" data-purchase-view="cancelled" class="${activePurchaseView === 'cancelled' ? 'active' : ''}" aria-selected="${activePurchaseView === 'cancelled'}">İptal Edilen <span>${cancelledRecords.length}</span></button>
      </div>
      <div class="module-stats purchase-stats">
        <article><span>Açık teklif</span><strong>${openQuotes}</strong></article>
        <article><span>Teklif kalemi</span><strong>${quoteLines}</strong></article>
        <article><span>Onaylanan teklif</span><strong>${quotes.filter(item => item.status === 'Onaylandı').length}</strong></article>
        <article><span>Açık satın alma</span><strong>${openRecords.length}</strong></article>
        <article><span>Geciken teslim</span><strong class="${lateCount ? 'expense-text' : ''}">${lateCount}</strong></article>
      </div>
      <section class="purchase-view ${activePurchaseView === 'quotes' ? 'active' : ''}" data-purchase-panel="quotes">${quoteTable(quotes)}</section>
      <section class="purchase-view ${activePurchaseView === 'open' ? 'active' : ''}" data-purchase-panel="open">${procurementTable(openRecords, 'Açık satın alma kaydı bulunmuyor.')}</section>
      <section class="purchase-view ${activePurchaseView === 'realized' ? 'active' : ''}" data-purchase-panel="realized">${procurementTable(realizedRecords, 'Gerçekleşen satın alma kaydı bulunmuyor.')}</section>
      <section class="purchase-view ${activePurchaseView === 'cancelled' ? 'active' : ''}" data-purchase-panel="cancelled">${procurementTable(cancelledRecords, 'İptal edilmiş satın alma kaydı bulunmuyor.')}</section>`;

    $('#addPurchaseQuote').onclick = () => openQuoteDialog(null, p.id);
    $('#addDirectProcurement').onclick = () => openDialog('procurement', null, { projectId: p.id });
    root.querySelectorAll('[data-purchase-view]').forEach(button => {
      button.onclick = () => {
        activePurchaseView = button.dataset.purchaseView;
        renderPurchaseQuotes(p);
        applyPermissions();
      };
    });
    root.querySelectorAll('[data-edit-quote]').forEach(button => button.onclick = () => openQuoteDialog(button.dataset.editQuote, p.id));
    root.querySelectorAll('[data-convert-quote]').forEach(button => button.onclick = () => convertQuoteToProcurement(button.dataset.convertQuote));
    root.querySelectorAll('[data-delete-quote]').forEach(button => {
      button.onclick = () => {
        const quote = data.purchaseQuotes.find(item => String(item.id) === button.dataset.deleteQuote);
        const hasProcurementHistory = quote && data.procurements.some(record => String(record.quoteId || '') === String(quote.id));
        if (!quote || hasProcurementHistory) return toast('Satın alma geçmişi bulunan teklif silinemez. Önce teklif kaydını arşivleyin.');
        if (!confirm(`${quote.quoteNo} numaralı teklif silinsin mi?`)) return;
        data.purchaseQuotes = data.purchaseQuotes.filter(item => String(item.id) !== button.dataset.deleteQuote);
        addActivity(p.id, 'Teklif silindi', `${quote.quoteNo} · ${quote.supplier}`, 'update');
        save();
        renderProjectDetail();
      };
    });
    root.querySelectorAll('[data-view-purchase-records]').forEach(button => button.onclick = () => {
      activePurchaseView = 'open';
      renderPurchaseQuotes(p);
      applyPermissions();
    });
    root.querySelectorAll('[data-edit-procurement]').forEach(button => button.onclick = () => openDialog('procurement', button.dataset.editProcurement));
    root.querySelectorAll('[data-change-procurement-status]').forEach(select => select.onchange = () => openProcurementStatusDialog(select.dataset.changeProcurementStatus, select.value));
    root.querySelectorAll('[data-reopen-procurement]').forEach(button => button.onclick = () => {
      const record = data.procurements.find(item => String(item.id) === button.dataset.reopenProcurement);
      if (record) reopenProcurement(record);
    });
  }

  ensureQuoteDialog();
  const baseRenderProjectDetail = renderProjectDetail;
  renderProjectDetail = function () {
    baseRenderProjectDetail();
    const currentProject = project(currentDetailId);
    if (currentProject) {
      renderPurchaseQuotes(currentProject);
      applyPermissions();
    }
  };

  if (currentDetailId && $('#projectDetail')?.classList.contains('active')) renderProjectDetail();
})();
