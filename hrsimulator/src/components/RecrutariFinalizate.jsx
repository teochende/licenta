import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPosturi } from '../api/postsApi'
import { getAplicatiiDashboard } from '../api/aplicatiiApi'
import { isPipelineOfertaAdmisFromJson } from '../utils/pipelineDefaults'
import { formatDataAplicare } from '../utils/dateFormat'
import ObservatiiCandidatDropdown from './ObservatiiCandidatDropdown'
import './RecrutariFinalizate.css'

function numeDinEmail(email) {
  if (!email || !email.includes('@')) return email || '—'
  const prefix = email.split('@')[0]
  return prefix
    .split(/[._-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ')
}

export default function RecrutariFinalizate({ token }) {
  const [posts, setPosts] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!token) {
      setPosts([])
      setApps([])
      return
    }
    setLoading(true)
    setErr('')
    Promise.all([
      getPosturi(token, { finalizate: true }).catch(() => []),
      getAplicatiiDashboard(token).catch(() => []),
    ])
      .then(([p, a]) => {
        setPosts(Array.isArray(p?.content) ? p.content : Array.isArray(p) ? p : [])
        setApps(Array.isArray(a) ? a : [])
      })
      .catch((e) => setErr(e?.message || 'Nu s-au putut încărca recrutările finalizate.'))
      .finally(() => setLoading(false))
  }, [token])

  const postIds = useMemo(() => new Set(posts.map((p) => p.id)), [posts])

  const angajariByPostId = useMemo(() => {
    const out = new Map()
    for (const a of apps) {
      if (!postIds.has(a.postId)) continue
      if (!isPipelineOfertaAdmisFromJson(a.pipelineStateJson)) continue
      if (!out.has(a.postId)) out.set(a.postId, [])
      out.get(a.postId).push(a)
    }
    // sort simplu: data aplicare desc
    for (const [pid, list] of out.entries()) {
      list.sort((x, y) => String(y.dataAplicare || '').localeCompare(String(x.dataAplicare || '')))
      out.set(pid, list)
    }
    return out
  }, [apps, postIds])

  return (
    <div className="recrutari-finalizate">
      <div className="recrutari-finalizate__header">
        <h1>Recrutări finalizate</h1>
        <Link className="recrutari-finalizate__back" to="/administrare-posturi">
          Înapoi la Administrare posturi
        </Link>
      </div>

      {loading ? <p>Se încarcă…</p> : null}
      {err ? <p className="recrutari-finalizate__err">{err}</p> : null}

      {!loading && posts.length === 0 ? (
        <p className="recrutari-finalizate__empty">Nu există posturi finalizate.</p>
      ) : (
        <div className="recrutari-finalizate__list">
          {posts.map((p) => {
            const hired = angajariByPostId.get(p.id) || []
            return (
              <section key={p.id} className="recrutari-finalizate__post">
                <div className="recrutari-finalizate__postTitle">
                  <h2>{p.nume}</h2>
                  <span className="recrutari-finalizate__meta">
                    {p.domeniu} · {p.subdomeniu} · {p.nivel}
                  </span>
                </div>
                <div className="recrutari-finalizate__stats">
                  <span>
                    Poziții: <strong>{p.nrPozitii ?? 1}</strong>
                  </span>
                  <span>
                    Libere: <strong>{p.pozitiiLibere ?? 0}</strong>
                  </span>
                  <span>
                    Angajați (Ofertă + Admis): <strong>{hired.length}</strong>
                  </span>
                </div>

                {hired.length === 0 ? (
                  <p className="recrutari-finalizate__noHired">Nu există candidați marcați ca Admis la etapa Ofertă.</p>
                ) : (
                  <table className="recrutari-finalizate__table">
                    <thead>
                      <tr>
                        <th>Candidat</th>
                        <th>Email</th>
                        <th>Aplicat</th>
                        <th>Observații</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hired.map((a) => (
                        <tr key={a.id}>
                          <td>{a.numeCandidat || numeDinEmail(a.email)}</td>
                          <td>{a.email}</td>
                          <td>{formatDataAplicare(a.dataAplicare)}</td>
                          <td>
                            <ObservatiiCandidatDropdown
                              pipelineStateJson={a.pipelineStateJson}
                              seedNum={a.id}
                              aiCvReview={a.aiCvReview}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

