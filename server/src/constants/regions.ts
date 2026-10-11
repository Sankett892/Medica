export const PUNE_TALUKAS = [
  'Junnar',
  'Ambegaon',
  'Khed',
  'Maval',
  'Mulshi',
  'Pune',
  'Haveli',
  'Shirur',
  'Velhe',
  'Bhor',
  'Purandar',
  'Daund',
  'Baramati',
  'Indapur'
] as const;

export type PuneTaluka = (typeof PUNE_TALUKAS)[number];

export interface TalukaGeoInfo {
  name: PuneTaluka;
  lat: number;
  lng: number;
  radiusKm: number;
  bounds: [[number, number], [number, number]];
  description: string;
  headquarters: string;
}

export const PUNE_TALUKA_GEO: Record<PuneTaluka, TalukaGeoInfo> = {
  Junnar: {
    name: 'Junnar',
    lat: 19.2084,
    lng: 73.8762,
    radiusKm: 28,
    bounds: [[19.05, 73.68], [19.35, 74.05]],
    description: 'Northern agro-industrial & Shivneri historical belt',
    headquarters: 'Junnar Town'
  },
  Ambegaon: {
    name: 'Ambegaon',
    lat: 19.0069,
    lng: 73.9431,
    radiusKm: 22,
    bounds: [[18.88, 73.72], [19.15, 74.08]],
    description: 'Western Ghats foothills, Manchar & Ghodegaon agricultural sector',
    headquarters: 'Manchar / Ghodegaon'
  },
  Khed: {
    name: 'Khed',
    lat: 18.8587,
    lng: 73.9056,
    radiusKm: 24,
    bounds: [[18.72, 73.75], [19.02, 74.05]],
    description: 'Rajgurunagar & Chakan auto manufacturing industrial corridor',
    headquarters: 'Rajgurunagar (Khed)'
  },
  Maval: {
    name: 'Maval',
    lat: 18.7346,
    lng: 73.6848,
    radiusKm: 26,
    bounds: [[18.60, 73.35], [18.88, 73.78]],
    description: 'Talegaon Dabhade & Lonavala hill station corridor',
    headquarters: 'Vadgaon / Talegaon'
  },
  Mulshi: {
    name: 'Mulshi',
    lat: 18.5283,
    lng: 73.6167,
    radiusKm: 25,
    bounds: [[18.38, 73.40], [18.66, 73.75]],
    description: 'Hinjawadi IT Hub & Paud catchment ecological sector',
    headquarters: 'Paud'
  },
  Pune: {
    name: 'Pune',
    lat: 18.5204,
    lng: 73.8567,
    radiusKm: 12,
    bounds: [[18.46, 73.78], [18.58, 73.92]],
    description: 'Pune Municipal Corporation central urban core & tertiary medical complexes',
    headquarters: 'Pune City'
  },
  Haveli: {
    name: 'Haveli',
    lat: 18.5089,
    lng: 73.9260,
    radiusKm: 22,
    bounds: [[18.38, 73.76], [18.65, 74.08]],
    description: 'Pimpri-Chinchwad, Hadapsar, Kharadi & Wagholi metro perimeter',
    headquarters: 'Hadapsar / Pimpri'
  },
  Shirur: {
    name: 'Shirur',
    lat: 18.8267,
    lng: 74.3789,
    radiusKm: 30,
    bounds: [[18.65, 74.12], [18.98, 74.55]],
    description: 'Ranjangaon MIDC & Shikrapur eastern manufacturing belt',
    headquarters: 'Shirur (Ghodnadi)'
  },
  Velhe: {
    name: 'Velhe',
    lat: 18.2974,
    lng: 73.6339,
    radiusKm: 20,
    bounds: [[18.15, 73.50], [18.42, 73.78]],
    description: 'Torna & Panshet basin, high rainfall rural tribal sector',
    headquarters: 'Velhe'
  },
  Bhor: {
    name: 'Bhor',
    lat: 18.1506,
    lng: 73.8444,
    radiusKm: 24,
    bounds: [[18.02, 73.65], [18.28, 74.02]],
    description: 'Southern mountain passes, Bhatghar reservoir & Bhor valley',
    headquarters: 'Bhor'
  },
  Purandar: {
    name: 'Purandar',
    lat: 18.3436,
    lng: 74.0308,
    radiusKm: 24,
    bounds: [[18.20, 73.88], [18.48, 74.22]],
    description: 'Saswad, Jejuri pilgrimage & Purandar agro-horticulture belt',
    headquarters: 'Saswad'
  },
  Daund: {
    name: 'Daund',
    lat: 18.4631,
    lng: 74.5806,
    radiusKm: 28,
    bounds: [[18.30, 74.35], [18.62, 74.82]],
    description: 'Bhima river basin, Daund railway junction & Kurkumbh MIDC',
    headquarters: 'Daund'
  },
  Baramati: {
    name: 'Baramati',
    lat: 18.1517,
    lng: 74.5772,
    radiusKm: 26,
    bounds: [[18.02, 74.38], [18.30, 74.80]],
    description: 'Southeastern agricultural cooperative & agro-technology hub',
    headquarters: 'Baramati'
  },
  Indapur: {
    name: 'Indapur',
    lat: 18.1158,
    lng: 75.0272,
    radiusKm: 28,
    bounds: [[17.95, 74.75], [18.25, 75.25]],
    description: 'Eastern district border, Ujani reservoir & Walchandnagar industrial belt',
    headquarters: 'Indapur'
  }
};

