import { supabase } from '../supabaseClient';

const COPPER_STORAGE_KEY = 'copper_prank_config';
const COPPER_EVENT_CODE = 'COPPER_SYS_CONFIG';

export const DEFAULT_COPPER_CONFIG = {
  enabled: true,
  audioUrl: '/song.mp3',
  volume: 0.85,
  loop: true,
  targets: [
    'anselrwilliams2106@gmail.com',
    'abhiramcs2007@gmail.com'
  ],
  updatedAt: new Date().toISOString()
};

/**
 * Read the current config from localStorage or defaults
 */
export function getLocalCopperConfig() {
  try {
    const raw = localStorage.getItem(COPPER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COPPER_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_COPPER_CONFIG,
      ...parsed,
      targets: Array.isArray(parsed.targets) && parsed.targets.length > 0
        ? parsed.targets.map(t => String(t).trim().toLowerCase())
        : DEFAULT_COPPER_CONFIG.targets
    };
  } catch {
    return { ...DEFAULT_COPPER_CONFIG };
  }
}

/**
 * Fetch latest config from Supabase cloud (with fallback to local)
 */
export async function syncCopperConfig() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, event_code, venue')
      .eq('event_code', COPPER_EVENT_CODE)
      .maybeSingle();

    if (!error && data?.venue) {
      try {
        const remoteParsed = JSON.parse(data.venue);
        const merged = {
          ...DEFAULT_COPPER_CONFIG,
          ...remoteParsed,
          targets: Array.isArray(remoteParsed.targets) && remoteParsed.targets.length > 0
            ? remoteParsed.targets.map(t => String(t).trim().toLowerCase())
            : DEFAULT_COPPER_CONFIG.targets
        };
        localStorage.setItem(COPPER_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('copper_config_changed', { detail: merged }));
        return merged;
      } catch (_) {}
    }
  } catch (err) {
    console.debug('[Copper] Cloud config sync skipped, using local fallback:', err);
  }

  return getLocalCopperConfig();
}

/**
 * Save updated config locally and sync to cloud if authorized
 */
export async function saveCopperConfig(updatedConfig) {
  const merged = {
    ...DEFAULT_COPPER_CONFIG,
    ...updatedConfig,
    targets: Array.isArray(updatedConfig.targets)
      ? updatedConfig.targets.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : DEFAULT_COPPER_CONFIG.targets,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(COPPER_STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('copper_config_changed', { detail: merged }));

  // Try pushing to Supabase
  try {
    const venueJson = JSON.stringify(merged);
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('event_code', COPPER_EVENT_CODE)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('events')
        .update({
          name: '[SYSTEM] Copper Protocol',
          category: 'SYSTEM',
          status: 'copper_hidden',
          venue: venueJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('events')
        .insert([{
          event_code: COPPER_EVENT_CODE,
          name: '[SYSTEM] Copper Protocol',
          category: 'SYSTEM',
          status: 'copper_hidden',
          venue: venueJson,
          registration_type: 'individual',
          registration_fee: 0,
          is_spot_registration_enabled: false
        }]);
    }
  } catch (err) {
    console.debug('[Copper] Remote config push caught:', err);
  }

  return merged;
}

/**
 * Check if a given email is a prank target and prank is currently active
 */
export function isCopperTarget(email, config = null) {
  if (!email) return false;
  const cfg = config || getLocalCopperConfig();
  if (!cfg.enabled) return false;

  const clean = String(email).trim().toLowerCase();
  const targetList = (cfg.targets || []).map(t => String(t).trim().toLowerCase());
  return targetList.includes(clean);
}
