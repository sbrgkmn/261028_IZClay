export interface PrinterProfile {
  id: string
  name: string
  version: string
  buildVolume: { x: number; y: number; z: number }
  bed: { x: number; y: number }
  nozzles: number[]
  speedRange: [number, number]
  evidence: 'supplied-gcode' | 'official-baseline'
  startScript: string[]
  endScript: string[]
  notes: string
}
