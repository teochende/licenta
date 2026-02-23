import { useState } from 'react'
import './administrare_posturi.css'

export default function AdministrarePosturi() {
    const initialPosturi = [
        { id: 1001, domeniu: 'Programare', subdomeniu: 'Java', nume: 'POST 1001', nivel: 'Senior', descriere: 'Descriere POST 1001', enabled: true },
        { id: 1002, domeniu: 'Contabilitate', subdomeniu: 'Gestiune', nume: 'POST 1002', nivel: 'Senior', descriere: 'Descriere POST 1002', enabled: true },
        { id: 1003, domeniu: 'Programare', subdomeniu: 'JavaScript', nume: 'POST 1003', nivel: 'Senior', descriere: 'Descriere POST 1003', enabled: true },
        { id: 1004, domeniu: 'Programare', subdomeniu: 'Python', nume: 'POST 1004', nivel: 'Intermediar', descriere: 'Descriere POST 1004', enabled: false }
    ]

    const [posturi, setPosturi] = useState(initialPosturi)

    // functie care creeaza un nou array de joburi, unde jobul cu id-ul dat are campul enabled inversat
    // folosita pentru a activa/dezactiva un job la click pe butonul din tabel

    // daca p.id e egal cu id-ul dat, returneaza o copie a jobului p, dar cu campul enabled inversat
    // daca p.id nu e egal cu id-ul dat, returneaza jobul p neschimbat
    const toggleEnabled = (id) => {
        setPosturi((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
    }

    return (
        <>
            <h1>Administrare posturi</h1>
            <table className="jobs-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Domeniu</th>
                        <th>Subdomeniu</th>
                        <th>Nume</th>
                        <th>Nivel</th>
                        <th>Descriere</th>
                        <th>Acțiune</th>
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
                            <td>
                                <button className={`toggle-btn ${post.enabled ? 'on' : 'off'}`} onClick={() => toggleEnabled(post.id)}>
                                    {post.enabled ? 'Dezactivează' : 'Activează'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    )
}