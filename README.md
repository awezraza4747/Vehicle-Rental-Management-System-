# BharatDrive vehicle rentals

BharatDrive is a responsive vehicle rental app with a browser interface, a Node.js API and a SQLite database. It uses the original BharatDrive theme and the project starts with an empty, real fleet rather than sample listings.

## Requirements

- Node.js 22.5 or newer (tested with Node.js 26.5).
- No package installation is needed. The app uses Node's built-in HTTP, crypto and SQLite modules.

## Create the first administrator and start the app (PowerShell)

```powershell
cd 'C:\Users\ADHNAN\Vehicle Rental System{new}'
node server.mjs --create-admin
node server.mjs
```

The first command asks for the admin name and email, then prompts for a password without showing it as you type. Run the second command to start the website. Once it reports that BharatDrive is ready, open `http://127.0.0.1:3000` in Edge, Chrome, Firefox, or another browser. Customers can create accounts through the site.

For later starts, double-click `run-local.bat`. It waits for the vehicle API, then opens the site in your default browser. Keep the BharatDrive Server window open while using the site. You can also open this folder in VS Code, choose **Terminal → New Terminal**, and run `node server.mjs`. Keep the terminal open while using the app; press Ctrl+C to stop the server. The server listens on localhost only. Open the site through its local address above, not by opening `index.html` directly or using the Live Server extension, because the app API and database require the Node server.

## Included

- Registration, login, logout, salted scrypt password hashes, expiring HttpOnly sessions, CSRF checks on state changes, and server-side role checks.
- Admin vehicle create, edit, activate/deactivate, validated image uploads, booking date/status filters, customer list and database-backed fleet statistics.
- Vehicle search and filtering by name, location, category, fuel, transmission, price, seat count and rental-date availability.
- Server-calculated rental totals (daily rate × days + 18% GST + a separately shown refundable ₹2,000 deposit).
- Transaction-locked overlapping-date checks, customer booking history and eligible cancellation, admin status transitions, customer list and downloadable HTML receipts with print/save-to-PDF support.
- SQLite schema, foreign keys, indexes and persistent records in `database/bharatdrive.sqlite`.

## Notes

- The local database now contains 75 active sample listings, including cars, motorcycles, scooters, electric rides, CNG vehicles, auto rickshaws, passenger vans and utility vehicles across Anantapur and nearby towns and neighborhoods. Category shortcuts and filters cover vehicle type, brand, fuel (petrol, diesel, CNG, electric and hybrid), transmission, seats, price and dates. Vehicle cards use bundled local image files, so they display without a photo service. Run node seed-starter-fleet.mjs to seed the starter fleet and node add-fleet-expansion.mjs to add the local listings and images. The expansion script skips names already in the database, so it can be run again safely. These are illustrative college-project listings with example prices and pickup points; confirm real vehicles, rates and availability before accepting bookings.
- The Top cities row is calculated from active vehicles and filters the fleet when selected.
- No payment gateway, SMS delivery, KYC collection, refund processing or remote hosting is configured. The app does not claim payment or identity verification.
- Keep `database/bharatdrive.sqlite` and `images/uploads/` backed up; they contain app data and uploaded images.
- Use a production deployment with HTTPS, a reverse proxy and operational backups before exposing the service to the public internet.

## Verify core workflows

```powershell
node --check server.mjs
node --check script.js
node smoke-test.mjs
```

The smoke check exercises admin creation and permissions, vehicle creation and filters, customer registration, price calculation, invalid and overlapping dates, cancellation, booking status changes, customer data isolation, receipts and dashboard statistics. It uses a temporary database and removes it after the check.
