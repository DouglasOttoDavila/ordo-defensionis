import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Cpu,
  Plane,
  Radar,
  Rocket,
  Shield,
  ShipWheel,
  Truck,
  Waves,
} from 'lucide-react'
import type { Branch } from '../types'

export function getCategoryIcon(category: string): LucideIcon {
  switch (category) {
    case 'Aircraft':
      return Plane
    case 'Ships':
      return ShipWheel
    case 'Missiles':
      return Rocket
    case 'Sensors':
      return Radar
    case 'Armoured vehicles':
      return Truck
    case 'Artillery':
      return Shield
    case 'Naval weapons':
      return Waves
    case 'Engines':
      return Cpu
    default:
      return Boxes
  }
}

export function getBranchTone(branch: Branch) {
  switch (branch) {
    case 'Air':
      return 'status-tag'
    case 'Land':
      return 'status-tag status-tag--accent'
    case 'Naval':
      return 'status-tag status-tag--danger'
    default:
      return 'status-tag'
  }
}
