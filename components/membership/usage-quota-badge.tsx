'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSubscriptionStore } from '@/lib/store/subscription';
import styles from './usage-quota-badge.module.css';

type UsageFeature = 'classroom' | 'exercise' | 'knowledge';

interface UsageData {
  feature: string;
  usedToday: number;
  limitToday: number;
  remaining: number;
  canUse: boolean;
}

const FEATURE_LABEL: Record<UsageFeature, string> = {
  classroom: '教案课堂',
  exercise: '互动练习',
  knowledge: '知识梳理',
};

export function UsageQuotaBadge({ feature }: { feature: UsageFeature }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);

  const refreshUsage = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/usage/check?feature=${feature}`, { method: 'GET' });
      const payload = (await response.json()) as { success?: boolean; data?: UsageData };
      if (response.ok && payload.success && payload.data) {
        setUsage(payload.data);
      } else {
        setUsage(null);
      }
    } catch {
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [feature]);

  useEffect(() => {
    void fetchSubscription();
    void refreshUsage();
    const onFocus = () => {
      void refreshUsage();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchSubscription, refreshUsage]);

  const mainText = useMemo(() => {
    const label = FEATURE_LABEL[feature];
    if (loading) return `${label}额度：查询中...`;
    if (!usage) return `${label}额度：暂无数据`;
    if (usage.limitToday === -1) return `${label}额度：无限`;
    return `${label}额度：今日剩余 ${Math.max(0, usage.remaining)} / ${usage.limitToday}`;
  }, [feature, loading, usage]);

  const subText = useMemo(() => {
    if (!usage || usage.limitToday === -1) {
      const planLabel =
        subscription?.subscriptionType === 'vip'
          ? 'VIP'
          : subscription?.subscriptionType === 'sub'
            ? '订阅会员'
            : '免费版';
      return `当前套餐：${planLabel}`;
    }
    return `已使用 ${Math.max(0, usage.usedToday)} 次`;
  }, [subscription?.subscriptionType, usage]);

  return (
    <div className={styles.badge} role="status" aria-live="polite">
      <span className={styles.main}>{mainText}</span>
      <span className={styles.sub}>{subText}</span>
    </div>
  );
}

