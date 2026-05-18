import { useMemo, useState } from 'react'
import IconSearch from './ui/IconSearch'
import { filterHrUsersBySearch } from '../utils/hrUserSearch'

function renderChecklistItems(items, selectedIds, onToggle) {
    if (items.length === 0) {
        return <p className="cereri-edit-check-empty">Nu există opțiuni disponibile.</p>
    }
    return items.map((item) => {
        const checked = selectedIds.includes(item.id)
        return (
            <label
                key={item.id}
                className={`cereri-edit-check${checked ? ' cereri-edit-check--on' : ''}`}
            >
                <input
                    type="checkbox"
                    className="cereri-edit-check-input"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                />
                <span className="cereri-edit-check-ui" aria-hidden />
                <span className="cereri-edit-check-label">{item.numeUtilizator}</span>
            </label>
        )
    })
}

export default function CereriEditTeamColumn({
    title,
    items = [],
    selectedIds = [],
    onToggle,
    searchPlaceholder = 'Căutați după nume…',
    searchAriaLabel,
    emptyListMessage = 'Nu există opțiuni disponibile.',
    noResultsMessage = 'Nu au fost găsiți utilizatori.',
    listAriaLabel,
}) {
    const [cautare, setCautare] = useState('')
    const filtered = useMemo(() => filterHrUsersBySearch(items, cautare), [items, cautare])

    return (
        <div className="cereri-edit-team-col">
            <span className="cereri-edit-team-label">{title}</span>
            {items.length > 0 && (
                <div className="cereri-edit-search-wrap">
                    <span className="cereri-edit-search-icon" aria-hidden="true">
                        <IconSearch />
                    </span>
                    <input
                        type="search"
                        className="cereri-edit-search-input cereri-edit-input"
                        value={cautare}
                        onChange={(e) => setCautare(e.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label={searchAriaLabel || `Căutare ${title}`}
                        autoComplete="off"
                    />
                </div>
            )}
            <div className="cereri-edit-check-list" role="group" aria-label={listAriaLabel || title}>
                {items.length === 0 ? (
                    <p className="cereri-edit-check-empty">{emptyListMessage}</p>
                ) : filtered.length === 0 ? (
                    <p className="cereri-edit-check-empty" role="status">
                        {noResultsMessage}
                    </p>
                ) : (
                    renderChecklistItems(filtered, selectedIds, onToggle)
                )}
            </div>
        </div>
    )
}
