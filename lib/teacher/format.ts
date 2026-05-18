/**
 * Formatierungs-Helfer fuer den Lehrer-Bereich.
 */

/**
 * Wandelt einen punkt-getrennten Schueler-Benutzernamen in einen lesbaren
 * Anzeigenamen um.
 *
 * Beispiel: "max.mustermann" -> "Max Mustermann"
 */
export function formatName(username: string): string {
  return username
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
