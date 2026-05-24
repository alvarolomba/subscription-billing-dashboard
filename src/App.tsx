import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, BadgeDollarSign, CreditCard, LoaderCircle, LogOut, Plus, Receipt, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { z } from 'zod'
import { api, type Customer, type Invoice, type Subscription } from './api'
import './App.css'
import './alignment.css'

const tokenKey = 'subscription-billing-token'
type Tab = 'overview' | 'plans' | 'customers' | 'subscriptions' | 'invoices'

const authSchema = z.object({ email: z.string().email(), fullName: z.string().optional(), password: z.string().min(8) })
const planSchema = z.object({ name: z.string().min(2), priceCents: z.coerce.number().int().min(0), currency: z.string().length(3).transform((v) => v.toUpperCase()), billingInterval: z.enum(['MONTHLY', 'YEARLY']), trialDays: z.coerce.number().int().min(0).max(365) })
const customerSchema = z.object({ email: z.string().email(), name: z.string().min(2), company: z.string().optional() })
const subscriptionSchema = z.object({ customerId: z.coerce.number().int().positive(), planId: z.coerce.number().int().positive() })

const money = (cents = 0, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '-'
const statusClass = (status: string) => `status ${status.toLowerCase()}`

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? '')
  const [tab, setTab] = useState<Tab>('overview')

  if (!token) {
    return <Auth onToken={(next) => { localStorage.setItem(tokenKey, next); setToken(next) }} />
  }

  return <Dashboard token={token} tab={tab} setTab={setTab} logout={() => { localStorage.removeItem(tokenKey); setToken('') }} />
}

function Auth({ onToken }: { onToken: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const form = useForm<z.infer<typeof authSchema>>({ resolver: zodResolver(authSchema), defaultValues: { email: '', fullName: '', password: '' } })
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof authSchema>) => {
      if (mode === 'register') {
        if (!values.fullName || values.fullName.length < 2) throw new Error('Full name must be at least 2 characters')
        await api.register({ email: values.email, fullName: values.fullName, password: values.password })
      }
      return api.login({ email: values.email, password: values.password })
    },
    onSuccess: (response) => onToken(response.accessToken),
  })

  return (
    <main className="auth-page">
      <section className="hero-panel">
        <div className="logo"><BadgeDollarSign /></div>
        <div>
          <p className="eyebrow">Subscription Billing</p>
          <h1>SaaS billing operations from plan setup to invoice payment.</h1>
          <p>A focused React client for the Spring Boot billing API with JWT auth, persisted data, and lifecycle actions.</p>
        </div>
      </section>
      <section className="auth-card">
        <div className="switcher">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Register</button>
        </div>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Email" error={form.formState.errors.email?.message}><input type="email" {...form.register('email')} /></Field>
          {mode === 'register' && <Field label="Full name" error={form.formState.errors.fullName?.message}><input {...form.register('fullName')} /></Field>}
          <Field label="Password" error={form.formState.errors.password?.message}><input type="password" {...form.register('password')} /></Field>
          {mutation.error && <p className="error">{mutation.error.message}</p>}
          <button className="primary" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="spin" /> : <ShieldCheck />} {mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
      </section>
    </main>
  )
}

function Dashboard({ token, tab, setTab, logout }: { token: string; tab: Tab; setTab: (tab: Tab) => void; logout: () => void }) {
  const user = useQuery({ queryKey: ['me'], queryFn: () => api.me(token) })
  const health = useQuery({ queryKey: ['health'], queryFn: api.health })
  const qc = useQueryClient()
  const tabs: Array<[Tab, string, typeof Activity]> = [['overview', 'Overview', Activity], ['plans', 'Plans', CreditCard], ['customers', 'Customers', Users], ['subscriptions', 'Subscriptions', RefreshCw], ['invoices', 'Invoices', Receipt]]

  return (
    <div className="shell">
      <aside>
        <div className="brand"><span><BadgeDollarSign /></span><div><strong>Billing Console</strong><small>Spring Boot API client</small></div></div>
        <nav>{tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon /> {label}</button>)}</nav>
        <div className="aside-bottom"><p><i className={health.data?.status === 'UP' ? 'up' : ''} /> API {health.data?.status ?? 'checking'}</p><button onClick={logout}><LogOut /> Logout</button></div>
      </aside>
      <main className="content">
        <header>
          <div><p className="eyebrow">Subscription Billing API</p><h1>{tabs.find(([id]) => id === tab)?.[1]}</h1></div>
          <div className="user"><button onClick={() => qc.invalidateQueries()}><RefreshCw /> Refresh</button><span>{user.data?.fullName ?? 'Loading'}<small>{user.data?.email ?? api.baseUrl}</small></span></div>
        </header>
        {tab === 'overview' && <Overview token={token} />}
        {tab === 'plans' && <Plans token={token} />}
        {tab === 'customers' && <Customers token={token} />}
        {tab === 'subscriptions' && <Subscriptions token={token} />}
        {tab === 'invoices' && <Invoices token={token} />}
      </main>
    </div>
  )
}

