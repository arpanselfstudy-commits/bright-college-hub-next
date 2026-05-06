import mongoose, { Schema, Document, Types } from 'mongoose'

export type ActivityAction = 'LOGIN' | 'LOGOUT'

export interface IUserActivityLog {
  _id?: string
  userId: Types.ObjectId
  action: ActivityAction
  ip?: string
  deviceName?: string
  createdAt?: Date
}

export interface IUserActivityLogDocument extends Omit<IUserActivityLog, '_id' | 'userId'>, Document {
  userId: Types.ObjectId
}

const UserActivityLogSchema = new Schema<IUserActivityLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: ['LOGIN', 'LOGOUT'], required: true },
    ip: { type: String },
    deviceName: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// Auto-expire logs after 90 days
UserActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export const UserActivityLogModel =
  mongoose.models.UserActivityLog ??
  mongoose.model<IUserActivityLogDocument>('UserActivityLog', UserActivityLogSchema)
