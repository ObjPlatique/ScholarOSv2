import { getState, setState, resetState, subscribe } from './store.js';
import { getSupabase } from './supabase.js';

const CLOUD_TABLE = 'user_state';
let enabled = false;
let syncing = false;
let activeUserId = null;
let saveTimer = null;
let saveRevision = 0;
let unsubscribeStore = null;
let authListenerBound = false;

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
  if (resetLocal) resetState();
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

    let source = 'local-migrated';
    if (row?.state && typeof row.state === 'object') {
      setState(row.state);
      source = 'cloud';
    } else {
      const snapshot = cloneState();
      const result = await supabase.from(CLOUD_TABLE).upsert({ user_id: user.id, state: snapshot }, { onConflict: 'user_id' });
      if (result.error) throw result.error;
    }

    if (activeUserId !== user.id) return { signedIn: false };
    enabled = true;
    syncing = false;
    unsubscribeStore = subscribe(scheduleSave);
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
    emit('error', { error });
    return { signedIn: false, error };
  }
}

export async function flushCloudPersistence() {
  if (!enabled || !activeUserId || syncing) return false;
  clearTimeout(saveTimer);
  return persist(cloneState(), ++saveRevision, activeUserId);
}

window.addEventListener('pagehide', () => { void flushCloudPersistence(); });
