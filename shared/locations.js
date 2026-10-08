// Where Penguin searches. `locations` is a list; older settings only have `location`.
export function searchLocations(config = {}) {
  const list = Array.isArray(config.locations) && config.locations.length
    ? config.locations
    : (config.location ? [config.location] : []);
  return [...new Set(list.map(l => String(l || '').trim()).filter(Boolean))];
}

// Short display name: "Hyderabad, Telangana (Hybrid)" -> "Hyderabad"
export const placeName = (location = '') => String(location).split(/[,(/|]/)[0].trim() || String(location).trim();
