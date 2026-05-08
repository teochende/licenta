import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './SearchableSelect.css'

function IconChevron() {
    return (
        <svg className="searchable-select__chevron" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconSearch() {
    return (
        <svg className="searchable-select__search-icon" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.2-4.2" strokeLinecap="round" />
        </svg>
    )
}

function IconCheck() {
    return (
        <svg className="searchable-select__check" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

/**
 * Select cu căutare — aceeași interfață ca <select>: value + onChange(ev.target.value).
 * @param {{ value: string, onChange: (e: { target: { value: string } }) => void, options: { value: string, label: string }[], placeholder?: string, ariaLabel?: string, id?: string, className?: string, disabled?: boolean }} props
 */
export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Selectați…',
    ariaLabel,
    id,
    className = '',
    disabled = false,
}) {
    const uid = useId()
    const listId = `${uid}-listbox`
    const rootRef = useRef(null)
    const panelRef = useRef(null)
    const searchRef = useRef(null)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [highlight, setHighlight] = useState(0)
    const [panelStyle, setPanelStyle] = useState({})

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return options
        return options.filter((o) => (o.label || '').toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
    }, [options, query])

    const selectedLabel = useMemo(() => {
        const hit = options.find((o) => String(o.value) === String(value))
        return hit?.label ?? placeholder
    }, [options, value, placeholder])

    const close = useCallback(() => {
        setOpen(false)
        setQuery('')
        setHighlight(0)
    }, [])

    useEffect(() => {
        if (!open) return undefined
        const onDoc = (e) => {
            const t = e.target
            if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return
            close()
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [open, close])

    useLayoutEffect(() => {
        if (!open) return undefined
        const r = rootRef.current?.getBoundingClientRect()
        if (!r) return undefined
        const vw = window.innerWidth
        const isMobile = vw <= 640
        if (isMobile) {
            setPanelStyle({ top: `${Math.min(r.bottom + 6, window.innerHeight - 120)}px` })
        } else {
            setPanelStyle({
                top: `${r.bottom + 6}px`,
                left: `${r.left}px`,
                width: `${Math.min(r.width, vw - r.left - 16)}px`,
            })
        }
        const t = window.setTimeout(() => searchRef.current?.focus(), 0)
        return () => window.clearTimeout(t)
    }, [open, filtered.length])

    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                close()
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)))
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlight((h) => Math.max(h - 1, 0))
            }
            if (e.key === 'Enter' && filtered[highlight]) {
                e.preventDefault()
                onChange({ target: { value: String(filtered[highlight].value) } })
                close()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, close, filtered, highlight, onChange])

    useEffect(() => {
        if (!open) return
        const i = filtered.findIndex((o) => String(o.value) === String(value))
        setHighlight(i >= 0 ? i : 0)
    }, [open, query, filtered, value])

    const toggle = () => {
        if (disabled) return
        setOpen((o) => !o)
    }

    const pick = (v) => {
        onChange({ target: { value: String(v) } })
        close()
    }

    const panel =
        open &&
        typeof document !== 'undefined' &&
        createPortal(
            <div
                ref={panelRef}
                className="searchable-select__panel"
                style={panelStyle}
                role="listbox"
                id={listId}
            >
                <div className="searchable-select__search-wrap">
                    <IconSearch />
                    <input
                        ref={searchRef}
                        type="search"
                        className="searchable-select__search"
                        placeholder="Search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Filtru listă"
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.stopPropagation()
                        }}
                    />
                </div>
                {filtered.length === 0 ? (
                    <div className="searchable-select__empty">Nicio opțiune.</div>
                ) : (
                    <ul className="searchable-select__list" role="presentation">
                        {filtered.map((o, idx) => {
                            const sel = String(o.value) === String(value)
                            const hi = idx === highlight
                            return (
                                <li key={`${o.value}-${idx}`} role="presentation">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={sel}
                                        className={`searchable-select__option${sel ? ' searchable-select__option--selected' : ''}${
                                            hi ? ' searchable-select__option--highlight' : ''
                                        }`}
                                        onMouseEnter={() => setHighlight(idx)}
                                        onClick={() => pick(o.value)}
                                    >
                                        <IconCheck />
                                        <span className="searchable-select__option-text">{o.label}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>,
            document.body
        )

    return (
        <div ref={rootRef} className={`searchable-select ${className}`.trim()}>
            <button
                id={id}
                type="button"
                className="searchable-select__btn"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={toggle}
            >
                <span className="searchable-select__btn-label">{selectedLabel}</span>
                <IconChevron />
            </button>
            {panel}
        </div>
    )
}
