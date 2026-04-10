import { useState } from 'react'
import { Link } from 'react-router-dom'
import { patchPost, putAdminAssignari } from '../api/postsApi'
import './administrare_posturi.css'
import ModalEditJob from './ModalEditJob'

export default function AdministrarePosturi({
    posturi,
    recrutoriDto = [],
    intervievatoriDto = [],
    token,
    onRefreshPosturi,
}) {
    const [editingId, setEditingId] = useState(null)

    const recrutoriNume = recrutoriDto.map((r) => r.numeUtilizator)
    const intervievatoriNume = intervievatoriDto.map((r) => r.numeUtilizator)

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

    const salveazaEditare = async (jobActualizat) => {
        if (!token || editingId == null) return
        const recIds = (jobActualizat.assignedRecrutori || [])
            .map((n) => recrutoriDto.find((r) => r.numeUtilizator === n)?.id)
            .filter((x) => x != null)
        const intIds = (jobActualizat.assignedIntervievatori || [])
            .map((n) => intervievatoriDto.find((r) => r.numeUtilizator === n)?.id)
            .filter((x) => x != null)
        try {
            await patchPost(token, editingId, {
                descriere: jobActualizat.descriere,
                enabled: jobActualizat.enabled,
            })
            await putAdminAssignari(token, editingId, recIds, intIds)
            await onRefreshPosturi?.()
        } catch (e) {
            alert(e?.message || 'Eroare la salvare.')
        }
        inchideModal()
    }

    const jobEditat = editingId != null ? posturi.find((p) => p.id === editingId) : null

    return (
        <>
            <h1>Administrare posturi</h1>
            <div className="toolbar-administrare">
                <Link to="/administrare-posturi/adaugare" className="btn-adaugare-post" title="Adaugă post nou">
                    +
                </Link>
                <span className="toggleDescriere">Adugare post</span>
            </div>
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
                            <td>{post.descriere}</td>
                            <td>{(post.assignedRecruteri || []).join(', ') || '—'}</td>
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
                                    >
                                        {post.enabled ? 'Dezactivează' : 'Activează'}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <ModalEditJob
                job={jobEditat}
                onSave={salveazaEditare}
                onClose={inchideModal}
                recrutoriDisponibili={recrutoriNume}
                intervievatoriDisponibili={intervievatoriNume}
            />
        </>
    )
}
