import { useState, useEffect, useMemo } from 'react'
import JobDisponibil from './job_disponibil'
import { getPosturiDisponibile } from '../api/postsApi'

export default function Acasa() {
    const [posturi, setPosturi] = useState([])

    useEffect(() => {
        getPosturiDisponibile()
            .then((rows) => setPosturi(Array.isArray(rows) ? rows : []))
            .catch(() => setPosturi([]))
    }, [])

    const posturiActive = posturi.filter((p) => p.enabled)

    const [filtruDomeniu, setFiltruDomeniu] = useState('')
    const [filtruSubdomeniu, setFiltruSubdomeniu] = useState('')
    const [filtruNivel, setFiltruNivel] = useState('')

    const domeniiUnice = useMemo(() => {
        const s = new Set(posturiActive.map((p) => p.domeniu).filter(Boolean))
        return [...s].sort()
    }, [posturiActive])

    const subdomeniiUnice = useMemo(() => {
        const s = new Set(posturiActive.map((p) => p.subdomeniu).filter(Boolean))
        return [...s].sort()
    }, [posturiActive])

    const niveluriUnice = useMemo(() => {
        const s = new Set(posturiActive.map((p) => p.nivel).filter(Boolean))
        return [...s].sort()
    }, [posturiActive])

    const filtreazaPosturi = (lista) =>
        lista.filter((el) => {
            if (filtruDomeniu !== '' && el.domeniu !== filtruDomeniu) return false
            if (filtruSubdomeniu !== '' && el.subdomeniu !== filtruSubdomeniu) return false
            if (filtruNivel !== '' && el.nivel !== filtruNivel) return false
            return true
        })

    const posturiFiltrate = filtreazaPosturi(posturiActive)

    return (
        <>
            <h1>Pozitii disponibile</h1>
            <div>
                Filtrare:
                <select
                    style={{ margin: '2px' }}
                    value={filtruDomeniu}
                    onChange={(e) => setFiltruDomeniu(e.target.value)}
                >
                    <option value="">Toate domeniile</option>
                    {domeniiUnice.map((d) => (
                        <option key={d} value={d}>
                            {d}
                        </option>
                    ))}
                </select>

                <select
                    style={{ margin: '2px' }}
                    value={filtruSubdomeniu}
                    onChange={(e) => setFiltruSubdomeniu(e.target.value)}
                >
                    <option value="">Toate subdomeniile</option>
                    {subdomeniiUnice.map((d) => (
                        <option key={d} value={d}>
                            {d}
                        </option>
                    ))}
                </select>

                <select
                    style={{ margin: '2px' }}
                    value={filtruNivel}
                    onChange={(e) => setFiltruNivel(e.target.value)}
                >
                    <option value="">Toate nivelurile</option>
                    {niveluriUnice.map((d) => (
                        <option key={d} value={d}>
                            {d}
                        </option>
                    ))}
                </select>
            </div>
            {posturiFiltrate.map((el) => (
                <JobDisponibil key={el.id} informatiiPost={el} />
            ))}
            {posturiFiltrate.length === 0 && <p>Nu exista posturi disponibile pentru filtrele selectate.</p>}
        </>
    )
}
