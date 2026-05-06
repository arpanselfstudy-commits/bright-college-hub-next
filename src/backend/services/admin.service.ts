import { connectDB } from '../lib/db'
import { UserModel } from '../models/user.model'
import { JobModel } from '../models/job.model'
import { ShopModel } from '../models/shop.model'
import { ListedProductModel } from '../models/listedProduct.model'
import { RequestedProductModel } from '../models/requestedProduct.model'
import { UserActivityLogModel } from '../models/userActivityLog.model'

export const AdminService = {
  async getDashboardStats() {
    await connectDB()

    const [
      totalUsers,
      totalJobs,
      totalShops,
      totalListedProducts,
      totalRequestedProducts,
      totalLogins,
      totalLogouts,
    ] = await Promise.all([
      UserModel.countDocuments(),
      JobModel.countDocuments(),
      ShopModel.countDocuments(),
      ListedProductModel.countDocuments(),
      RequestedProductModel.countDocuments(),
      UserActivityLogModel.countDocuments({ action: 'LOGIN' }),
      UserActivityLogModel.countDocuments({ action: 'LOGOUT' }),
    ])

    return {
      totalUsers,
      totalJobs,
      totalShops,
      totalListedProducts,
      totalRequestedProducts,
      totalLogins,
      totalLogouts,
    }
  },

  async getActivityLogs(filters: {
    page?: number
    limit?: number
    action?: 'LOGIN' | 'LOGOUT'
    userId?: string
  }) {
    await connectDB()

    const { page = 1, limit = 20, action, userId } = filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {}

    if (action) query.action = action
    if (userId) query.userId = userId

    const skip = (page - 1) * limit
    const [logs, total] = await Promise.all([
      UserActivityLogModel.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserActivityLogModel.countDocuments(query),
    ])

    return {
      logs,
      total,
      page,
      limit,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    }
  },
}
