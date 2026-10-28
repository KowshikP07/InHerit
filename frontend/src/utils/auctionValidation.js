import { CATEGORIES, CONDITIONS } from '../services/auctionService.js'

export const MAX_IMAGES = 5
export const MAX_IMAGE_SIZE = 1024 * 1024
export const TITLE_LIMIT = 80
export const DESCRIPTION_LIMIT = 1500

export function validateListing(values, imageCount) {
  const errors = {}
  const title = String(values.title ?? '').trim()
  const description = String(values.description ?? '').trim()
  if (!title) errors.title = 'Product title is required.'
  else if (title.length > TITLE_LIMIT) errors.title = `Use ${TITLE_LIMIT} characters or fewer.`
  if (!CATEGORIES.includes(values.category)) errors.category = 'Choose a category.'
  if (!CONDITIONS.includes(values.condition)) errors.condition = 'Choose a condition.'
  if (!description) errors.description = 'Description is required.'
  else if (description.length > DESCRIPTION_LIMIT) errors.description = `Use ${DESCRIPTION_LIMIT} characters or fewer.`
  if (Number(values.startingPrice) <= 0) errors.startingPrice = 'Starting price must be greater than zero.'
  if (Number(values.minIncrement) <= 0) errors.minIncrement = 'Minimum increment must be greater than zero.'
  if (!values.endTime) errors.endTime = 'Choose an auction closing date and time.'
  else if (new Date(values.endTime).getTime() <= Date.now()) errors.endTime = 'Closing time must be in the future.'
  if (!imageCount) errors.images = 'Attach at least one product image.'
  return errors
}

export function validateImageFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Only JPEG, PNG, and WebP images are supported.'
  if (file.size > MAX_IMAGE_SIZE) return 'Each image must be 1 MB or smaller.'
  return null
}

export function imageId() {
  return globalThis.crypto?.randomUUID?.() ?? `image-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
