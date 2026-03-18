import { ScatterplotLayer, TextLayer, TripsLayer } from 'deck.gl'
import DeckGL from '@deck.gl/react'
import { Globe, LocateFixed, Maximize2, Minimize2, Minus, Plus, Radar } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Map } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import { BRAZIL_HUB_COORDINATES } from '../lib/geo'
import type { ExporterFlow } from '../types'

const mapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const worldView = {
  longitude: -18,
  latitude: 8,
  zoom: 0.88,
  pitch: 22,
  bearing: 0,
}

const brazilFocusView = {
  longitude: -36,
  latitude: -12,
  zoom: 1.62,
  pitch: 28,
  bearing: 8,
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function buildRoutePath(source: [number, number], destination: [number, number], steps = 28) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps
    const longitude = source[0] + (destination[0] - source[0]) * progress

    const latitudeArc =
      Math.sin(progress * Math.PI) *
      Math.min(15, Math.max(3.5, Math.abs(source[0] - destination[0]) * 0.04 + Math.abs(source[1] - destination[1]) * 0.12))

    const latitude = source[1] + (destination[1] - source[1]) * progress + latitudeArc

    return [longitude, latitude] as [number, number]
  })
}

export function WorldFlowMap({ flows }: { flows: ExporterFlow[] }) {
  const [animationPhase, setAnimationPhase] = useState(0)
  const [isMaximized, setIsMaximized] = useState(false)
  const [viewState, setViewState] = useState(worldView)

  useEffect(() => {
    let frame = 0

    const animate = (time: number) => {
      setAnimationPhase((time % 6400) / 6400)
      frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!isMaximized) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMaximized(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMaximized])

  const summary = useMemo(() => {
    const totalUnits = flows.reduce((sum, flow) => sum + flow.units, 0)
    const totalRecords = flows.reduce((sum, flow) => sum + flow.records, 0)
    return {
      totalUnits,
      totalRecords,
      topExporter: flows[0]?.country ?? 'Unavailable',
    }
  }, [flows])

  const layers = useMemo(() => {
    const maxUnits = Math.max(...flows.map((flow) => flow.units), 1)
    const exporterPins = flows.map((flow, index) => ({
      ...flow,
      id: `${flow.country}-${index}`,
      intensity: flow.units / maxUnits,
      routePath: buildRoutePath(flow.coordinates, flow.destination),
      timestamps: Array.from({ length: 29 }, (_, step) => step * (100 / 28)),
    }))
    const brazilPulse = [
      {
        id: 'brazil-pulse',
        position: BRAZIL_HUB_COORDINATES,
        radius: 18 + Math.sin(animationPhase * Math.PI * 2) * 6,
      },
    ]
    const labels = flows.slice(0, 10).map((flow) => ({
      id: `${flow.country}-label`,
      position: [flow.coordinates[0], flow.coordinates[1] - 6] as [number, number],
      text: `${flow.country} ${flow.records}`,
    }))

    return [
      new TripsLayer({
        id: 'export-route-streams',
        data: exporterPins,
        pickable: true,
        capRounded: true,
        jointRounded: true,
        fadeTrail: true,
        trailLength: 68,
        currentTime: animationPhase * 100,
        widthUnits: 'pixels',
        getPath: (flow: typeof exporterPins[number]) => flow.routePath,
        getTimestamps: (flow: typeof exporterPins[number]) => flow.timestamps,
        getColor: (flow: typeof exporterPins[number]) => [78, 232, 214, 170 + Math.round(flow.intensity * 70)],
        getWidth: (flow: typeof exporterPins[number]) => 2.1 + flow.intensity * 4.2,
      }),
      new ScatterplotLayer({
        id: 'exporter-pins',
        data: exporterPins,
        pickable: true,
        stroked: true,
        filled: true,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        radiusMinPixels: 6,
        radiusMaxPixels: 18,
        getPosition: (flow: ExporterFlow) => flow.coordinates,
        getRadius: (flow: typeof exporterPins[number]) => 7 + flow.intensity * 7,
        getFillColor: (flow: typeof exporterPins[number]) => [77, 215, 255, 140 + Math.round(flow.intensity * 70)],
        getLineColor: [170, 245, 255, 255],
        getLineWidth: 1.25,
      }),
      new ScatterplotLayer({
        id: 'brazil-hub-core',
        data: [{ position: BRAZIL_HUB_COORDINATES }],
        pickable: false,
        radiusUnits: 'pixels',
        radiusMinPixels: 8,
        radiusMaxPixels: 8,
        getPosition: (item: { position: [number, number] }) => item.position,
        getRadius: 8,
        getFillColor: [70, 245, 155, 255],
      }),
      new ScatterplotLayer({
        id: 'brazil-hub-pulse',
        data: brazilPulse,
        pickable: false,
        stroked: true,
        filled: false,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        getPosition: (item: { position: [number, number] }) => item.position,
        getRadius: (item: { radius: number }) => item.radius,
        getLineColor: [70, 245, 155, 170],
        getLineWidth: 2,
      }),
      new TextLayer({
        id: 'route-labels',
        data: labels,
        pickable: false,
        getPosition: (item: { position: [number, number] }) => item.position,
        getText: (item: { text: string }) => item.text,
        getColor: [150, 188, 201, 180],
        getSize: 12,
        sizeUnits: 'pixels',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        fontFamily: 'Fira Code, monospace',
      }),
    ]
  }, [animationPhase, flows])

  const mapFrame = (
    <>
      {isMaximized ? (
        <button
          aria-label="Minimize map overlay"
          className="flow-map__backdrop"
          onClick={() => setIsMaximized(false)}
          type="button"
        />
      ) : null}
      <div
        aria-modal={isMaximized ? 'true' : undefined}
        className={`flow-map__frame${isMaximized ? ' flow-map__frame--maximized' : ''}`}
        role={isMaximized ? 'dialog' : undefined}
      >
        <DeckGL
          controller={{ dragRotate: false, touchRotate: false }}
          layers={layers}
          getTooltip={({ object }) => {
            if (!object || typeof object !== 'object' || !('country' in object)) {
              return null
            }

            const flow = object as Pick<ExporterFlow, 'country' | 'units' | 'records' | 'assets'>
            return {
              html: `<strong>${flow.country}</strong><br />${formatCount(flow.units)} tracked units<br />${flow.records} line items<br />${flow.assets} linked assets`,
              style: {
                background: 'rgba(2, 8, 23, 0.92)',
                color: '#f8fafc',
                border: '1px solid rgba(115, 252, 176, 0.22)',
                borderRadius: '14px',
                fontFamily: 'Fira Code, monospace',
                padding: '10px 12px',
              },
            }
          }}
          onViewStateChange={({ viewState: nextViewState }) =>
            setViewState((current) => ({
              ...current,
              ...nextViewState,
            }))
          }
          style={{ position: 'absolute', inset: '0' }}
          viewState={viewState}
        >
          <Map
            attributionControl={false}
            dragRotate={false}
            mapLib={maplibregl}
            mapStyle={mapStyle}
            reuseMaps
          />
        </DeckGL>

        <div className="flow-map__hud">
          <div>
            <p className="eyebrow">OSINT route mesh</p>
            <strong>Exporter states feeding the Brazilian procurement hub</strong>
            <span>
              {flows.length} mapped countries · {formatCount(summary.totalRecords)} line items ·{' '}
              {formatCount(summary.totalUnits)} tracked units
            </span>
          </div>
          <div className="flow-map__hud-tags">
            <span className="micro-label">
              <Radar size={14} aria-hidden="true" />
              top exporter: {summary.topExporter}
            </span>
            <span className="micro-label">
              <LocateFixed size={14} aria-hidden="true" />
              nexus: Brasilia
            </span>
            <button
              className="flow-map__control flow-map__control--label"
              onClick={() => setIsMaximized((current) => !current)}
              type="button"
            >
              {isMaximized ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
              {isMaximized ? 'Minimize' : 'Maximize'}
            </button>
          </div>
        </div>

        <div className="flow-map__controls" aria-label="Map controls">
          <button
            className="flow-map__control"
            onClick={() => setViewState((current) => ({ ...current, zoom: Math.min(current.zoom + 0.25, 4.5) }))}
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
          <button
            className="flow-map__control"
            onClick={() => setViewState((current) => ({ ...current, zoom: Math.max(current.zoom - 0.25, 0.6) }))}
            type="button"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <button className="flow-map__control flow-map__control--label" onClick={() => setViewState(worldView)} type="button">
            <Globe size={16} aria-hidden="true" />
            World
          </button>
          <button
            className="flow-map__control flow-map__control--label"
            onClick={() => setViewState(brazilFocusView)}
            type="button"
          >
            <LocateFixed size={16} aria-hidden="true" />
            Brazil focus
          </button>
        </div>

        <div className="flow-map__legend">
          <span className="flow-map__legend-item">
            <i className="flow-map__legend-dot flow-map__legend-dot--source" aria-hidden="true" />
            exporter pin
          </span>
          <span className="flow-map__legend-item">
            <i className="flow-map__legend-dot flow-map__legend-dot--route" aria-hidden="true" />
            transfer route
          </span>
          <span className="flow-map__legend-item">
            <i className="flow-map__legend-dot flow-map__legend-dot--hub" aria-hidden="true" />
            brazil command nexus
          </span>
        </div>
      </div>
    </>
  )

  return (
    <div className={`flow-map${isMaximized ? ' flow-map--maximized' : ''}`}>
      {!isMaximized ? mapFrame : null}
      {isMaximized ? createPortal(mapFrame, document.body) : null}
    </div>
  )
}
