import * as yup from 'yup'
import { LISTED_CATEGORIES, LISTED_CONDITIONS } from '@/modules/marketplace/types'
import type {
  EditProfileForm,
  ListProductForm,
  RequestProductForm,
  ManageListingForm,
  ManageRequestForm,
} from '@/modules/user/types'

// ── Shared rules ─────────────────────────────────────────
const phoneRule = yup
  .string()
  .required('Phone number is required')
  .matches(/^\d+$/, 'Phone number must contain digits only')
  .min(10, 'Phone number must be exactly 10 digits')
  .max(10, 'Phone number must be exactly 10 digits')

const emailRule = yup
  .string()
  .required('Email address is required')
  .email('Please enter a valid email address (e.g. name@example.com)')

// ── Edit Profile ─────────────────────────────────────────
export const editProfileSchema: yup.ObjectSchema<EditProfileForm> = yup.object({
  name: yup
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .required('Full name is required'),
  email: emailRule,
  phoneNumber: phoneRule,
})

// ── List Product ─────────────────────────────────────────
export const listProductSchema: yup.ObjectSchema<ListProductForm> = yup.object({
  productName: yup
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .required('Product name is required'),
  category: yup
    .mixed<ListProductForm['category']>()
    .oneOf(LISTED_CATEGORIES, 'Please select a valid category')
    .required('Category is required'),
  price: yup
    .string()
    .required('Price is required')
    .test('price-positive', 'Price must be greater than 0', (value) =>
      value ? parseFloat(value) > 0 : false
    ),
  description: yup
    .string()
    .min(10, 'Description must be at least 10 characters')
    .required('Description is required'),
  condition: yup
    .mixed<ListProductForm['condition']>()
    .oneOf(LISTED_CONDITIONS, 'Please select a condition')
    .required('Condition is required'),
  yearUsed: yup
    .number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .typeError('Years used must be a number')
    .min(0, 'Years used cannot be negative')
    .required('Years used is required'),
  isNegotiable: yup.boolean().required(),
  email: emailRule,
  phoneNo: phoneRule,
})

// ── Request Product ──────────────────────────────────────
export const requestProductSchema: yup.ObjectSchema<RequestProductForm> = yup.object({
  name: yup
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .required('Product name is required'),
  category: yup
    .mixed<RequestProductForm['category']>()
    .oneOf(LISTED_CATEGORIES, 'Please select a valid category')
    .required('Category is required'),
  priceFrom: yup
    .number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .typeError('Min price must be a number')
    .min(0, 'Min price cannot be negative')
    .required('Min price is required'),
  priceTo: yup
    .number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .typeError('Max price must be a number')
    .required('Max price is required')
    .test('priceTo-gt-priceFrom', 'Max price must be greater than min price', function (value) {
      return value > this.parent.priceFrom
    }),
  isNegotiable: yup.boolean().required(),
  description: yup
    .string()
    .min(10, 'Description must be at least 10 characters')
    .required('Description is required'),
  email: emailRule,
  phoneNo: phoneRule,
})

// ── Manage Listing ───────────────────────────────────────
export const manageListingSchema: yup.ObjectSchema<ManageListingForm> = yup.object({
  productName: yup
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .required('Product name is required'),
  category: yup
    .mixed<ManageListingForm['category']>()
    .oneOf(LISTED_CATEGORIES, 'Please select a valid category')
    .required('Category is required'),
  price: yup
    .string()
    .required('Price is required')
    .test('price-positive', 'Price must be greater than 0', (value) =>
      value ? parseFloat(value) > 0 : false
    ),
  description: yup
    .string()
    .min(10, 'Description must be at least 10 characters')
    .required('Description is required'),
  condition: yup
    .mixed<ManageListingForm['condition']>()
    .oneOf(LISTED_CONDITIONS, 'Please select a condition')
    .required('Condition is required'),
  yearUsed: yup
    .number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .typeError('Years used must be a number')
    .min(0, 'Years used cannot be negative')
    .required('Years used is required'),
  isNegotiable: yup.boolean().required(),
  isAvailable: yup.boolean().required(),
  email: emailRule,
  phoneNo: phoneRule,
})

// ── Manage Request ───────────────────────────────────────
export const manageRequestSchema: yup.ObjectSchema<ManageRequestForm> = yup.object({
  name: yup
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .required('Product name is required'),
  category: yup
    .string()
    .oneOf(LISTED_CATEGORIES, 'Please select a valid category')
    .required('Category is required') as yup.StringSchema<import('@/modules/marketplace/types').ListedProductCategory>,
  priceFrom: yup
    .number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .typeError('Min price must be a number')
    .min(0, 'Min price cannot be negative')
    .required('Min price is required'),
  priceTo: yup
    .number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .typeError('Max price must be a number')
    .required('Max price is required')
    .test('priceTo-gt-priceFrom', 'Max price must be greater than min price', function (value) {
      return value > this.parent.priceFrom
    }),
  isNegotiable: yup.boolean().required(),
  isFulfilled: yup.boolean().required(),
  description: yup
    .string()
    .min(10, 'Description must be at least 10 characters')
    .required('Description is required'),
  email: emailRule,
  phoneNo: phoneRule,
})
