import { createContext, useContext, useState, useEffect } from 'react'
const Ctx = createContext(null)
export function AuthProvider({ children }) {
  const [user,setUser]=useState(null); const [token,setToken]=useState(null); const [role,setRole]=useState(null); const [loading,setLoading]=useState(true)
  useEffect(()=>{ const t=localStorage.getItem('drivo_token'),u=localStorage.getItem('drivo_user'),r=localStorage.getItem('drivo_role'); if(t&&u){setToken(t);setUser(JSON.parse(u));setRole(r)} setLoading(false) },[])
  const login=(u,t,r)=>{ setUser(u);setToken(t);setRole(r); localStorage.setItem('drivo_token',t); localStorage.setItem('drivo_user',JSON.stringify(u)); localStorage.setItem('drivo_role',r) }
  const logout=()=>{ setUser(null);setToken(null);setRole(null); localStorage.removeItem('drivo_token'); localStorage.removeItem('drivo_user'); localStorage.removeItem('drivo_role') }
  return <Ctx.Provider value={{user,token,role,loading,login,logout,isAdmin:role==='admin',isDriver:role==='driver',isRider:role==='user'}}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
