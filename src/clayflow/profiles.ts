import type { PrinterProfile } from './types'

export const PRINTER_PROFILES: PrinterProfile[] = [
  {
    id: 'potterbot-super-10',
    name: 'PotterBot Super 10',
    version: '10',
    buildVolume: { x: 415, y: 405, z: 500 },
    bed: { x: 381, y: 381 },
    nozzles: [3, 4, 5, 6],
    speedRange: [30, 200],
    evidence: 'supplied-gcode',
    startScript: [
      'M104 S0',
      'M105',
      'M109 S0',
      'G28 ; Home',
      'G1 X207.5 Y202.5 Z20 F10000 ; Center above bed',
      'G92 E0',
      'G1 E3000 F40000 ; Prime extruder - supplied profile value',
      'G92 E0',
      'M82 ; Absolute extrusion',
    ],
    endScript: [
      'M83 ; Relative extrusion',
      'G91 ; Relative positioning',
      'G1 Z150 E-4000 F66666 ; Lift and depressurize - supplied profile value',
      'G90 ; Absolute positioning',
      'G28 Z',
      'G1 X207.5 Y0 F500',
      'M82 ; Absolute extrusion',
    ],
    notes: 'Envelope and start/end commands match the supplied Cura file. Verify prime/depressurization with an unloaded machine after any hardware or firmware change.',
  },
  {
    id: 'potterbot-10-xl',
    name: 'PotterBot 10 XL',
    version: '10',
    buildVolume: { x: 490, y: 490, z: 710 },
    bed: { x: 381, y: 381 },
    nozzles: [3, 4, 5, 6],
    speedRange: [30, 200],
    evidence: 'official-baseline',
    startScript: ['G90 ; Absolute positioning', 'M82 ; Absolute extrusion', 'G28 ; Home', 'G92 E0'],
    endScript: ['G90 ; Absolute positioning', 'M82 ; Absolute extrusion', 'G28 Z ; Home Z'],
    notes: 'Official envelope baseline. No supplied XL machine file was available, so machine-specific prime and pressure-release commands are intentionally omitted.',
  },
]

export const getPrinter = (id: string) =>
  PRINTER_PROFILES.find((profile) => profile.id === id) ?? PRINTER_PROFILES[0]
