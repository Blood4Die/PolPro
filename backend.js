(function () {
  const config = window.POLATPRO_CONFIG || {};
  const available = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const client = available
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  function requireClient(message) {
    if (!client) throw new Error(message || 'Canlı veritabanı bağlantısı yapılandırılmamış.');
    return client;
  }

  window.PolatProBackend = {
    configured: Boolean(config.supabaseUrl && config.supabaseAnonKey),
    enabled: available,
    client,

    async getSession() {
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async signIn(email, password) {
      requireClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.user;
    },

    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async getCurrentProfile() {
      requireClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Oturum bulunamadı.');
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, role, category, active')
        .eq('id', authData.user.id)
        .single();
      if (error) throw error;
      if (!data.active) throw new Error('Bu kullanıcı hesabı pasif durumdadır.');
      return { ...data, email: authData.user.email || '' };
    },

    async loadAppState() {
      requireClient();
      const { data, error } = await client
        .from('app_state')
        .select('payload, version, updated_at, updated_by')
        .eq('id', 'main')
        .single();
      if (error) throw error;
      return data;
    },

    async saveAppState(expectedVersion, payload) {
      requireClient();
      const { data, error } = await client.rpc('save_app_state', {
        expected_version: expectedVersion,
        new_payload: payload
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },

    subscribeAppState(onChange) {
      if (!client) return null;
      return client
        .channel('polpro-app-state')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_state',
          filter: 'id=eq.main'
        }, onChange)
        .subscribe();
    },

    async uploadProjectFile(projectId, file) {
      requireClient('Canlı dosya alanı yapılandırılmamış.');
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${projectId}/${crypto.randomUUID()}-${safeName}`;
      const { data, error } = await client.storage
        .from('project-files')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const signed = await client.storage.from('project-files').createSignedUrl(data.path, 3600);
      if (signed.error) throw signed.error;
      return { path: data.path, url: signed.data?.signedUrl || '' };
    },

    async createSignedFileUrl(storagePath) {
      requireClient('Canlı dosya alanı yapılandırılmamış.');
      const { data, error } = await client.storage
        .from('project-files')
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      return data?.signedUrl || '';
    },

    async deleteProjectFile(storagePath) {
      requireClient('Canlı dosya alanı yapılandırılmamış.');
      const { error } = await client.storage.from('project-files').remove([storagePath]);
      if (error) throw error;
    }
  };
  window.Proje360Backend = window.PolatProBackend;
})();
