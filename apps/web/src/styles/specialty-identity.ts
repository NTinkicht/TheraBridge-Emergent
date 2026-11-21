import { colors } from './tokens';

// M5-B visual identity is presentation-only: never authorization or data migration.
export type SpecialtyFamily = 'speech' | 'occupational' | 'behavioral' | 'physical' | 'group';
export type SpecialtyPresentation = Readonly<{
  family: SpecialtyFamily; label: string; description: string;
  icon: 'message-circle' | 'hand' | 'brain' | 'activity' | 'users';
  color: string; tint: string;
}>;

export const specialtyFamilies: Readonly<Record<SpecialtyFamily, SpecialtyPresentation>> = {
  speech: { family: 'speech', label: 'Speech and language therapy', description: 'Communication, language and interaction', icon: 'message-circle', color: colors.specialty.speech, tint: colors.specialty.speechTint },
  occupational: { family: 'occupational', label: 'Occupational therapy', description: 'Participation, daily living and fine motor skills', icon: 'hand', color: colors.specialty.ot, tint: colors.specialty.otTint },
  behavioral: { family: 'behavioral', label: 'ABA / behavioral therapy', description: 'Behavioral learning and structured support', icon: 'brain', color: colors.specialty.aba, tint: colors.specialty.abaTint },
  physical: { family: 'physical', label: 'Physiotherapy', description: 'Movement, balance and functional mobility', icon: 'activity', color: colors.specialty.physio, tint: colors.specialty.physioTint },
  group: { family: 'group', label: 'Group therapy', description: 'Shared participation and social learning', icon: 'users', color: colors.specialty.group, tint: colors.specialty.groupTint },
} as const;

// Six existing service identifiers remain unchanged; group is a planned family.
const existingServiceAliases: Readonly<Record<string, { family: SpecialtyFamily; label: string }>> = {
  speech: { family: 'speech', label: 'Speech & language' },
  occupational: { family: 'occupational', label: 'Occupational therapy' },
  behavioral: { family: 'behavioral', label: 'Behavioral therapy' },
  physical: { family: 'physical', label: 'Physical therapy' },
  feeding: { family: 'occupational', label: 'Feeding therapy' },
  developmental: { family: 'behavioral', label: 'Developmental therapy' },
  group: { family: 'group', label: 'Group therapy' },
};

export function specialtyIdentity(service: string): SpecialtyPresentation {
  const key = Object.prototype.hasOwnProperty.call(existingServiceAliases, service)
    ? existingServiceAliases[service].family : null;
  return key ? specialtyFamilies[key] : specialtyFamilies.group;
}
export function specialtyDisplayName(service: string): string {
  return Object.prototype.hasOwnProperty.call(existingServiceAliases, service)
    ? existingServiceAliases[service].label : service;
}
export const isRecognizedSpecialty = (service: string): boolean =>
  Object.prototype.hasOwnProperty.call(existingServiceAliases, service);
export const specialtyVisualIdentityVersion = 'm5-b-v1' as const;
