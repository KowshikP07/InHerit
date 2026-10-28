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

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Build and lint with:

```bash
cd frontend
npm run build
npm run lint
```

## Folder structure

```text
frontend/
├── src/
│   ├── App.jsx                         # Landing page and student join/login dialog
│   ├── App.css                         # Landing and dialog styles
│   ├── auction-market.css              # Student marketplace styles
│   ├── main.jsx                        # React Router route registration
│   ├── components/
│   │   ├── admin/                      # CSV preview, roster, import history
│   │   └── auctions/                   # Marketplace UI components
│   ├── pages/
│   │   ├── admin/                      # Super Admin login and dashboard
│   │   └── auctions/                   # Create, browse, detail, and seller views
│   ├── services/
│   │   ├── auctionService.js           # Auction metadata and ownership rules
│   │   ├── imageStorageService.js      # IndexedDB image blobs
│   │   └── studentRosterService.js     # Roster, registrations, and demo sessions
│   └── utils/
│       ├── auctionDisplay.js           # INR and closing-time presentation
│       ├── auctionValidation.js        # Listing and image validation
│       └── csvValidation.js            # CSV parsing and validation
└── package.json
```

## Student marketplace

| Route | Purpose |
|---|---|
| `/auctions` | Search, filter, and sort active listings |
| `/auctions/create` | Publish a listing |
| `/auctions/:id` | View an auction and countdown |
| `/my-listings` | View, edit, or cancel the signed-in student's listings |

Marketplace routes require the ordinary student demo session. Super Admin is not a regular seller account. The create flow accepts JPEG, PNG, and WebP images, up to five at 1 MB each. Images are stored as blobs in IndexedDB, while lightweight listing metadata is stored in `localStorage` under `InHerit_auctions`. Canceled and expired listings do not appear in active browsing.

A registered student can publish a title, category, description, condition, starting price, minimum increment, and future closing date. Sellers may edit an open listing or cancel it with confirmation. Ownership checks prevent one signed-in student from editing another student's listing. These checks are enforced only in this browser prototype and can be bypassed through developer tools.

Bidding is intentionally out of scope. Auction details explain that bidding will be added in a future phase and do not create bids or process payments.

## Student setup and testing

1. Return to `/` and choose **Join campus**.
2. Enter any valid campus email; no roster approval is required for joining.
3. Registration requires name, roll number, department, year, email, and password. The app stores the account profile but not the password.
4. After the success prompt, open `/auctions/create`, publish a listing with valid prices, a future closing time, and at least one image.
5. Refresh the page and open `/my-listings`; verify the listing and ownership actions persist.
6. Open `/auctions` to search and filter the listing, sort it, and open its details.
7. Register a second member, browse the first member's listing, and confirm the second member cannot edit or cancel it.
8. Return to the first member and cancel the listing. It disappears from `/auctions` while remaining in the seller's history with `CANCELLED` status.

## Super Admin CSV tools

Super Admin remains available at `/admin/login` using `admin@campusbid.local` / `Admin@123`. CSV import and roster management remain available for future administrative workflows, but the roster does not gate ordinary student registration or marketplace access. A frontend production migration must enforce this behavior with backend authorization.

## Storage and prototype security

- `campusbid_eligible_students`: optional Super Admin roster data; it does not gate student registration
- `campusbid_import_history`: admin import batches
- `campusbid_student_registrations`: ordinary student registration profiles
- `campusbid_admin_session`: Super Admin session in `sessionStorage`
- `inherit_student_session`: ordinary student session in `sessionStorage`
- `InHerit_auctions`: listing metadata in `localStorage`
- IndexedDB database `inherit-auction-images`: image blobs keyed by stable image ID

These browser mechanisms are not authentication or authorization. Student registration and marketplace access are demo-only frontend checks and can be bypassed with developer tools. A production migration must enforce eligibility and account ownership in a secured backend, store passwords with proper password hashing, and verify email ownership with OTP or a similar mechanism.
