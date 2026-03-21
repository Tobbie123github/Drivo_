import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function Spinner({ size='md', color='brand' }) {
  const s = {sm:'w-4 h-4 border-[2px]',md:'w-6 h-6 border-2',lg:'w-10 h-10 border-[3px]'}[size]
  const c = color==='white' ? 'border-white/20 border-t-white' : 'border-brand/20 border-t-brand'
  return <div className={`${s} ${c} rounded-full animate-spin`}/>
}

export function Btn({ children, variant='primary', size='md', loading, className='', ...p }) {
  const base = 'font-display font-700 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 select-none active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm:'px-4 py-2.5 text-[13px]', md:'px-5 py-3.5 text-sm', lg:'w-full py-4 text-[15px]' }
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark shadow-brand hover:shadow-lg',
    secondary: 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 hover:border-brand dark:hover:border-brand',
    ghost: 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border-2 border-brand text-brand hover:bg-brand hover:text-white',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={loading||p.disabled} {...p}>
      {loading ? <Spinner size="sm" color={variant==='primary'?'white':'brand'}/> : children}
    </button>
  )
}

export function Input({ label, icon:Icon, error, hint, className='', ...p }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"/>}
        <input className={`w-full ${Icon?'pl-11':'pl-4'} pr-4 py-3.5 rounded-2xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800/80 border-2 ${error?'border-red-400':'border-transparent focus:border-brand'} text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none transition-all duration-200 ${className}`} {...p}/>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}

export function Select({ label, children, className='', ...p }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{label}</label>}
      <select className={`w-full px-4 py-3.5 rounded-2xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800/80 border-2 border-transparent focus:border-brand text-zinc-900 dark:text-white focus:outline-none transition-all ${className}`} {...p}>{children}</select>
    </div>
  )
}

export function Badge({ children, color='green', dot=true }) {
  const c = {green:'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400',yellow:'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',red:'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400',blue:'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',gray:'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}[color]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${c}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/>}{children}
    </span>
  )
}

export function Card({ children, className='', onClick, animate=true }) {
  const base = `bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl transition-all duration-200 ${onClick?'cursor-pointer hover:border-brand/40 dark:hover:border-brand/40 hover:shadow-md active:scale-[0.99]':''}`
  if (animate) return <motion.div className={`${base} ${className}`} onClick={onClick} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.25}}>{children}</motion.div>
  return <div className={`${base} ${className}`} onClick={onClick}>{children}</div>
}

export function Modal({ open, onClose, title, children, size='md' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
          <motion.div
            className={`relative w-full ${size==='lg'?'max-w-2xl':size==='sm'?'max-w-sm':'max-w-md'} bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-float`}
            onClick={e=>e.stopPropagation()}
            initial={{opacity:0,y:32,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:0.97}}
            transition={{type:'spring',damping:28,stiffness:380}}
          >
            {title && (
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-lg text-zinc-900 dark:text-white">{title}</h3>
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"><X size={15}/></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function StarRating({ value, onChange, readonly=false }) {
  return (
    <div className="flex gap-2">
      {[1,2,3,4,5].map(s=>(
        <button key={s} onClick={()=>!readonly&&onChange?.(s)} className={`text-3xl transition-all duration-150 ${!readonly?'hover:scale-110 cursor-pointer':'cursor-default'} ${s<=value?'text-amber-400':'text-zinc-200 dark:text-zinc-700'}`}>★</button>
      ))}
    </div>
  )
}

export function Divider({ label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800"/>
      {label && <span className="text-xs font-medium text-zinc-400">{label}</span>}
      <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800"/>
    </div>
  )
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <motion.span className="text-5xl" animate={{y:[0,-6,0]}} transition={{repeat:Infinity,duration:2.5,ease:'easeInOut'}}>{icon}</motion.span>
      <p className="font-display font-semibold text-zinc-500 dark:text-zinc-400">{title}</p>
      {subtitle && <p className="text-xs text-zinc-400 max-w-xs">{subtitle}</p>}
    </div>
  )
}

export function FileUpload({ label, value, onChange, accept='image/*' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">{label}</label>}
      <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${value?'border-brand bg-green-50 dark:bg-green-500/10':'border-zinc-200 dark:border-zinc-700 hover:border-brand bg-zinc-50 dark:bg-zinc-800/50'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${value?'bg-brand/10':'bg-zinc-200 dark:bg-zinc-700'}`}>{value?'✓':'📎'}</div>
        <div>
          <p className={`text-sm font-medium ${value?'text-brand':'text-zinc-500 dark:text-zinc-400'}`}>{value?value.name||'File selected':'Click to upload'}</p>
          <p className="text-xs text-zinc-400">PNG, JPG up to 10MB</p>
        </div>
        <input type="file" accept={accept} className="hidden" onChange={onChange}/>
      </label>
    </div>
  )
}
