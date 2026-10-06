import { motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

export default function PageTransition() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <motion.main
      id="main-content"
      key={location.pathname}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      className="mx-auto w-full max-w-xl px-4 pt-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-5"
    >
      <Outlet />
    </motion.main>
  )
}
