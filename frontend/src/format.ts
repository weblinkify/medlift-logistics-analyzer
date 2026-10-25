import type { PayloadType, Priority, TimeWindow, Weather } from './domain/types';

export const fmtMin = (v: number) => `${v.toFixed(1)} min`;
export const fmtKm = (v: number) => `${v.toFixed(1)} km`;
export const fmtEur = (v: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
export const fmtEurCompact = (v: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(v);
export const fmtInt = (v: number) => new Intl.NumberFormat('en-IE').format(Math.round(v));

export const PAYLOAD_LABEL: Record<PayloadType, string> = {
  BLOOD_PRODUCTS: 'Blood products',
  LAB_SAMPLES: 'Lab samples',
  PHARMACEUTICALS: 'Pharmaceuticals',
  MEDICAL_DEVICES: 'Medical devices',
};
export const PRIORITY_LABEL: Record<Priority, string> = { ROUTINE: 'Routine', URGENT: 'Urgent', STAT: 'STAT' };
export const WEATHER_LABEL: Record<Weather, string> = {
  CLEAR: 'Clear',
  WINDY: 'Windy',
  RAIN: 'Rain',
  SNOW: 'Snow',
  STORM: 'Storm',
};
export const TIME_LABEL: Record<TimeWindow, string> = { OFF_PEAK: 'Off-peak', DAYTIME: 'Daytime', PEAK: 'Rush hour' };

export const shortName = (name: string) => name.replace(' Hospital', '').replace(' Tower & HUSLAB Hub', '').replace(' & HUSLAB Hub', '');
