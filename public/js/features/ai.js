import { getState, setState } from '../core/store.js';

const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

let mathJaxPromise = null;
function ensureMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax);
  if (mathJaxPromise) return mathJaxPromise;
  window.MathJax = window.MathJax || {};
  window.MathJax.tex = {
    ...(window.MathJax.tex || {}),
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']]
  };
  window.MathJax.options = {
    ...(window.MathJax.options || {}),
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  };
  mathJaxPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    script.onload = () => resolve(window.MathJax);
    script.onerror = () => reject(new Error('Không thể tải bộ render công thức toán học.'));
    document.head.appendChild(script);
  });
  return mathJaxPromise;
}

function protectMath(text) {
  const slots = [];
  const put = value => {
    const index = slots.length;
    slots.push(value);
    return `SCHOLARMATHX${index}TOKEN`;
  };
  let output = String(text || '');
  output = output.replace(/\\\[([\s\S]*?)\\\]/g, (_, value) => put(`\\[${value}\\]`));
  output = output.replace(/\$\$([\s\S]*?)\$\$/g, (_, value) => put(`\\[${value}\\]`));
  output = output.replace(/\\\(([\s\S]*?)\\\)/g, (_, value) => put(`\\(${value}\\)`));
  output = output.replace(/(^|[^$])\$([^$\n]+?)\$(?!\$)/g, (_, prefix, value) => `${prefix}${put(`\\(${value}\\)`)}`);
  return { output, slots };
}

function restoreMath(text, slots) {
  return text.replace(/SCHOLARMATHX(\d+)TOKEN/g, (_, index) => slots[Number(index)] || '');
}

function inlineMarkdown(text) {
  let value = text;
  value = value.replace(/`([^`]+)`/g, '<code>$1</code>');
  value = value.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  value = value.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  value = value.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  return value;
}

function renderMarkdown(text) {
  const safe = esc(text || '');
  const protectedMath = protectMath(safe);
  const lines = protectedMath.output.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join('<br>'))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listType || !listItems.length) return;
    html.push(`<${listType}>${listItems.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(4, heading[1].length);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      flushList();
      html.push('<hr>');
      continue;
    }
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(unordered[1]);
      continue;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(ordered[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return restoreMath(html.join(''), protectedMath.slots);
}

function renderAIText(text, target = null) {
  const html = `<div class="ai-markdown">${renderMarkdown(text || 'Không có kết quả.')}</div>`;
  if (target) target.innerHTML = html;
  if (target) {
    ensureMathJax().then(() => window.MathJax.typesetPromise([target])).catch(() => {});
  }
  return html;
}

function contextSnapshot() {
  const s = getState();
  return {
    tasks: (s.tasks || []).slice(0, 30),
    schedule: (s.schedule || []).slice(0, 50),
    habits: (s.habits || []).slice(0, 30),
    goals: (s.goals || []).slice(0, 20),
    notes: (s.notes || []).slice(0, 30),
    subjects: (s.subjects || []).slice(0, 30),
    materials: (s.materials || []).slice(0, 30),
    colleges: (s.colleges || []).slice(0, 20),
    focusSessions: s.focusSessions || 0,
    streak: s.streak || 0
  };
}

function postJSON(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async response => {
    let data = {};
    try { data = await response.json(); } catch { /* ignore malformed response */ }
    if (!response.ok) throw new Error(data.error || `AI request failed (${response.status})`);
    return data;
  });
}

function shell({ title, description, icon, body }) {
  return {
    title,
    description,
    render: () => `<div class="ai-module">
      <div class="ai-hero card">
        <div class="ai-hero-icon">${icon}</div>
        <div><span class="eyebrow">SCHOLAR AI</span><h2>${esc(title)}</h2><p>${esc(description)}</p></div>
        <span class="ai-status"><i></i> AI Core</span>
      </div>
      ${body()}
    </div>`
  };
}

function chatMessages() {
  const messages = getState().aiChat || [];
  if (!messages.length) return `<div class="ai-empty"><div class="ai-empty-icon">✦</div><strong>Bắt đầu với Scholar AI</strong><span>Hỏi về bài học, kế hoạch, nhiệm vụ hoặc bất kỳ vấn đề học tập nào.</span><div class="ai-suggestions"><button class="chip" data-action="ai-suggest" data-prompt="Hôm nay tôi nên ưu tiên học gì?">Tôi nên học gì hôm nay?</button><button class="chip" data-action="ai-suggest" data-prompt="Hãy giúp tôi lập kế hoạch ôn tập cho tuần này.">Lập kế hoạch tuần</button><button class="chip" data-action="ai-suggest" data-prompt="Giải thích cho tôi cách học một chủ đề khó hiệu quả.">Cách học chủ đề khó</button></div></div>`;
  return messages.map(m => `<div class="ai-message ${m.role === 'user' ? 'user' : 'assistant'}"><div class="ai-message-label">${m.role === 'user' ? 'Bạn' : 'Scholar AI'}</div><div class="ai-message-body">${renderMarkdown(m.content)}</div></div>`).join('');
}

