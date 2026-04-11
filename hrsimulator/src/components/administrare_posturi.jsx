import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDepartamente } from '../api/departamenteApi'
import { getRecrutori, getIntervievatoriTehnici } from '../api/hrMetaApi'
import {
    deletePost,
    patchPost,
    putPost,
    uploadPostDescriereFisier,
    deletePostDescriereFisier,
} from '../api/postsApi'
import './administrare_posturi.css'
import ModalEditJob from './ModalEditJob'

export default function AdministrarePosturi({
    posturi,
    recrutoriDto = [],
    intervievatoriDto = [],
    token,
    onRefreshPosturi,
    allowDeletePost = false,
    embeddedInAdmin = false,
}) {
    const [editingId, setEditingId] = useState(null)
    const [departamente, setDepartamente] = useState([])
    /** Reîncărcăm local; după încărcare folosim răspunsul API chiar dacă lista e goală. */
    const [hrMeta, setHrMeta] = useState({ loaded: false, recrutori: [], intervievatori: [] })

    useEffect(() => {
        if (!token) {
            setDepartamente([])
            setHrMeta({ loaded: false, recrutori: [], intervievatori: [] })
            return
        }
        getDepartamente(token)
            .then((rows) => setDepartamente(Array.isArray(rows) ? rows : []))
            .catch(() => setDepartamente([]))
        Promise.all([
            getRecrutori(token).catch(() => []),
            getIntervievatoriTehnici(token).catch(() => []),
        ]).then(([r, i]) => {
            setHrMeta({
                loaded: true,
                recrutori: Array.isArray(r) ? r : [],
                intervievatori: Array.isArray(i) ? i : [],
            })
        })
    }, [token])

    const recrutoriEfectivi = hrMeta.loaded ? hrMeta.recrutori : recrutoriDto
    const intervievatoriEfectivi = hrMeta.loaded ? hrMeta.intervievatori : intervievatoriDto
    const recrutoriNume = recrutoriEfectivi.map((r) => r.numeUtilizator)
    const intervievatoriNume = intervievatoriEfectivi.map((r) => r.numeUtilizator)

    const toggleEnabled = async (id) => {
        const p = posturi.find((x) => x.id === id)
        if (!p || !token) return
        try {
            await patchPost(token, id, { enabled: !p.enabled })
            await onRefreshPosturi?.()
        } catch (e) {
            alert(e?.message || 'Eroare.')
        }
    }

    const deschideEditare = (post) => {
        setEditingId(post.id)
    }

    const inchideModal = () => {
        setEditingId(null)
    }

    const stergePost = async (id) => {
        if (!token || !allowDeletePost) return
        if (!window.confirm('Sigur ștergeți acest post? Se vor șterge și aplicările asociate.')) return
        try {
            await deletePost(token, id)
            await onRefreshPosturi?.()
            if (editingId === id) setEditingId(null)
        } catch (e) {
            alert(e?.message || 'Eroare la ștergere.')
        }
    }

    const salveazaEditare = async (jobActualizat) => {
        if (!token || editingId == null) return
        const idPost = editingId
        const norm = (s) => (s == null ? '' : String(s)).trim().toLowerCase()
        const numeRecrutoriAlesi =
            jobActualizat.assignedRecrutori ?? jobActualizat.assignedRecruteri ?? []
        const numeIntervAlesi = jobActualizat.assignedIntervievatori ?? []
        const recIds = (Array.isArray(numeRecrutoriAlesi) ? numeRecrutoriAlesi : [])
            .map((n) => recrutoriEfectivi.find((r) => norm(r.numeUtilizator) === norm(n))?.id)
            .filter((x) => x != null)
        const intIds = (Array.isArray(numeIntervAlesi) ? numeIntervAlesi : [])
            .map((n) => intervievatoriEfectivi.find((r) => norm(r.numeUtilizator) === norm(n))?.id)
            .filter((x) => x != null)
        try {
            await putPost(token, idPost, {
                departamentId: Number(jobActualizat.departamentId),
                subdomeniu: (jobActualizat.subdomeniu || '').trim(),
                nume: (jobActualizat.nume || '').trim(),
                nivel: (jobActualizat.nivel || '').trim(),
                descriere: jobActualizat.descriere != null ? String(jobActualizat.descriere) : '',
                enabled: !!jobActualizat.enabled,
                recrutoriIds: recIds,
                intervievatoriIds: intIds,
            })
            if (jobActualizat.stergeDescriereFisier) {
                await deletePostDescriereFisier(token, idPost)
            } else if (jobActualizat.descriereFisierFile) {
                await uploadPostDescriereFisier(token, idPost, jobActualizat.descriereFisierFile)
            }
            await onRefreshPosturi?.()
            inchideModal()
        } catch (e) {
            alert(e?.message || 'Eroare la salvare.')
        }
    }

    const jobEditat = editingId != null ? posturi.find((p) => p.id === editingId) : null

    const toolbar = (
        <div className={embeddedInAdmin ? 'toolbar-administrare toolbar-administrare--embedded' : 'toolbar-administrare'}>
            <Link
                to="/administrare-posturi/adaugare"
                className={embeddedInAdmin ? 'btn-adaugare-post btn-adaugare-post--text' : 'btn-adaugare-post'}
                title="Adaugă post nou"
            >
                {embeddedInAdmin ? '+ Post nou' : '+'}
            </Link>
            {!embeddedInAdmin && <span className="toggleDescriere">Adăugare post</span>}
        </div>
    )

    const heading = embeddedInAdmin ? (
        <div className="administrare-posturi__intro">
            {toolbar}
        </div>
    ) : (
        <>
            <h1>Administrare posturi</h1>
            {toolbar}
        </>
    )

    return (
        <div className={embeddedInAdmin ? 'administrare-posturi administrare-posturi--embedded' : 'administrare-posturi'}>
            {heading}
            <div className="jobs-table-wrap">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Domeniu</th>
                            <th>Subdomeniu</th>
                            <th>Nume</th>
                            <th>Nivel</th>
                            <th>Descriere</th>
                            <th>Recruteri</th>
                            <th>Intervievatori</th>
                            <th>Acțiuni</th>
                            {allowDeletePost && <th>Ștergere</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {posturi.map((post) => (
                            <tr key={post.id} className={post.enabled ? 'row-enabled' : 'row-disabled'}>
                                <td>{post.id}</td>
                                <td>{post.domeniu}</td>
                                <td>{post.subdomeniu}</td>
                                <td>{post.nume}</td>
                                <td>{post.nivel}</td>
                                <td className="jobs-table-descriere">
                                    <span className="jobs-table-descriere-text">
                                        {(post.descriere || '').length > 80
                                            ? `${(post.descriere || '').slice(0, 80)}…`
                                            : post.descriere || '—'}
                                    </span>
                                    {post.descriereFisierStocat && (
                                        <span className="jobs-table-badge-fisier" title={post.descriereFisierNume || 'Fișier'}>
                                            PDF/DOCX
                                        </span>
                                    )}
                                </td>
                                <td>{(post.assignedRecrutori || []).join(', ') || '—'}</td>
                                <td>{(post.assignedIntervievatori || []).join(', ') || '—'}</td>
                                <td>
                                    <div className="actiuni-celula">
                                        <button
                                            type="button"
                                            className="toggle-btn edit-btn"
                                            onClick={() => deschideEditare(post)}
                                        >
                                            Editare
                                        </button>
                                        <button
                                            className={`toggle-btn ${post.enabled ? 'on' : 'off'}`}
                                            onClick={() => toggleEnabled(post.id)}
                                            title={post.enabled ? 'Dezactivează postul' : 'Activează postul'}
                                        >
                                            {post.enabled ? 'Dezactivează' : 'Activează'}
                                        </button>
                                    </div>
                                </td>
                                {allowDeletePost && (
                                    <td>
                                        <button
                                            type="button"
                                            className="toggle-btn delete-post-btn"
                                            onClick={() => stergePost(post.id)}
                                        >
                                            Șterge
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ModalEditJob
                job={jobEditat}
                token={token}
                onSave={salveazaEditare}
                onClose={inchideModal}
                departamente={departamente}
                recrutoriDisponibili={recrutoriNume}
                intervievatoriDisponibili={intervievatoriNume}
            />
        </div>
    )
}
