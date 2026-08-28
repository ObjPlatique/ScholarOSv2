import { getState, setState, subscribe } from './store.js';
import { getSupabase } from './supabase.js';

let enabled = false;
let timer = null;
let saveToken = 0;

async function save(snapshot, token) {
  if (!enabled || token !== saveToken) return;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return;
    if (token !== saveToken) return;
    const result = await supabase.from('user_state').upsert({
      user_id: data.user.id,
      state: snapshot
    }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
  } catch (error) {
    console.warn('[Cloud persistence] save failed', error);
  }
}

function queueSave() {
  if (!enabled) return;
  const token = ++saveToken;
  clearTimeout(timer);
  timer = setTimeout(() => save(JSON.parse(JSON.stringify(getState())), token), 400);
}

export async function initCloudPersistence() {
  try {
    const supabase = await getSupabase();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) return { signedIn: false };

    const { data: row, error } = await supabase
      .from('user_state')
      .select('state')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (error) throw error;

    if (row?.state && typeof row.state === 'object') {
      setState(row.state);
    } else {
      const snapshot = JSON.parse(JSON.stringify(getState()));
      const result = await supabase.from('user_state').upsert({
        user_id: auth.user.id,
        state: snapshot
      }, { onConflict: 'user_id' });
      if (result.error) throw result.error;
    }

    enabled = true;
    subscribe(queueSave);
    return { signedIn: true, source: row?.state ? 'cloud' : 'local-migrated' };
  } catch (error) {
    console.warn('[Cloud persistence] init failed', error);
    return { signedIn: false, error };
  }
}
