import { supabase } from '../supabaseClient';

export const DEFAULT_SPONSORS = [
  {
    id: 'sp-1',
    name: 'Google for Developers',
    tier: 'TITLE SPONSOR',
    logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=400&auto=format&fit=crop&q=80',
    website: 'https://developers.google.com'
  },
  {
    id: 'sp-2',
    name: 'Kerala Startup Mission',
    tier: 'INNOVATION PARTNER',
    logo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&auto=format&fit=crop&q=80',
    website: 'https://startupmission.kerala.gov.in'
  },
  {
    id: 'sp-3',
    name: 'Red Bull',
    tier: 'ENERGY PARTNER',
    logo: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&auto=format&fit=crop&q=80',
    website: 'https://www.redbull.com'
  },
  {
    id: 'sp-4',
    name: 'GitHub Education',
    tier: 'TECH PARTNER',
    logo: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=400&auto=format&fit=crop&q=80',
    website: 'https://education.github.com'
  },
  {
    id: 'sp-5',
    name: 'Intel OneAPI',
    tier: 'PLATINUM PARTNER',
    logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80',
    website: 'https://intel.com'
  },
  {
    id: 'sp-6',
    name: 'IEDC Thrissur',
    tier: 'ECOSYSTEM PARTNER',
    logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80',
    website: 'https://stthomas.ac.in'
  }
];

const LOCAL_STORAGE_KEY = 'srishti27_sponsors_list';

export async function fetchSponsors() {
  try {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (_) {}

  // Fallback to localStorage or default sponsors
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}

  return DEFAULT_SPONSORS;
}

export async function saveSponsorsToStore(sponsorsList) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sponsorsList));
  } catch (_) {}

  try {
    // Attempt upserting to Supabase if table exists
    for (const sp of sponsorsList) {
      await supabase.from('sponsors').upsert({
        id: sp.id,
        name: sp.name,
        tier: sp.tier || 'PARTNER',
        logo: sp.logo,
        website: sp.website || '',
        updated_at: new Date().toISOString()
      });
    }
  } catch (_) {}
}

export async function addSponsorToStore(newSponsor) {
  const current = await fetchSponsors();
  const sponsorWithId = {
    ...newSponsor,
    id: newSponsor.id || `sp-${Date.now()}`
  };
  const updated = [...current, sponsorWithId];
  await saveSponsorsToStore(updated);
  return updated;
}

export async function deleteSponsorFromStore(sponsorId) {
  const current = await fetchSponsors();
  const updated = current.filter(s => s.id !== sponsorId);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}

  try {
    await supabase.from('sponsors').delete().eq('id', sponsorId);
  } catch (_) {}

  return updated;
}
