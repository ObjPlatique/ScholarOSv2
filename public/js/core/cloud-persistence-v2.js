import { getState, setState, resetState, subscribe } from './store.js';
import { getSupabase } from './supabase.js';

const CLOUD_TABLE = 'user_state';
const RESET_MARKER = '__SCHOLAROS_RESET__';
let enabled = false;
let syncing = false;
let activeUserId = null;
let saveTimer = null;
let saveRevision = 0;
let unsubscribeStore = null;
let authListenerBound = false;
let realtimeChannel = null;

const cloneState = () => JSON.parse(JSON.stringify(getState()));
const emit = (status, extra = {}) => window.dispatchEvent(new CustomEvent('scholaros:persistence', { detail: { status, ...extra } }));

function stop({ resetLocal = false } = {}) {
  enabled = false;
  activeUserId = null;
  syncing = false;
  saveRevision += 1;
  clearTimeout(saveTimer);
  saveTimer = null;
  unsubscribeStore?.();
  unsubscribeStore = null;
  if (realtimeChannel) {
    void realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
  if (resetLocal) {
    resetState();
    localStorage.removeItem('scholaros.v2.state');
  }
}

async function persist(snapshot, revision, userId) {
  if (!enabled || syncing || !userId || revision !== saveRevision) return false;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || data?.user?.id !== userId || revision !== saveRevision) return false;
    const result = await supabase.from(CLOUD_TABLE).upsert({ user_id: userId, state: snapshot }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
    emit('synced', { userId });
    return true;
  } catch (error) {
    console.warn('[Cloud persistence] save failed', error);
    emit('error', { userId, error });
    return false;
  }
}

function scheduleSave() {
  if (!enabled || syncing || !activeUserId) return;
  const revision = ++saveRevision;
  clearTimeout(saveTimer);
  emit('saving', { userId: activeUserId });
  const userId = activeUserId;
  saveTimer = setTimeout(() => { void persist(cloneState(), revision, userId); }, 500);
}

async function bindRealtime(userId) {
  const supabase = await getSupabase();
  if (realtimeChannel) void realtimeChannel.unsubscribe();
  realtimeChannel = supabase.channel(`scholaros-user-state-${userId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: CLOUD_TABLE, filter: `user_id=eq.${userId}` }, payload => {
      if (activeUserId !== userId || !payload.new?.state || !payload.new.state[RESET_MARKER]) return;
      clearLocalStateAfterCloudDeletion();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: CLOUD_TABLE, filter: `user_id=eq.${userId}` }, async () => {
      if (activeUserId !== userId) return;
      stop({ resetLocal: true });
      emit('remote-reset', { userId, reason: 'account-deleted' });
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
      window.location.hash = '#auth';
      window.setTimeout(() => window.location.reload(), 0);
    })
    .subscribe(status => emit('realtime', { userId, status }));
}

async function hydrate(user) {
  if (!user?.id) {
    stop({ resetLocal: true });
    emit('signed-out');
    return { signedIn: false };
  }
  if (syncing && activeUserId === user.id) return { signedIn: true, source: 'syncing' };
  stop();
  syncing = true;
  activeUserId = user.id;
  emit('loading', { userId: user.id });
  try {
    const supabase = await getSupabase();
    const { data: row, error } = await supabase.from(CLOUD_TABLE).select('state,version,updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;

    let source = 'new-account';
    if (row?.state && typeof row.state === 'object') {
      if (row.state[RESET_MARKER]) {
        clearLocalStateAfterCloudDeletion();
        source = 'cloud-reset';
      } else {
        setState(row.state);
        source = 'cloud';
      }
    } else {
      resetState();
      const snapshot = cloneState();
      const result = await supabase.from(CLOUD_TABLE).upsert({ user_id: user.id, state: snapshot }, { onConflict: 'user_id' });
      if (result.error) throw result.error;
    }

    if (activeUserId !== user.id) return { signedIn: false };
    enabled = true;
    syncing = false;
    if (!unsubscribeStore) unsubscribeStore = subscribe(scheduleSave);
    await bindRealtime(user.id);
    emit('synced', { userId: user.id, source });
    return { signedIn: true, source };
  } catch (error) {
    console.warn('[Cloud persistence] hydrate failed', error);
    stop();
    emit('error', { userId: user.id, error });
    return { signedIn: false, error };
  } finally {
    syncing = false;
  }
}

export async function initCloudPersistence() {
  try {
    const supabase = await getSupabase();
    if (!authListenerBound) {
      authListenerBound = true;
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          setTimeout(() => { void hydrate(session?.user); }, 0);
        } else if (event === 'SIGNED_OUT') {
          stop({ resetLocal: true });
          emit('signed-out');
        }
      });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      stop({ resetLocal: true });
      emit('signed-out');
      return { signedIn: false };
    }
    return hydrate(data.user);
  } catch (error) {
    console.warn('[Cloud persistence] init failed', error);
    return { signedIn: false, error };
  }
}

export function clearLocalStateAfterCloudDeletion() {
  if (!activeUserId) {
    resetState();
    localStorage.removeItem('scholaros.v2.state');
    return;
  }
  clearTimeout(saveTimer);
  saveTimer = null;
  saveRevision += 1;
  syncing = false;
  enabled = true;
  unsubscribeStore?.();
  unsubscribeStore = null;
  resetState();
  localStorage.removeItem('scholaros.v2.state');
  unsubscribeStore = subscribe(scheduleSave);
  emit('cleared-local', { userId: activeUserId });
}

export async function flushCloudPersistence() {
  if (!enabled || !activeUserId || syncing) return false;
  clearTimeout(saveTimer);
  return persist(cloneState(), ++saveRevision, activeUserId);
}

window.addEventListener('pagehide', () => { void flushCloudPersistence(); });
