const tzOffset = new Date().getTimezoneOffset();
console.log("TZ offset:", tzOffset);

const dateStr = '2026-02-25';
const d = new Date(dateStr);
console.log("Local getDate():", d.getDate());
console.log("UTC getUTCDate():", d.getUTCDate());

// The API returns '2026-02-25T00:00:00.000Z' 
const apiDateStr = '2026-02-25T00:00:00.000Z';
const d2 = new Date(apiDateStr);
console.log("Local getDate() from API format:", d2.getDate());
console.log("UTC getUTCDate() from API format:", d2.getUTCDate());
