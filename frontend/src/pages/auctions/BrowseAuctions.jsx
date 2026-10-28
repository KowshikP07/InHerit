import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, PackageSearch } from 'lucide-react'
import AuctionImage from '../../components/auctions/AuctionImage.jsx'
import { closingLabel, formatInr } from '../../utils/auctionDisplay.js'
import { CATEGORIES, CONDITIONS, getOpenAuctions, syncAuctionsFromBackend } from '../../services/auctionService.js'

export default function BrowseAuctions() {
  const [auctions, setAuctions] = useState(getOpenAuctions)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [condition, setCondition] = useState('All')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    syncAuctionsFromBackend().then((items) => {
      if (items && Array.isArray(items)) {
        setAuctions(items.filter((a) => a.status === 'OPEN'))
      }
    })
    const sync = () => setAuctions(getOpenAuctions())
    window.addEventListener('inherit-auctions-updated', sync)
    return () => window.removeEventListener('inherit-auctions-updated', sync)
  }, [])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return auctions.filter((item) => (!term || `${item.title} ${item.description}`.toLowerCase().includes(term)) && (category === 'All' || item.category === category) && (condition === 'All' || item.condition === condition)).sort((a, b) => {
      if (sort === 'closing') return new Date(a.endTime) - new Date(b.endTime)
      if (sort === 'low') return a.startingPrice - b.startingPrice
      if (sort === 'high') return b.startingPrice - a.startingPrice
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [auctions, search, category, condition, sort])

  return <section className="market-page"><div className="market-heading"><p>CAMPUS FINDER</p><h1>Browse auctions</h1><span>Useful things, ready for their next owner.</span></div>
    <div className="market-filters"><label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or description" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>All</option>{CONDITIONS.map((item) => <option key={item}>{item}</option>)}</select></label><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="closing">Closing soon</option><option value="low">Lowest price</option><option value="high">Highest price</option></select></label></div>
    {visible.length ? <div className="auction-grid">{visible.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}</div> : <div className="market-empty"><PackageSearch /><h2>No listings match</h2><p>Try another search or list the first item for campus.</p><Link className="market-button" to="/auctions/create">Create listing</Link></div>}
  </section>
}

function AuctionCard({ auction }) {
  const imageKey = (auction.imageIds && auction.imageIds[0]) || (auction.images && auction.images[0]) || ''
  return <article className="auction-card-market"><Link className="auction-card-image" to={`/auctions/${auction.id}`}><AuctionImage imageId={imageKey} alt={auction.title} /></Link><div className="auction-card-body"><div className="auction-tags"><span>{auction.category}</span><span>{auction.condition}</span></div><h2><Link to={`/auctions/${auction.id}`}>{auction.title}</Link></h2><p>{auction.description}</p><div className="auction-card-meta"><div><small>CURRENT BID</small><strong>{formatInr(auction.currentBid || auction.startingPrice)}</strong></div><span>+{formatInr(auction.minIncrement)} min.</span></div><div className="auction-seller"><span>By {auction.sellerName}</span><time dateTime={auction.endTime}>{closingLabel(auction.endTime)}</time></div><Link className="market-button market-card-button" to={`/auctions/${auction.id}`}>View listing <ArrowRight /></Link></div></article>
}
