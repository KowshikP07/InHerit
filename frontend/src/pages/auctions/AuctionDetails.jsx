import { useEffect, useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Check, ShieldCheck, AlertCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import AuctionImage from '../../components/auctions/AuctionImage.jsx'
import { fetchAuctionDetails, getAuction, placeBid } from '../../services/auctionService.js'
import { getStudentSession } from '../../services/studentRosterService.js'
import { formatInr } from '../../utils/auctionDisplay.js'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default function AuctionDetails() {
  const { id } = useParams()
  const student = getStudentSession()
  const [auction, setAuction] = useState(() => getAuction(id))
  const [bids, setBids] = useState([])
  const [remaining, setRemaining] = useState(0)

  // Bidding form states
  const [bidAmount, setBidAmount] = useState('')
  const [bidStatus, setBidStatus] = useState({ error: '', success: '', loading: false })

  // 1. Fetch latest details from backend API
  useEffect(() => {
    fetchAuctionDetails(id).then((data) => {
      if (data) {
        setAuction(data)
        if (Array.isArray(data.bids)) {
          setBids(data.bids)
        }
      }
    })
  }, [id])

  // 2. Real-time Socket.IO Live Bidding updates
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    })

    socket.emit('join_auction', id)

    socket.on('accepted_bid', (data) => {
      setAuction((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          currentBid: data.amount,
          bidCount: data.totalBids ?? ((prev.bidCount || 0) + 1)
        }
      })

      setBids((prevBids) => [
        {
          id: data.bidId,
          amount: data.amount,
          createdAt: data.timestamp,
          bidderName: data.bidderName,
          bidderRoll: data.bidderRoll
        },
        ...prevBids
      ])
    })

    socket.on('auction_closed', (data) => {
      setAuction((prev) => prev ? { ...prev, status: data.status } : prev)
    })

    return () => {
      socket.emit('leave_auction', id)
      socket.disconnect()
    }
  }, [id])

  // 3. Countdown timer
  useEffect(() => {
    if (!auction?.endTime) return undefined
    const update = () => setRemaining(new Date(auction.endTime).getTime() - Date.now())
    const initialTimer = window.setTimeout(update, 0)
    const timer = window.setInterval(update, 1000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [auction?.endTime])

  // Minimum required bid calculation
  const minRequiredBid = useMemo(() => {
    if (!auction) return 0
    const current = parseFloat(auction.currentBid || auction.startingPrice || 0)
    const inc = parseFloat(auction.minIncrement || 50)
    return auction.bidCount > 0 ? current + inc : current
  }, [auction])

  if (!auction) {
    return (
      <section className="market-state">
        <h1>Listing unavailable</h1>
        <p>This listing may have been cancelled or removed.</p>
        <Link className="market-button" to="/auctions">Back to browse</Link>
      </section>
    )
  }

  const ended = auction.status !== 'OPEN' || remaining <= 0
  const isSeller = student && student.id === auction.sellerId

  async function handleBidSubmit(event) {
    event.preventDefault()
    setBidStatus({ error: '', success: '', loading: true })

    const amount = parseFloat(bidAmount || minRequiredBid)
    if (isNaN(amount) || amount < minRequiredBid) {
      setBidStatus({
        error: `Bid must be at least ₹${minRequiredBid.toLocaleString('en-IN')}.`,
        success: '',
        loading: false
      })
      return
    }

    const result = await placeBid(auction.id, amount)
    if (result.ok) {
      setBidStatus({
        error: '',
        success: `Your bid of ₹${amount.toLocaleString('en-IN')} has been accepted!`,
        loading: false
      })
      setBidAmount(String(amount + parseFloat(auction.minIncrement || 50)))
    } else {
      setBidStatus({
        error: result.message || 'Failed to place bid.',
        success: '',
        loading: false
      })
    }
  }

  return (
    <section className="market-page market-detail">
      <Link className="market-back" to="/auctions">
        <ArrowLeft size={18} /> Back to auctions
      </Link>

      <div className="detail-grid">
        {/* Left Column: Image Gallery */}
        <div className="detail-gallery">
          {(auction.imageIds || auction.images || []).map((imageId) => (
            <AuctionImage key={imageId} imageId={imageId} alt={auction.title} />
          ))}
        </div>

        {/* Right Column: Auction Information & Live Bidding */}
        <div className="detail-info">
          <div className="auction-tags">
            <span>{auction.category}</span>
            <span>{auction.condition}</span>
            <span className={ended ? 'ended-tag' : ''}>
              {ended ? 'Auction ended' : auction.status}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-['Archivo_Black'] text-[#171717]">{auction.title}</h1>
          <p className="detail-description">{auction.description}</p>

          <dl>
            <div>
              <dt>Starting price</dt>
              <dd>{formatInr(auction.startingPrice)}</dd>
            </div>
            <div>
              <dt>Current highest bid</dt>
              <dd className="font-['Archivo_Black'] text-xl text-[#0c6b58]">
                {formatInr(auction.currentBid || auction.startingPrice)}
              </dd>
            </div>
            <div>
              <dt>Minimum increment</dt>
              <dd>+{formatInr(auction.minIncrement)}</dd>
            </div>
            <div>
              <dt>Seller</dt>
              <dd>{auction.sellerName || 'Verified Student'}</dd>
            </div>
            <div>
              <dt>Closes</dt>
              <dd>{new Date(auction.endTime).toLocaleString('en-IN')}</dd>
            </div>
          </dl>

          {/* Countdown timer */}
          {ended ? (
            <div className="countdown ended">
              <strong>Auction ended</strong>
              <span>This listing is no longer accepting bids.</span>
            </div>
          ) : (
            <Countdown remaining={remaining} />
          )}

          {/* Interactive Live Bidding Section */}
          <div className="mt-6 border-[3px] border-[#171717] bg-white p-6 shadow-[6px_6px_0_#171717]">
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-3 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#171717] uppercase tracking-wider block">
                  LIVE CAMPUS BIDDING
                </span>
                <span className="font-['Archivo_Black'] text-xl text-[#171717]">
                  {formatInr(auction.currentBid || auction.startingPrice)}
                </span>
              </div>
              <span className="font-mono text-xs font-bold bg-[#ffdc3d] px-2.5 py-1 border-2 border-[#171717] shadow-[2px_2px_0_#171717]">
                {auction.bidCount || bids.length || 0} BID{(auction.bidCount || bids.length) === 1 ? '' : 'S'} PLACED
              </span>
            </div>

            {ended ? (
              <p className="text-sm font-medium text-neutral-600">
                This auction is finalized. No further offers are accepted.
              </p>
            ) : isSeller ? (
              <div className="flex items-center gap-2 border-2 border-[#171717] bg-[#ffdc3d] p-3 text-xs font-bold font-mono">
                <ShieldCheck size={18} strokeWidth={2.5} />
                <span>You are the seller of this item. Sellers cannot place bids on their own listings.</span>
              </div>
            ) : !student ? (
              <div className="text-center py-3">
                <p className="text-sm font-bold text-[#171717] mb-2">
                  Sign in with your verified campus student account to place bids.
                </p>
                <Link className="market-button text-xs py-2 px-4 inline-flex" to="/">
                  Go to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleBidSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[#171717] mb-1">
                    Your Bid Amount (₹)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="1"
                      min={minRequiredBid}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      required
                      placeholder={`Min. ₹${minRequiredBid}`}
                      className="market-field flex-1 h-12 px-3 border-2 border-[#171717] font-['Archivo_Black'] text-lg font-bold outline-none"
                    />
                    <button
                      type="submit"
                      disabled={bidStatus.loading}
                      className="market-button h-12 px-5 font-extrabold text-sm flex items-center gap-1.5"
                    >
                      <span>{bidStatus.loading ? 'Submitting…' : 'Place Bid'}</span>
                      <ArrowRight size={16} strokeWidth={3} />
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500 mt-1 block">
                    Next minimum acceptable bid: <strong>₹{minRequiredBid.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                {bidStatus.error && (
                  <div className="flex items-start gap-2 border-2 border-[#b42318] bg-[#fff1f0] p-3 text-xs font-bold text-[#b42318]">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{bidStatus.error}</span>
                  </div>
                )}

                {bidStatus.success && (
                  <div className="flex items-center gap-2 border-2 border-[#0c6b58] bg-[#e8faf9] p-3 text-xs font-bold text-[#0c6b58]">
                    <Check size={16} strokeWidth={3} />
                    <span>{bidStatus.success}</span>
                  </div>
                )}
              </form>
            )}

            {/* Public Bid History Ticker */}
            <div className="mt-6 pt-4 border-t-2 border-[#171717]">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#171717] mb-3 flex items-center justify-between">
                <span>Public Bid History</span>
                <span className="text-[10px] text-neutral-500 font-normal">Real-time synchronized</span>
              </h3>

              {bids.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {bids.map((bid, index) => (
                    <div
                      key={bid.id || `${bid.amount}-${index}`}
                      className={`flex items-center justify-between p-2 border border-[#171717] text-xs ${
                        index === 0 ? 'bg-[#fffbea] font-bold border-2' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-neutral-500 font-bold">
                          #{bids.length - index}
                        </span>
                        <span>{bid.bidderName || 'Campus Student'}</span>
                        {index === 0 && (
                          <span className="font-mono text-[9px] bg-[#62cfcc] px-1.5 py-0.5 border border-[#171717] font-bold">
                            HIGHEST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <strong className="font-['Archivo_Black'] text-sm">
                          {formatInr(bid.amount)}
                        </strong>
                        <span className="font-mono text-[10px] text-neutral-400">
                          {new Date(bid.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-neutral-500 italic py-2">
                  No bids recorded yet. Be the first to place an offer!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Countdown({ remaining }) {
  const total = Math.max(0, remaining)
  const days = Math.floor(total / 86400000)
  const hours = Math.floor(total / 3600000) % 24
  const minutes = Math.floor(total / 60000) % 60
  const seconds = Math.floor(total / 1000) % 60
  return (
    <div className="countdown">
      <small>TIME REMAINING</small>
      <strong>
        {[days, hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')}
      </strong>
      <span>DAYS : HOURS : MIN : SEC</span>
    </div>
  )
}
