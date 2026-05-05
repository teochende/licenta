import { useCallback, useEffect, useId, useRef, useState } from 'react'
import './MultiSelectDropdown.css'

/**
 * Multi-select cu checkbox-uri (fără logică de filtrare — doar UI).
 * @param {{ values: string[], onChange: (next: string[]) => void, options: { value: string, label: string }[], placeholder?: string, ariaLabel?: string, className?: string, disabled?: boolean }} props
 */
export default function MultiSelectDropdown({
    values,
    onChange,
    options,
    placeholder = 'Selectați…',
    ariaLabel,
    className = '',
    disabled = false,
}) {
    const uid = useId()
    const rootRef = useRef(null)
    const [open, setOpen] = useState(false)
    const selected = new Set(values || [])

    const summary =
        values && values.length > 0
            ? `${values.length} selectate`
            : placeholder

    const close = useCallback(() => setOpen(false), [])

    useEffect(() => {
        if (!open) return undefined
        const onDoc = (e) => {
            if (!rootRef.current?.contains(e.target)) close()
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [open, close])

    const toggleVal = (v) => {
        const next = new Set(selected)
        if (next.has(v)) next.delete(v)
        else next.add(v)
        onChange([...next])
    }

    return (
        <div ref={rootRef} className={`multi-select-dd ${className}`.trim()}>
            <button
                type="button"
                id={uid}
                className="multi-select-dd__btn"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
            >
                <span className="multi-select-dd__summary">{summary}</span>
                <svg className="multi-select-dd__chevron" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open ? (
                <div className="multi-select-dd__panel" role="listbox" aria-labelledby={uid}>
                    {options.map((o) => {
                        const checked = selected.has(String(o.value))
                        return (
                            <label key={o.value} className="multi-select-dd__row">
                                <input type="checkbox" checked={checked} onChange={() => toggleVal(String(o.value))} />
                                <span>{o.label}</span>
                            </label>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
