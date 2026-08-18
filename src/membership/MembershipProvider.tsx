import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ISODate, Plan, addDays, mock, parseISODate, toISODate, todayISO } from '@/data';

const STORAGE_KEY = 'app.membership';

export type MembershipStatus = 'active' | 'cancelled';

type StoredMembership = {
  plan_id: string;
  status: MembershipStatus;
  started_at: ISODate;
};

type MembershipContextValue = {
  plan: Plan;
  plans: Plan[];
  status: MembershipStatus;
  isActive: boolean;
  startedAt: ISODate;
  /** Renewal date while active; the last day of access once cancelled. */
  renewsOn: ISODate;
  changePlan: (planId: string) => void;
  cancelMembership: () => void;
  resumeMembership: () => void;
};

const MembershipContext = createContext<MembershipContextValue | null>(null);

const initial: StoredMembership = {
  plan_id: mock.subscription.plan_id,
  status: 'active',
  started_at: mock.subscription.started_at.slice(0, 10),
};

/**
 * The user's plan and its state. Stored locally for V1 — cancelling here is a
 * local flag, not a call to a payment provider, so wire the real billing calls
 * into these three methods when that exists.
 */
export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [membership, setMembership] = useState<StoredMembership>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setMembership(JSON.parse(stored) as StoredMembership);
      })
      .finally(() => setHydrated(true));
  }, []);

  const persist = useCallback((next: StoredMembership) => {
    setMembership(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const changePlan = useCallback(
    (planId: string) => {
      if (!mock.plans.some((p) => p.id === planId)) return;
      // A new term starts the day the user switches, so the renewal date the
      // screen shows is the one they actually get.
      persist({ plan_id: planId, status: 'active', started_at: todayISO() });
    },
    [persist]
  );

  const cancelMembership = useCallback(() => {
    persist({ ...membership, status: 'cancelled' });
  }, [membership, persist]);

  const resumeMembership = useCallback(() => {
    persist({ ...membership, status: 'active' });
  }, [membership, persist]);

  const value = useMemo<MembershipContextValue>(() => {
    const plan = mock.plans.find((p) => p.id === membership.plan_id) ?? mock.plans[0];

    return {
      plan,
      plans: mock.plans,
      status: membership.status,
      isActive: membership.status === 'active',
      startedAt: membership.started_at,
      renewsOn: toISODate(addDays(parseISODate(membership.started_at), plan.duration_days)),
      changePlan,
      cancelMembership,
      resumeMembership,
    };
  }, [membership, changePlan, cancelMembership, resumeMembership]);

  if (!hydrated) return null;

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership() {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error('useMembership must be used within MembershipProvider');
  return ctx;
}
