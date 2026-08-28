// Legacy Drive sync intentionally disabled.
// Drive is now loaded exclusively through drive-data.js and the academic route.
// Keeping this module as a no-op preserves the existing script import without
// allowing a second polling loop to overwrite state.materials.
export function syncLegacyDrive() { return Promise.resolve(null); }
