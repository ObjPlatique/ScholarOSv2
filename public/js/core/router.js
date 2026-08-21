const routes = new Map();
let currentRoute = 'dashboard';

export function registerRoute(name, config) {
  routes.set(name, config);
}

export function getRoute(name) {
  const config = routes.get(name) || routes.get('dashboard');
  if (typeof config === 'function') return config();
  return config;
}

export function getCurrentRoute() {
  return currentRoute;
}

function renderRoute(name, { push = false } = {}) {
  const routeName = routes.has(name) ? name : 'dashboard';
  const route = getRoute(routeName);
  currentRoute = routeName;

  if (push) {
    history.pushState({ route: currentRoute }, '', `#${currentRoute}`);
  } else if (location.hash.slice(1) !== currentRoute) {
    history.replaceState({ route: currentRoute }, '', `#${currentRoute}`);
  }

  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === currentRoute);
    btn.setAttribute('aria-current', btn.dataset.route === currentRoute ? 'page' : 'false');
  });

  document.getElementById('pageTitle').textContent = route.title || '';
  document.getElementById('pageDescription').textContent = route.description || '';
  document.getElementById('pageEyebrow').textContent = route.eyebrow || 'PERSONAL LEARNING SYSTEM';
  document.getElementById('appView').innerHTML = route.render?.() || '<div class="empty-state"><strong>Module chưa sẵn sàng</strong>Module này chưa có giao diện.</div>';
  route.mount?.();
}

export function navigate(name, options = {}) {
  renderRoute(name, { push: options.replace ? false : true });
}

export function initRouter() {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigate(btn.dataset.route);
      document.getElementById('sidebar')?.classList.remove('open');
    });
  });

  window.addEventListener('popstate', () => {
    renderRoute(location.hash.slice(1) || 'dashboard');
  });

  renderRoute(location.hash.slice(1) || 'dashboard');
}
