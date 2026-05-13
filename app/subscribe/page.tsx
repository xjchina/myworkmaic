'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { useSubscriptionStore, PLAN_META, PERMISSION_LABELS, type SubscriptionType } from '@/lib/store/subscription';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { toast } from 'sonner';
import {
  Check,
  Crown,
  Zap,
  Sparkles,
  Gift,
  Copy,
  ArrowRight,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import styles from './subscribe.module.css';

const PLAN_ORDER: SubscriptionType[] = ['free', 'sub', 'vip'];

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
}: {
  plan: SubscriptionType;
  isCurrent: boolean;
  onUpgrade: () => void;
}) {
  const meta = PLAN_META[plan];
  const isRecommended = plan === 'sub';
  const isVip = plan === 'vip';

  return (
    <div
      className={`${styles.planCard} ${isCurrent ? styles.planCardCurrent : ''} ${isRecommended ? styles.planCardRecommended : ''}`}
      data-plan={plan}
    >
      {/* Badge */}
      {meta.badge && (
        <div className={styles.planBadge} style={{ background: meta.gradient }}>
          {meta.badge}
        </div>
      )}

      {/* Header */}
      <div className={styles.planHeader}>
        <div className={styles.planIconWrap} style={{ background: meta.gradient }}>
          {plan === 'free' && <Zap className={styles.planIcon} />}
          {plan === 'sub' && <Sparkles className={styles.planIcon} />}
          {plan === 'vip' && <Crown className={styles.planIcon} />}
        </div>
        <h3 className={styles.planName} style={{ color: meta.color }}>{meta.label}</h3>
        <div className={styles.planPriceRow}>
          <span className={styles.planPrice}>{meta.price}</span>
          <span className={styles.planPeriod}>{meta.period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className={styles.featureList}>
        {(Object.keys(PERMISSION_LABELS) as Array<keyof typeof PERMISSION_LABELS>).map((key) => (
          <li key={key} className={`${styles.featureItem} ${plan !== 'free' ? styles.featureItemPremium : ''}`}>
            <Check
              className={styles.featureCheck}
              style={{ color: plan === 'free' ? '#94a3b8' : meta.color }}
            />
            <span className={styles.featureName}>{PERMISSION_LABELS[key].name}</span>
            <span
              className={styles.featureValue}
              style={{ color: plan === 'free' ? '#64748b' : meta.color }}
            >
              {PERMISSION_LABELS[key][plan]}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {plan === 'free' ? (
        <div className={styles.planCtaDisabled}>当前方案</div>
      ) : isCurrent ? (
        <div className={styles.planCtaActive}>
          {plan === 'vip' ? 'VIP 尊享中' : '订阅中'}
        </div>
      ) : (
        <button className={styles.planCtaButton} style={{ background: meta.gradient }} onClick={onUpgrade}>
          {isVip ? '升级 VIP' : '开通会员'}
          <ArrowRight className={styles.ctaArrow} />
        </button>
      )}
    </div>
  );
}

function RedeemCodePanel() {
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const redeemCode = useSubscriptionStore((s) => s.redeemCode);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('请输入兑换码');
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemCode(code.trim());
      if (result.success) {
        toast.success(result.message);
        setCode('');
      } else {
        toast.error(result.message);
      }
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className={styles.redeemPanel}>
      <Gift className={styles.redeemIcon} />
      <h4 className={styles.redeemTitle}>有兑换码？</h4>
      <p className={styles.redeemDesc}>输入订阅码即可激活或续期会员</p>
      <div className={styles.redeemInputRow}>
        <input
          className={styles.redeemInput}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={19}
        />
        <button
          className={styles.redeemButton}
          onClick={handleRedeem}
          disabled={redeeming || !code.trim()}
        >
          {redeeming ? <Loader2 className="size-4 animate-spin" /> : '兑换'}
        </button>
      </div>
    </div>
  );
}

function InviteSharePanel() {
  const shareStats = useSubscriptionStore((s) => s.shareStats);
  const fetchShareStats = useSubscriptionStore((s) => s.fetchShareStats);
  const generateInviteLink = useSubscriptionStore((s) => s.generateInviteLink);
  const [copied, setCopied] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchShareStats();
    }
  }, [fetchShareStats]);

  const handleCopyLink = useCallback(async () => {
    const result = await generateInviteLink();
    if (result.success && result.link) {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      toast.success('邀请链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(result.message || '生成失败');
    }
  }, [generateInviteLink]);

  if (!shareStats) return null;

  return (
    <div className={styles.invitePanel}>
      <h4 className={styles.inviteTitle}>邀请好友</h4>
      <p className={styles.inviteDesc}>好友注册并开通会员，你将获得 30 天订阅延长</p>
      <div className={styles.inviteStats}>
        <div className={styles.inviteStatItem}>
          <span className={styles.inviteStatValue}>{shareStats.totalInvites}</span>
          <span className={styles.inviteStatLabel}>邀请人数</span>
        </div>
        <div className={styles.inviteStatDivider} />
        <div className={styles.inviteStatItem}>
          <span className={styles.inviteStatValue}>{shareStats.successfulInvites}</span>
          <span className={styles.inviteStatLabel}>成功奖励</span>
        </div>
        <div className={styles.inviteStatDivider} />
        <div className={styles.inviteStatItem}>
          <span className={styles.inviteStatValue}>{shareStats.pendingRewards}</span>
          <span className={styles.inviteStatLabel}>待生效</span>
        </div>
      </div>
      <button className={styles.inviteButton} onClick={handleCopyLink}>
        <Copy className="size-4" />
        {copied ? '已复制' : '复制邀请链接'}
      </button>
    </div>
  );
}

export default function SubscribePage() {
  const isLoggedIn = useAuthGuard();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const loading = useSubscriptionStore((s) => s.loading);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const [showRedeem, setShowRedeem] = useState(false);
  const subFetchedRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn && !subFetchedRef.current) {
      subFetchedRef.current = true;
      fetchSubscription();
    }
  }, [isLoggedIn, fetchSubscription]);

  if (!isLoggedIn) return null;

  const currentType = subscription?.subscriptionType ?? 'free';

  const handleUpgrade = (plan: SubscriptionType) => {
    // TODO: 接入支付后替换为实际支付流程
    toast.info(`即将跳转到${PLAN_META[plan].label}支付页面...`, {
      description: '支付功能开发中，可使用兑换码激活',
    });
    // 自动展开兑换码面板
    setShowRedeem(true);
  };

  return (
    <AppShell
      activeKey="account"
      title="会员中心"
      description="选择适合你的学习方案，解锁全部功能"
    >
      <div className={styles.page}>
        {/* Current status bar */}
        <div className={styles.statusBar}>
          <div className={styles.statusInfo}>
            <div
              className={styles.statusBadge}
              style={{
                background:
                  currentType === 'vip'
                    ? 'linear-gradient(135deg,#f59e0b,#dc2626)'
                    : currentType === 'sub'
                      ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                      : 'linear-gradient(135deg,#94a3b8,#64748b)',
              }}
            >
              {currentType === 'vip' ? <Crown className="size-4" /> : currentType === 'sub' ? <Sparkles className="size-4" /> : <Zap className="size-4" />}
              <span>{PLAN_META[currentType].label}</span>
            </div>
            {subscription && subscription.expiresAt && (
              <span className={styles.statusExpiry}>
                到期时间：{subscription.expiresAt}（剩余 {subscription.remainingDays} 天）
              </span>
            )}
          </div>
          <button
            className={styles.redeemToggleButton}
            onClick={() => setShowRedeem(!showRedeem)}
          >
            <Gift className="size-4" />
            兑换码
          </button>
        </div>

        {/* Redeem panel (toggleable) */}
        {showRedeem && <RedeemCodePanel />}

        {/* Plan cards */}
        <div className={styles.plansGrid}>
          {PLAN_ORDER.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              isCurrent={plan === currentType}
              onUpgrade={() => handleUpgrade(plan)}
            />
          ))}
        </div>

        {/* Invite / Share */}
        <InviteSharePanel />

        {/* FAQ */}
        <section className={styles.faqSection}>
          <h3 className={styles.faqTitle}>常见问题</h3>
          {[
            { q: '订阅到期后怎么办？', a: '到期后自动降级为免费版，数据不受影响。随时可以续期或升级。' },
            { q: '兑换码可以叠加使用吗？', a: '可以！每张兑换码会在当前有效期基础上延长对应天数。' },
            { q: '如何获得兑换码？', a: '通过官方活动、邀请好友奖励、或直接联系客服获取。' },
            { q: '支持退款吗？', a: '订阅购买后不支持退款，请根据需要选择合适的套餐。兑换码未使用前可申请退回。' },
          ].map((item, idx) => (
            <details key={idx} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                {item.q}
                <ChevronRight className={`size-4 ${styles.faqChevron}`} />
              </summary>
              <p className={styles.faqAnswer}>{item.a}</p>
            </details>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
