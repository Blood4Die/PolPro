(function () {
  const key = 'proje360-data';
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Geçersiz veri');
    } catch (error) {
      try { localStorage.setItem('polpro-bozuk-veri-yedegi', raw); } catch (backupError) {}
      localStorage.removeItem(key);
    }
  }

  if (window.POLATPRO_CONFIG?.supabaseUrl && window.POLATPRO_CONFIG?.supabaseAnonKey) {
    document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
  }
})();
