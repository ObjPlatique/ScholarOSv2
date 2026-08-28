import { getState, setState } from '../core/store.js';
import { getSupabase } from '../core/supabase.js';

const BUCKET = 'scholar-drive';
let syncing = false;

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024, i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

function typeFromName(name = '') {
  const ext = String(name).split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'doc' || ext === 'docx') return ext.toUpperCase();
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return ext === 'jpeg' ? 'JPG' : ext.toUpperCase();
  return 'FILE';
}

function titleFromObject(name = '') {
  return String(name).split('/').pop() || name;
}

async function syncDrive() {
  if (syncing || !location.hash.replace(/^#/, '').startsWith('academic')) return;
  syncing = true;
  try {
    const supabase = await getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const state = getState();
    const subjects = state.subjects || [];
    if (!subjects.length) return;

    const existing = state.materials || [];
    const discovered = [];

    for (const subject of subjects) {
      const prefix = `${user.id}/${subject.id}`;
      const { data: files, error } = await supabase.storage.from(BUCKET).list(prefix, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (error) {
        console.warn('[Drive sync]', subject.id, error.message);
        continue;
      }
      for (const file of files || []) {
        if (!file?.name || file.name === '.emptyFolderPlaceholder') continue;
        const storagePath = `${prefix}/${file.name}`;
        if (existing.some(item => item.storagePath === storagePath)) continue;
        const metadata = file.metadata || {};
        discovered.push({
          id: `storage-${storagePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
          title: titleFromObject(file.name),
          subjectId: subject.id,
          subject: subject.name,
          type: typeFromName(file.name),
          mimeType: metadata.mimetype || metadata.mimeType || 'application/octet-stream',
          size: formatSize(Number(metadata.size || 0)),
          fileSize: Number(metadata.size || 0),
          fileName: titleFromObject(file.name),
          storageFileName: file.name,
          storageBucket: BUCKET,
          storagePath,
          updatedAt: file.updated_at ? String(file.updated_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
          storageStatus: 'uploaded'
        });
      }
    }

    if (discovered.length) {
      const merged = [...existing, ...discovered];
      setState({ materials: merged });
      console.info(`[Drive sync] Found ${discovered.length} file(s) in Supabase Storage.`);
    }
  } catch (error) {
    console.warn('[Drive sync]', error);
  } finally {
    syncing = false;
  }
}

window.addEventListener('hashchange', () => setTimeout(syncDrive, 100));
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncDrive(); });
setTimeout(syncDrive, 800);
setInterval(syncDrive, 2500);
