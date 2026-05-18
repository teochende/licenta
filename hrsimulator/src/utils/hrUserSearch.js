export function normalizeHrUserSearch(s) {
    return String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
}

export function matchesHrUserSearch(user, queryNorm) {
    if (!queryNorm) return true
    const nume = normalizeHrUserSearch(user?.numeUtilizator)
    const email = normalizeHrUserSearch(user?.email)
    return nume.includes(queryNorm) || (email && email.includes(queryNorm))
}

export function filterHrUsersBySearch(users, query) {
    const list = Array.isArray(users) ? users : []
    const q = normalizeHrUserSearch(query)
    if (!q) return list
    return list.filter((u) => matchesHrUserSearch(u, q))
}
