import { createServerSupabaseClient } from './supabase-server'

interface RateLimitConfig {
  table: string
  userField: string
  windowMinutes: number
  maxCount: number
  filter?: { field: string, value: string }
}

export async function checkRateLimit(userId: string, config: RateLimitConfig): Promise<{ allowed: boolean, remaining: number, resetIn: number }> {
  const supabase = await createServerSupabaseClient()
  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000).toISOString()

  let query = supabase
    .from(config.table)
    .select('*', { count: 'exact', head: true })
    .eq(config.userField, userId)
    .gte('created_at', windowStart)

  if (config.filter) {
    query = query.eq(config.filter.field, config.filter.value)
  }

  const { count } = await query
  const current = count || 0
  const remaining = Math.max(0, config.maxCount - current)
  const resetIn = config.windowMinutes

  return {
    allowed: current < config.maxCount,
    remaining,
    resetIn,
  }
}

// Pre-defined rate limits
export const RATE_LIMITS = {
  posts: {
    table: 'posts',
    userField: 'user_id',
    windowMinutes: 60,
    maxCount: 10,
  },
  messages: {
    table: 'messages',
    userField: 'user_id',
    windowMinutes: 1,
    maxCount: 20,
  },
  reports: {
    table: 'reports',
    userField: 'reporter_id',
    windowMinutes: 60 * 24,
    maxCount: 5,
  },
  comments: {
    table: 'comments',
    userField: 'user_id',
    windowMinutes: 60,
    maxCount: 30,
  },
}
