import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg'
import { getFitView, MAP_CROP_RATIO, MAX_SCALE, MIN_SCALE } from '../map/mapViewport.js'
import { useTheme } from '../theme/index.js'
import { haptics } from '../utils/haptics.js'

const AnimatedView = Animated.createAnimatedComponent(View)

const HIT_RADIUS_RATIO = 0.028
const LABEL_HEIGHT_RATIO = 0.032

function clampScaleValue(value) {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE)
}

const clampScaleWorklet = (value) => {
  'worklet'
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE)
}

/**
 * Renders one floor of the campus graph.
 *
 * The SVG uses a `viewBox` fitted to the floor's bounds, so the map always
 * fills the available space regardless of the coordinate range the backend
 * reports. Pinch and pan are layered on top as a transform.
 */
export const CampusMap = forwardRef(function CampusMap(
  {
    nodes = [],
    edges = [],
    routePath = null,
    sourceNodeId = null,
    destinationNodeId = null,
    positionNodeId = null,
    selectedNodeId = null,
    viewKey = 'default',
    onSelectNode,
  },
  ref,
) {
  const theme = useTheme()
  const [size, setSize] = useState({ width: 0, height: 0 })

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1

  const view = useMemo(
    () => getFitView(nodes, aspect, 90, MAP_CROP_RATIO),
    [nodes, aspect],
  )

  const nodeRadius = Math.max(view.width, view.height) * 0.014
  const hitRadius = Math.max(view.width, view.height) * HIT_RADIUS_RATIO
  const fontSize = Math.max(view.width, view.height) * LABEL_HEIGHT_RATIO

  const resetTransform = useCallback(() => {
    scale.value = withTiming(1, { duration: 220 })
    savedScale.value = 1
    translateX.value = withTiming(0, { duration: 220 })
    translateY.value = withTiming(0, { duration: 220 })
    savedTranslateX.value = 0
    savedTranslateY.value = 0
  }, [savedScale, savedTranslateY, savedTranslateX, scale, translateX, translateY])

  useEffect(() => {
    resetTransform()
  }, [viewKey, resetTransform])

  const focusPoint = useCallback(
    (x, y, nextScale = 2.2) => {
      const target = clampScaleValue(nextScale)
      const centerX = view.minX + view.width / 2
      const centerY = view.minY + view.height / 2

      scale.value = withTiming(target, { duration: 260 })
      savedScale.value = target
      translateX.value = withTiming(centerX - target * x, { duration: 260 })
      translateY.value = withTiming(centerY - target * y, { duration: 260 })
      savedTranslateX.value = centerX - target * x
      savedTranslateY.value = centerY - target * y
    },
    [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, view],
  )

  useImperativeHandle(
    ref,
    () => ({
      reset: resetTransform,
      focusNode(node) {
        if (node) {
          focusPoint(node.x, node.y)
        }
      },
    }),
    [focusPoint, resetTransform],
  )

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .onUpdate((event) => {
          translateX.value = savedTranslateX.value + event.translationX
          translateY.value = savedTranslateY.value + event.translationY
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value
          savedTranslateY.value = translateY.value
        }),
    [savedTranslateX, savedTranslateY, translateX, translateY],
  )

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          scale.value = clampScaleWorklet(savedScale.value * event.scale)
        })
        .onEnd(() => {
          savedScale.value = scale.value
        }),
    [savedScale, scale],
  )

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          scale.value = withTiming(clampScaleWorklet(savedScale.value * 1.8), {
            duration: 200,
          })
          savedScale.value = clampScaleWorklet(savedScale.value * 1.8)
        }),
    [savedScale, scale],
  )

  const composed = useMemo(
    () => Gesture.Simultaneous(pan, pinch, doubleTap),
    [doubleTap, pan, pinch],
  )

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  const handleSelect = useCallback(
    (node) => {
      haptics.selection()
      onSelectNode?.(node)
    },
    [onSelectNode],
  )

  const nodesById = useMemo(() => {
    const lookup = new Map()
    for (const node of nodes) {
      lookup.set(node.nodeId, node)
    }
    return lookup
  }, [nodes])

  const visibleEdges = useMemo(
    () =>
      edges
        .map((edge) => ({
          edge,
          from: nodesById.get(edge.fromNode),
          to: nodesById.get(edge.toNode),
        }))
        .filter((entry) => entry.from && entry.to),
    [edges, nodesById],
  )

  const showLabels = nodes.length <= 40

  return (
    <View
      style={[styles.root, { backgroundColor: theme.mapBackground }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout
        setSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        )
      }}
    >
      <GestureDetector gesture={composed}>
        <AnimatedView style={[styles.canvas, animatedStyle]}>
          {size.width > 0 ? (
            <Svg
              width={size.width}
              height={size.height}
              viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}
            >
              {routePath ? (
                <>
                  <Path
                    d={routePath}
                    stroke={theme.mapRouteHalo}
                    strokeWidth={nodeRadius * 2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <Path
                    d={routePath}
                    stroke={theme.mapRoute}
                    strokeWidth={nodeRadius * 1.1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </>
              ) : null}

              <G>
                {visibleEdges.map(({ edge, from, to }, index) => (
                  <Line
                    key={`${edge.fromNode}-${edge.toNode}-${index}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={theme.mapEdge}
                    strokeWidth={nodeRadius * 0.55}
                    strokeLinecap="round"
                  />
                ))}
              </G>

              {nodes.map((node) => {
                const isSource = node.nodeId === sourceNodeId
                const isDestination = node.nodeId === destinationNodeId
                const isSelected = node.nodeId === selectedNodeId
                const isPosition = node.nodeId === positionNodeId

                const fill = isDestination
                  ? theme.mapRoute
                  : isSource
                    ? theme.accent
                    : theme.mapNode

                return (
                  <G key={node.nodeId}>
                    {isPosition ? (
                      <Circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeRadius * 2.8}
                        fill={theme.accent}
                        opacity={0.18}
                      />
                    ) : null}

                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={nodeRadius * (isSource || isDestination || isPosition ? 1.5 : 1)}
                      fill={fill}
                      stroke={isSelected ? theme.text : theme.mapNodeBorder}
                      strokeWidth={nodeRadius * (isSelected ? 0.6 : 0.35)}
                    />

                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={hitRadius}
                      fill="transparent"
                      onPress={() => runOnJS(handleSelect)(node)}
                    />

                    {showLabels ? (
                      <SvgText
                        x={node.x}
                        y={node.y - nodeRadius * 2.1}
                        fontSize={fontSize}
                        fill={theme.mapLabel}
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {node.name}
                      </SvgText>
                    ) : null}
                  </G>
                )
              })}
            </Svg>
          ) : null}
        </AnimatedView>
      </GestureDetector>
    </View>
  )
})

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
})

export default CampusMap
