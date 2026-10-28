import assert from 'assert';
import { query, pool } from '../src/config/db.js';
import server from '../src/server.js';

const PORT = process.env.PORT || 5000;
const API_BASE = `http://localhost:${PORT}/api`;

async function runAllTests() {
  console.log('🧪 Starting InHerit Backend Automated Test Suite...');

  if (!server.listening) {
    await new Promise((resolve) => server.listen(PORT, resolve));
  }

  // Wait for server to be responsive
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${API_BASE}/health`);
      if (r.ok) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  try {
    // 1. Health check
    console.log('\n[TEST 1] Checking server health...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthData.status, 'UP');
    assert.strictEqual(healthData.database.connected, true);
    console.log('✅ Server health UP & connected to Supabase PostgreSQL!');

    // 2. Admin Login
    console.log('\n[TEST 2] Testing Super Admin login...');
    const adminLoginRes = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@campusbid.local',
        password: 'Admin@123'
      })
    });
    const adminData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200);
    assert.ok(adminData.token, 'Token must be returned');
    assert.strictEqual(adminData.user.role, 'SUPER_ADMIN');
    const adminToken = adminData.token;
    console.log('✅ Super Admin authenticated successfully!');

    // 3. Admin Roster & CSV Import
    console.log('\n[TEST 3] Testing Admin Roster Retrieval...');
    const rosterRes = await fetch(`${API_BASE}/admin/roster`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const rosterData = await rosterRes.json();
    assert.strictEqual(rosterRes.status, 200);
    assert.ok(Array.isArray(rosterData.roster), 'Roster array returned');
    console.log(`✅ Loaded ${rosterData.roster.length} roster students from database.`);

    // 4. Student Registration Test
    console.log('\n[TEST 4] Testing Student Registration & DB storage...');
    const testEmail = `newstudent_${Date.now()}@campus.edu`;
    const newStudentRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Campus Student',
        email: testEmail,
        rollNo: `ROLL_${Date.now().toString().slice(-5)}`,
        password: 'Password@123',
        department: 'Computer Science',
        year: '2'
      })
    });
    const newStudentData = await newStudentRes.json();
    assert.strictEqual(newStudentRes.status, 201, 'Student registration must succeed');
    assert.ok(newStudentData.token, 'Token must be issued');
    assert.strictEqual(newStudentData.user.email, testEmail);
    console.log(`✅ New student (${testEmail}) registered and stored in Supabase PostgreSQL!`);

    // 5. Eligible Student Logins
    console.log('\n[TEST 5] Testing registered student logins...');
    const aaravRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aarav.sharma@campus.edu', password: 'Student@123' })
    });
    const aaravData = await aaravRes.json();
    const aaravToken = aaravData.token;
    const aaravId = aaravData.user.id;
    console.log(`✅ Student Aarav logged in: ${aaravId}`);

    const priyaRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.patel@campus.edu', password: 'Student@123' })
    });
    const priyaData = await priyaRes.json();
    const priyaToken = priyaData.token;
    const priyaId = priyaData.user.id;
    console.log(`✅ Student Priya logged in: ${priyaId}`);

    const alexRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@campus.edu', password: 'Student@123' })
    });
    const alexData = await alexRes.json();
    const alexToken = alexData.token;
    const alexId = alexData.user.id;
    console.log(`✅ Student Alex logged in: ${alexId}`);

    // 6. Browse Auctions
    console.log('\n[TEST 6] Testing Browse Auctions API...');
    const auctionsRes = await fetch(`${API_BASE}/auctions?status=OPEN`);
    const auctionsData = await auctionsRes.json();
    assert.strictEqual(auctionsRes.status, 200);
    assert.ok(auctionsData.auctions.length > 0);
    console.log(`✅ Found ${auctionsData.auctions.length} live auctions.`);

    const sampleAuction = auctionsData.auctions.find(a => a.sellerId === aaravId) || auctionsData.auctions[0];
    const auctionId = sampleAuction.id;
    console.log(`Selected test auction: "${sampleAuction.title}" (ID: ${auctionId}, Current: ₹${sampleAuction.currentBid}, Inc: ₹${sampleAuction.minIncrement})`);

    // 7. Anti-Self Bidding Rule
    console.log('\n[TEST 7] Testing Anti-Self Bidding Protection...');
    const selfBidRes = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aaravToken}`
      },
      body: JSON.stringify({ amount: parseFloat(sampleAuction.currentBid) + 100 })
    });
    assert.strictEqual(selfBidRes.status, 403, 'Seller must not be allowed to bid on own auction');
    console.log('✅ Seller self-bidding was strictly rejected with 403 Forbidden!');

    // Fetch latest auction details to see who currently holds highest bid
    const detailsRes = await fetch(`${API_BASE}/auctions/${auctionId}`);
    const detailsData = await detailsRes.json();
    const currentHighestBidder = detailsData.auction.bids[0]?.bidderName;
    
    // Choose bidder who doesn't currently hold the highest bid
    const activeBidderToken = (currentHighestBidder && currentHighestBidder.includes('Alex')) ? priyaToken : alexToken;
    const activeBidderName = (currentHighestBidder && currentHighestBidder.includes('Alex')) ? 'Priya' : 'Alex';
    const otherBidderToken = activeBidderToken === alexToken ? priyaToken : alexToken;

    // 8. Place Valid Bid
    console.log(`\n[TEST 8] Placing valid bid from ${activeBidderName}...`);
    const currentHighest = parseFloat(detailsData.auction.currentBid || detailsData.auction.startingPrice);
    const validAmount = currentHighest + parseFloat(detailsData.auction.minIncrement);
    
    const bidRes = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeBidderToken}`
      },
      body: JSON.stringify({ amount: validAmount })
    });
    const bidData = await bidRes.json();
    assert.strictEqual(bidRes.status, 201, `Bid placement should succeed: ${JSON.stringify(bidData)}`);
    assert.strictEqual(bidData.bid.amount, validAmount);
    console.log(`✅ Successfully placed bid of ₹${validAmount} on auction by ${activeBidderName}!`);

    // 9. Minimum Increment Rejection
    console.log('\n[TEST 9] Testing minimum increment rejection...');
    const tooLowAmount = validAmount + 1; // less than minimum increment
    const lowBidRes = await fetch(`${API_BASE}/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherBidderToken}`
      },
      body: JSON.stringify({ amount: tooLowAmount })
    });
    assert.strictEqual(lowBidRes.status, 400, 'Low increment must be rejected');
    console.log('✅ Insufficient bid increment was properly rejected!');

    console.log('\n🎉 ALL 9 TEST SUITES PASSED FLAWLESSLY!\n');
    server.close();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    server.close();
    await pool.end();
    process.exit(1);
  }
}

runAllTests();
