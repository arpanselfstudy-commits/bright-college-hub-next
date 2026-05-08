import mongoose, { Schema, Document, Types } from 'mongoose'
import { IRefreshToken } from '../types/backend.types'

export interface IRefreshTokenDocument extends Omit<IRefreshToken, '_id' | 'userId'>, Document {
  userId: Types.ObjectId
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    /*
    What happens here

      You tell MongoDB:

      Create an index on the token field.

      MongoDB internally builds a lookup structure like:

      TOKEN INDEX

      token_value          → document location
      -----------------------------------------
      abc123               → doc pointer
      xyz456               → doc pointer
      token789             → doc pointer
    */
    deviceInfo: {
      type: {
        ip: { type: String },
        name: { type: String },
      },
      _id: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
/*
TTL Index (Automatic Expiration)
RefreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)

This creates a TTL (Time-To-Live) index.

What MongoDB does

MongoDB runs a background cleanup worker.

It checks:

Is current time >= expiresAt ?

If YES:

Delete document automatically

No backend code required. 
*/

export const RefreshTokenModel =
  mongoose.models.RefreshToken ??
  mongoose.model<IRefreshTokenDocument>('RefreshToken', RefreshTokenSchema)
