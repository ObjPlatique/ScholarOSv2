import { getState, setState } from '../core/store.js';
import { getSupabase, DRIVE_STORAGE_BUCKET } from '../core/supabase.js';

const BUCKET = DRIVE_STORAGE_BUCKET || 'scholar-drive';

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

function fileNameFromPath(path = '') { return String(path).split('/').pop() || path; }

function toMaterial(row, subjectMap) {
  const subjectId = String(row.subject_id ?? '');
  const subject = subjectMap.get(subjectId);
  const name = row.name || fileNameFromPath(row.storage_path);
  return {
    id: `drive-${row.id}`,
    dbId: row.id,
    title: name,
    subjectId,
    subject: subject?.name || 'Môn học',
    type: typeFromName(name),
    mimeType: row.mime_type || 'application/octet-stream',
    size: formatSize(Number(row.file_size || 0)),
    fileSize: Number(row.file_size || 0),
    fileName: name,
    storageFileName: fileNameFromPath(row.storage_path),
    storageBucket: row.storage_bucket || BUCKET,
    storagePath: row.storage_path,
    updatedAt: row.updated_at ? String(row.updated_at).slice(0, 10) : '',
    storageStatus: 'uploaded'
  };
}

export async function loadDriveFiles() {
  const supabase = await getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error('Bạn cần đăng nhập để sử dụng Drive.');

  const state = getState();
  const subjects = state.subjects || [];
  const subjectMap = new Map(subjects.map(subject => [String(subject.id), subject]));
  const { data, error } = await supabase
    .from('drive_files')
    .select('id,user_id,subject_id,name,storage_bucket,storage_path,mime_type,file_size,created_at,updated_at')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const materials = (data || []).map(row => toMaterial(row, subjectMap));
  setState({ materials });
  return materials;
}

export async function registerUploadedFile({ userId, subjectId, file, storagePath }) {
  const supabase = await getSupabase();
  const payload = {
    user_id: userId,
    subject_id: String(subjectId),
    name: file.name,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size
  };
  const { data, error } = await supabase
    .from('drive_files')
    .insert(payload)
    .select('id,user_id,subject_id,name,storage_bucket,storage_path,mime_type,file_size,created_at,updated_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDriveFile(file) {
  const supabase = await getSupabase();
  const storagePath = file.storagePath;
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from(file.storageBucket || BUCKET).remove([storagePath]);
    if (storageError) throw storageError;
  }
  const dbId = file.dbId || String(file.id || '').replace(/^drive-/, '');
  if (dbId) {
    const { error } = await supabase.from('drive_files').delete().eq('id', dbId);
    if (error) throw error;
  }
}

export async function syncDriveFiles() {
  try { return await loadDriveFiles(); }
  catch (error) { console.warn('[Drive data]', error); return null; }
}
