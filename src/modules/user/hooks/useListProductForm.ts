'use client'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { listProductSchema } from '@/modules/user/validation'
import type { ListProductForm } from '@/modules/user/types'

export function useListProductForm() {
  const { register, handleSubmit, formState, watch, setValue, control } = useForm<ListProductForm>({
    resolver: yupResolver(listProductSchema),
    defaultValues: {
      productName: '',
      category: 'ELECTRONICS',
      price: '',
      description: '',
      condition: 'NEW',
      yearUsed: undefined as unknown as number,
      isNegotiable: false,
      email: '',
      phoneNo: '',
    },
  })

  return { register, handleSubmit, formState, watch, setValue, control }
}
