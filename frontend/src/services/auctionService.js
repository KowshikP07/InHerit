import { getStudentToken } from './studentRosterService.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const AUCTION_KEY = 'InHerit_auctions'

export const CATEGORIES = ['Books', 'Calculators', 'Cycles', 'Electronics', 'Hostel Essentials', 'Furniture', 'Other']
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

function readAuctions() {
  try {
    const value = JSON.parse(localStorage.getItem(AUCTION_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function getAuctions() {
  return readAuctions()
}

export function getOpenAuctions() {
  return getAuctions().filter((auction) => auction.status === 'OPEN' && new Date(auction.endTime).getTime() > Date.now())
}

export function getAuction(id) {
  return getAuctions().find((auction) => auction.id === id) ?? null
}

export function getSellerAuctions(sellerId) {
  return getAuctions().filter((auction) => auction.sellerId === sellerId)
}

function writeAuctions(auctions) {
  try {
    localStorage.setItem(AUCTION_KEY, JSON.stringify(auctions))
    window.dispatchEvent(new CustomEvent('inherit-auctions-updated'))
    return { ok: true }
  } catch (error) {
    return { ok: false, message: 'Storage unavailable.', error }
  }
}

// Fetch live auctions from Supabase backend
export async function syncAuctionsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/auctions?status=all`)
    const data = await res.json()
    if (data.success && Array.isArray(data.auctions)) {
      writeAuctions(data.auctions)
      return data.auctions
    }
  } catch {
    // Return local cache on network error
  }
  return readAuctions()
}

export async function createAuction(input, files = []) {
  const token = getStudentToken()

  if (token) {
    try {
      const formData = new FormData()
      formData.append('title', input.title)
      formData.append('description', input.description)
      formData.append('category', input.category)
      formData.append('condition', input.condition)
      formData.append('starting_price', input.startingPrice)
      formData.append('min_increment', input.minIncrement)
      formData.append('end_time', input.endTime)

      if (Array.isArray(files)) {
        files.forEach((file) => formData.append('images', file))
      }

      const res = await fetch(`${API_BASE}/auctions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await syncAuctionsFromBackend()
        return { ok: true, auction: data.auction }
      }
      return { ok: false, message: data.message || 'Failed to create auction listing.' }
    } catch (err) {
      console.warn('Backend create auction error:', err)
    }
  }

  // Fallback to local
  const auction = {
    ...input,
    id: globalThis.crypto?.randomUUID?.() ?? `auction-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    startingPrice: Number(input.startingPrice),
    minIncrement: Number(input.minIncrement),
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  }
  const result = writeAuctions([auction, ...readAuctions()])
  return result.ok ? { ok: true, auction } : result
}

export async function placeBid(auctionId, amount) {
  const token = getStudentToken()
  if (!token) {
    return { ok: false, message: 'Please sign in with your student account to place a bid.' }
  }

  try {
    const res = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount: Number(amount) })
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      return { ok: false, message: data.message || 'Failed to place bid.' }
    }

    await syncAuctionsFromBackend()
    return { ok: true, bid: data.bid, message: data.message }
  } catch (error) {
    return { ok: false, message: error.message || 'Network error while placing bid.' }
  }
}

export async function fetchAuctionDetails(id) {
  try {
    const res = await fetch(`${API_BASE}/auctions/${id}`)
    const data = await res.json()
    if (res.ok && data.success) {
      return data.auction
    }
  } catch {
    // Return from local cache
  }
  return getAuction(id)
}

export async function updateAuction(id, sellerId, changes) {
  const token = getStudentToken()
  if (token) {
    try {
      await fetch(`${API_BASE}/auctions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(changes)
      })
    } catch {
      // Ignore
    }
  }

  const auctions = readAuctions()
  const current = auctions.find((auction) => auction.id === id)
  if (!current) return { ok: false, message: 'Listing not found.' }
  if (current.sellerId !== sellerId) return { ok: false, message: 'You can only edit your own listings.' }
  if (current.status !== 'OPEN') return { ok: false, message: 'Only open listings can be edited.' }
  const updated = { ...current, ...changes, startingPrice: Number(changes.startingPrice ?? current.startingPrice), minIncrement: Number(changes.minIncrement ?? current.minIncrement), updatedAt: new Date().toISOString() }
  const result = writeAuctions(auctions.map((auction) => auction.id === id ? updated : auction))
  return result.ok ? { ok: true, auction: updated } : result
}

export async function cancelAuction(id, sellerId) {
  const token = getStudentToken()
  if (token) {
    try {
      await fetch(`${API_BASE}/auctions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {
      // Ignore
    }
  }

  const auctions = readAuctions()
  const current = auctions.find((auction) => auction.id === id)
  if (!current) return { ok: false, message: 'Listing not found.' }
  if (current.sellerId !== sellerId) return { ok: false, message: 'You can only cancel your own listings.' }
  if (current.status !== 'OPEN') return { ok: false, message: 'This listing is already cancelled.' }
  const result = writeAuctions(auctions.map((auction) => auction.id === id ? { ...auction, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : auction))
  return result.ok ? { ok: true } : result
}

// Auto-sync on client boot
if (typeof window !== 'undefined') {
  syncAuctionsFromBackend()
}