function Overview({ token }: { token: string }) {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.stats(token) })
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.plans(token) })
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => api.customers(token) })
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: () => api.invoices(token) })
  const s = stats.data
  return <div className="stack"><div className="metrics"><Metric label="Active subscriptions" value={s?.activeSubscriptions ?? 0} /><Metric label="Trials" value={s?.trialingSubscriptions ?? 0} /><Metric label="Open invoices" value={s?.openInvoices ?? 0} /><Metric label="MRR" value={money(s?.monthlyRecurringRevenueCents)} /></div><div className="grid"><Panel title="Revenue" subtitle="Paid and recurring revenue"><Rows rows={[['Paid revenue', money(s?.paidRevenueCents)], ['Monthly recurring revenue', money(s?.monthlyRecurringRevenueCents)]]} /></Panel><Panel title="Objects" subtitle="Current account data"><Rows rows={[['Plans', plans.data?.length ?? 0], ['Customers', customers.data?.length ?? 0], ['Invoices', invoices.data?.length ?? 0]]} /></Panel></div></div>
}

function Plans({ token }: { token: string }) {
  const qc = useQueryClient()
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.plans(token) })
  const form = useForm<z.input<typeof planSchema>, unknown, z.output<typeof planSchema>>({ resolver: zodResolver(planSchema), defaultValues: { name: 'Growth', priceCents: 4900, currency: 'USD', billingInterval: 'MONTHLY', trialDays: 14 } })
  const create = useMutation({ mutationFn: (body: z.output<typeof planSchema>) => api.createPlan(token, body), onSuccess: () => { form.reset(); qc.invalidateQueries() } })
  const deactivate = useMutation({ mutationFn: (id: number) => api.deactivatePlan(token, id), onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }) })
  return <Two main={<Panel title="Plans" subtitle="Pricing plans">{plans.data?.map((p) => <article className="list-card" key={p.id}><b>{p.name}</b><span>{money(p.priceCents, p.currency)}</span><em className={statusClass(p.active ? 'ACTIVE' : 'CANCELED')}>{p.active ? 'ACTIVE' : 'INACTIVE'}</em>{p.active && <button onClick={() => deactivate.mutate(p.id)}>Deactivate</button>}</article>)}<State loading={plans.isLoading} error={plans.error} empty={!plans.data?.length} /></Panel>} side={<Panel title="Create plan" subtitle="Add a billable tier"><Form onSubmit={form.handleSubmit((v) => create.mutate(v))} error={create.error?.message}><Field label="Name"><input {...form.register('name')} /></Field><Field label="Price cents"><input type="number" {...form.register('priceCents')} /></Field><Field label="Currency"><input {...form.register('currency')} /></Field><Field label="Interval"><select {...form.register('billingInterval')}><option>MONTHLY</option><option>YEARLY</option></select></Field><Field label="Trial days"><input type="number" {...form.register('trialDays')} /></Field><Submit pending={create.isPending}>Create plan</Submit></Form></Panel>} />
}

function Customers({ token }: { token: string }) {
  const qc = useQueryClient()
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => api.customers(token) })
  const form = useForm<z.infer<typeof customerSchema>>({ resolver: zodResolver(customerSchema), defaultValues: { email: 'buyer@example.com', name: 'Buyer One', company: 'Acme Inc' } })
  const create = useMutation({ mutationFn: (body: z.infer<typeof customerSchema>) => api.createCustomer(token, body), onSuccess: () => { form.reset(); qc.invalidateQueries({ queryKey: ['customers'] }) } })
  return <Two main={<Panel title="Customers" subtitle="Customer records"><Table data={customers.data ?? []} loading={customers.isLoading} error={customers.error} cols={['Name', 'Email', 'Company', 'Created']} row={(c: Customer) => [c.name, c.email, c.company ?? '-', date(c.createdAt)]} /></Panel>} side={<Panel title="Create customer" subtitle="Add a billing customer"><Form onSubmit={form.handleSubmit((v) => create.mutate(v))} error={create.error?.message}><Field label="Email"><input type="email" {...form.register('email')} /></Field><Field label="Name"><input {...form.register('name')} /></Field><Field label="Company"><input {...form.register('company')} /></Field><Submit pending={create.isPending}>Create customer</Submit></Form></Panel>} />
}

