import { getState } from '../core/store.js';
import { getSupabase } from '../core/supabase.js';

const BUCKET = 'resources';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const STEP = 0.25;

const esc = (value = '') => String(value).replace(/[&<>\'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const isPdf = (item) => /pdf/i.test(String(item?.mimeType || item?.mime_type || item?.type || item?.fileType || item?.file_type || item?.name || item?.title || ''));
const getBucket = (item) => item?.storageBucket || item?.storage_bucket || item?.bucket || item?.storage?.bucket || BUCKET;
const getPath = (item) => item?.storagePath || item?.storage_path || item?.path || item?.storage?.path || '';
const getDirectUrl = (item) => item?.publicUrl || item?.public_url || item?.storageUrl || item?.storage_url || item?.url || '';

let zoom = 1;
let currentUrl = '';

function removePreview() {
  document.querySelector('.drive-fullscreen-preview')?.remove();
  document.body.classList.remove('drive-preview-open');
  document.removeEventListener('keydown', handleKeydown);
}

function setZoom(next) {
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
  const viewer = document.querySelector('.drive-pdf-viewer');
  const frame = document.querySelector('.drive-pdf-frame');
  const value = document.querySelector('.drive-zoom-value');
  if (!viewer || !frame || !value) return;
  frame.style.width = `${100 / zoom}%`;
  frame.style.height = `${100 / zoom}%`;
  frame.style.transform = `scale(${zoom})`;
  value.textContent = `${Math.round(zoom * 100)}%`;
  viewer.classList.toggle('is-zoomed', zoom !== 1);
}

function handleKeydown(event) {
  const modal = document.querySelector('.drive-fullscreen-preview');
  if (!modal) return;
  if (event.key === 'Escape') removePreview();
  if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(zoom + STEP); }
  if (event.key === '-') { event.preventDefault(); setZoom(zoom - STEP); }
  if (event.key === '0') { event.preventDefault(); setZoom(1); }
}

function renderPreview(item, url, error = '') {
  removePreview();
  currentUrl = url || '';
  document.body.classList.add('drive-preview-open');
  document.body.insertAdjacentHTML('beforeend', `
    <div class="drive-fullscreen-preview" role="dialog" aria-modal="true" aria-label="Xem trước tài liệu">
      <header class="drive-preview-toolbar">
        <div class="drive-preview-title">
          <span class="drive-preview-file-icon">PDF</span>
          <div><strong>${esc(item?.title || item?.name || 'Tài liệu PDF')}</strong><span>${esc(item?.size || 'PDF')}</span></div>
        </div>
        <div class="drive-preview-controls">
          <button class="drive-preview-control" type="button" data-drive-preview="zoom-out" aria-label="Thu nhỏ">−</button>
          <button class="drive-zoom-value" type="button" data-drive-preview="reset-zoom" aria-label="Đặt lại thu phóng">100%</button>
          <button class="drive-preview-control" type="button" data-drive-preview="zoom-in" aria-label="Phóng to">+</button>
          <span class="drive-preview-divider"></span>
          ${url ? `<a class="drive-preview-control drive-preview-download" href="${esc(url)}" target="_blank" rel="noopener" title="Mở file trong tab mới">↗</a>` : ''}
          <button class="drive-preview-close" type="button" data-drive-preview="close" aria-label="Đóng preview">×</button>
        </div>
      </header>
      <main class="drive-pdf-viewer">
        ${url && isPdf(item) ? `<iframe class="drive-pdf-frame" title="${esc(item?.title || 'PDF')}" src="${esc(url)}#toolbar=0&navpanes=0&view=FitH"></iframe>` : url ? `<div class="drive-preview-unsupported"><strong>File này chưa phải PDF</strong><p>Hiện tại Drive Preview trực tiếp được tối ưu cho PDF.</p><a class="button primary" href="${esc(url)}" target="_blank" rel="noopener">Mở file</a></div>` : `<div class="drive-preview-unsupported"><strong>Không thể mở file</strong><p>${esc(error || 'Tài liệu chưa có public URL hoặc storage path hợp lệ.')}</p></div>`}
      </main>
    </div>
  `);
  zoom = 1;
  setZoom(1);
  document.addEventListener('keydown', handleKeydown);
}

async function resolveUrl(item) {
  const direct = getDirectUrl(item);
  if (direct) return direct;
  const path = getPath(item);
  if (!path) return '';

  const supabase = await getSupabase();
  const bucket = getBucket(item);
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  if (publicData?.publicUrl) return publicData.publicUrl;

  const { data: signedData, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return signedData?.signedUrl || '';
}

async function openPreview(item) {
  renderPreview(item, '', 'Đang kết nối tới Cloud Storage…');
  try {
    const url = await resolveUrl(item);
    if (!url) throw new Error('Tài liệu không có public URL/storage path.');
    renderPreview(item, url);
  } catch (error) {
    renderPreview(item, '', error?.message || 'Không thể lấy URL của tài liệu.');
  }
}

function findMaterial(id) {
  return (getState().materials || []).find((material) => String(material.id) === String(id));
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action="material-preview"]');
  if (trigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const item = findMaterial(trigger.dataset.id);
    if (item) openPreview(item);
    return;
  }

  const control = event.target.closest('[data-drive-preview]');
  if (!control) return;
  const action = control.dataset.drivePreview;
  if (action === 'close') removePreview();
  if (action === 'zoom-in') setZoom(zoom + STEP);
  if (action === 'zoom-out') setZoom(zoom - STEP);
  if (action === 'reset-zoom') setZoom(1);
}, true);
