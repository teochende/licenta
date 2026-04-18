/**
 * Antete obligatorii în descrierea postului (aceleași reguli ca pe backend).
 */
export const JOB_DESC_REQUIRED_SECTION_LABELS = [
    'Job title',
    'Location',
    'Company overview',
    'Responsibilities',
    'Requirements',
    'Nice to have',
    'Education',
    'Experience',
    'What we offer',
]

const SECTION_LINE_SPECS = [
    { label: 'What we offer', re: /^(\s*)(what\s+we\s+offer)(\s*)(:\s*|[-–]\s*)?(.*)$/i },
    { label: 'Nice to have', re: /^(\s*)(nice\s+to\s+have)(\s*)(:\s*|[-–]\s*)?(.*)$/i },
    { label: 'Company overview', re: /^(\s*)(company\s+overview)(\s*)(:\s*|[-–]\s*)?(.*)$/i },
    { label: 'Job title', re: /^(\s*)(job\s+title)(\s*)(:\s*|[-–]\s*)?(.*)$/i },
    { label: 'Responsibilities', re: /^(\s*)(responsibilit(?:y|ies)|responsabilit(?:y|ies))(\s*)(:\s*|[-–]\s*)?(.*)$/i },
    {
        label: 'Requirements',
        re: /^(\s*)(requi?rements|requierements|requienrements)(\s*)(:\s*|[-–]\s*)?(.*)$/i,
    },
    { label: 'Education', re: /^(\s*)(education)(\s*)(:\s*|[-–]\s*)?(.*)$/i },
    { label: 'Experience', re: /^(\s*)(experience)(\s*)(:\s*|[-–]\s*)?(.*)$/i },
    { label: 'Location', re: /^(\s*)(location)(\s*)(:\s*|[-–]\s*)?(.*)$/i },
]

const HAYSTACK_CHECKS = [
    { label: 'Job title', test: (s) => /\bjob\s+title\b/i.test(s) },
    { label: 'Location', test: (s) => /\blocation\b/i.test(s) },
    { label: 'Company overview', test: (s) => /\bcompany\s+overview\b/i.test(s) },
    {
        label: 'Responsibilities',
        test: (s) => /\bresponsibilit/i.test(s) || /\bresponsabilit/i.test(s),
    },
    {
        label: 'Requirements',
        test: (s) =>
            /\brequirement/i.test(s) ||
            /\brequierement/i.test(s) ||
            /\brequienrements?\b/i.test(s),
    },
    { label: 'Nice to have', test: (s) => /\bnice\s+to\s+have\b/i.test(s) },
    { label: 'Education', test: (s) => /\beducation\b/i.test(s) },
    { label: 'Experience', test: (s) => /\bexperience\b/i.test(s) },
    { label: 'What we offer', test: (s) => /\bwhat\s+we\s+offer\b/i.test(s) },
]

/**
 * @param {string} text
 * @returns {string[]}
 */
export function getMissingJobDescriereSections(text) {
    if (text == null || String(text).trim() === '') return []
    const hay = ` ${String(text).toLowerCase().replace(/\r/g, '\n')} `
    return HAYSTACK_CHECKS.filter((c) => !c.test(hay)).map((c) => c.label)
}

/**
 * @param {string} text
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateJobDescriereSections(text) {
    const missing = getMissingJobDescriereSections(text)
    return { ok: missing.length === 0, missing }
}

function matchSectionLine(line) {
    for (const spec of SECTION_LINE_SPECS) {
        const m = line.match(spec.re)
        if (m) {
            return {
                type: 'header',
                indent: m[1] || '',
                title: spec.label,
                sep: m[4] || '',
                rest: m[5] != null ? m[5] : '',
            }
        }
    }
    return { type: 'plain', text: line }
}

/**
 * @param {string} descriere
 */
export function renderDescriereWithSectionBold(descriere) {
    const text = descriere != null ? String(descriere) : ''
    const lines = text.split(/\r?\n/)
    return lines.map((line, idx) => {
        const m = matchSectionLine(line)
        const showBr = idx < lines.length - 1
        if (m.type === 'plain') {
            return (
                <span key={idx}>
                    {m.text}
                    {showBr ? <br /> : null}
                </span>
            )
        }
        return (
            <span key={idx}>
                {m.indent}
                <strong>{m.title}</strong>
                {m.sep}
                {m.rest}
                {showBr ? <br /> : null}
            </span>
        )
    })
}

/** Rezumat vizibil lângă câmpul de descriere / încărcare fișier (cereri, posturi, dashboard). */
export function JobDescriereSectiuniHint({ className = '', compact = false }) {
    const list = JOB_DESC_REQUIRED_SECTION_LABELS.join(', ')
    if (compact) {
        return (
            <p className={className} style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.45, color: '#4b5563' }}>
                <strong>Structură obligatorie</strong> (în text sau extras din PDF/DOCX): {list}.
            </p>
        )
    }
    return (
        <div className={className} style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.45, color: '#374151' }}>
            <strong>Descrierea trebuie să conțină explicit</strong> (în text sau în fișierul PDF/DOCX) următoarele
            secțiuni, astfel încât să poată fi identificate în text:
            <ul style={{ margin: '6px 0 0', paddingLeft: '1.25rem' }}>
                {JOB_DESC_REQUIRED_SECTION_LABELS.map((label) => (
                    <li key={label}>{label}</li>
                ))}
            </ul>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
                Dacă lipsește vreuna, salvarea este respinsă — corectați descrierea sau reîncărcați un document complet.
            </p>
        </div>
    )
}
