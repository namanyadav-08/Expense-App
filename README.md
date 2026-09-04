# Expense Reimbursement

Expense reimbursement workflow with a Node.js/Express/MongoDB backend and a Vite/React frontend.

## Local setup

Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Create `backend/.env` from `backend/.env.example` and set `MONGO_URI` and `JWT_SECRET`.
For the frontend, create `frontend/.env` from `frontend/.env.example` and set `VITE_API_URL`.

Start the applications in separate terminals:

```bash
cd backend && npm start
cd frontend && npm run dev
```

Seed demo data after configuring the backend environment:

```bash
cd backend && npm run seed
```

Demo password: `demo1234`.

## Deployment

### 1. MongoDB Atlas

Create a database, allow the deployment provider to connect, and copy the connection string.

### 2. Render backend

Create a Web Service from this repository with:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Set these environment variables in Render:

```text
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<long random secret>
CLIENT_URL=https://<your-vercel-domain>
NODE_ENV=production
```

After the service deploys, verify `https://<your-render-domain>/api/health` returns a successful response.
Run the seed command once from a trusted environment using the same production `MONGO_URI`:

```bash
cd backend && npm run seed
```

### 3. Vercel frontend

Import the repository into Vercel with:


Set this Vercel environment variable:

```text
VITE_API_URL=https://<your-render-domain>/api
```

Redeploy after setting the variable. The root `vercel.json` keeps React Router URLs working on browser refreshes.
The frontend `vercel.json` keeps React Router URLs working on browser refreshes.
## Demo accounts

After seeding:

- Employee: `alice@demo.com` / `demo1234`
- Employee: `bob@demo.com` / `demo1234`
- Approver: `carol@demo.com` / `demo1234`
- Approver: `dave@demo.com` / `demo1234`

Change demo credentials before sharing a production deployment.

