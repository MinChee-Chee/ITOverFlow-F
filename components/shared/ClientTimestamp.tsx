"use client"

import React, { useEffect, useMemo, useState } from "react"
import { getTimestamp } from "@/lib/utils"

type Props = {
  createdAt: Date | string
  prefix?: string
  className?: string
}

/**
 * Renders a client-only relative timestamp to avoid SSR/client mismatches.
 */
const ClientTimestamp = ({ createdAt, prefix = "", className }: Props) => {
  const [text, setText] = useState<string>("")

  // Normalize to a stable primitive so Date instances don't retrigger the effect unnecessarily
  const createdKey = useMemo(() => {
    if (typeof createdAt === "string") return createdAt
    return createdAt ? createdAt.toISOString() : ""
  }, [createdAt])

  useEffect(() => {
    if (!createdKey) {
      setText("")
      return
    }
    const created = new Date(createdKey)
    const now = new Date()
    const value = `${prefix}${getTimestamp(created, now)}`
    setText(value)
  }, [createdKey, prefix])

  if (!text) return null

  return <span className={className}>{text}</span>
}

export default ClientTimestamp


