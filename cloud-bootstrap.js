(function () {
  const backend = window.PolatProBackend;
  const appScripts = [
    'app.js?v=20260722-cloud-5',
    'enterprise.js?v=20260722-cloud-2',
    'kedi-kumu-plan.js?v=20260722-cloud-1',
    'account-admin.js?v=20260722-cloud-1'
  ];

  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} yüklenemedi.`));
    document.body.appendChild(script);
  });

  const setLoginError = message => {
    const target = document.querySelector('#loginError');
    if (target) target.textContent = message || '';
  };

  const setLoginBusy = busy => {
    const button = document.querySelector('#loginForm button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? 'Bağlanıyor...' : 'Giriş yap →';
  };

  const showLogin = () => {
    const screen = document.querySelector('#loginScreen');
    screen.hidden = false;
    screen.classList.remove('hidden');
    screen.setAttribute('aria-hidden', 'false');
    document.body.classList.add('logged-out');
    setTimeout(() => document.querySelector('#loginEmail')?.focus(), 50);
  };

  const cleanPayload = value => {
    const copy = JSON.parse(JSON.stringify(value || {}));
    if (Array.isArray(copy.users)) copy.users.forEach(user => delete user.password);
    if (Array.isArray(copy.files)) copy.files.forEach(file => {
      if (file.storagePath) file.content = '';
    });
    return copy;
  };

  const setCloudStatus = (label, state = '') => {
    let target = document.querySelector('#cloudSaveStatus');
    if (!target) {
      target = document.createElement('span');
      target.id = 'cloudSaveStatus';
      target.className = 'role-chip';
      target.title = 'Supabase otomatik kayıt durumu';
      document.querySelector('#roleChip')?.after(target);
    }
    target.textContent = label;
    target.dataset.state = state;
  };

  const downloadConflictRecovery = value => {
    const savedAt = new Date().toISOString();
    const payload = JSON.stringify({
      application: 'PolPro',
      version: 1,
      savedAt,
      reason: 'version-conflict',
      data: cleanPayload(value)
    }, null, 2);
    localStorage.setItem('polpro-conflict-recovery', payload);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PolPro-cakisma-kurtarma-${savedAt.slice(0, 19).replaceAll(':', '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const hydrateSignedUrls = async payload => {
    if (!Array.isArray(payload?.files)) return payload;
    await Promise.all(payload.files.map(async file => {
      if (!file.storagePath) return;
      try { file.content = await backend.createSignedFileUrl(file.storagePath); }
      catch (error) { file.content = ''; }
    }));
    return payload;
  };

  async function loadApplication() {
    for (const src of appScripts) await loadScript(src);
  }

  async function startLocalMode() {
    window.PolProCloud = { enabled: false };
    await loadApplication();
  }

  async function startCloudMode(user) {
    const profile = await backend.getCurrentProfile();
    const remote = await backend.loadAppState();
    const hasRemoteData = remote?.payload && Array.isArray(remote.payload.projects);
    if (hasRemoteData) {
      const payload = await hydrateSignedUrls(cleanPayload(remote.payload));
      localStorage.setItem('proje360-data', JSON.stringify(payload));
    }

    let version = Number(remote?.version) || 0;
    let pendingPayload = null;
    let drainPromise = null;
    let conflictShown = false;
    let saveBlocked = false;
    setCloudStatus('Buluta bağlı', 'ready');

    const drain = async () => {
      while (pendingPayload) {
        const payload = pendingPayload;
        pendingPayload = null;
        try {
          const saved = await backend.saveAppState(version, payload);
          version = Number(saved?.version) || version + 1;
          conflictShown = false;
          saveBlocked = false;
          setCloudStatus('Kaydedildi', 'saved');
        } catch (error) {
          pendingPayload = payload;
          saveBlocked = true;
          const conflict = error?.code === '40001' || /POLPRO_VERSION_CONFLICT/i.test(error?.message || '');
          if (conflict && !conflictShown) {
            conflictShown = true;
            setCloudStatus('Kayıt çakışması', 'conflict');
            downloadConflictRecovery(payload);
            alert('Başka bir kullanıcı verileri sizden önce güncelledi. Değişikliğiniz sunucuya yazılmadı ve otomatik kurtarma JSON dosyası indirildi. Güncel verileri almak için sayfayı yenileyin.');
          } else if (!conflict) {
            setCloudStatus('Kayıt hatası', 'error');
            alert(`Sunucuya kayıt yapılamadı: ${error?.message || error}`);
          }
          break;
        }
      }
    };

    const scheduleDrain = () => {
      if (!drainPromise && !saveBlocked) {
        drainPromise = drain().finally(() => {
          drainPromise = null;
          if (pendingPayload && !saveBlocked) scheduleDrain();
        });
      }
      return drainPromise || Promise.resolve();
    };

    window.PolProCloud = {
      enabled: true,
      user,
      profile,
      get version() { return version; },
      save(value) {
        pendingPayload = cleanPayload(value);
        setCloudStatus('Kaydediliyor...', 'saving');
        return scheduleDrain();
      },
      flush() { return drainPromise || Promise.resolve(); }
    };

    await loadApplication();

    if (!hasRemoteData) {
      const local = JSON.parse(localStorage.getItem('proje360-data') || '{}');
      await window.PolProCloud.save(local);
    }

    backend.subscribeAppState(event => {
      const nextVersion = Number(event?.new?.version) || 0;
      if (nextVersion <= version) return;
      if (event?.new?.updated_by === user.id) {
        version = nextVersion;
        setCloudStatus('Kaydedildi', 'saved');
        return;
      }
      if (pendingPayload || drainPromise) return;
      setCloudStatus('Yeni veri var', 'remote');
      const reload = confirm('PolPro verileri başka bir kullanıcı tarafından güncellendi. Güncel verileri yüklemek için sayfa yenilensin mi?');
      if (reload) location.reload();
    });
  }

  async function boot() {
    if (!backend?.enabled) {
      if (backend?.configured) {
        setLoginError('Supabase istemcisi yüklenemedi. Ağ bağlantısını ve içerik engelleyicileri kontrol edin.');
        showLogin();
        return;
      }
      return startLocalMode();
    }

    const form = document.querySelector('#loginForm');
    form.onsubmit = async event => {
      event.preventDefault();
      setLoginError('');
      setLoginBusy(true);
      try {
        const user = await backend.signIn(
          document.querySelector('#loginEmail').value.trim(),
          document.querySelector('#loginPassword').value
        );
        await startCloudMode(user);
      } catch (error) {
        try { await backend.signOut(); } catch (signOutError) {}
        setLoginError(error?.message || 'Oturum açılamadı.');
        showLogin();
      } finally {
        setLoginBusy(false);
      }
    };

    document.querySelector('#togglePassword').onclick = () => {
      const input = document.querySelector('#loginPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
    };

    try {
      const session = await backend.getSession();
      if (session?.user) await startCloudMode(session.user);
      else showLogin();
    } catch (error) {
      setLoginError(error?.message || 'Sunucu bağlantısı kurulamadı.');
      showLogin();
    }
  }

  boot();
})();
