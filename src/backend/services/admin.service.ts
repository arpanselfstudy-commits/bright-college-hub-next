import { connectDB } from '../lib/db'
import { UserModel } from '../models/user.model'
import { JobModel } from '../models/job.model'
import { ShopModel } from '../models/shop.model'
import { ListedProductModel } from '../models/listedProduct.model'
import { RequestedProductModel } from '../models/requestedProduct.model'

export const AdminService = {
  async getDashboardStats() {
    await connectDB()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      newUsersThisMonth,
      totalJobs,
      totalShops,
      totalListedProducts,
      totalRequestedProducts,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      JobModel.countDocuments(),
      ShopModel.countDocuments(),
      ListedProductModel.countDocuments(),
      RequestedProductModel.countDocuments(),
    ])

    return {
      totalUsers,
      newUsersThisMonth,
      totalJobs,
      totalShops,
      totalListedProducts,
      totalRequestedProducts,
    }
  },
}
