/**
 * Cursor DTO for pagination
 */
export interface Cursor {
    popularity: number;
    id: number;
}

/**
 * Parse and validate cursor string for pagination
 * Format: "popularity:id" (e.g., "123.45:678")
 *
 * @param cursor - Cursor string in format "popularity:id"
 * @returns Parsed cursor object or null if invalid
 */
export function parseCursor(cursor: string): Cursor | null {
    // Regex patterns for strict validation
    const FLOAT_PATTERN = /^-?\d+(\.\d+)?$/;  // Optional sign, digits, optional decimal
    const INTEGER_PATTERN = /^\d+$/;           // Digits only, no sign

    // Split and validate segment count
    const segments = cursor.split(':');
    if (segments.length !== 2) {
        return null; // Reject extra colons or missing segments
    }

    const [popularityRaw, idRaw] = segments;

    // Validate format with regex before parsing
    if (!FLOAT_PATTERN.test(popularityRaw) || !INTEGER_PATTERN.test(idRaw)) {
        return null;
    }

    // Parse values
    const popularity = Number(popularityRaw);
    const id = parseInt(idRaw, 10);

    // Strict validation: must be finite numbers
    if (!isFinite(popularity) || !isFinite(id)) {
        return null;
    }

    return { popularity, id };
}
