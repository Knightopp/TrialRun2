/**
 * SRISHTI 2.7 — High-Precision Activity & Location Audit Logger
 * Captures:
 * 1. Physical GPS Coordinates (Browser Geolocation API with high accuracy & zero-cache)
 * 2. Network GeoIP Intelligence (Public IP, City, Region, Country, Postal/PIN, ISP, ASN, Timezone)
 * 3. Deep Hardware & Browser Environmental Fingerprints
 * 4. Multi-Layer Persistence:
 *    - Supabase public.audit_logs table (if exists)
 *    - Supabase public.registrations payment_reference telemetry embedding (guaranteed persistent cloud sync across all devices)
 *    - Local audit cache (localStorage)
 *    - Serverless endpoint (/api/track)
 */
import { supabase } from '../supabaseClient';

const LOCAL_STORAGE_KEY = 'srishti_audit_logs';
const MAX_LOCAL_LOGS = 300;

// Cache IP geo lookup in memory for 15 minutes to avoid redundant network queries
let _cachedGeoIp = null;
let _cachedGeoIpTime = 0;

/**
 * Gather rich client-side environment and hardware fingerprints
 */
export function getDeviceDetails() {
  if (typeof window === 'undefined') return {};

  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  // WebGL GPU Renderer Detection
  let gpuRenderer = 'N/A';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'N/A';
      }
    }
  } catch (_) {}

  return {
    os,
    browser,
    platform: navigator.platform || 'N/A',
    language: navigator.language || 'en',
    languages: (navigator.languages || []).slice(0, 3).join(', '),
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen?.colorDepth ? `${window.screen.colorDepth}-bit` : '24-bit',
    cpuCores: navigator.hardwareConcurrency || 'N/A',
    deviceMemoryGb: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'N/A',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    gpu: gpuRenderer,
    connectionType: connection ? (connection.effectiveType || connection.type || 'unknown') : 'unknown',
    downlinkMbps: connection?.downlink ? `${connection.downlink} Mbps` : 'N/A',
    rttMs: connection?.rtt ? `${connection.rtt} ms` : 'N/A',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    isMobile: /Mobi|Android/i.test(ua)
  };
}

/**
 * Tries to fetch high-precision physical GPS coordinates from browser Geolocation API
 * Uses maximumAge: 0 to force an immediate fresh satellite/WiFi fix.
 */
export async function getBrowserLocation(timeoutMs = 7000) {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    let completed = false;
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        resolve(null);
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          const c = pos.coords;
          resolve({
            latitude: Number(c.latitude.toFixed(7)),
            longitude: Number(c.longitude.toFixed(7)),
            accuracy: Math.round(c.accuracy), // accuracy in meters
            altitude: c.altitude ? Math.round(c.altitude) : null,
            altitudeAccuracy: c.altitudeAccuracy ? Math.round(c.altitudeAccuracy) : null,
            heading: c.heading || null,
            speed: c.speed || null,
            timestamp: pos.timestamp
          });
        }
      },
      () => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve(null);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0 // Force fresh physical reading
      }
    );
  });
}

/**
 * Fetches accurate public IP and Network Geolocation data
 * Uses ipwho.is with fallback to api.ipify.org
 */
export async function getNetworkGeoIp(timeoutMs = 4000) {
  const now = Date.now();
  if (_cachedGeoIp && (now - _cachedGeoIpTime) < 15 * 60 * 1000) {
    return _cachedGeoIp;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch('https://ipwho.is/', {
      signal: controller?.signal,
      headers: { 'Accept': 'application/json' }
    });
    if (timer) clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const result = {
          ip: data.ip || 'Unknown IP',
          city: data.city || 'Unknown City',
          region: data.region || 'Unknown Region',
          country: data.country || 'Unknown Country',
          postal: data.postal || '',
          latitude: typeof data.latitude === 'number' ? Number(data.latitude.toFixed(6)) : null,
          longitude: typeof data.longitude === 'number' ? Number(data.longitude.toFixed(6)) : null,
          isp: data.connection?.isp || data.connection?.org || 'N/A',
          org: data.connection?.org || 'N/A',
          asn: data.connection?.asn ? `AS${data.connection.asn}` : '',
          timezone: data.timezone?.id || 'UTC'
        };
        _cachedGeoIp = result;
        _cachedGeoIpTime = now;
        return result;
      }
    }
  } catch (err) {
    // Fallback: try public IP detection via ipify
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { timeout: 2000 });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const fallback = {
          ip: ipData.ip || 'Unknown IP',
          city: 'Unknown City',
          region: '',
          country: '',
          postal: '',
          latitude: null,
          longitude: null,
          isp: 'Direct Internet Connection',
          org: '',
          asn: '',
          timezone: 'UTC'
        };
        return fallback;
      }
    } catch (_) {}
  }

  return {
    ip: 'Unknown IP',
    city: 'Unknown City',
    region: '',
    country: '',
    postal: '',
    latitude: null,
    longitude: null,
    isp: 'Direct Network',
    org: '',
    asn: '',
    timezone: 'UTC'
  };
}

