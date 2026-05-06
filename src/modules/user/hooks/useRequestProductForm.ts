'use client'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { requestProductSchema } from '@/modules/user/validation'
import type { RequestProductForm } from '@/modules/user/types'

export function useRequestProductForm() {
  const { register, handleSubmit, formState, watch, setValue, control } =
    useForm<RequestProductForm>({
      resolver: yupResolver(requestProductSchema),
      defaultValues: {
        name: '',
        category: 'ELECTRONICS',
        priceFrom: undefined as unknown as number,
        priceTo: undefined as unknown as number,
        isNegotiable: false,
        description: '',
        email: '',
        phoneNo: '',
      },
    })

  return { register, handleSubmit, formState, watch, setValue, control }
}