export function aiChat() {
  return shell({
    title: 'Scholar AI',
    description: 'Trợ lý AI trung tâm, có thể sử dụng dữ liệu học tập trong ScholarOS.',
    icon: '✦',
    body: () => `<section class="ai-chat-layout">
      <div class="card ai-chat-card">
        <div class="ai-chat-header"><div><h3>Trò chuyện</h3><p class="muted">AI có thể tham chiếu nhiệm vụ, lịch, mục tiêu, ghi chú và môn học của bạn.</p></div><button class="button" data-action="ai-clear-chat">Xóa hội thoại</button></div>
        <div class="ai-messages" id="aiMessages">${chatMessages()}</div>
        <form class="ai-composer" data-action="ai-send-form">
          <textarea id="aiPrompt" rows="3" maxlength="6000" placeholder="Ví dụ: Hãy giúp tôi ưu tiên các nhiệm vụ hôm nay..."></textarea>
          <div class="ai-composer-footer"><span class="muted">Không gửi API key hoặc thông tin bí mật.</span><button class="button primary" type="submit">Gửi ↗</button></div>
        </form>
      </div>
      <aside class="ai-side-stack">
        <div class="card"><h3>AI hiểu gì?</h3><div class="ai-context-list"><span>✓ Nhiệm vụ & deadline</span><span>✓ Thời gian biểu</span><span>✓ Mục tiêu & thói quen</span><span>✓ Ghi chú & môn học</span><span>✓ Lịch sử Focus</span></div></div>
        <div class="card"><h3>Nguyên tắc</h3><p class="muted">AI chỉ đưa ra đề xuất. Nó không tự ý thay đổi dữ liệu ScholarOS.</p></div>
      </aside>
    </section>`
  });
}

export function aiStudy() {
  return shell({
    title: 'Study Assistant',
    description: 'Giải thích kiến thức, tạo quiz và phản hồi bài làm ngay trong ScholarOS.',
    icon: '◇',
    body: () => `<div class="ai-study-grid">
      <section class="card"><div class="card-heading"><div><h3>Giải thích & ôn tập</h3><p class="muted">Nhập môn học và chủ đề bạn đang gặp khó khăn.</p></div></div>
        <label class="field"><span>Môn học</span><input id="studySubject" placeholder="Ví dụ: Toán, Vật lý, Ngữ văn"></label>
        <label class="field"><span>Chủ đề / câu hỏi</span><textarea id="studyTopic" rows="5" placeholder="Tôi chưa hiểu định luật bảo toàn động lượng..."></textarea></label>
        <div class="button-row"><button type="button" class="button primary" data-action="ai-explain">Giải thích</button><button type="button" class="button" data-action="ai-study-plan">Cho tôi cách ôn tập</button></div>
      </section>
      <section class="card"><div class="card-heading"><div><h3>Quiz nhanh</h3><p class="muted">Tạo 3–10 câu trắc nghiệm từ một chủ đề.</p></div></div>
        <label class="field"><span>Chủ đề quiz</span><input id="quizTopic" placeholder="Ví dụ: Hàm số bậc hai"></label>
        <div class="form-grid"><label class="field"><span>Môn</span><input id="quizSubject" placeholder="Toán"></label><label class="field"><span>Số câu</span><select id="quizCount"><option>3</option><option selected>5</option><option>10</option></select></label></div>
        <label class="field"><span>Độ khó</span><select id="quizDifficulty"><option>Dễ</option><option selected>Vừa</option><option>Khó</option></select></label>
        <button type="button" class="button primary" data-action="ai-quiz">Tạo Quiz</button>
      </section>
    </div><section class="card ai-result-card" id="aiStudyResult"><div class="empty-state"><strong>Kết quả AI sẽ xuất hiện ở đây</strong>Hãy bắt đầu bằng một yêu cầu ở phía trên.</div></section>`
  });
}

