import { useEffect, useState } from 'react'
import { getImage } from '../../services/imageStorageService.js'

export default function AuctionImage({ imageId, alt, className = '' }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let active = true
    let objectUrl = ''
    getImage(imageId).then((blob) => {
      if (active && blob) {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      }
    }).catch(() => setUrl(''))
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [imageId])

  if (!url) return <div className={`auction-image-placeholder ${className}`} aria-label="Image unavailable">Image unavailable</div>
  return <img className={className} src={url} alt={alt} />
}
