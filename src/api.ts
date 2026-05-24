export type TokenResponse = { accessToken: string; tokenType: string }
export type User = { id: number; email: string; fullName: string }
export type Plan = { id: number; name: string; priceCents: number; currency: string; billingInterval: 'MONTHLY' | 'YEARLY'; trialDays: number; active: boolean; createdAt: string }
export type Customer = { id: number; email: string; name: string; company?: string | null; createdAt: string }
export type Subscription = { id: number; customerId: number; customerEmail: string; planId: number; planName: string; status: 'TRIALING' | 'ACTIVE' | 'CANCELED'; currentPeriodStart: string; currentPeriodEnd: string; canceledAt?: string | null; createdAt: string }
export type Invoice = { id: number; customerId: number; customerEmail: string; subscriptionId: number; amountCents: number; currency: string; status: 'OPEN' | 'PAID' | 'VOID'; dueDate: string; paidAt?: string | null; createdAt: string }
export type BillingStats = { activeSubscriptions: number; trialingSubscriptions: number; openInvoices: number; monthlyRecurringRevenueCents: number; paidRevenueCents: number }

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'https://subscription-billing-api.onrender.com'

async function request<T>(path: string, options: { token?: string; method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {}) {
  const headers: HeadersInit = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const fallback = `${response.status} ${response.statusText}`
    try {
      const errorBody = (await response.json()) as { message?: string; error?: string }
      throw new Error(errorBody.message ?? errorBody.error ?? fallback)
    } catch {
      throw new Error(fallback)
    }
  }

  return response.json() as Promise<T>
}

export const api = {
  baseUrl: API_BASE_URL,
  health: () => request<{ status: string }>('/actuator/health'),
  register: (body: { email: string; fullName: string; password: string }) => request<User>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) => request<TokenResponse>('/auth/login', { method: 'POST', body }),
  me: (token: string) => request<User>('/auth/me', { token }),
  stats: (token: string) => request<BillingStats>('/billing/stats', { token }),
  plans: (token: string) => request<Plan[]>('/plans', { token }),
  createPlan: (token: string, body: Omit<Plan, 'id' | 'active' | 'createdAt'>) => request<Plan>('/plans', { method: 'POST', token, body }),
  deactivatePlan: (token: string, id: number) => request<Plan>(`/plans/${id}/deactivate`, { method: 'PATCH', token }),
  customers: (token: string) => request<Customer[]>('/customers', { token }),
  createCustomer: (token: string, body: { email: string; name: string; company?: string }) => request<Customer>('/customers', { method: 'POST', token, body }),
  subscriptions: (token: string) => request<Subscription[]>('/subscriptions', { token }),
  createSubscription: (token: string, body: { customerId: number; planId: number }) => request<Subscription>('/subscriptions', { method: 'POST', token, body }),
  cancelSubscription: (token: string, id: number) => request<Subscription>(`/subscriptions/${id}/cancel`, { method: 'PATCH', token }),
  invoices: (token: string) => request<Invoice[]>('/invoices', { token }),
  payInvoice: (token: string, id: number) => request<Invoice>(`/invoices/${id}/pay`, { method: 'PATCH', token }),
}