export function aiPlanner() {
  const s = getState();
  const pending = (s.tasks || []).filter(t => !t.done).length;
  return shell({
    title: 'AI Planner',
    description: 'Phân tích dữ liệu học tập và đề xuất lịch học thực tế, không tự ý thay đổi lịch của bạn.',
    icon: '⌁',
    body: () => `<div class="ai-planner-grid">
      <section class="card"><h3>Context hiện tại</h3><div class="planner-stats"><div><strong>${pending}</strong><span>Nhiệm vụ chưa xong</span></div><div><strong>${(s.schedule||[]).length}</strong><span>Phiên đã lập lịch</span></div><div><strong>${(s.goals||[]).length}</strong><span>Mục tiêu</span></div><div><strong>${s.focusSessions||0}</strong><span>Focus sessions</span></div></div><p class="muted">AI sẽ ưu tiên deadline và nhiệm vụ quan trọng, đồng thời giữ các phiên cố định.</p><button type="button" class="button primary" data-action="ai-optimize-schedule">Phân tích & đề xuất lịch</button></section>
      <section class="card"><h3>Nguyên tắc Planner</h3><ul class="ai-rule-list"><li>Không tự thay đổi lịch hiện tại.</li><li>Ưu tiên việc khẩn cấp và quan trọng.</li><li>Ưu tiên block học 50 phút + 10 phút nghỉ.</li><li>Không xếp lịch học kín cả ngày.</li><li>Cảnh báo khi dữ liệu không đủ để lập lịch tốt.</li></ul></section>
    </div><section class="card ai-result-card" id="aiPlannerResult"><div class="empty-state"><strong>Chưa có đề xuất</strong>Nhấn “Phân tích & đề xuất lịch” để bắt đầu.</div></section>`
  });
}

function saveChat(role, content) {
  const s = getState();
  setState({ aiChat: [...(s.aiChat || []), { id: uid('msg'), role, content, createdAt: Date.now() }].slice(-40) });
}

function setResult(id, html) {
  const el = document.getElementById(id); if (el) el.innerHTML = html;
}

function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) { button.disabled = true; button.dataset.originalLabel = button.textContent; button.textContent = label || 'Đang xử lý…'; }
  else { button.disabled = false; button.textContent = button.dataset.originalLabel || button.textContent; }
}

export function handleAIAction(action, id, event, control = null) {
  if (!action) return null;
  if (action === 'ai-send-form') {
    event.preventDefault();
    event.stopPropagation();
    const input = document.getElementById('aiPrompt');
    const prompt = input?.value.trim();
    if (!prompt) return null;
    sendChat(prompt);
    return null;
  }
  if (action === 'ai-suggest') {
    const prompt = event.target?.closest('[data-action=\"ai-suggest\"]')?.dataset.prompt || '';
    if (!prompt) return null;
    sendChat(prompt);
    return null;
  }
  if (action === 'ai-clear-chat') {
    setState({ aiChat: [] }); return 'refresh';
  }
  if (action === 'ai-explain' || action === 'ai-study-plan') {
    runStudyAction(action, control || event.target?.closest('button[data-action]')); return null;
  }
  if (action === 'ai-quiz') { runQuiz(control || event.target?.closest('button[data-action]')); return null; }
  if (action === 'ai-optimize-schedule') { runPlanner(control || event.target?.closest('button[data-action]')); return null; }
  return null;
}

async function sendChat(prompt) {
  saveChat('user', prompt);
  const input = document.getElementById('aiPrompt'); if (input) input.value = '';
  const box = document.getElementById('aiMessages'); if (box) box.innerHTML = chatMessages() + `<div class="ai-message assistant"><div class="ai-message-label">Scholar AI</div><div class="ai-message-body ai-thinking">Đang suy nghĩ…</div></div>`;
  try {
    const data = await postJSON('/api/ai', { prompt, context: contextSnapshot() });
    saveChat('assistant', data.text || 'AI không trả về nội dung.');
  } catch (err) {
    saveChat('assistant', `Không thể kết nối Scholar AI: ${err.message}`);
  }
  const box2 = document.getElementById('aiMessages'); if (box2) box2.innerHTML = chatMessages();
  if (box2) {
    try { await ensureMathJax(); await window.MathJax.typesetPromise([box2]); } catch {}
    box2.scrollTo({ top: box2.scrollHeight, behavior: 'smooth' });
  }
}

