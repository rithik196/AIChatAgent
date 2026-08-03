import { redirect } from 'next/navigation';

type LandingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const journey = resolvedSearchParams.journey;
  const journeyValue = Array.isArray(journey) ? journey[0] : journey;

  if (journeyValue) {
    const nextParams = new URLSearchParams({ journey: journeyValue });
    redirect(`/login?${nextParams.toString()}`);
  }

  redirect('/login');
}
