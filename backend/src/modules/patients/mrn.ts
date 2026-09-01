export const formatMrn = (value: number, clinicCode = 'CLN') => `${clinicCode}-${value.toString().padStart(6, '0')}`;
