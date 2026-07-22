(function () {
  const backend = window.PolatProBackend;
  const cloud = window.PolProCloud;
  const grid = document.querySelector('#accountGrid');
  const stats = document.querySelector('#accountStats');
  const status = document.querySelector('#accountStatus');
  const addButton = document.querySelector('#addLoginAccount');
  if (!grid || !stats || !status) return;
  if (!backend?.enabled || !cloud?.enabled) {
    document.querySelector('[data-admin-tab="accounts"]')?.setAttribute('hidden', '');
    document.querySelector('[data-admin-tab="users"]')?.click();
    return;
  }
  if (cloud.profile?.role !== 'Yönetici') return;

  let accounts = [];
  let loading = false;
  const roles = ['Yönetici', 'Kullanıcı', 'Görüntüleyici'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const categories = () => {
    const fromDirectory = window.PolProDirectory?.categories || [];
    const fromAccounts = accounts.map(account => account.category).filter(Boolean);
    return [...new Set([...fromDirectory, ...fromAccounts, 'Yönetim', 'Proje Ofisi', 'Teknik Ekip'])];
  };

  function initials(name, email) {
    return String(name || email || '?').split(/[ .@]+/).filter(Boolean).slice(0, 2)
      .map(part => part[0]?.toLocaleUpperCase('tr')).join('');
  }

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = !message;
  }

  function render() {
    const active = accounts.filter(account => account.active).length;
    const admins = accounts.filter(account => account.active && account.role === 'Yönetici').length;
    stats.innerHTML = `<article><span>Toplam hesap</span><strong>${accounts.length}</strong></article><article><span>Aktif hesap</span><strong>${active}</strong></article><article><span>Pasif hesap</span><strong>${accounts.length - active}</strong></article><article><span>Aktif yönetici</span><strong>${admins}</strong></article>`;
    grid.innerHTML = accounts.map(account => `<article class="user-card account-card">
      <div class="user-card-head"><span class="person-avatar">${esc(initials(account.full_name, account.email))}</span><span class="user-state ${account.active ? '' : 'inactive'}">${account.active ? 'Aktif' : 'Pasif'}</span></div>
      <h3>${esc(account.full_name || 'Ad belirtilmemiş')}</h3><p title="${esc(account.email)}">${esc(account.email)}</p>
      <div class="user-details"><span>${esc(account.category || 'Kategori yok')}</span><b>${esc(account.role || 'Görüntüleyici')}</b></div>
      <div class="account-meta">${account.email_confirmed ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı'} · ${account.last_sign_in_at ? `Son giriş: ${new Date(account.last_sign_in_at).toLocaleDateString('tr-TR')}` : 'Henüz giriş yapmadı'}</div>
      <div class="user-actions"><button class="secondary" data-edit-account="${esc(account.id)}">Hesabı düzenle</button></div>
    </article>`).join('') || '<div class="empty">Supabase giriş hesabı bulunamadı.</div>';
    grid.querySelectorAll('[data-edit-account]').forEach(button => {
      button.onclick = () => openDialog(accounts.find(account => account.id === button.dataset.editAccount));
    });
  }

  function ensureDialog() {
    let dialog = document.querySelector('#accountDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'accountDialog';
    dialog.innerHTML = `<form id="accountForm">
      <div class="modal-head"><div><p class="kicker">SUPABASE AUTH</p><h2 id="accountDialogTitle">Giriş hesabı</h2></div><button type="button" class="icon" data-close-account>×</button></div>
      <div class="form-grid" id="accountFields"></div>
      <p class="account-security-note">Geçici şifreyi kullanıcıya güvenli bir kanaldan iletin. Şifre GitHub'a veya PolPro verilerine kaydedilmez.</p>
      <div class="modal-actions"><button type="button" class="secondary" data-close-account>Vazgeç</button><button type="submit" class="primary">Kaydet</button></div>
    </form>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-account]').forEach(button => button.onclick = () => dialog.close());
    return dialog;
  }

  function openDialog(account = null) {
    const dialog = ensureDialog();
    const categoryOptions = categories().map(category => `<option>${esc(category)}</option>`).join('');
    dialog.querySelector('#accountDialogTitle').textContent = account ? 'Giriş hesabını düzenle' : 'Yeni giriş hesabı';
    dialog.querySelector('#accountFields').innerHTML = `
      <label class="full">Ad soyad<input name="full_name" required value="${esc(account?.full_name || '')}"></label>
      <label class="full">E-posta<input name="email" type="email" required ${account ? 'readonly' : ''} value="${esc(account?.email || '')}"></label>
      <label>Kategori<select name="category">${categoryOptions}</select></label>
      <label>Rol<select name="role">${roles.map(role => `<option>${role}</option>`).join('')}</select></label>
      <label>Durum<select name="active"><option value="true">Aktif</option><option value="false">Pasif</option></select></label>
      <label class="full">${account ? 'Yeni şifre (değişmeyecekse boş bırakın)' : 'Geçici şifre'}<input name="password" type="password" minlength="8" ${account ? '' : 'required'} autocomplete="new-password"></label>`;
    const form = dialog.querySelector('#accountForm');
    form.elements.category.value = account?.category || categories()[0] || '';
    form.elements.role.value = account?.role || 'Kullanıcı';
    form.elements.active.value = String(account?.active !== false);
    form.onsubmit = async event => {
      event.preventDefault();
      const submit = form.querySelector('[type="submit"]');
      const values = Object.fromEntries(new FormData(form));
      values.active = values.active === 'true';
      if (account) values.id = account.id;
      if (!values.password) delete values.password;
      submit.disabled = true;
      submit.textContent = 'Kaydediliyor...';
      try {
        await backend.manageAccounts(account ? 'update' : 'create', values);
        dialog.close();
        await refresh(true);
      } catch (error) {
        alert(error.message || 'Hesap kaydedilemedi.');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Kaydet';
      }
    };
    dialog.showModal();
  }

  async function refresh(force = false) {
    if (loading || (!force && accounts.length)) return;
    loading = true;
    setStatus('Supabase hesapları yükleniyor...');
    try {
      const result = await backend.manageAccounts('list');
      accounts = Array.isArray(result?.users) ? result.users : [];
      setStatus('');
      render();
    } catch (error) {
      setStatus(`Hesap yönetimi henüz etkin değil: ${error.message}`, 'error');
      stats.innerHTML = '';
      grid.innerHTML = '<div class="empty">Supabase Edge Function yayımlandıktan sonra giriş hesapları burada görünecek.</div>';
    } finally {
      loading = false;
    }
  }

  addButton.onclick = () => openDialog();
  window.PolProAccounts = { refresh };
  refresh();
})();
