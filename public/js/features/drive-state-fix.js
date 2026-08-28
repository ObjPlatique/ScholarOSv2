// Keep the active Drive subject visible after upload-triggered route re-renders.
// The Drive data is persisted in the shared store; this module only restores the
// selected subject panel in the DOM after academic() renders again.
(function () {
  const appView = document.getElementById('appView');
  if (!appView) return;

  function restoreActiveSubject() {
    if (!location.hash.replace(/^#/, '').startsWith('academic')) return;
    const subjectId = window.__scholarActiveSubjectId;
    if (!subjectId) return;

    const escaped = CSS.escape(String(subjectId));
    const tab = appView.querySelector(`.subject-tab[data-id="${escaped}"]`);
    const panel = appView.querySelector(`.learning-panel[data-subject-panel="${escaped}"]`);
    if (!tab || !panel) return;

    appView.querySelectorAll('.subject-tab[data-id]').forEach((el) => {
      const active = el === tab;
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', String(active));
    });
    appView.querySelectorAll('.learning-panel[data-subject-panel]').forEach((el) => {
      const active = el === panel;
      el.classList.toggle('active', active);
      el.hidden = !active;
    });
  }

  appView.addEventListener('click', (event) => {
    const tab = event.target.closest('.subject-tab[data-id]');
    if (tab) window.__scholarActiveSubjectId = tab.dataset.id;
  }, true);

  const observer = new MutationObserver(restoreActiveSubject);
  observer.observe(appView, { childList: true, subtree: true });
  window.addEventListener('hashchange', restoreActiveSubject);
  restoreActiveSubject();
})();
