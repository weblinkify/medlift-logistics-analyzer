import type { Facility, RestrictedZone } from './types';

// Keep in sync with backend/src/main/resources/db/migration/V2__seed_helsinki_network.sql

export const FACILITIES: Facility[] = [
  { id: 1, code: 'HUS-MEI', name: 'Meilahti Tower Hospital & HUSLAB Hub', city: 'Helsinki', type: 'HUB', lat: 60.1906, lon: 24.9036, hasDronePad: true, dailyShipments: 0 },
  { id: 2, code: 'HUS-JOR', name: 'Jorvi Hospital', city: 'Espoo', type: 'HOSPITAL', lat: 60.2203, lon: 24.6728, hasDronePad: true, dailyShipments: 14 },
  { id: 3, code: 'HUS-PEI', name: 'Peijas Hospital', city: 'Vantaa', type: 'HOSPITAL', lat: 60.3297, lon: 25.0577, hasDronePad: true, dailyShipments: 12 },
  { id: 4, code: 'HUS-MAL', name: 'Malmi Hospital', city: 'Helsinki', type: 'HOSPITAL', lat: 60.2475, lon: 25.013, hasDronePad: true, dailyShipments: 8 },
  { id: 5, code: 'HUS-TOO', name: 'Töölö Hospital', city: 'Helsinki', type: 'HOSPITAL', lat: 60.1855, lon: 24.9213, hasDronePad: false, dailyShipments: 10 },
  { id: 6, code: 'HUS-HER', name: 'Herttoniemi Hospital', city: 'Helsinki', type: 'HOSPITAL', lat: 60.1952, lon: 25.0365, hasDronePad: true, dailyShipments: 5 },
  { id: 7, code: 'HUS-POR', name: 'Porvoo Hospital', city: 'Porvoo', type: 'HOSPITAL', lat: 60.396, lon: 25.664, hasDronePad: true, dailyShipments: 6 },
  { id: 8, code: 'HUS-HYV', name: 'Hyvinkää Hospital', city: 'Hyvinkää', type: 'HOSPITAL', lat: 60.627, lon: 24.86, hasDronePad: true, dailyShipments: 7 },
  { id: 9, code: 'HUS-LOH', name: 'Lohja Hospital', city: 'Lohja', type: 'HOSPITAL', lat: 60.253, lon: 24.064, hasDronePad: true, dailyShipments: 6 },
];

export const RESTRICTED_ZONES: RestrictedZone[] = [
  { id: 1, code: 'EFHK-CTR', name: 'Helsinki-Vantaa (EFHK)', severity: 'RESTRICTED', lat: 60.3172, lon: 24.9633, radiusKm: 6.0, authority: 'Fintraffic ANS', notes: 'Airport control zone core. UAS operations require ATC authorisation.' },
  { id: 2, code: 'EFHF', name: 'Malmi Airfield (EFHF)', severity: 'RESTRICTED', lat: 60.2546, lon: 25.0428, radiusKm: 1.5, authority: 'Fintraffic ANS', notes: 'General aviation aerodrome traffic zone.' },
  { id: 3, code: 'GOV-HKI', name: 'Helsinki Government Quarter', severity: 'PROHIBITED', lat: 60.1695, lon: 24.9525, radiusKm: 1.2, authority: 'Traficom', notes: 'Permanent prohibited area over state buildings.' },
  { id: 4, code: 'MIL-SANTA', name: 'Santahamina Garrison', severity: 'PROHIBITED', lat: 60.15, lon: 25.05, radiusKm: 1.5, authority: 'Finnish Defence Forces', notes: 'Military area. No UAS operations.' },
  { id: 5, code: 'ECO-KESK', name: 'Keskuspuisto Nature Corridor', severity: 'ADVISORY', lat: 60.23, lon: 24.92, radiusKm: 2.0, authority: 'City of Helsinki', notes: 'Wildlife-sensitive corridor. Avoid low-altitude hovering.' },
];
