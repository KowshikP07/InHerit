const AUCTION_KEY = 'InHerit_auctions'

export const CATEGORIES = ['Books', 'Calculators', 'Cycles', 'Electronics', 'Furniture', 'Other']
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

function readAuctions() {
  try {
    const value = JSON.parse(localStorage.getItem(AUCTION_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function getAuctions() { return readAuctions() }
export function getOpenAuctions() {
  return getAuctions().filter((auction) => auction.status === 'OPEN' && new Date(auction.endTime).getTime() > Date.now())
}
export function getAuction(id) { return getAuctions().find((auction) => auction.id === id) ?? null }
export function getSellerAuctions(sellerId) { return getAuctions().filter((auction) => auction.sellerId === sellerId) }

function writeAuctions(auctions) {
  try {
    localStorage.setItem(AUCTION_KEY, JSON.stringify(auctions))
    window.dispatchEvent(new CustomEvent('inherit-auctions-updated'))
    return { ok: true }
  } catch (error) {
    return { ok: false, message: 'Browser storage is full or unavailable. Remove unused listings or images and try again.', error }
  }
}

export function createAuction(input) {
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

export function updateAuction(id, sellerId, changes) {
  const auctions = readAuctions()
  const current = auctions.find((auction) => auction.id === id)
  if (!current) return { ok: false, message: 'Listing not found.' }
  if (current.sellerId !== sellerId) return { ok: false, message: 'You can only edit your own listings.' }
  if (current.status !== 'OPEN') return { ok: false, message: 'Only open listings can be edited.' }
  const updated = { ...current, ...changes, startingPrice: Number(changes.startingPrice ?? current.startingPrice), minIncrement: Number(changes.minIncrement ?? current.minIncrement), updatedAt: new Date().toISOString() }
  const result = writeAuctions(auctions.map((auction) => auction.id === id ? updated : auction))
  return result.ok ? { ok: true, auction: updated } : result
}

export function cancelAuction(id, sellerId) {
  const auctions = readAuctions()
  const current = auctions.find((auction) => auction.id === id)
  if (!current) return { ok: false, message: 'Listing not found.' }
  if (current.sellerId !== sellerId) return { ok: false, message: 'You can only cancel your own listings.' }
  if (current.status !== 'OPEN') return { ok: false, message: 'This listing is already cancelled.' }
  const result = writeAuctions(auctions.map((auction) => auction.id === id ? { ...auction, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : auction))
  return result.ok ? { ok: true } : result
}
