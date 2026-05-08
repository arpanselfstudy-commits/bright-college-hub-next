import mongoose, { Schema, Document } from 'mongoose'
import { UserRole, IUser } from '../types/backend.types'

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
    phoneNumber: { type: String },
    photo: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
)

export const UserModel = mongoose.models.User ?? mongoose.model<IUserDocument>('User', UserSchema)

/* 
Schema → defines structure
Model → interacts with database

Why not just:
mongoose.model('User', UserSchema)

Because Next.js uses:

Hot Reloading
Server Actions
API routes reload

Without this check you get:

OverwriteModelError:
Cannot overwrite `User` model once compiled.
What this line does
Step 1 — Check existing models
mongoose.models.User

If already created → reuse it.

Step 2 — Otherwise create model
mongoose.model('User', UserSchema)
This prevents the "Cannot overwrite `User` model once compiled" error.
*/

/* 
Runtime Reality

Although _id looks like a string:

665cba2f2c9c4d2b6b1a0c11

it is NOT a string internally.

It is a BSON object.
*/