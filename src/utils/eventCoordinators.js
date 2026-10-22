// Event Coordinators Store & Synchronizer
// Enables festival coordinators for each event to be editable in the Admin Panel
// and seamlessly consumed by event details menus, registration screens, and popups.

export const DEFAULT_EVENT_COORDINATORS = {
  'SRI27-TREASURE': [
    { name: 'Alex Johnson', phone: '+91 98765 43210' },
    { name: 'Sarah Williams', phone: '+91 98765 43211' }
  ],
  'SRI27-WALTZ': [
    { name: 'Rahul Menon', phone: '+91 98470 12345' },
    { name: 'Ananya Nair', phone: '+91 98470 12346' }
  ],
  'SRI27-QUIZ': [
    { name: 'Arjun Krishna', phone: '+91 97450 67890' },
    { name: 'Devika S', phone: '+91 97450 67891' }
  ],
  'SRI27-CODE': [
    { name: 'Siddharth V', phone: '+91 94470 54321' },
    { name: 'Meera Raj', phone: '+91 94470 54322' }
  ],
  'SRI27-TRACEBOT': [
    { name: 'Kevin George', phone: '+91 98950 33445' },
    { name: 'Sneha Paul', phone: '+91 98950 33446' }
  ],
  'SRI27-RELAY': [
    { name: 'Rohit Sharma', phone: '+91 99950 88776' },
    { name: 'Pooja K', phone: '+91 99950 88777' }
  ],
  'TEST-EV-02': [
    { name: 'Vishnu Prasad', phone: '+91 95670 11223' },
    { name: 'Riya Varghese', phone: '+91 95670 11224' }
  ],
  'TEST-EV-01': [
    { name: 'Amal Joy', phone: '+91 98460 99887' },
    { name: 'Fathima N', phone: '+91 98460 99888' }
  ],
  'SRI27-BOMB': [
    { name: 'Joel Thomas', phone: '+91 97440 44556' },
    { name: 'Diya B', phone: '+91 97440 44557' }
  ]
};

const STORAGE_KEY = 'srishti_event_coordinators';

export function normalizeEventKey(val) {
  if (!val) return '';
  return String(val).trim().toUpperCase();
}

export function getAllCoordinatorsMap() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_EVENT_COORDINATORS, ...parsed };
      }
    }
  } catch (err) {
    console.warn('Could not read coordinators from storage:', err);
  }
  return { ...DEFAULT_EVENT_COORDINATORS };
}

export function parseCoordinatorsList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(item => {
      if (typeof item === 'string') {
        const parts = item.split(':');
        return { name: parts[0]?.trim() || 'Coordinator', phone: parts[1]?.trim() || '' };
      }
      return {
        name: item?.name?.trim() || 'Coordinator',
        phone: item?.phone?.trim() || ''
      };
    }).filter(c => c.name || c.phone);
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parseCoordinatorsList(parsed);
    } catch (_) {}
    // Treat as comma/newline separated
    return input.split(/[\n,]+/).map(entry => {
      const parts = entry.split(':');
      if (parts.length >= 2) {
        return { name: parts[0].trim(), phone: parts.slice(1).join(':').trim() };
      }
      return { name: entry.trim(), phone: '' };
    }).filter(c => c.name);
  }
  return [];
}

export function getEventCoordinators(eventOrCode) {
  if (!eventOrCode) return [];

  // 1. Direct property on event object (from Supabase or active state)
  if (typeof eventOrCode === 'object') {
    if (eventOrCode.coordinators) {
      const parsed = parseCoordinatorsList(eventOrCode.coordinators);
      if (parsed.length > 0) return parsed;
    }
  }

  const code = normalizeEventKey(
    typeof eventOrCode === 'string'
      ? eventOrCode
      : (eventOrCode.event_code || eventOrCode.id || '')
  );

  const map = getAllCoordinatorsMap();

  // Try exact match
  if (map[code] && map[code].length > 0) {
    return parseCoordinatorsList(map[code]);
  }

  // Try matching without or with 'SRI27-'
  const altKey = code.startsWith('SRI27-') ? code.replace('SRI27-', '') : `SRI27-${code}`;
  if (map[altKey] && map[altKey].length > 0) {
    return parseCoordinatorsList(map[altKey]);
  }

  // Try matching by event label / name
  if (typeof eventOrCode === 'object' && (eventOrCode.name || eventOrCode.label)) {
    const nameKey = normalizeEventKey(eventOrCode.name || eventOrCode.label);
    for (const [k, list] of Object.entries(map)) {
      if (nameKey.includes(k) || k.includes(nameKey)) {
        return parseCoordinatorsList(list);
      }
    }
  }

  // Fallback defaults
  return [
    { name: 'Alex Johnson', phone: '+91 98765 43210' },
    { name: 'Sarah Williams', phone: '+91 98765 43211' }
  ];
}

export function saveEventCoordinators(eventCodeOrId, coordinatorsList) {
  const code = normalizeEventKey(eventCodeOrId);
  if (!code) return;

  const cleanList = parseCoordinatorsList(coordinatorsList);
  const currentMap = getAllCoordinatorsMap();
  currentMap[code] = cleanList;

  // Also set the alias key if SRI27- prefix
  if (code.startsWith('SRI27-')) {
    currentMap[code.replace('SRI27-', '')] = cleanList;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentMap));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('srishti_coordinators_updated', {
      detail: { eventCode: code, coordinators: cleanList }
    }));
  } catch (err) {
    console.error('Failed to save event coordinators to localStorage:', err);
  }

  return cleanList;
}
