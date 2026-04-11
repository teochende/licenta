/** Formatează ISO instant (de la server) pentru afișare în română. */
export function formatDataAplicare(iso) {
    if (iso == null || iso === '') return '—'
    try {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return '—'
        return d.toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
        return '—'
    }
}
