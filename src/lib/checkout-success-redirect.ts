import { redirect } from 'next/navigation';

/** Polar / payment flows often redirect to /success or /checkout/success — normalize to home query the app already handles. */
export function redirectToCheckoutSuccess(
  searchParams?: Record<string, string | string[] | undefined>
) {
  const q = new URLSearchParams();
  q.set('checkout', 'success');
  if (searchParams) {
    for (const [key, val] of Object.entries(searchParams)) {
      if (key === 'checkout' || val == null) continue;
      if (Array.isArray(val)) {
        for (const x of val) q.append(key, String(x));
      } else {
        q.set(key, String(val));
      }
    }
  }
  redirect(`/?${q.toString()}`);
}