export function resolvePuneTaluka(locality?: string, explicitRegion?: string): PuneTaluka {
  if (explicitRegion) {
    const trimmed = explicitRegion.trim().toLowerCase();
    const match = PUNE_TALUKAS.find(t => t.toLowerCase() === trimmed);
    if (match) return match;
  }

  if (!locality) return 'Pune';
  const loc = locality.trim().toLowerCase();

  if (loc.includes('junnar') || loc.includes('narayangaon') || loc.includes('otul') || loc.includes('alephata')) return 'Junnar';
  if (loc.includes('ambegaon') || loc.includes('manchar') || loc.includes('ghodegaon') || loc.includes('bhimashankar')) return 'Ambegaon';
  if (loc.includes('khed') || loc.includes('rajgurunagar') || loc.includes('chakan') || loc.includes('alandi')) return 'Khed';
  if (loc.includes('maval') || loc.includes('talegaon') || loc.includes('lonavala') || loc.includes('kamshet') || loc.includes('vadgaon')) return 'Maval';
  if (loc.includes('mulshi') || loc.includes('hinjawadi') || loc.includes('paud') || loc.includes('pirangut') || loc.includes('lavasa')) return 'Mulshi';
  if (loc.includes('pune') || loc.includes('shivajinagar') || loc.includes('kothrud') || loc.includes('erandwane') || loc.includes('aundh') || loc.includes('yerawada') || loc.includes('viman') || loc.includes('deccan') || loc.includes('swargate') || loc.includes('rasta peth')) return 'Pune';
  if (loc.includes('haveli') || loc.includes('hadapsar') || loc.includes('kharadi') || loc.includes('baner') || loc.includes('bavdhan') || loc.includes('kondhwa') || loc.includes('bibwewadi') || loc.includes('katraj') || loc.includes('wagholi') || loc.includes('pimpri') || loc.includes('chinchwad') || loc.includes('bhosari') || loc.includes('nigdi')) return 'Haveli';
  if (loc.includes('shirur') || loc.includes('shikrapur') || loc.includes('ranjangaon')) return 'Shirur';
  if (loc.includes('velhe') || loc.includes('panshet') || loc.includes('torna')) return 'Velhe';
  if (loc.includes('bhor') || loc.includes('nasrapur') || loc.includes('kikvi')) return 'Bhor';
  if (loc.includes('purandar') || loc.includes('saswad') || loc.includes('jejuri')) return 'Purandar';
  if (loc.includes('daund') || loc.includes('patas') || loc.includes('kurkumbh') || loc.includes('kedgaon')) return 'Daund';
  if (loc.includes('baramati') || loc.includes('malegaon') || loc.includes('someshwar')) return 'Baramati';
  if (loc.includes('indapur') || loc.includes('walchandnagar') || loc.includes('bavada')) return 'Indapur';

  return 'Pune';
}
