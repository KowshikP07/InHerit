const DB_NAME = 'inherit-auction-images'
const STORE = 'images'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transaction(mode, operation) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = operation(tx.objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function saveImages(imageIds, blobs) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    blobs.forEach((blob, index) => tx.objectStore(STORE).put(blob, imageIds[index]))
    tx.oncomplete = () => { db.close(); resolve({ ok: true }) }
    tx.onerror = () => { db.close(); reject(new Error('IndexedDB storage is full or unavailable.')) }
  })
}

export async function getImage(id) {
  return transaction('readonly', (store) => store.get(id))
}

export async function deleteImages(ids) {
  await openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    ids.forEach((id) => tx.objectStore(STORE).delete(id))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}
