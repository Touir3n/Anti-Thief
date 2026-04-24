/**
 * Utility to normalize Greek text for display.
 * In Greek typography, accents (tonoi) are traditionally omitted when text is displayed in all caps.
 */
export const toUpperCaseAccentFree = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .toUpperCase()
    .normalize('NFD') // Decompose combined characters (e.g., 'ά' -> 'α' + '◌́')
    .replace(/[\u0300-\u036f]/g, ""); // Remove the accent marks
};
