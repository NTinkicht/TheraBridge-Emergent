const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export type Form = Record<'organizationName' | 'contactName' | 'contactEmail' | 'contactPhone' | 'country' | 'city' | 'timezone' | 'therapistEstimate' | 'childEstimate' | 'message', string>;
export function validateApplication(f: Form, specialties: string[], ack: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.organizationName.trim().length < 2) e.organizationName = 'Enter your center’s name.';
  if (f.contactName.trim().length < 2) e.contactName = 'Enter the name of the person we should contact.';
  if (!EMAIL.test(f.contactEmail.trim())) e.contactEmail = 'Enter a valid email address.';
  if (f.contactPhone && !/^[+()0-9 .-]{6,40}$/.test(f.contactPhone.trim())) e.contactPhone = 'Use digits, spaces and + ( ) - only.';
  if (f.country.trim().length < 2) e.country = 'Enter the country.';
  if (f.city.trim().length < 2) e.city = 'Enter the city.';
  const t = Number(f.therapistEstimate);
  if (!Number.isInteger(t) || t < 1 || t > 500) e.therapistEstimate = 'Enter a whole number from 1 to 500.';
  const c = Number(f.childEstimate);
  if (f.childEstimate === '' || !Number.isInteger(c) || c < 0 || c > 5000) e.childEstimate = 'Enter a whole number from 0 to 5000.';
  if (!specialties.length) e.specialties = 'Choose at least one service.';
  if (f.message.length > 2000) e.message = 'Keep the message under 2000 characters.';
  if (!ack) e.ack = 'Please confirm to continue.';
  return e;
}

