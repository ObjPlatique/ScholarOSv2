import { getState, setState, subscribe } from './store.js';
import { getSupabase } from './supabase.js';

let enabled = false;
let timer = null;
let saveToken = 0;
let unsubscribeStore = null;
let authListenerBound = false;
let syncing = false;
let activeUserId = null;

function snapshotState() {
  return JSON.parse(JSON.stringify(getState()));
}

async function save(snapshot, token) {
  if (!enabled || syncing || token !== saveToken || !activeUserId) return;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user || data.user.id !== activeUserId) return;
    if (token !== saveToken) return;
    const result = await supabase.from('user_state').upsert({
      user_id: activeUserId,
      state: snapshot
    }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
  } catch (error) {
    console.warn('[Cloud persistence] save failed', error);
  }
}

function queueSave() {
  if (!enabled || syncing || !activeUserId) return;
  const token = ++saveToken;
  clearTimeout(timer);
  timer = setTimeout(() => save(snapshotState(), token), 400);
}

function disablePersistence() {
  enabled = false;
  activeUserId = null;
  syncing = false;
  saveToken++;
  clearTimeout(timer);
  timer = null;
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
}

async function syncUser(user) {
  if (!user?.id) {
    disablePersistence();
    return { signedIn: false };
  }

  if (syncing && activeUserId === user.id) return { signedIn: true, source: 'syncing' };
  disablePersistence();
  syncing = true;
  activeUserId = user.id;

  try {
    const supabase = await getSupabase();
    const { data: row, error } = await supabase
      .from('user_state')
      .select('state')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    if (row?.state && typeof row.state === 'object') {
      // Cloud is authoritative once an account has saved state.
      setState(row.state);
    } else {
      // First login: migrate the browser's existing state exactly once.
      const snapshot = snapshotState();
      const result = await supabase.from('user_state').upsert({
        user_id: user.id,
        state: snapshot
      }, { onConflict: 'user_id' });
      if (result.error) throw result.error;
    }

    enabled = true;
    syncing = false;
    if (activeUserId !== user.id) return { signedIn: false };
    unsubscribeStore = subscribe(queueSave);
    return { signedIn: true, source: row?.state ? 'cloud' : 'local-migrated' };
  } catch (error) {
    console.warn('[Cloud persistence] init failed', error);
    disablePersistence();
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
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setTimeout(() => syncUser(session?.user), 0);
        } else if (event === 'SIGNED_OUT') {
          disablePersistence();
        }
      });
    }

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) return { signedIn: false };
    return syncUser(auth.user);
  } catch (error) {
    console.warn('[Cloud persistence] init failed', error);
    return { signedIn: false, error };
  }
}
