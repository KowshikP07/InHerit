<<<<<<< Updated upstream
**# InHerit**

InHerit is a campus marketplace for students who need to sell useful belongings or discover items offered by other students. The prototype uses a Neubrutalist interface and client-side storage

**LANDING PAGE**
<img width="1877" height="912" alt="Screenshot 2026-10-28 160254" src="https://github.com/user-attachments/assets/caa3fef0-f059-4f73-b963-15a8af5fd932" />

**BROWSING AUCTION PAGE**
<img width="1877" height="903" alt="Screenshot 2026-10-28 160307" src="https://github.com/user-attachments/assets/8e3f2552-c6b9-4661-9df3-72d2902ae264" />

**BIDDING PAGE**
<img width="1872" height="902" alt="Screenshot 2026-10-28 160804" src="https://github.com/user-attachments/assets/452ddc62-8d11-4062-9b51-b263dd9e1f52" />
<img width="1867" height="906" alt="Screenshot 2026-10-28 160841" src="https://github.com/user-attachments/assets/b415e127-ef51-4b5f-b33a-032cbdf0fdaa" />

**ADMIN PAGE**
<img width="1878" height="912" alt="Screenshot 2026-10-28 160352" src="https://github.com/user-attachments/assets/9572f335-1b3b-4859-b1eb-2a6e18d866f4" />

**BULK IMPORT OF STUDENT DATA**
<img width="1871" height="920" alt="Screenshot 2026-10-28 160403" src="https://github.com/user-attachments/assets/706e1f1e-9c40-4d91-90ec-6fbc13fe4442" />

**LISTING OF STUDENT DATA**
<img width="1880" height="907" alt="Screenshot 2026-10-28 160416" src="https://github.com/user-attachments/assets/e1e42019-3983-45c8-9fb9-16095deed96d" />
=======
# InHerit — Campus Auction Marketplace

InHerit is a fair campus auction marketplace connecting college students. The system features a Neo-brutalist React frontend integrated with a robust Node.js, Express, Socket.IO, and Supabase-hosted PostgreSQL backend.
>>>>>>> Stashed changes

---

## Architecture & Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide icons, Socket.IO client.
- **Backend**: Node.js & Express.js.
- **Database**: Supabase-hosted PostgreSQL (accessed via standard `pg` connection pooler).
- **Real-time Live Bidding**: Socket.IO rooms (`auction:<id>`).
- **Security & Concurrency**:
  - Row-level lock `SELECT ... FOR UPDATE` inside single-client transactions.
  - Strict anti-self bidding and minimum bid increment validation.
  - Password hashing with `bcryptjs`.
  - Stateless JWT authentication (`jsonwebtoken`).
  - Security headers with `helmet`, IP rate limiting with `express-rate-limit`, CORS.
- **Image Uploads**: `multer` with MIME type, size validation, and cryptographically safe unique filenames.
- **Auction Lifecycle Scheduler**: `node-cron` running every 30 seconds for automated, idempotent auction closure and pending sale assignment.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL database (or Supabase project)

### 2. Configure Backend Environment
Create `backend/.env` (refer to `backend/.env.example`):

```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Supabase PostgreSQL Connection Pooler URL
DATABASE_URL=postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres

# JWT Secret
JWT_SECRET=super_secret_hackathon_jwt_key_inherit_campus_2026
JWT_EXPIRES_IN=7d

# Super Admin Credentials
ADMIN_BOOTSTRAP_EMAIL=admin@campusbid.local
ADMIN_BOOTSTRAP_PASSWORD=Admin@123
ADMIN_BOOTSTRAP_NAME="Super Administrator"
```

### 3. Run Database Migrations & Seeds
Run migrations to set up the idempotent schema on PostgreSQL:

```bash
cd backend
npm run migrate
```

Seed the initial Super Admin account, eligible student roster, and sample campus auctions:

```bash
npm run seed
```

### 4. Start the Backend Server

```bash
cd backend
npm start
# Or for hot-reloading development:
npm run dev
```

The API runs on `http://localhost:5000` with WebSocket support at `ws://localhost:5000`.

### 5. Run Backend Integration Test Suite

```bash
cd backend
npm test
```

Verifies:
- Server health & Supabase connection
- Super Admin login & roster retrieval
- Student eligibility roster rejection (403 Forbidden for unauthorized emails)
- Student registration & JWT authentication
- Auction browsing & filtering
- Concurrency & anti-self bidding checks (`SELECT ... FOR UPDATE`)
- Minimum increment bid enforcement

### 6. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `eligible_students` | College roster whitelist: email, student_id (roll number), department, eligibility status |
| `users` | Registered campus accounts: UUID ID, name, email, roll number, department, bcrypt password hash, role (`STUDENT`, `SUPER_ADMIN`) |
| `import_batches` | Super Admin CSV upload audit trail: filename, total rows, success, duplicate, and invalid counts |
| `auctions` | Campus listings: seller ID, title, description, category, condition, starting price, minimum increment, closing timestamp, status (`OPEN`, `CLOSED`, `SOLD`, `UNSOLD`, `CANCELLED`) |
| `auction_images` | Image paths, ordering, and primary flag |
| `bids` | Append-only public bid ledger: auction ID, bidder ID, amount, timestamp |
| `sales` | Post-auction handover & settlement: winner ID, final price, seller decision (`APPROVED`, `REJECTED`), handover status (`CONFIRMED`, `CANCELLED`, `FAILED_PICKUP`) |

