let scheduleModulePromise;

async function getScheduleModule() {
  scheduleModulePromise ||= import('./schedule.js');
  return scheduleModulePromise;
}

document.addEventListener('click', async event => {
  const modal = event.target.closest('[data-schedule-modal]');
  if (!modal) return;

  const actionTarget = event.target.closest('button[data-action^="schedule-"]');
  if (!actionTarget || !modal.contains(actionTarget)) return;

  const action = actionTarget.dataset.action;
  if (!['schedule-modal-close', 'schedule-save-submit', 'schedule-delete'].includes(action)) return;

  // The dialog currently contains an inline stopPropagation handler. Capture
  // these controls before that handler so close/save/delete cannot be swallowed.
  event.preventDefault();
  event.stopPropagation();

  const { handleScheduleAction } = await getScheduleModule();
  const result = handleScheduleAction(action, actionTarget.dataset.id, event, actionTarget);

  if (result === 'refresh') {
    const hash = window.location.hash;
    window.location.href = `${window.location.pathname}${window.location.search}${hash}`;
  }
}, true);
