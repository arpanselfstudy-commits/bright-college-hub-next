import { withErrorHandler } from '@/backend/lib/withErrorHandler'
import { getAuthUser } from '@/backend/lib/authGuard'
import { authorize, UserRole } from '@/backend/lib/authorize'
import { sendSuccess } from '@/backend/lib/response'
import { AdminService } from '@/backend/services/admin.service'

export const GET = withErrorHandler(async () => {
  const user = await getAuthUser()
  authorize(user, UserRole.ADMIN)

  const stats = await AdminService.getDashboardStats()
  return sendSuccess(stats)
})
