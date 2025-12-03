import { Roles } from '@/types/globals'
import { auth } from '@clerk/nextjs/server'

export const checkRole = async (role: Roles) => {
  const { sessionClaims } = await auth()

  const claim = (sessionClaims as any)?.metadata?.role

  if (Array.isArray(claim)) {
    // If roles are stored as an array, check inclusion (case-insensitive)
    return claim.some(
      (r) => typeof r === 'string' && r.toLowerCase() === role.toLowerCase()
    )
  }

  if (typeof claim === 'string') {
    // Handle simple string roles, normalizing case
    return claim.toLowerCase() === role.toLowerCase()
  }

  return false
}