function Subscriptions({ token }: { token: string }) {
  const qc = useQueryClient()
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.plans(token) })
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => api.customers(token) })
  const subscriptions = useQuery({ queryKey: ['subscriptions'], queryFn: () => api.subscriptions(token) })
  const form = useForm<z.input<typeof subscriptionSchema>, unknown, z.output<typeof subscriptionSchema>>({ resolver: zodResolver(subscriptionSchema) })
  const create = useMutation({ mutationFn: (body: z.output<typeof subscriptionSchema>) => api.createSubscription(token, body), onSuccess: () => qc.invalidateQueries() })
  const cancel = useMutation({ mutationFn: (id: number) => api.cancelSubscription(token, id), onSuccess: () => qc.invalidateQueries() })
  return <Two main={<Panel title="Subscriptions" subtitle="Lifecycle and periods"><Table data={subscriptions.data ?? []} loading={subscriptions.isLoading} error={subscriptions.error} cols={['Customer', 'Plan', 'Status', 'Period', 'Action']} row={(s: Subscription) => [s.customerEmail, s.planName, <em className={statusClass(s.status)}>{s.status}</em>, `${date(s.currentPeriodStart)} - ${date(s.currentPeriodEnd)}`, s.status !== 'CANCELED' ? <button onClick={() => cancel.mutate(s.id)}>Cancel</button> : '-']} /></Panel>} side={<Panel title="Create subscription" subtitle="Generates first invoice"><Form onSubmit={form.handleSubmit((v) => create.mutate(v))} error={create.error?.message}><Field label="Customer"><select {...form.register('customerId')}><option value="">Select customer</option>{customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Plan"><select {...form.register('planId')}><option value="">Select plan</option>{plans.data?.map((p) => <option disabled={!p.active} key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Submit pending={create.isPending}>Create subscription</Submit></Form></Panel>} />
}

function Invoices({ token }: { token: string }) {
  const qc = useQueryClient()
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: () => api.invoices(token) })
  const pay = useMutation({ mutationFn: (id: number) => api.payInvoice(token, id), onSuccess: () => qc.invalidateQueries() })
  return <Panel title="Invoices" subtitle="Generated invoices and payment state"><Table data={invoices.data ?? []} loading={invoices.isLoading} error={invoices.error} cols={['Customer', 'Amount', 'Status', 'Due date', 'Paid at', 'Action']} row={(i: Invoice) => [i.customerEmail, money(i.amountCents, i.currency), <em className={statusClass(i.status)}>{i.status}</em>, date(i.dueDate), date(i.paidAt), i.status === 'OPEN' ? <button onClick={() => pay.mutate(i.id)}>Pay</button> : 'Paid']} /></Panel>
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="panel"><div className="panel-head"><h2>{title}</h2><p>{subtitle}</p></div>{children}</section> }
function Two({ main, side }: { main: React.ReactNode; side: React.ReactNode }) { return <section className="two"><div>{main}</div><div>{side}</div></section> }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label>{label}{children}{error && <span>{error}</span>}</label> }
function Form({ onSubmit, error, children }: { onSubmit: () => void; error?: string; children: React.ReactNode }) { return <form onSubmit={onSubmit}>{children}{error && <p className="error">{error}</p>}</form> }
function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) { return <button className="primary" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Plus />}{children}</button> }
function Metric({ label, value }: { label: string; value: string | number }) { return <article className="metric"><span>{label}</span><b>{value}</b></article> }
function Rows({ rows }: { rows: Array<[string, string | number]> }) { return <div className="rows">{rows.map(([k, v]) => <p key={k}><span>{k}</span><b>{v}</b></p>)}</div> }
function State({ loading, error, empty }: { loading?: boolean; error?: Error | null; empty?: boolean }) { if (loading) return <p className="empty">Loading...</p>; if (error) return <p className="error">{error.message}</p>; if (empty) return <p className="empty">No records yet.</p>; return null }
function Table<T>({ data, cols, row, loading, error }: { data: T[]; cols: string[]; row: (item: T) => React.ReactNode[]; loading?: boolean; error?: Error | null }) { if (loading || error || data.length === 0) return <State loading={loading} error={error} empty={data.length === 0} />; return <div className="table-wrap"><table><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{data.map((item, i) => <tr key={i}>{row(item).map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div> }
