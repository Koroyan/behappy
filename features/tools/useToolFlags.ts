import { useAccount } from '@/lib/api/account';

/** Platform feature switches that decide which tools appear (off when unknown). */
export function useToolFlags() {
  const { me } = useAccount();
  const features = (me?.platform as { features?: Record<string, boolean> } | undefined)?.features || {};
  return { wellbeingSummary: features.wellbeingSummary === true };
}
