# Subscription Billing Dashboard

React + TypeScript dashboard for the `subscription-billing-api` Spring Boot backend.

## Live Links

- Dashboard: [https://subscription-billing-dashboard.vercel.app](https://subscription-billing-dashboard.vercel.app)
- Backend API: [https://subscription-billing-api.onrender.com](https://subscription-billing-api.onrender.com)
- Swagger UI: [https://subscription-billing-api.onrender.com/swagger-ui.html](https://subscription-billing-api.onrender.com/swagger-ui.html)

## Demo Access

Use this shared account to explore the deployed dashboard with preloaded billing data:

```text
Email: demo@alvarolomba.dev
Password: DemoPassword123!
```

This account contains demo data only. You can also register a new account from the dashboard.

## Features

- JWT login and registration
- Billing metrics overview
- Plan creation and deactivation
- Customer creation
- Subscription creation and cancellation
- Invoice listing and payment
- API health status

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Lucide React

## Production

The dashboard is deployed on Vercel and talks to the Render-hosted Spring Boot API.

Set this environment variable in Vercel:

```text
VITE_API_BASE_URL=https://subscription-billing-api.onrender.com
```

The backend must include the deployed frontend URL in `CORS_ALLOWED_ORIGINS`:

```text
https://subscription-billing-dashboard.vercel.app
```

## Local Development

Local development is optional. The deployed dashboard and API are the primary demo targets.

Create `.env.local`:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Run the app:

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:5173
```
