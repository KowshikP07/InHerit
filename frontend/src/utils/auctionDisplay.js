export function formatInr(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

export function closingLabel(endTime) {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return 'Auction ended'
  const hours = Math.ceil(diff / 3600000)
  return hours >= 24 ? `Closes in ${Math.ceil(hours / 24)}d` : `Closes in ${hours}h`
}