/**
 * Main activity & location logger: logs user action, determines highest accuracy coordinates,
 * and persists to Supabase, serverless, and local audit vaults.
 */
export async function logActivity(action, options = {}) {
  const {
    email = '',
    participant_code = '',
    name = '',
    status = 'SUCCESS',
    metadata = {},
    requestGps = true
  } = options;

  const device = getDeviceDetails();

  // Run physical GPS and Network GeoIP in parallel for maximum speed and accuracy
  const [gpsLocation, netGeo] = await Promise.all([
    requestGps ? getBrowserLocation(4500) : Promise.resolve(null),
    getNetworkGeoIp(3500)
  ]);

  // Determine highest accuracy coordinates
  let finalLat = null;
  let finalLon = null;
  let accuracyMeters = null;
  let locationSource = 'network_ip_geoip';

  if (gpsLocation?.latitude && gpsLocation?.longitude) {
    finalLat = gpsLocation.latitude;
    finalLon = gpsLocation.longitude;
    accuracyMeters = gpsLocation.accuracy;
    locationSource = 'high_precision_gps';
  } else if (netGeo?.latitude && netGeo?.longitude) {
    finalLat = netGeo.latitude;
    finalLon = netGeo.longitude;
    accuracyMeters = 5000; // Standard IP geolocation precision (~city level)
    locationSource = 'network_ip_geoip';
  }

  const mapsUrl = (finalLat !== null && finalLon !== null) 
    ? `https://www.google.com/maps?q=${finalLat},${finalLon}&z=17` 
    : '';

  const timestamp = new Date().toISOString();
  const cleanEmail = email ? email.trim().toLowerCase() : 'anonymous';

  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp,
    action,
    status,
    user_email: cleanEmail,
    participant_code: participant_code || 'N/A',
    participant_name: name || 'Attendee',
    client_ip: netGeo.ip || 'Unknown IP',
    city: netGeo.city || 'Unknown City',
    region: netGeo.region || '',
    country: netGeo.country || '',
    postal: netGeo.postal || '',
    isp: netGeo.isp || 'N/A',
    org: netGeo.org || '',
    asn: netGeo.asn || '',
    latitude: finalLat,
    longitude: finalLon,
    accuracy_meters: accuracyMeters,
    location_source: locationSource,
    maps_url: mapsUrl,
    device,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    metadata: {
      ...metadata,
      gps_altitude: gpsLocation?.altitude ?? null,
      gps_heading: gpsLocation?.heading ?? null,
      gps_speed: gpsLocation?.speed ?? null,
      gps_fixed: !!gpsLocation
    }
  };

  // 1. Try forwarding to /api/track (Vercel serverless)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ...logEntry, gps_location: gpsLocation })
      }).catch(() => {});
    }
  } catch (_) {}

  // Persist locally for this device; durable writes are server-only.
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift(logEntry);
    if (logs.length > MAX_LOCAL_LOGS) logs.length = MAX_LOCAL_LOGS;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  } catch (_) {}

  return logEntry;
}

/**
 * Format a compact string representation of the location for embedding into database text fields
 */
export function formatLocationTelemetryPayload(log) {
  if (!log) return '';
  const compact = {
    ip: log.client_ip,
    city: log.city,
    region: log.region,
    country: log.country,
    postal: log.postal,
    lat: log.latitude,
    lon: log.longitude,
    acc: log.accuracy_meters,
    src: log.location_source,
    isp: log.isp,
    os: log.device?.os,
    br: log.device?.browser,
    t: log.timestamp
  };
  return `GEO:${JSON.stringify(compact)}`;
}

/**
 * Parses embedded location telemetry from database fields (like payment_reference)
 */
