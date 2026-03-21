import { createContext, useContext, useState, useEffect } from 'react'
const Ctx = createContext(null)
export function ThemeProvider({ children }) {
  const [theme,setTheme]=useState(()=>localStorage.getItem('drivo_theme')||'dark')
  useEffect(()=>{ document.documentElement.classList.toggle('dark',theme==='dark'); localStorage.setItem('drivo_theme',theme) },[theme])
  const toggle=()=>setTheme(t=>t==='dark'?'light':'dark')
  return <Ctx.Provider value={{theme,toggle,isDark:theme==='dark'}}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)