---

## API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register student (enforces college email eligibility against `eligible_students`).
- `POST /api/auth/login` — Student sign in.
- `GET /api/auth/me` — Current user profile.

### Super Admin Roster (`/api/admin`)
- `POST /api/admin/login` — Super Admin sign in.
- `GET /api/admin/roster` — View student eligibility roster.
- `PATCH /api/admin/roster/:id/eligibility` — Toggle student bidding clearance.
- `DELETE /api/admin/roster/:id` — Remove student record.
- `POST /api/admin/roster/import` — Ingest CSV roster batch (`Name, RollNo, Email, Dept`).
- `GET /api/admin/history` — Audit log of CSV batches.

### Auctions & Bidding (`/api/auctions`)
- `GET /api/auctions` — Browse listings (filters: `search`, `category`, `condition`, `minPrice`, `maxPrice`, `sort`).
- `GET /api/auctions/:id` — Listing details, current highest bid, public bid history, and images.
- `POST /api/auctions` — Create listing with up to 5 images (Multer).
- `PATCH /api/auctions/:id` — Seller edit listing.
- `DELETE /api/auctions/:id` — Seller cancel listing (bid history preserved).
- `GET /api/users/me/auctions` — Seller's listings.
- `POST /api/auctions/:id/bids` — **Atomic Bidding**:
  - Acquires `SELECT ... FOR UPDATE` row lock on a single `pg` client.
  - Revalidates auction status and server expiration time.
  - Rejects seller self-bidding (403).
  - Enforces starting price and `currentHighest + minIncrement`.
  - Inserts bid and commits transaction.
  - Emits real-time `accepted_bid` event via Socket.IO.

### Sale Lifecycle (`/api/sales`)
- `GET /api/sales/:auctionId` — Handover details.
- `PATCH /api/sales/:auctionId/decision` — Seller approves/rejects winning price.
- `PATCH /api/sales/:auctionId/handover` — Seller/Winner confirms campus handover (`CONFIRMED`, `FAILED_PICKUP`, `CANCELLED`).

---

## Socket.IO Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join_auction` | Client → Server | `auctionId` | Subscribes to live room `auction:<auctionId>` |
| `leave_auction` | Client → Server | `auctionId` | Leaves auction room |
| `accepted_bid` | Server → Room | `{ auctionId, bidId, amount, bidderName, timestamp, currentHighestBid, totalBids }` | Broadcasted immediately after a bid commits to PostgreSQL |
| `outbid` | Server → User | `{ auctionId, auctionTitle, newHighestBid, timestamp }` | Sent to previous highest bidder |
| `auction_closed` | Server → Room | `{ auctionId, status, winnerName, finalPrice }` | Broadcasted when scheduler finalizes auction |# InHerit — Campus Auction Marketplace

InHerit is a fair campus auction marketplace connecting college students. The system features a Neo-brutalist React frontend integrated with a robust Node.js, Express, Socket.IO, and Supabase-hosted PostgreSQL backend.

**LANDING PAGE**
<img width="1877" height="912" alt="Screenshot 2026-10-28 160254" src="https://github.com/user-attachments/assets/caa3fef0-f059-4f73-b963-15a8af5fd932" />

**BROWSING AUCTION PAGE**
<img width="1877" height="903" alt="Screenshot 2026-10-28 160307" src="https://github.com/user-attachments/assets/8e3f2552-c6b9-4661-9df3-72d2902ae264" />

**BIDDING PAGE**
<img width="1872" height="902" alt="Screenshot 2026-10-28 160804" src="https://github.com/user-attachments/assets/452ddc62-8d11-4062-9b51-b263dd9e1f52" />
<img width="1867" height="906" alt="Screenshot 2026-10-28 160841" src="https://github.com/user-attachments/assets/b415e127-ef51-4b5f-b33a-032cbdf0fdaa" />

**ADMIN PAGE**
<img width="1878" height="912" alt="Screenshot 2026-10-28 160352" src="https://github.com/user-attachments/assets/9572f335-1b3b-4859-b1eb-2a6e18d866f4" />

**BULK IMPORT OF STUDENT DATA**
<img width="1871" height="920" alt="Screenshot 2026-10-28 160403" src="https://github.com/user-attachments/assets/706e1f1e-9c40-4d91-90ec-6fbc13fe4442" />

**LISTING OF STUDENT DATA**
<img width="1880" height="907" alt="Screenshot 2026-10-28 160416" src="https://github.com/user-attachments/assets/e1e42019-3983-45c8-9fb9-16095deed96d" />

---

## Architecture & Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide icons, Socket.IO client.
- **Backend**: Node.js & Express.js.
- **Database**: Supabase-hosted PostgreSQL (accessed via standard `pg` connection pooler).
- **Real-time Live Bidding**: Socket.IO rooms (`auction:<id>`).
- **Security & Concurrency**:
  - Row-level lock `SELECT ... FOR UPDATE` inside single-client transactions.
  - Strict anti-self bidding and minimum bid increment validation.
  - Password hashing with `bcryptjs`.
  - Stateless JWT authentication (`jsonwebtoken`).
  - Security headers with `helmet`, IP rate limiting with `express-rate-limit`, CORS.
- **Image Uploads**: `multer` with MIME type, size validation, and cryptographically safe unique filenames.
- **Auction Lifecycle Scheduler**: `node-cron` running every 30 seconds for automated, idempotent auction closure and pending sale assignment.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL database (or Supabase project)