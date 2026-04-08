import { redirectToCheckoutSuccess } from '@/lib/checkout-success-redirect';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  redirectToCheckoutSuccess(sp);
}
