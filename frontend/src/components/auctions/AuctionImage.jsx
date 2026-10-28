import { useEffect, useState } from 'react'
import { getImage } from '../../services/imageStorageService.js'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function AuctionImage({ imageId, alt, className = '' }) {
  const directUrl = typeof imageId === 'string' && (imageId.startsWith('http://') || imageId.startsWith('https://'))
    ? imageId
    : typeof imageId === 'string' && imageId.startsWith('/uploads/')
    ? `${BACKEND_URL}${imageId}`
    : ''

  const [blobUrl, setBlobUrl] = useState('')

  useEffect(() => {
    if (directUrl || !imageId) return undefined

    let active = true
    let objectUrl = ''
    getImage(imageId)
      .then((blob) => {
        if (active && blob) {
          objectUrl = URL.createObjectURL(blob)
          setBlobUrl(objectUrl)
        }
      })
      .catch(() => setBlobUrl(''))

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [directUrl, imageId])

  const effectiveUrl = directUrl || blobUrl

  if (!effectiveUrl) {
    return (
      <div className={`auction-image-placeholder ${className}`} aria-label="Image unavailable">
        Image unavailable
      </div>
    )
  }

  return <img className={className} src={effectiveUrl} alt={alt} />
}
