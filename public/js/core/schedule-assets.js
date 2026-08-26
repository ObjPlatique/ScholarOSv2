const pad = value => String(value).padStart(2, '0');

const DAY_COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export function createDefaultScheduleAsset() {
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayIndex);
    const localDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const color = DAY_COLORS[dayIndex];

    return Array.from({ length: 16 }, (_, hourIndex) => {
      const hour = hourIndex + 6;
      return {
        id: `asset-default-${dayIndex + 1}-${hour}`,
        title: `Phiên ${pad(hour)}:00 – ${pad(hour + 1)}:00`,
        date: localDate,
        start: `${pad(hour)}:00`,
        duration: 60,
        type: 'study',
        recurrence: 'weekly',
        color,
        focusLinked: false,
        notes: 'Phiên mặc định của ScholarOS. Bạn có thể chỉnh sửa hoặc xóa phiên này.'
      };
    });
  }).flat();
}
