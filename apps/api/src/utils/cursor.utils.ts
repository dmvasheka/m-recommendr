export function parseCursor(cursor: string): { popularity: number; id: number } | null {
    const [popularityRaw, idRaw] = cursor.split(':');
    const popularity = parseFloat(popularityRaw);
    const id = parseInt(idRaw, 10);

    if (!Number.isFinite(popularity) || Number.isNaN(id)) {
        return null;
    }

    return { popularity, id };
}
