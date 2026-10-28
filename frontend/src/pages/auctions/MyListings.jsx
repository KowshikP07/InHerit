import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Eye, Ban, PackageSearch } from 'lucide-react'
import { cancelAuction, getSellerAuctions } from '../../services/auctionService.js'
import { deleteImages } from '../../services/imageStorageService.js'
import { getStudentSession } from '../../services/studentRosterService.js'
import { formatInr } from '../../utils/auctionDisplay.js'

export default function MyListings() {
  const student = getStudentSession()
  const [auctions, setAuctions] = useState(() => getSellerAuctions(student.id))
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const sync = () => setAuctions(getSellerAuctions(student.id))
    window.addEventListener('inherit-auctions-updated', sync)
    return () => window.removeEventListener('inherit-auctions-updated', sync)
  }, [student.id])

  async function confirmCancel() {
    setError('')
    const result = cancelAuction(pending.id, student.id)
    if (!result.ok) { setError(result.message); return }
    await deleteImages(pending.imageIds).catch(() => undefined)
    setPending(null)
  }

  return <section className="market-page"><div className="market-heading"><p>YOUR INVENTORY</p><h1>My listings</h1><span>Manage what you are passing on.</span></div>{error && <p className="market-alert" role="alert">{error}</p>}{auctions.length ? <div className="my-listings">{auctions.map((auction) => <article key={auction.id}><div><span className={`status-tag ${auction.status.toLowerCase()}`}>{auction.status}</span><h2>{auction.title}</h2><p>{formatInr(auction.startingPrice)} · Listed {new Date(auction.createdAt).toLocaleDateString('en-IN')} · Closes {new Date(auction.endTime).toLocaleString('en-IN')}</p></div><div className="listing-actions"><Link to={`/auctions/${auction.id}`} aria-label={`View ${auction.title}`}><Eye /> View</Link>{auction.status === 'OPEN' && <Link to={`/auctions/create?id=${auction.id}`} aria-label={`Edit ${auction.title}`}><Pencil /> Edit</Link>}{auction.status === 'OPEN' && <button type="button" onClick={() => setPending(auction)} aria-label={`Cancel ${auction.title}`}><Ban /> Cancel</button>}</div></article>)}</div> : <div className="market-empty"><PackageSearch /><h2>No listings yet</h2><p>Publish your first campus auction.</p><Link className="market-button" to="/auctions/create">Create listing</Link></div>}{pending && <div className="market-confirm" role="presentation" onMouseDown={() => setPending(null)}><section role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><h2>Cancel this listing?</h2><p>{pending.title} will disappear from the active browse page.</p><div><button type="button" onClick={() => setPending(null)}>Keep listing</button><button type="button" onClick={confirmCancel}>Cancel listing</button></div></section></div>}</section>
}
