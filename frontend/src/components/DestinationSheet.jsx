import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Footprints, MapPinned, Navigation, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import IconButton from './IconButton.jsx'
import { useRecentDestinations } from '../hooks/useRecentDestinations.js'
import { getFloorLabel, getLocationTitle } from '../utils/location.js'

export default function DestinationSheet({ node, onClose }) {
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const { record } = useRecentDestinations()
  const panelRef = useRef(null)
  const nodeId = node?.nodeId ?? null

  useEffect(() => {
    if (node) {
      record(node)
    }
  }, [node, record])

  useEffect(() => {
    if (!node) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    panelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [node, onClose])

  function goTo(path) {
    navigate(path)
  }

  return createPortal(
    <AnimatePresence>
      {node ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Close destination preview"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-950/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="destination-sheet-title"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, gesture) => {
              if (gesture.offset.y > 96) {
                onClose()
              }
            }}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: 'spring', stiffness: 340, damping: 34 }
            }
            className="relative w-full max-w-lg rounded-t-sheet border-t border-white/10 bg-ink-850 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float outline-none"
          >
            <div className="mx-auto h-1.5 w-11 rounded-full bg-white/20" />

            <div className="mt-4 flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-200">
                <MapPinned size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="destination-sheet-title"
                  className="text-xl font-extrabold tracking-[-0.02em] text-white"
                >
                  {getLocationTitle(node)}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {getFloorLabel(node.floor)}
                </p>
              </div>
              <IconButton label="Close preview" onClick={onClose}>
                <X size={19} aria-hidden="true" />
              </IconButton>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5">
                <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Floor
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-white">
                  {node.floor}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5">
                <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Node ID
                </dt>
                <dd className="mt-0.5 truncate font-mono text-xs font-semibold text-white">
                  {node.nodeId}
                </dd>
              </div>
            </dl>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() =>
                  goTo(`/navigate?node=${encodeURIComponent(nodeId)}`)
                }
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-[15px] font-bold text-ink-950 shadow-accent transition-colors duration-150 active:bg-brand-600"
              >
                <Navigation size={19} aria-hidden="true" />
                Start navigation
              </button>
              <button
                type="button"
                onClick={() => goTo(`/map?node=${encodeURIComponent(nodeId)}`)}
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-[15px] font-semibold text-white transition-colors duration-150 active:bg-white/10"
              >
                View on map
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => goTo(`/map?from=${encodeURIComponent(nodeId)}`)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-slate-400 transition-colors duration-150 active:text-slate-200"
              >
                <Footprints size={17} aria-hidden="true" />
                Use as starting point
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
