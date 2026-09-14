# 18. Auth-Routing Stability Plan

Status: **Plan only, written before implementation, per instruction.**
Scope: Fix a routing/loading race on direct URL loads to `/checkout`,
`/dashboard`, `/orders`. Not a login-method redesign.

---

## Root cause

`AuthContext` (`src/context/AuthContext.tsx`) already tracks session-loading
correctly:

```ts
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    if (session?.user) {
      loadCustomerProfile(session.user.id);
    } else {
      setLoading(false);
    }
  });
  ...
}, []);
```

`user` starts `null` and `loading` starts `true`. Both only settle after the
async `getSession()` call resolves (and, if a session exists, after
`loadCustomerProfile` finishes). `loading` is already returned from
`useAuth()` — it exists and is correct, it's just not being read anywhere
protected.

The three protected pages each have their own `useEffect` that checks auth on
mount, but depends only on `user`, not `loading`:

```ts
// CheckoutPage.tsx, DashboardPage.tsx, OrdersPage.tsx (same shape in each)
useEffect(() => {
  if (!user) {
    onNavigateToLogin();
    return;
  }
  loadSomething();
}, [user /* + other deps */]);
```

On a direct URL load or a refresh, this effect runs immediately after the
first render, when `user` is still `null` (the real session hasn't been read
back from storage yet). So it calls `onNavigateToLogin()` unconditionally —
even for a customer with a perfectly valid, unexpired session — before
`AuthContext` has had a chance to confirm one way or the other. Once
`getSession()` resolves a moment later, it's too late: the page has already
navigated away.

This is a **render-order race**, not an authentication bug: the session check
is genuinely asynchronous (it reads `localStorage` via a promise, per the
Supabase JS client), while the guard effect that decides whether to redirect
runs synchronously on mount, before that promise can resolve.

## Files likely touched

- `src/pages/CheckoutPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/OrdersPage.tsx`

`src/context/AuthContext.tsx` needs **no changes** — it already exposes the
`loading` flag these three pages need; they just aren't reading it yet.

`src/App.tsx` needs no changes — the routing race is inside each protected
page's own guard effect, not in how `App.tsx` selects which page to render.

## Exact intended fix

In each of the three pages:

1. Destructure `loading` from `useAuth()` under a distinct local name (e.g.
   `authLoading`), since each page already has its own unrelated `loading`
   state for its own data fetch.
2. In the existing guard `useEffect`, add an early return while
   `authLoading` is `true` — i.e., do nothing until the real session state is
   known, instead of assuming `!user` means "not logged in."
3. Add `authLoading` to that effect's dependency array so it re-runs the
   instant the real session state resolves.
4. Once `authLoading` is `false`: if `user` is still null, redirect to Login
   exactly as today; if `user` exists, proceed to load the page's data exactly
   as today.

No new UI is needed for this: all three pages already render a full-page
spinner (`if (loading) return <Loader ... />`) driven by their own `loading`
state, which starts `true` by default and only flips to `false` once their
data-loading branch runs. Because the guard effect now waits for
`authLoading` before doing anything, that existing spinner naturally covers
the short extra wait for the session check too — the user sees the same
loading spinner slightly longer, then either their real page or Login,
correctly, instead of a flash-redirect to Login that may reverse a moment
later.

This is the minimal fix: one new destructured value, one added early-return
line, one added dependency-array entry, per file. Nothing else in these
three files changes.

## What will not be changed

- `src/context/AuthContext.tsx` — no changes; its existing `loading`/`user`
  state machine is already correct.
- Email OTP, WhatsApp OTP, signup, or reset-password logic — untouched.
- `src/App.tsx` routing/navigation functions — untouched. The originally
  requested route (`/checkout`, `/dashboard`, `/orders`) is preserved as-is;
  this fix only delays an incorrect early redirect, it does not add new
  redirect/history logic.
- Checkout business logic, payment logic (Razorpay), delivery-fee
  calculation, cart logic, order logic — untouched.
- Supabase functions, migrations, WhatsApp/SMS notification logic —
  untouched.
- The visual design system — no new components, no new styles; the existing
  spinner markup already present in each file is reused as-is.
- `src/pages/AdminPage.tsx` — out of scope for this pass (not listed in the
  three routes to fix); left untouched.
