# FMS Vercel Frontend

Files included:
- `login.html` – login page that exchanges FMS credentials through `/api/login`
- `index.html` – main dispatcher workspace
- `api/*.js` – Vercel serverless functions used to call FMS endpoints server-side
- `vercel.json` – clean URL support

## Deploy
1. Push this folder structure to GitHub.
2. Import the repo into Vercel.
3. Make sure the project uses Node.js runtime for serverless functions.
4. Open `/login.html` first.

## Important
The implementation stores the FMS session in an HTTP-only cookie after login, which keeps the visible frontend free of raw token/auth controls.
