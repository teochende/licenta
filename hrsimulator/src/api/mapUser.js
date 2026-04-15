import { ROLURI } from '../context/login_context'

const ROL_MAP = {
  admin: ROLURI.ADMIN,
  intervievator_tehnic: ROLURI.INTERVIEVATOR_TEHNIC,
  recrutor: ROLURI.RECRUTOR,
  manager_recrutare: ROLURI.MANAGER_RECRUTARE,
  manager_departament: ROLURI.MANAGER_DEPARTAMENT,
  guest: ROLURI.GUEST,
}

export function mapProfileToUser(me, token) {
  return {
    isAuthenticated: true,
    token,
    id: me.id,
    nume: me.numeUtilizator,
    numeUtilizator: me.numeUtilizator,
    email: me.email,
    rol: ROL_MAP[me.rolCod] || me.rolCod,
    departament: me.departamentNume || '',
    departamentId: me.departamentId ?? null,
    rolDoritCod: me.rolDoritCod ?? null,
    rolDoritDenumire: me.rolDoritDenumire ?? null,
  }
}
