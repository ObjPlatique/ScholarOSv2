import { getState, setState } from '../core/store.js';
import { getSupabase, DRIVE_STORAGE_BUCKET } from '../core/supabase.js';
import { navigate, getCurrentRoute } from '../core/router.js';

const BUCKET = DRIVE_STORAGE_BUCKET || 'scholar-drive';
let running = false;
let signature = '';

const sizeText = (n) => {
  if (!Number.isFinite(n) || n < 1024) return `${n || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
};
const typeText = (name = '') => {
  const ext = String(name).split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'doc' || ext === 'docx') return ext.toUpperCase();
  if (['png','jpg','jpeg','webp'].includes(ext)) return ext === 'jpeg' ? 'JPG' : ext.toUpperCase();
  return 'FILE';
};

async function repairDrive() {
  if (running || getCurrentRoute() !== 'academic') return;
  running = true;
  try {
    const supabase = await getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;
    const subjects = getState().subjects || [];
    if (!subjects.length) return;

    // Reconcile every Storage object into drive_files. This repairs uploads
    // that succeeded in Storage before their metadata row was created.
    const objects = [];
    for (const subject of subjects) {
      const prefix = `${user.id}/${subject.id}`;
      const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) { console.warn('[Drive repair:list]', error); continue; }
      for (const f of data || []) {
        if (!f?.name || f.name === '.emptyFolderPlaceholder') continue;
        objects.push({
          user_id: user.id,
          subject_id: subject.id,
          name: f.name,
          storage_bucket: BUCKET,
          storage_path: `${prefix}/${f.name}`,
          mime_type: f.metadata?.mimetype || f.metadata?.mimeType || 'application/octet-stream',
          file_size: Number(f.metadata?.size || 0)
        });
      }
    }
    if (objects.length) {
      const { error } = await supabase.from('drive_files').upsert(objects, { onConflict: 'user_id,storage_path', ignoreDuplicates: true });
      if (error) console.warn('[Drive repair:metadata]', error);
    }

    const { data: rows, error: queryError } = await supabase
      .from('drive_files')
      .select('id,user_id,subject_id,name,storage_bucket,storage_path,mime_type,file_size,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (queryError) throw queryError;

    const subjectMap = new Map(subjects.map(s => [String(s.id), s]));
    const materials = (rows || []).filter(row => subjectMap.has(String(row.subject_id))).map(row => ({
      id: `drive-${row.id}`,
      dbId: row.id,
      title: row.name,
      subjectId: row.subject_id,
      subject: subjectMap.get(String(row.subject_id)).name,
      type: typeText(row.name),
      mimeType: row.mime_type || 'application/octet-stream',
      size: sizeText(Number(row.file_size || 0)),
      fileSize: Number(row.file_size || 0),
      fileName: row.name,
      storageFileName: String(row.storage_path).split('/').pop(),
      storageBucket: row.storage_bucket || BUCKET,
      storagePath: row.storage_path,
      updatedAt: row.updated_at ? String(row.updated_at).slice(0,10) : '',
      storageStatus: 'uploaded'
    }));

    const nextSignature = materials.map(m => `${m.dbId}:${m.storagePath}`).join('|');
    if (nextSignature === signature) return;
    signature = nextSignature;
    setState({ materials });

    const activeSubject = window.__scholarActiveSubjectId;
    navigate('academic', { replace: true });
    if (activeSubject) requestAnimationFrame(() => {
      const tab = document.querySelector(`.subject-tab[data-id="${CSS.escape(String(activeSubject))}"]`);
      const panel = document.querySelector(`.learning-panel[data-subject-panel="${CSS.escape(String(activeSubject))}"]`);
      if (!tab || !panel) return;
      document.querySelectorAll('.subject-tab[data-id]').forEach(el => {
        const active = el === tab;
        el.classList.toggle('active', active);
        el.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.learning-panel[data-subject-panel]').forEach(el => {
        el.classList.toggle('active', el === panel);
        el.hidden = el !== panel;
      });
    });
  } catch (error) {
    console.warn('[Drive repair]', error);
  } finally { running = false; }
}

window.addEventListener('hashchange', () => setTimeout(repairDrive, 250));
window.addEventListener('focus', repairDrive);
setTimeout(repairDrive, 1200);
setInterval(repairDrive, 3000);
