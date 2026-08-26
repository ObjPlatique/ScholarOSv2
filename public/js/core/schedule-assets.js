const pad = value => String(value).padStart(2, '0');

export function createDefaultScheduleAsset() {
  const date = new Date();
  const localDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return Array.from({ length: 16 }, (_, index) => {
    const hour = index + 6;
    return {
      id: `asset-default-${hour}`,
      title: `Phiên ${pad(hour)}:00 – ${pad(hour + 1)}:00`,
      date: localDate,
      start: `${pad(hour)}:00`,
      duration: 60,
      type: 'study',
      recurrence: 'once',
      color: '#2563eb',
      focusLinked: false,
      notes: 'Phiên mặc định của ScholarOS. Bạn có thể chỉnh sửa hoặc xóa phiên này.'
    };
  });
}
