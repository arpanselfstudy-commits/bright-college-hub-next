import { connectDB } from '../lib/db'
import { AppError } from '../lib/appError'
import { CmsModel } from '../models/cms.model'
import { ICms } from '../types/backend.types'
import { z } from 'zod'
import { createCmsSchema, updateCmsSchema } from '../validators/cms.validator'

type CreateCmsInput = z.infer<typeof createCmsSchema>
type UpdateCmsInput = z.infer<typeof updateCmsSchema>

async function generateCmsId(): Promise<string> {
  while (true) {
    const id = `CMS-${Math.floor(1000 + Math.random() * 9000)}`
    const exists = await CmsModel.findOne({ cmsId: id })
    if (!exists) return id
  }
}

export async function createCms(data: CreateCmsInput): Promise<ICms> {
  await connectDB()
  const type = data.type.toUpperCase()
  const existing = await CmsModel.findOne({ type })
  if (existing) throw new AppError('CMS type already exists', 409, 'CMS_TYPE_EXISTS')
  const cmsId = await generateCmsId()
  const cms = await CmsModel.create({ ...data, type, cmsId })
  return cms.toObject() as ICms
}

function buildCmsQuery(typeOrId: string) {
  // If it looks like a MongoDB ObjectId (24 hex chars), query by _id; otherwise by type
  return /^[a-f\d]{24}$/i.test(typeOrId)
    ? { _id: typeOrId }
    : { type: typeOrId.toUpperCase() }
}

export async function updateCms(typeOrId: string, data: UpdateCmsInput): Promise<ICms> {
  await connectDB()
  const cms = await CmsModel.findOneAndUpdate(
    buildCmsQuery(typeOrId),
    data,
    { new: true, runValidators: true }
  )
  if (!cms) throw new AppError('CMS page not found', 404, 'NOT_FOUND')
  return cms.toObject() as ICms
}

export async function deleteCms(typeOrId: string): Promise<void> {
  await connectDB()
  const cms = await CmsModel.findOneAndDelete(buildCmsQuery(typeOrId))
  if (!cms) throw new AppError('CMS page not found', 404, 'NOT_FOUND')
}

export async function getCmsByType(type: string): Promise<ICms> {
  await connectDB()
  const cms = await CmsModel.findOne({ type: type.toUpperCase(), isActive: true }).lean()
  if (!cms) throw new AppError('CMS page not found', 404, 'NOT_FOUND')
  return cms as unknown as ICms
}

export async function getAllCmsPages(): Promise<ICms[]> {
  await connectDB()
  const pages = await CmsModel.find({}).sort({ type: 1 }).lean()
  return pages as unknown as ICms[]
}
