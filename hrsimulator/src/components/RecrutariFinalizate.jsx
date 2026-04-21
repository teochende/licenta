import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPosturi, redeschidePost } from '../api/postsApi'
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

export default function RecrutariFinalizate({ token, user }) {
  const [posts, setPosts] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [reopenBusyId, setReopenBusyId] = useState(null)

  const reload = async () => {
    if (!token) {
      setPosts([])
      setApps([])
      return
    }
    setLoading(true)
    setErr('')
    try {
      const [p, a] = await Promise.all([
        getPosturi(token, { finalizate: true }).catch(() => []),
        getAplicatiiDashboard(token).catch(() => []),
      ])
      setPosts(Array.isArray(p?.content) ? p.content : Array.isArray(p) ? p : [])
      setApps(Array.isArray(a) ? a : [])
    } catch (e) {
      setErr(e?.message || 'Nu s-au putut încărca recrutările finalizate.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [token])

  const canReopen = user?.rol === 'admin'

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
        <div className="recrutari-finalizate__title">
          <h1>Recrutări finalizate</h1>
          <p className="recrutari-finalizate__subtitle">
            Posturi fără poziții libere. Vezi candidații admiși și observațiile finale.
          </p>
        </div>
        <div className="recrutari-finalizate__headerActions">
          <Link className="recrutari-finalizate__back" to="/administrare-posturi">
            Înapoi la Administrare posturi
          </Link>
        </div>
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
                <div className="recrutari-finalizate__postHead">
                  <div className="recrutari-finalizate__postTitle">
                    <h2>{p.nume}</h2>
                    <span className="recrutari-finalizate__meta">
                      {p.domeniu} · {p.subdomeniu} · {p.nivel}
                    </span>
                  </div>
                  {canReopen ? (
                    <div className="recrutari-finalizate__actions">
                      <button
                        type="button"
                        className="recrutari-finalizate__btn"
                        disabled={reopenBusyId === p.id}
                        onClick={async () => {
                          if (!token) return
                          setReopenBusyId(p.id)
                          try {
                            await redeschidePost(token, p.id)
                            await reload()
                          } catch (e) {
                            setErr(e?.message || 'Nu s-a putut redeschide postul.')
                          } finally {
                            setReopenBusyId(null)
                          }
                        }}
                      >
                        {reopenBusyId === p.id ? 'Se redeschide…' : 'Redeschide postul'}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="recrutari-finalizate__kpis">
                  <div className="recrutari-finalizate__kpi">
                    <span className="recrutari-finalizate__kpiLabel">Poziții</span>
                    <span className="recrutari-finalizate__kpiValue">{p.nrPozitii ?? 1}</span>
                  </div>
                  <div className="recrutari-finalizate__kpi">
                    <span className="recrutari-finalizate__kpiLabel">Libere</span>
                    <span className="recrutari-finalizate__kpiValue">{p.pozitiiLibere ?? 0}</span>
                  </div>
                  <div className="recrutari-finalizate__kpi">
                    <span className="recrutari-finalizate__kpiLabel">Angajați</span>
                    <span className="recrutari-finalizate__kpiValue">{hired.length}</span>
                    <span className="recrutari-finalizate__kpiHint">Ofertă + Admis</span>
                  </div>
                </div>

                {hired.length === 0 ? (
                  <p className="recrutari-finalizate__noHired">Nu există candidați marcați ca Admis la etapa Ofertă.</p>
                ) : (
                  <div className="recrutari-finalizate__tableWrap">
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
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

