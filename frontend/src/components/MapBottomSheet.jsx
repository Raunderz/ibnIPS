import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Footprints,
  MapPin,
  Navigation,
  RotateCcw,
  Wifi,
  X,
} from 'lucide-react'
import { useId, useState } from 'react'
import { getFloorLabel, getLocationTitle } from '../utils/location.js'

const actionClasses =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-colors duration-150'

function Detail({ label, children }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5">
      <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-white">{children}</dd>
    </div>
  )
}

export default function MapBottomSheet({
  node,
  startNode = null,
  route = null,
  routeFloors = [],
  linkCount = 0,
  fingerprintCount = 0,
  canStartFromSelection = false,
  onSetStart,
  onClearStart,
  onStartNavigation,
  onClearSelection,
}) {
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const hasRoute = Boolean(route)

  return (
    <section
      className="pointer-events-auto absolute inset-x-0 bottom-0 rounded-t-sheet border-t border-white/10 bg-ink-850/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-float backdrop-blur"
      aria-label="Map selection"
    >
      <motion.button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls={bodyId}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, gesture) => {
          if (gesture.offset.y < -28) {
            setExpanded(true)
          } else if (gesture.offset.y > 28) {
            setExpanded(false)
          }
        }}
        className="w-full cursor-grab touch-none pt-1 pb-2 text-left active:cursor-grabbing"
      >
        <span className="mx-auto block h-1.5 w-11 rounded-full bg-white/20" />
        <span className="mt-2.5 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-200">
            <MapPin size={19} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-extrabold tracking-[-0.02em] text-white">
              {node ? getLocationTitle(node) : 'No location selected'}
            </span>
            <span className="block truncate text-xs text-slate-400">
              {node
                ? `${getFloorLabel(node.floor)} · ${linkCount} direct link${
                    linkCount === 1 ? '' : 's'
                  }`
                : 'Tap a location on the map to inspect it'}
            </span>
          </span>
          {hasRoute ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1.5 text-xs font-bold text-brand-200">
              <Footprints size={14} aria-hidden="true" />
              {route.totalSteps}
            </span>
          ) : null}
          <span className="shrink-0 text-slate-400" aria-hidden="true">
            {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </span>
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            id={bodyId}
            key="map-sheet-body"
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
            }
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              {node ? (
                <dl className="grid grid-cols-2 gap-2">
                  <Detail label="Floor">
                    {getFloorLabel(node.floor)}
                  </Detail>
                  <Detail label="Node ID">
                    <span className="font-mono text-xs">{node.nodeId}</span>
                  </Detail>
                  <Detail label="Direct links">{linkCount}</Detail>
                  <Detail label="Wi-Fi readings">
                    {fingerprintCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Wifi size={14} aria-hidden="true" />
                        {fingerprintCount}
                      </span>
                    ) : (
                      'None stored'
                    )}
                  </Detail>
                </dl>
              ) : null}

              {hasRoute ? (
                <div className="rounded-2xl border border-brand-400/25 bg-brand-500/8 px-3.5 py-3">
                  <p className="text-sm font-bold text-white">
                    {route.totalSteps} steps from {getLocationTitle(startNode)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {route.segments.length} corridor move
                    {route.segments.length === 1 ? '' : 's'}
                    {routeFloors.length > 1
                      ? ` · crosses ${routeFloors.length} floors`
                      : ''}
                    . Steps come from the stored edge lengths.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                {hasRoute && onStartNavigation ? (
                  <button
                    type="button"
                    onClick={onStartNavigation}
                    className={`${actionClasses} bg-brand-500 text-ink-950 shadow-accent active:bg-brand-600`}
                  >
                    <Navigation size={18} aria-hidden="true" />
                    Start navigation
                  </button>
                ) : null}

                {node && onSetStart ? (
                  <button
                    type="button"
                    onClick={() => onSetStart(node)}
                    className={`${actionClasses} border border-white/10 bg-white/5 text-white active:bg-white/10`}
                  >
                    {canStartFromSelection ? (
                      <>
                        <RotateCcw size={17} aria-hidden="true" />
                        Use as starting point
                      </>
                    ) : (
                      <>
                        <Footprints size={17} aria-hidden="true" />
                        Set as starting point
                      </>
                    )}
                  </button>
                ) : null}

                {startNode && onClearStart ? (
                  <button
                    type="button"
                    onClick={onClearStart}
                    className={`${actionClasses} border border-white/10 text-slate-300 active:bg-white/10`}
                  >
                    Clear starting point
                  </button>
                ) : null}

                {node && onClearSelection ? (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className={`${actionClasses} text-slate-400`}
                  >
                    <X size={16} aria-hidden="true" />
                    Clear selection
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
