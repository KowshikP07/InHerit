import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react'
import { CATEGORIES, CONDITIONS, createAuction, getAuction, updateAuction } from '../../services/auctionService.js'
import { deleteImages, getImage, saveImages } from '../../services/imageStorageService.js'
import { getStudentSession } from '../../services/studentRosterService.js'
import { imageId, MAX_IMAGES, validateImageFile, validateListing } from '../../utils/auctionValidation.js'

export default function CreateAuction() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const student = getStudentSession()
  const existing = params.get('id') ? getAuction(params.get('id')) : null
  const [values, setValues] = useState(existing ? { ...existing, endTime: toLocalDateTime(existing.endTime) } : { title: '', category: '', description: '', condition: '', startingPrice: '', minIncrement: '', endTime: '' })
  const [files, setFiles] = useState([])
  const [existingImages, setExistingImages] = useState(existing?.imageIds ?? [])
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing && existing.sellerId !== student?.id) navigate('/my-listings', { replace: true })
  }, [existing, navigate, student])

  function change(event) { setValues((current) => ({ ...current, [event.target.name]: event.target.value })) }
  function addFiles(event) {
    const next = Array.from(event.target.files ?? [])
    const combined = [...files, ...next]
    const message = combined.length > MAX_IMAGES ? `You can attach up to ${MAX_IMAGES} images.` : next.map(validateImageFile).find(Boolean)
    setErrors((current) => ({ ...current, images: message || '' }))
    setFiles(combined.slice(0, MAX_IMAGES).filter((file) => !validateImageFile(file)))
    event.target.value = ''
  }
  function removeFile(index) { setFiles((current) => current.filter((_, i) => i !== index)) }

  async function submit(event) {
    event.preventDefault()
    setStatus('')
    const nextErrors = validateListing(values, files.length + existingImages.length)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    const ids = existingImages.length ? [...existingImages] : []
    const newFiles = files
    const newIds = newFiles.map(imageId)
    try {
      await saveImages(newIds, newFiles)
      const input = { ...values, sellerId: student.id, sellerName: student.name, imageIds: [...ids, ...newIds] }
      const result = existing ? await updateAuction(existing.id, student.id, input) : await createAuction(input, newFiles)
      if (!result.ok) { setStatus(result.message); setSaving(false); return }
      navigate(existing ? '/my-listings' : '/auctions')
    } catch (error) {
      setStatus(error.message)
      setSaving(false)
    }
  }

  async function removeExisting(id) {
    setExistingImages((current) => current.filter((item) => item !== id))
    await deleteImages([id]).catch(() => undefined)
  }

  const fieldError = (name) => errors[name] ? <span className="market-field-error">{errors[name]}</span> : null
  return (
    <section className="market-page market-form-page">
      <button className="market-back" type="button" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
      <div className="market-heading"><p>SELL ON CAMPUS</p><h1>{existing ? 'Edit listing' : 'List your item'}</h1><span>No bidding needed. Just a clean, visible handover.</span></div>
      <form className="market-form" onSubmit={submit} noValidate>
        <div className="market-form-grid">
          <label className="market-field market-wide">Product title<input name="title" value={values.title} onChange={change} maxLength={80} placeholder="Scientific calculator" />{fieldError('title')}</label>
          <label className="market-field">Category<select name="category" value={values.category} onChange={change}><option value="">Choose category</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>{fieldError('category')}</label>
          <label className="market-field">Condition<select name="condition" value={values.condition} onChange={change}><option value="">Choose condition</option>{CONDITIONS.map((item) => <option key={item}>{item}</option>)}</select>{fieldError('condition')}</label>
          <label className="market-field market-wide">Description<textarea name="description" value={values.description} onChange={change} maxLength={1500} rows="5" placeholder="Mention condition, accessories, defects, and pickup preferences." />{fieldError('description')}</label>
          <label className="market-field">Starting price (₹)<input name="startingPrice" type="number" min="1" value={values.startingPrice} onChange={change} />{fieldError('startingPrice')}</label>
          <label className="market-field">Minimum increment (₹)<input name="minIncrement" type="number" min="1" value={values.minIncrement} onChange={change} />{fieldError('minIncrement')}</label>
          <label className="market-field market-wide">Auction closes at<input name="endTime" type="datetime-local" value={values.endTime} onChange={change} />{fieldError('endTime')}</label>
        </div>
        <div className="market-upload">
          <label htmlFor="listing-images"><ImagePlus /> <strong>Add product images</strong><span>JPEG, PNG or WebP · 1 MB each · up to 5</span></label>
          <input id="listing-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} />
          {fieldError('images')}
          <div className="market-previews">
            {existingImages.map((id) => <div key={id} className="market-preview"><AuctionPreview id={id} /><button type="button" onClick={() => removeExisting(id)} aria-label="Remove image"><Trash2 /></button></div>)}
            {files.map((file, index) => <div key={`${file.name}-${index}`} className="market-preview"><img src={URL.createObjectURL(file)} alt="Product preview" /><button type="button" onClick={() => removeFile(index)} aria-label="Remove image"><Trash2 /></button></div>)}
          </div>
        </div>
        {status && <p className="market-alert" role="alert">{status}</p>}
        <button className="market-button market-submit" type="submit" disabled={saving}>{saving ? 'Publishing…' : existing ? 'Save changes' : 'Publish listing'}</button>
      </form>
    </section>
  )
}

function toLocalDateTime(value) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function AuctionPreview({ id }) {
  const [url, setUrl] = useState('')
  useEffect(() => { let active = true; let objectUrl = ''; getImage(id).then((blob) => { if (active && blob) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) } }).catch(() => undefined); return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) } }, [id])
  return url ? <img src={url} alt="Existing product" /> : <span />
}
