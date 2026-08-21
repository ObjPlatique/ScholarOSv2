export function placeholder(title, description, icon = '◇') {
  return {
    title,
    description,
    render: () => `<article class="card"><div class="feature-icon">${icon}</div><h2>${title}</h2><p>${description}</p><div class="empty-state" style="margin-top:18px"><strong>Module đang được rebuild</strong>Foundation đã sẵn sàng. Tính năng này sẽ được chuyển từ ScholarOS v1 sang v2 theo từng module.</div></article>`
  };
}
