// Kill Zone Session Windows (UTC hours)

import { KillZone, KillZoneSession } from './types'

const KILL_ZONES: KillZone[] = [
  { session: 'asia', startHourUTC: 0, endHourUTC: 3, active: true },
  { session: 'london', startHourUTC: 7, endHourUTC: 10, active: true },
  { session: 'new_york', startHourUTC: 12, endHourUTC: 15, active: true },
]

export function isInKillZone(date: Date): KillZoneSession | null {
  const hourUTC = date.getUTCHours()

  for (const zone of KILL_ZONES) {
    if (hourUTC >= zone.startHourUTC && hourUTC < zone.endHourUTC) {
      return zone.session
    }
  }

  return null
}

export function getActiveKillZones(date: Date): KillZone[] {
  const hourUTC = date.getUTCHours()

  return KILL_ZONES.filter(
    (zone) => hourUTC >= zone.startHourUTC && hourUTC < zone.endHourUTC
  )
}

export function getCurrentSession(): { session: KillZoneSession | null; label: string } {
  const now = new Date()
  const s = isInKillZone(now)
  if (!s) return { session: null, label: 'OFF SESSION' }
  const labels: Record<KillZoneSession, string> = {
    asia: 'ASIA (00-03 UTC)',
    london: 'LONDON (07-10 UTC)',
    new_york: 'NEW YORK (12-15 UTC)',
  }
  return { session: s, label: labels[s] }
}

export function getKillZoneColor(session: KillZoneSession): string {
  const colors: Record<KillZoneSession, string> = {
    asia: '#a855f7',
    london: '#3b82f6',
    new_york: '#22c55e',
  }
  return colors[session]
}

export { KILL_ZONES }
