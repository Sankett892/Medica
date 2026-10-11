import { Facility, IFacility } from '../models/Facility.js';

export const PUNE_TALUKA_FACILITIES: Array<Partial<IFacility>> = [
  // 1. Junnar
  {
    facilityId: 'FAC-PUN-JUN-01',
    name: 'Junnar Sub-District Hospital (SDH Junnar)',
    type: 'Sub-District Hospital',
    region: 'Junnar',
    locality: 'Junnar Town',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Old Bus Stand, Junnar, Pune District - 410502',
    coordinates: { lat: 19.2084, lng: 73.8762 },
    bedCapacity: 100,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-JUN-02',
    name: 'Narayangaon Rural Hospital',
    type: 'Rural Hospital',
    region: 'Junnar',
    locality: 'Narayangaon',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Pune-Nashik Highway, Narayangaon, Junnar - 410504',
    coordinates: { lat: 19.1235, lng: 73.9786 },
    bedCapacity: 50,
    verificationStatus: 'Verified'
  },

  // 2. Ambegaon
  {
    facilityId: 'FAC-PUN-AMB-01',
    name: 'Manchar Sub-District Hospital',
    type: 'Sub-District Hospital',
    region: 'Ambegaon',
    locality: 'Manchar',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Manchar-Bhimashankar Road, Manchar, Ambegaon - 410503',
    coordinates: { lat: 19.0069, lng: 73.9431 },
    bedCapacity: 100,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-AMB-02',
    name: 'Ghodegaon Rural Hospital',
    type: 'Rural Hospital',
    region: 'Ambegaon',
    locality: 'Ghodegaon',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Tehsil Office, Ghodegaon, Ambegaon - 412408',
    coordinates: { lat: 19.0436, lng: 73.8344 },
    bedCapacity: 30,
    verificationStatus: 'Verified'
  },

  // 3. Khed (Rajgurunagar)
  {
    facilityId: 'FAC-PUN-KHD-01',
    name: 'Chandoli Rural Hospital (Rajgurunagar)',
    type: 'Rural Hospital',
    region: 'Khed',
    locality: 'Rajgurunagar (Khed)',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Wada Road, Rajgurunagar (Khed), Pune - 410505',
    coordinates: { lat: 18.8587, lng: 73.9056 },
    bedCapacity: 60,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-KHD-02',
    name: 'Chakan Rural Hospital',
    type: 'Rural Hospital',
    region: 'Khed',
    locality: 'Chakan',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Talegaon-Chakan Road, Chakan MIDC, Khed - 410501',
    coordinates: { lat: 18.7618, lng: 73.8589 },
    bedCapacity: 50,
    verificationStatus: 'Verified'
  },

  // 4. Maval
  {
    facilityId: 'FAC-PUN-MAV-01',
    name: 'Talegaon General Hospital (MIMER)',
    type: 'General Hospital',
    region: 'Maval',
    locality: 'Talegaon Dabhade',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Talegaon Station Road, Talegaon Dabhade, Maval - 410507',
    coordinates: { lat: 18.7346, lng: 73.6848 },
    bedCapacity: 700,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-MAV-02',
    name: 'Lonavala Municipal Rural Hospital',
    type: 'Sub-District Hospital',
    region: 'Maval',
    locality: 'Lonavala',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Railway Station, Lonavala, Maval - 410401',
    coordinates: { lat: 18.7557, lng: 73.4091 },
    bedCapacity: 50,
    verificationStatus: 'Verified'
  },

  // 5. Mulshi
  {
    facilityId: 'FAC-PUN-MUL-01',
    name: 'Paud Rural Hospital',
    type: 'Rural Hospital',
    region: 'Mulshi',
    locality: 'Paud',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Paud-Mulshi Road, Paud, Mulshi - 412108',
    coordinates: { lat: 18.5283, lng: 73.6167 },
    bedCapacity: 30,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-MUL-02',
    name: 'Hinjawadi LifePoint Multispecialty Facility',
    type: 'Multispecialty Hospital',
    region: 'Mulshi',
    locality: 'Hinjawadi',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Phase 1, Hinjawadi Rajiv Gandhi Infotech Park, Mulshi - 411057',
    coordinates: { lat: 18.5913, lng: 73.7389 },
    bedCapacity: 120,
    verificationStatus: 'Verified'
  },

  // 6. Pune (Pune City)
  {
    facilityId: 'FAC-PUN-CTY-01',
    name: 'Sassoon General Hospital & B.J. Medical College',
    type: 'District Hospital',
    region: 'Pune',
    locality: 'Shivajinagar / Pune Station',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Pune Railway Station, Jai Prakash Narayan Road, Pune - 411001',
    coordinates: { lat: 18.5255, lng: 73.8738 },
    bedCapacity: 1296,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-CTY-02',
    name: 'Deenanath Mangeshkar Hospital & Research Center',
    type: 'Multispecialty Hospital',
    region: 'Pune',
    locality: 'Kothrud / Erandwane',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Mhatre Bridge, Erandwane, Pune - 411004',
    coordinates: { lat: 18.5029, lng: 73.8329 },
    bedCapacity: 800,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-CTY-03',
    name: 'KEM Hospital Pune',
    type: 'Multispecialty Hospital',
    region: 'Pune',
    locality: 'Rasta Peth',
    city: 'Pune',
    state: 'Maharashtra',
    address: '489, Sardar Moodliar Road, Rasta Peth, Pune - 411011',
    coordinates: { lat: 18.5186, lng: 73.8681 },
    bedCapacity: 550,
    verificationStatus: 'Verified'
  },

  // 7. Haveli
  {
    facilityId: 'FAC-PUN-HAV-01',
    name: 'YCM Hospital (Yashwantrao Chavan Memorial)',
    type: 'General Hospital',
    region: 'Haveli',
    locality: 'Pimpri',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Sant Tukaram Nagar, Pimpri, Haveli - 411018',
    coordinates: { lat: 18.6277, lng: 73.8183 },
    bedCapacity: 750,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-HAV-02',
    name: 'Noble Hospital & Research Centre',
    type: 'Multispecialty Hospital',
    region: 'Haveli',
    locality: 'Hadapsar',
    city: 'Pune',
    state: 'Maharashtra',
    address: '153, Magarpatta City Road, Hadapsar, Haveli - 411028',
    coordinates: { lat: 18.5089, lng: 73.9260 },
    bedCapacity: 350,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-HAV-03',
    name: 'Wagholi Rural Health Centre',
    type: 'Community Health Centre',
    region: 'Haveli',
    locality: 'Wagholi',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Pune-Nagar Highway, Wagholi, Haveli - 412207',
    coordinates: { lat: 18.5793, lng: 73.9818 },
    bedCapacity: 40,
    verificationStatus: 'Verified'
  },

  // 8. Shirur
  {
    facilityId: 'FAC-PUN-SHI-01',
    name: 'Shirur Sub-District Hospital',
    type: 'Sub-District Hospital',
    region: 'Shirur',
    locality: 'Shirur',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Ghodnadi, Pune-Ahmednagar Road, Shirur - 412210',
    coordinates: { lat: 18.8267, lng: 74.3789 },
    bedCapacity: 100,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-SHI-02',
    name: 'Shikrapur Rural Hospital',
    type: 'Rural Hospital',
    region: 'Shirur',
    locality: 'Shikrapur',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Chakan-Shikrapur Road, Shikrapur, Shirur - 412208',
    coordinates: { lat: 18.6942, lng: 74.1283 },
    bedCapacity: 30,
    verificationStatus: 'Verified'
  },

  // 9. Velhe
  {
    facilityId: 'FAC-PUN-VEL-01',
    name: 'Velhe Rural Hospital & Community Health Centre',
    type: 'Rural Hospital',
    region: 'Velhe',
    locality: 'Velhe',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Torna Fort Road, Velhe, Pune District - 412212',
    coordinates: { lat: 18.2974, lng: 73.6339 },
    bedCapacity: 30,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-VEL-02',
    name: 'Panshet Primary Health Centre',
    type: 'Primary Health Centre',
    region: 'Velhe',
    locality: 'Panshet',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Panshet Dam Area, Velhe Taluka - 412107',
    coordinates: { lat: 18.3756, lng: 73.6067 },
    bedCapacity: 15,
    verificationStatus: 'Verified'
  },

  // 10. Bhor
  {
    facilityId: 'FAC-PUN-BHO-01',
    name: 'Bhor Sub-District Hospital',
    type: 'Sub-District Hospital',
    region: 'Bhor',
    locality: 'Bhor',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Mahad-Pandharpur Road, Bhor Town, Pune - 412206',
    coordinates: { lat: 18.1506, lng: 73.8444 },
    bedCapacity: 60,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-BHO-02',
    name: 'Nasrapur Community Health Centre',
    type: 'Community Health Centre',
    region: 'Bhor',
    locality: 'Nasrapur',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Pune-Bangalore Highway, Nasrapur, Bhor - 412213',
    coordinates: { lat: 18.2528, lng: 73.9167 },
    bedCapacity: 30,
    verificationStatus: 'Verified'
  },

  // 11. Purandar (Saswad)
  {
    facilityId: 'FAC-PUN-PUR-01',
    name: 'Saswad Sub-District Hospital',
    type: 'Sub-District Hospital',
    region: 'Purandar',
    locality: 'Saswad',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Hadapsar-Saswad Road, Saswad, Purandar - 412301',
    coordinates: { lat: 18.3436, lng: 74.0308 },
    bedCapacity: 100,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-PUR-02',
    name: 'Jejuri Rural Hospital',
    type: 'Rural Hospital',
    region: 'Purandar',
    locality: 'Jejuri',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Khandoba Temple Bypass, Jejuri, Purandar - 412303',
    coordinates: { lat: 18.2778, lng: 74.1594 },
    bedCapacity: 50,
    verificationStatus: 'Verified'
  },

  // 12. Daund
  {
    facilityId: 'FAC-PUN-DAU-01',
    name: 'Daund Sub-District Hospital',
    type: 'Sub-District Hospital',
    region: 'Daund',
    locality: 'Daund',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Railway Junction, Daund, Pune District - 413801',
    coordinates: { lat: 18.4631, lng: 74.5806 },
    bedCapacity: 100,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-DAU-02',
    name: 'Patas Rural Hospital',
    type: 'Rural Hospital',
    region: 'Daund',
    locality: 'Patas',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Pune-Solapur Highway, Patas, Daund - 412219',
    coordinates: { lat: 18.4414, lng: 74.4219 },
    bedCapacity: 30,
    verificationStatus: 'Verified'
  },

  // 13. Baramati
  {
    facilityId: 'FAC-PUN-BAR-01',
    name: 'Silver Jubilee Sub-District Hospital (GMC Baramati)',
    type: 'District Hospital',
    region: 'Baramati',
    locality: 'Baramati',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Near Bhigwan Chowk, Baramati, Pune District - 413102',
    coordinates: { lat: 18.1517, lng: 74.5772 },
    bedCapacity: 500,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-BAR-02',
    name: 'Giriraj Multispecialty Hospital',
    type: 'Multispecialty Hospital',
    region: 'Baramati',
    locality: 'Baramati MIDC',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'MIDC Road, Baramati, Pune District - 413133',
    coordinates: { lat: 18.1692, lng: 74.6011 },
    bedCapacity: 150,
    verificationStatus: 'Verified'
  },

  // 14. Indapur
  {
    facilityId: 'FAC-PUN-IND-01',
    name: 'Indapur Sub-District Hospital',
    type: 'Sub-District Hospital',
    region: 'Indapur',
    locality: 'Indapur',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Pune-Solapur National Highway 65, Indapur - 413106',
    coordinates: { lat: 18.1158, lng: 75.0272 },
    bedCapacity: 100,
    verificationStatus: 'Verified'
  },
  {
    facilityId: 'FAC-PUN-IND-02',
    name: 'Walchandnagar Memorial Hospital',
    type: 'General Hospital',
    region: 'Indapur',
    locality: 'Walchandnagar',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Walchandnagar Township, Indapur Taluka - 413114',
    coordinates: { lat: 18.0086, lng: 74.8789 },
    bedCapacity: 100,
    verificationStatus: 'Verified'
  }
];

export async function seedFacilities(): Promise<void> {
  try {
    for (const fac of PUNE_TALUKA_FACILITIES) {
      await Facility.findOneAndUpdate(
        { facilityId: fac.facilityId },
        { $set: fac },
        { upsert: true, new: true }
      );
    }
    console.log('[Seed] Seeded/updated ' + PUNE_TALUKA_FACILITIES.length + ' verified facilities across all 14 Pune talukas.');
  } catch (error) {
    console.error('[Seed] Error seeding Pune facilities:', error);
  }
}
