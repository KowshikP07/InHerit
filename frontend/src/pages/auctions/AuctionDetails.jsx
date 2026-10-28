import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import AuctionImage from '../../components/auctions/AuctionImage.jsx'
import { getAuction } from '../../services/auctionService.js'
import { formatInr } from '../../utils/auctionDisplay.js'

export default function AuctionDetails() {
  const { id } = useParams()
  const [auction] = useState(() => getAuction(id))
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!auction) return undefined
    const update = () => setRemaining(new Date(auction.endTime).getTime() - Date.now())
    const initialTimer = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 1000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [auction])

  if (!auction) return <section className="market-state"><h1>Listing unavailable</h1><p>This listing may have been cancelled or removed.</p><Link className="market-button" to="/auctions">Back to browse</Link></section>
  const ended = auction.status !== 'OPEN' || remaining <= 0
  return <section className="market-page market-detail"><Link className="market-back" to="/auctions"><ArrowLeft /> Back to auctions</Link><div className="detail-grid"><div className="detail-gallery">{auction.imageIds.map((imageId) => <AuctionImage key={imageId} imageId={imageId} alt={auction.title} />)}</div><div className="detail-info"><div className="auction-tags"><span>{auction.category}</span><span>{auction.condition}</span><span className={ended ? 'ended-tag' : ''}>{ended ? 'Auction ended' : auction.status}</span></div><h1>{auction.title}</h1><p className="detail-description">{auction.description}</p><dl><div><dt>Starting price</dt><dd>{formatInr(auction.startingPrice)}</dd></div><div><dt>Minimum increment</dt><dd>{formatInr(auction.minIncrement)}</dd></div><div><dt>Seller</dt><dd>{auction.sellerName}</dd></div><div><dt>Closes</dt><dd>{new Date(auction.endTime).toLocaleString('en-IN')}</dd></div></dl>{ended ? <div className="countdown ended"><strong>Auction ended</strong><span>This listing is no longer accepting bids.</span></div> : <Countdown remaining={remaining} />}<div className="future-bid"><strong>Bidding opens in a future feature</strong><p>You can review the item and auction terms here. No bids or payments are recorded in this phase.</p></div></div></div></section>
}

function Countdown({ remaining }) {
  const total = Math.max(0, remaining)
  const days = Math.floor(total / 86400000)
  const hours = Math.floor(total / 3600000) % 24
  const minutes = Math.floor(total / 60000) % 60
  const seconds = Math.floor(total / 1000) % 60
  return <div className="countdown"><small>TIME REMAINING</small><strong>{[days, hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')}</strong><span>DAYS : HOURS : MIN : SEC</span></div>
}
