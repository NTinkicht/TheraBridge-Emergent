const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export type Form = { name: string; slug: string; city: string; country: string; timezone: string; adminName: string; adminEmail: string };
export function validateCenter(f: Form, specialties: string[]) {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = 'Enter the center’s name.';
  if (f.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = 'Use lowercase letters, numbers and single dashes.';
  if (f.slug && (f.slug.length < 3 || f.slug.length > 64)) e.slug = 'Use 3 to 64 characters.';
  if (f.country.trim().length < 2) e.country = 'Enter the country.';
  if (f.city.trim().length < 2) e.city = 'Enter the city.';
  if (!specialties.length) e.specialties = 'Choose at least one service.';
  if (f.adminName.trim().length < 2) e.adminName = 'Enter the administrator’s full name.';
  if (!EMAIL.test(f.adminEmail.trim())) e.adminEmail = 'Enter a valid email address.';
  return e;
}

