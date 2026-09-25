import { motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

export default function PageTransition() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <motion.main
      key={location.pathname}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
      className="mx-auto w-full max-w-5xl px-4 pt-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-12"
    >
      <Outlet />
    </motion.main>
  )
}
