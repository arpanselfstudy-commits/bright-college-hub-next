import { z } from 'zod'

export const generateDescriptionSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.string().min(1, 'Price is required'),
  condition: z.string().min(1, 'Condition is required'),
  yearUsed: z.number().int().min(0, 'Years used must be 0 or more'),
})

export type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>
