// Legacy Drive repair is intentionally disabled.
// Drive now has one source of truth: drive_files via drive-data.js.
export function repairLegacyDrive() { return Promise.resolve(null); }