async function runStudyAction(action, button) {
  const subject = document.getElementById('studySubject')?.value.trim() || 'Môn học';
  const topic = document.getElementById('studyTopic')?.value.trim() || '';
  if (!topic) { setResult('aiStudyResult', `<div class="empty-state"><strong>Thiếu chủ đề</strong>Hãy nhập câu hỏi hoặc chủ đề cần hỗ trợ.</div>`); return; }
  setBusy(button, true, 'AI đang xử lý…');
  try {
    const prompt = action === 'ai-explain'
      ? `Giải thích dễ hiểu cho học sinh Việt Nam về môn ${subject}, chủ đề: ${topic}. Trình bày theo cấu trúc: ý chính, giải thích từng bước, ví dụ ngắn, lỗi thường gặp, 3 câu tự kiểm tra.`
      : `Tạo chiến lược ôn tập thực tế cho môn ${subject}, chủ đề: ${topic}. Tôi muốn biết nên học theo thứ tự nào, mỗi phiên nên làm gì, cách tự kiểm tra và cách ôn lại sau 1/3/7 ngày.`;
    const data = await postJSON('/api/ai', { prompt, context: contextSnapshot() });
    const result = document.getElementById('aiStudyResult');
    if (result) {
      result.innerHTML = `<div class="ai-result"><div class="result-heading"><span class="tag">Scholar AI</span><h3>${action === 'ai-explain' ? 'Giải thích' : 'Chiến lược ôn tập'}</h3></div><div class="result-text"></div></div>`;
      renderAIText(data.text || 'Không có kết quả.', result.querySelector('.result-text'));
    }
  } catch (err) {
    setResult('aiStudyResult', `<div class="empty-state"><strong>Không thể hoàn thành yêu cầu</strong>${esc(err.message)}</div>`);
  } finally { setBusy(button, false); }
}

async function runQuiz(button) {
  const topic = document.getElementById('quizTopic')?.value.trim();
  if (!topic) { setResult('aiStudyResult', `<div class="empty-state"><strong>Thiếu chủ đề</strong>Hãy nhập chủ đề quiz.</div>`); return; }
  setBusy(button, true, 'Đang tạo quiz…');
  try {
    const data = await postJSON('/api/quiz', { topic, subject: document.getElementById('quizSubject')?.value.trim(), difficulty: document.getElementById('quizDifficulty')?.value, count: Number(document.getElementById('quizCount')?.value || 5) });
    const questions = data.questions || [];
    setResult('aiStudyResult', `<div class="quiz-result"><div class="result-heading"><span class="tag">${esc(data.title || 'Quiz')}</span><h3>${questions.length} câu hỏi</h3></div>${questions.map((q,i)=>`<article class="quiz-question"><strong>${i+1}. ${esc(q.question)}</strong><div class="quiz-options">${(q.options||[]).map((o,j)=>`<button class="quiz-option" data-action="quiz-answer" data-question="${i}" data-option="${String.fromCharCode(65+j)}">${String.fromCharCode(65+j)}. ${esc(o)}</button>`).join('')}</div><div class="quiz-explanation" id="quiz-exp-${i}" hidden>Đáp án: <strong>${esc(q.answer || '')}</strong><br>${esc(q.explanation || '')}</div></article>`).join('')}<div class="muted">Quiz này chỉ hiển thị đáp án sau khi bạn chọn.</div></div>`);
    window.__scholarQuiz = questions;
  } catch (err) { setResult('aiStudyResult', `<div class="empty-state"><strong>Không thể tạo quiz</strong>${esc(err.message)}</div>`); }
  finally { setBusy(button, false); }
}

async function runPlanner(button) {
  setBusy(button, true, 'Đang phân tích…');
  try {
    const data = await postJSON('/api/schedule', { context: contextSnapshot() });
    const blocks = data.blocks || [];
    setResult('aiPlannerResult', `<div class="planner-result"><div class="result-heading"><span class="tag">AI đề xuất</span><h3>${esc(data.summary || 'Kế hoạch đề xuất')}</h3></div>${data.warnings?.length ? `<div class="warning-box"><strong>Lưu ý</strong>${data.warnings.map(x=>`<div>• ${esc(x)}</div>`).join('')}</div>` : ''}<div class="planner-blocks">${blocks.length ? blocks.map(b=>`<div class="planner-block"><div><strong>${esc(b.title)}</strong><span>${esc(b.day || '')} · ${esc(b.start || '')}–${esc(b.end || '')}</span></div><p>${esc(b.reason || '')}</p></div>`).join('') : '<div class="empty-state"><strong>AI không tạo được block</strong>Hãy bổ sung deadline hoặc thời gian cố định.</div>'}</div><p class="muted">Đây là đề xuất. ScholarOS chưa thay đổi thời gian biểu của bạn.</p></div>`);
  } catch (err) { setResult('aiPlannerResult', `<div class="empty-state"><strong>Không thể lập đề xuất</strong>${esc(err.message)}</div>`); }
  finally { setBusy(button, false); }
}

window.__scholarQuizAnswer = (button) => {
  const index = Number(button.dataset.question); const option = button.dataset.option; const q = window.__scholarQuiz?.[index];
  if (!q) return;
  button.parentElement.querySelectorAll('.quiz-option').forEach(x => x.disabled = true);
  button.classList.add(option === q.answer ? 'correct' : 'incorrect');
  if (option !== q.answer) button.parentElement.querySelector(`[data-option="${CSS.escape(q.answer)}"]`)?.classList.add('correct');
  const exp = document.getElementById(`quiz-exp-${index}`); if (exp) exp.hidden = false;
};
