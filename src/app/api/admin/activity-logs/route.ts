import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/backend/lib/withErrorHandler'
import { getAuthUser } from '@/backend/lib/authGuard'
import { authorize, UserRole } from '@/backend/lib/authorize'
import { sendSuccess } from '@/backend/lib/response'
import { AdminService } from '@/backend/services/admin.service'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getAuthUser()
  authorize(user, UserRole.ADMIN)

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const action = searchParams.get('action') as 'LOGIN' | 'LOGOUT' | null
  const userId = searchParams.get('userId') ?? undefined

  const result = await AdminService.getActivityLogs({
    page,
    limit,
    action: action ?? undefined,
    userId,
  })

  return sendSuccess(result)
})
