# FMS Single-Index Vercel Portal

This package is structured for a Vercel deployment where `index.html` is the landing page.

## File structure

```text
/index.html
/style.css
/app.js
/api/_shared.js
/api/login.js
/api/session.js
/api/logout.js
/api/search.js
/api/order.js
/api/trip.js
/api/linehaul.js
/vercel.json
```

## How it works

- `index.html` is both the login entry point and the dashboard shell.
- On load, the frontend calls `/api/session`.
- If no session exists, the login screen is shown.
- After login, the server stores FMS auth values in an HTTP-only cookie.
- The frontend never needs to directly handle the raw tokens.
- All follow-up calls use the stored session on the server side.

## API groups wired

### Search
- `search-all`

### Order
- billing
- consignee
- detail
- files
- estimate freight
- order basic
- order history
- order tasks
- shipper
- head info
- actual freight

### Trip
- detail
- files
- history
- stops
- tasks

### Linehaul
- get-linehaul

## Deploy steps

1. Upload all files to your GitHub repo root.
2. Connect the repo to Vercel.
3. Deploy.
4. Open the deployed site.
5. Log in using valid FMS credentials.

## Notes

- Company ID is locked to `SBFH`.
- FMS client is locked to `FMS_WEB`.
- If you want to extend the dashboard, update `app.js` for the UI and the matching `/api/*.js` route for the backend logic.
