import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Footprints,
  MapPin,
  Navigation,
  RotateCcw,
  X,
} from 'lucide-react'
import { useId, useState } from 'react'
import { getFloorLabel } from '../utils/location.js'

const ACTION_CLASSES =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-colors duration-150'

export default function NavigationBottomSheet({
  routeDetails,
  destinationNode,
  sourceNode,
  currentSegment,
  nextSegment,
  progress,
  isNavigating,
  onStartNavigation,
  onNextStep,
  onPreviousStep,
  onStopNavigation,
  onChangeSource,
  onClose,
}) {
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(true)
  const bodyId = useId()
  const hasRoute = Boolean(routeDetails)

  if (!hasRoute || !destinationNode) {
    return null
  }

  const destinationTitle = destinationNode.name
  const sourceTitle = sourceNode?.name ?? 'Unknown'

  return (
    <section
      className="pointer-events-auto absolute inset-x-0 bottom-0 rounded-t-sheet border-t border-white/10 bg-ink-850/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-float backdrop-blur"
      aria-label="Navigation"
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
            <Navigation size={19} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-extrabold tracking-[-0.02em] text-white">
              {isNavigating ? 'Navigating' : 'Ready to navigate'}
            </span>
            <span className="block truncate text-xs text-slate-400">
              {progress.current}/{progress.total} moves · {routeDetails.totalSteps} steps
            </span>
          </span>
          {isNavigating && currentSegment ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1.5 text-xs font-bold text-amber-300">
              <Footprints size={14} aria-hidden="true" />
              Step {progress.current}
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
            key="nav-sheet-body"
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
              <div className="flex items-center gap-3 rounded-2xl bg-brand-500/8 px-3.5 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-200">
                  <MapPin size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">To {destinationTitle}</p>
                  <p className="truncate text-xs text-slate-300">{getFloorLabel(destinationNode.floor)}</p>
                </div>
                <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                  {routeDetails.totalSteps} steps
                </span>
              </div>

              {isNavigating && currentSegment ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-400 text-ink-950 font-bold text-[13px]">
                      {progress.current}
                    </span>
                    <span className="text-sm font-extrabold text-amber-200">NEXT</span>
                  </div>
                  <p className="text-lg font-semibold text-white leading-snug">{currentSegment.instruction}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {currentSegment.fromName} → {currentSegment.toName}
                    {currentSegment.crossesFloor ? ` · Floor change to ${getFloorLabel(currentSegment.toFloor)}` : ''}
                    · {currentSegment.steps} steps
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-brand-400/25 bg-brand-500/8 px-3.5 py-3">
                  <p className="text-sm font-bold text-white">
                    {routeDetails.totalSteps} steps from {sourceTitle}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {routeDetails.totalSegments} corridor move{routeDetails.totalSegments === 1 ? '' : 's'}
                    {routeDetails.routeFloors.length > 1
                      ? ` · crosses ${routeDetails.routeFloors.length} floors`
                      : ''}
                    . Steps come from the stored edge lengths.
                  </p>
                </div>
              )}

              {nextSegment && isNavigating ? (
                <div className="rounded-2xl border border-white/10 bg-white/4 px-3.5 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                    <ArrowUp size={12} aria-hidden="true" />
                    THEN
                  </div>
                  <p className="text-sm text-slate-200">{nextSegment.instruction}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {nextSegment.steps} steps
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                {isNavigating ? (
                  <>
                    <button
                      type="button"
                      onClick={onNextStep}
                      className={`${ACTION_CLASSES} bg-brand-500 text-ink-950 shadow-accent active:bg-brand-600`}
                    >
                      <Footprints size={18} aria-hidden="true" />
                      Next step
                    </button>
                    <button
                      type="button"
                      onClick={onPreviousStep}
                      disabled={progress.current <= 1}
                      className={`${ACTION_CLASSES} border border-white/10 bg-white/5 text-white active:bg-white/10 ${progress.current <= 1 ? 'opacity-50' : 'opacity-100'}`}
                    >
                      <RotateCcw size={17} aria-hidden="true" />
                      Previous step
                    </button>
                    <button
                      type="button"
                      onClick={onStopNavigation}
                      className={`${ACTION_CLASSES} border border-red-400/30 bg-red-500/10 text-red-300 active:bg-red-500/20`}
                    >
                      <X size={17} aria-hidden="true" />
                      Stop navigation
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onStartNavigation}
                      className={`${ACTION_CLASSES} bg-brand-500 text-ink-950 shadow-accent active:bg-brand-600`}
                    >
                      <Navigation size={18} aria-hidden="true" />
                      Start navigation
                    </button>
                    <button
                      type="button"
                      onClick={onChangeSource}
                      className={`${ACTION_CLASSES} border border-white/10 bg-white/5 text-white active:bg-white/10`}
                    >
                      <RotateCcw size={17} aria-hidden="true" />
                      Change starting point
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className={`${ACTION_CLASSES} text-slate-400`}
                >
                  <X size={16} aria-hidden="true" />
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}