export function parseLocationTelemetryPayload(str) {
  if (!str || typeof str !== 'string' || !str.includes('GEO:')) return null;
  try {
    const idx = str.indexOf('GEO:');
    const jsonStr = str.substring(idx + 4).trim();
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

/**
 * Comprehensive Audit Logs Retriever
 * Queries:
 * 1. Supabase public.audit_logs table (if available)
 * 2. Supabase public.registrations table (extracts telemetry from payment_reference and participant/event details)
 * 3. Local audit vault (localStorage)
 * Merges, deduplicates, and sorts newest first.
 */
export async function getAuditLogs() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Administrator sign-in is required to view audit logs.');
  const { data: profile, error: profileError } = await supabase
    .from('volunteers')
    .select('role, status')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (profileError || profile?.role !== 'admin' || profile?.status !== 'active') {
    throw new Error('Administrator access is required to view audit logs.');
  }

  const combined = [];
  const seenKeys = new Set();

  // 1. Fetch from Supabase audit_logs table
  try {
    const { data: dbLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (dbLogs && dbLogs.length > 0) {
      dbLogs.forEach(l => {
        const item = {
          ...l,
          timestamp: l.created_at || l.timestamp,
          device: l.device_info || l.device || {}
        };
        const key = `db_${item.id || item.timestamp}_${item.user_email}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push(item);
        }
      });
    }
  } catch (_) {}

  // 2. Fetch from Supabase registrations table (Guaranteed persistent multi-device cloud records!)
  try {
    const { data: regRows } = await supabase
      .from('registrations')
      .select('*, participants(*), events(*)')
      .order('registered_at', { ascending: false })
      .limit(200);

    if (regRows && regRows.length > 0) {
      regRows.forEach(r => {
        const p = r.participants || {};
        const ev = r.events || {};
        const parsedGeo = parseLocationTelemetryPayload(r.payment_reference);

        const lat = parsedGeo?.lat ?? null;
        const lon = parsedGeo?.lon ?? null;
        const mapsUrl = (lat !== null && lon !== null) 
          ? `https://www.google.com/maps?q=${lat},${lon}&z=17` 
          : '';

        const item = {
          id: `reg_${r.id}`,
          timestamp: r.registered_at || r.created_at || new Date().toISOString(),
          action: 'EVENT_REGISTRATION',
          status: 'SUCCESS',
          user_email: (p.email || 'N/A').toLowerCase(),
          participant_code: p.participant_code || 'N/A',
          participant_name: p.name || 'Attendee',
          client_ip: parsedGeo?.ip || 'Direct Cloud Record',
          city: parsedGeo?.city || 'Location Recorded',
          region: parsedGeo?.region || '',
          country: parsedGeo?.country || '',
          postal: parsedGeo?.postal || '',
          isp: parsedGeo?.isp || 'Cloud Database Sync',
          latitude: lat,
          longitude: lon,
          accuracy_meters: parsedGeo?.acc ?? (lat ? 15 : null),
          location_source: parsedGeo?.src || (lat ? 'high_precision_gps' : 'cloud_registration'),
          maps_url: mapsUrl,
          device: {
            os: parsedGeo?.os || 'Cloud Client',
            browser: parsedGeo?.br || 'Web Browser',
            platform: 'Registered via Web'
          },
          user_agent: 'Srishti Registration Service',
          metadata: {
            event_id: r.event_id,
            event_code: ev.event_code || ev.name,
            event_name: ev.name || ev.label || 'Fest Event',
            college: p.college || 'N/A',
            phone: p.phone || 'N/A',
            department: p.department || 'N/A',
            payment_status: r.payment_status || 'verified',
            payment_method: r.payment_method || 'upi',
            registration_id: r.id
          }
        };

        const key = `reg_${r.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push(item);
        }
      });
    }
  } catch (regFetchErr) {
    console.warn('Registrations audit log sync notice:', regFetchErr);
  }

  // Merge this browser's cache only after confirming the signed-in admin above.
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const localLogs = JSON.parse(raw);
      localLogs.forEach(l => {
        const key = `local_${l.id || l.timestamp}_${l.action}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push(l);
        }
      });
    }
  } catch (_) {}

  // Sort strictly by timestamp descending (newest first)
  combined.sort((a, b) => {
    const tA = new Date(a.timestamp || 0).getTime();
    const tB = new Date(b.timestamp || 0).getTime();
    return tB - tA;
  });

  return combined;
}

/**
 * Clear local audit logs
 */
export async function clearAuditLogs() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Administrator sign-in is required to clear audit logs.');
  const { data: profile, error: profileError } = await supabase
    .from('volunteers')
    .select('role, status')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (profileError || profile?.role !== 'admin' || profile?.status !== 'active') {
    throw new Error('Administrator access is required to clear audit logs.');
  }
  const { error } = await supabase.from('audit_logs').delete().not('id', 'is', null);
  if (error) throw error;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

/**
 * Export logs as JSON file download
 */
export function exportLogsAsJson(logs) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `srishti_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
  dlAnchorElem.click();
}

/**
 * Export logs as CSV file download
 */
export function exportLogsAsCsv(logs) {
  if (!logs || logs.length === 0) return;

  const headers = [
    'Timestamp', 
    'Action', 
    'Status', 
    'Email', 
    'Participant Code', 
    'Attendee Name', 
    'IP Address', 
    'City', 
    'Region', 
    'Country', 
    'ISP', 
    'Latitude', 
    'Longitude', 
    'Accuracy (m)', 
    'Location Source', 
    'Google Maps URL', 
    'OS', 
    'Browser'
  ];

  const rows = logs.map(l => [
    `"${l.timestamp || ''}"`,
    `"${l.action || ''}"`,
    `"${l.status || ''}"`,
    `"${l.user_email || ''}"`,
    `"${l.participant_code || ''}"`,
    `"${(l.participant_name || '').replace(/"/g, '""')}"`,
    `"${l.client_ip || ''}"`,
    `"${l.city || ''}"`,
    `"${l.region || ''}"`,
    `"${l.country || ''}"`,
    `"${(l.isp || '').replace(/"/g, '""')}"`,
    `"${l.latitude ?? ''}"`,
    `"${l.longitude ?? ''}"`,
    `"${l.accuracy_meters ?? ''}"`,
    `"${l.location_source || ''}"`,
    `"${l.maps_url || ''}"`,
    `"${l.device?.os || ''}"`,
    `"${l.device?.browser || ''}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", encodeURI(csvContent));
  dlAnchorElem.setAttribute("download", `srishti_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  dlAnchorElem.click();
}
