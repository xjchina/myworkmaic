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
  ChevronRight,
  X,
} from 'lucide-react';
import styles from './subscribe.module.css';

const PLAN_ORDER: SubscriptionType[] = ['free', 'sub', 'vip'];
const PLAN_FEATURE_KEYS = (Object.keys(PERMISSION_LABELS) as Array<keyof typeof PERMISSION_LABELS>).filter(
  (key) => key !== 'knowledgeSteps',
);

interface WechatPaymentOrder {
  outTradeNo: string;
  plan: 'monthly' | 'yearly';
  channel: 'native' | 'jsapi';
  amount: number;
  amountYuan: number;
  description: string;
  expiresAt: string;
  codeUrl: string | null;
  qrCodeUrl: string | null;
}

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  disabled,
}: {
  plan: SubscriptionType;
  isCurrent: boolean;
  onUpgrade: () => void;
  disabled?: boolean;
}) {
  const meta = PLAN_META[plan];
  const isRecommended = plan === 'sub';
  const isVip = plan === 'vip';

  return (
    <div
      className={`${styles.planCard} ${isCurrent ? styles.planCardCurrent : ''} ${isRecommended ? styles.planCardRecommended : ''}`}
      data-plan={plan}
    >
      {meta.badge ? (
        <div className={styles.planBadge} style={{ background: meta.gradient }}>
          {meta.badge}
        </div>
      ) : null}

      <div className={styles.planHeader}>
        <div className={styles.planIconWrap} style={{ background: meta.gradient }}>
          {plan === 'free' ? <Zap className={styles.planIcon} /> : null}
          {plan === 'sub' ? <Sparkles className={styles.planIcon} /> : null}
          {plan === 'vip' ? <Crown className={styles.planIcon} /> : null}
        </div>
        <h3 className={styles.planName} style={{ color: meta.color }}>
          {meta.label}
        </h3>
        <div className={styles.planPriceRow}>
          <span className={styles.planPrice}>{meta.price}</span>
          <span className={styles.planPeriod}>{meta.period}</span>
        </div>
      </div>

      <ul className={styles.featureList}>
        {PLAN_FEATURE_KEYS.map((key) => (
          <li key={key} className={`${styles.featureItem} ${plan !== 'free' ? styles.featureItemPremium : ''}`}>
            <Check className={styles.featureCheck} style={{ color: plan === 'free' ? '#94a3b8' : meta.color }} />
            <span className={styles.featureName}>{PERMISSION_LABELS[key].name}</span>
            <span className={styles.featureValue} style={{ color: plan === 'free' ? '#64748b' : meta.color }}>
              {PERMISSION_LABELS[key][plan]}
            </span>
          </li>
        ))}
      </ul>

      {plan === 'free' ? (
        <div className={styles.planCtaDisabled}>当前方案</div>
      ) : isCurrent ? (
        <div className={styles.planCtaActive}>{plan === 'vip' ? 'VIP 进行中' : '订阅进行中'}</div>
      ) : (
        <button className={styles.planCtaButton} style={{ background: meta.gradient }} onClick={onUpgrade} disabled={disabled}>
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
        <button className={styles.redeemButton} onClick={handleRedeem} disabled={redeeming || !code.trim()}>
          {redeeming ? <Loader2 className="size-4 animate-spin" /> : '兑换'}
        </button>
      </div>
    </div>
  );
}

function InviteSharePanel() {
  const shareStats = useSubscriptionStore((s) => s.shareStats);
  const fetchShareStats = useSubscriptionStore((s) => s.fetchShareStats);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const generateInviteLink = useSubscriptionStore((s) => s.generateInviteLink);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      void fetchShareStats();
    }
  }, [fetchShareStats]);

  const handleCopyLink = useCallback(async () => {
    const result = await generateInviteLink();
    if (result.success && result.link) {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      toast.success('邀请链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    toast.error(result.message || '生成失败');
  }, [generateInviteLink]);

  const handleClaimRewards = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/share/claim-rewards', { method: 'POST' });
      const data = await res.json().catch(() => ({} as { success?: boolean; message?: string; data?: { claimedCount?: number; rewardDays?: number } }));
      if (!res.ok || !data.success) {
        toast.error(data.message || '领取失败，请稍后重试');
        return;
      }

      const claimedCount = data.data?.claimedCount ?? 0;
      const rewardDays = data.data?.rewardDays ?? 0;
      if (claimedCount > 0) {
        toast.success(`已领取 ${rewardDays} 天会员奖励`);
      } else {
        toast.info('暂无可领取奖励');
      }

      await Promise.all([fetchShareStats(), fetchSubscription()]);
    } catch {
      toast.error('网络异常，领取失败，请稍后重试');
    } finally {
      setClaiming(false);
    }
  }, [claiming, fetchShareStats, fetchSubscription]);

  if (!shareStats) return null;

  return (
    <div className={styles.invitePanel}>
      <h4 className={styles.inviteTitle}>邀请好友</h4>
      <p className={styles.inviteDesc}>好友通过你的链接注册成功后，你可领取 30 天会员奖励。</p>
      <div className={styles.inviteStats}>
        <div className={styles.inviteStatItem}>
          <span className={styles.inviteStatValue}>{shareStats.totalInvites}</span>
          <span className={styles.inviteStatLabel}>邀请人数</span>
        </div>
        <div className={styles.inviteStatDivider} />
        <div className={styles.inviteStatItem}>
          <span className={styles.inviteStatValue}>{shareStats.successfulInvites}</span>
          <span className={styles.inviteStatLabel}>已领取</span>
        </div>
        <div className={styles.inviteStatDivider} />
        <div className={styles.inviteStatItem}>
          <span className={styles.inviteStatValue}>{shareStats.pendingRewards}</span>
          <span className={styles.inviteStatLabel}>待领取</span>
        </div>
      </div>
      <div className={styles.inviteActions}>
        {shareStats.pendingRewards > 0 ? (
          <button className={styles.inviteClaimButton} onClick={handleClaimRewards} disabled={claiming}>
            {claiming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            领取会员奖励
          </button>
        ) : null}
        <button className={styles.inviteButton} onClick={handleCopyLink}>
          <Copy className="size-4" />
          {copied ? '已复制' : '复制邀请链接'}
        </button>
      </div>
    </div>
  );
}

function WechatPayModal({
  order,
  checking,
  onClose,
}: {
  order: WechatPaymentOrder;
  checking: boolean;
  onClose: () => void;
}) {
  return (
    <div className={styles.payOverlay} role="dialog" aria-modal="true">
      <div className={styles.payModal}>
        <button className={styles.payCloseButton} type="button" onClick={onClose} aria-label="关闭支付弹窗">
          <X className="size-5" />
        </button>

        <div className={styles.payHeader}>
          <div className={styles.payLogo}>微</div>
          <div>
            <h3 className={styles.payTitle}>微信扫码支付</h3>
            <p className={styles.payDesc}>请使用微信扫一扫完成支付，支付成功后会自动开通会员。</p>
          </div>
        </div>

        <div className={styles.payBody}>
          <div className={styles.payQrBox}>
            {order.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.payQrImage} src={order.qrCodeUrl} alt="微信支付二维码" />
            ) : (
              <div className={styles.payQrFallback}>二维码生成失败，请重新下单</div>
            )}
          </div>

          <div className={styles.payInfo}>
            <div className={styles.payAmount}>¥{order.amountYuan.toFixed(2)}</div>
            <div className={styles.payProduct}>{order.description}</div>
            <div className={styles.payOrderNo}>订单号：{order.outTradeNo}</div>
            <div className={styles.payHint}>
              <Loader2 className="size-4 animate-spin" />
              正在等待微信支付结果...
            </div>
          </div>
        </div>

        <div className={styles.payFooter}>
          二维码有效期约 30 分钟，请勿重复支付同一订单。
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const isLoggedIn = useAuthGuard();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const [showRedeem, setShowRedeem] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionType | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<WechatPaymentOrder | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const subFetchedRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn && !subFetchedRef.current) {
      subFetchedRef.current = true;
      void fetchSubscription();
    }
  }, [isLoggedIn, fetchSubscription]);

  const currentType = subscription?.subscriptionType ?? 'free';

  useEffect(() => {
    if (!paymentOrder) return;
    let stopped = false;

    const checkPaymentStatus = async () => {
      if (stopped) return;
      setCheckingPayment(true);
      try {
        const res = await fetch(`/api/wechat/pay/status?outTradeNo=${encodeURIComponent(paymentOrder.outTradeNo)}`);
        const data = await res.json().catch(() => ({} as { success?: boolean; data?: { status?: string } }));
        if (res.ok && data.success && data.data?.status === 'paid') {
          stopped = true;
          setPaymentOrder(null);
          await fetchSubscription();
          toast.success('微信支付成功，会员已开通');
        }
      } finally {
        if (!stopped) setCheckingPayment(false);
      }
    };

    void checkPaymentStatus();
    const timer = window.setInterval(() => void checkPaymentStatus(), 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [fetchSubscription, paymentOrder]);

  if (!isLoggedIn) return null;

  const handleUpgrade = async (plan: SubscriptionType) => {
    if (plan === 'free') return;
    if (upgradingPlan) return;

    const payPlan = plan === 'vip' ? 'yearly' : 'monthly';

    setUpgradingPlan(plan);
    try {
      const res = await fetch('/api/wechat/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: payPlan,
          channel: 'native',
        }),
      });

      const data = await res.json().catch(() => ({} as { success?: boolean; error?: string; message?: string; data?: WechatPaymentOrder }));
      if (!res.ok || !data.success) {
        toast.error(data.message || data.error || '开通失败，请稍后重试');
        return;
      }

      if (!data.data) {
        toast.error('微信支付订单创建失败，请稍后重试');
        return;
      }

      setPaymentOrder(data.data);
      setShowRedeem(false);
      toast.success('微信支付订单已创建，请扫码支付');
    } catch {
      toast.error('网络异常，开通失败，请稍后重试');
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <AppShell activeKey="account" title="会员中心" description="选择适合你的学习方案，解锁更多能力">
      <div className={styles.page}>
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
            {subscription && subscription.expiresAt ? (
              <span className={styles.statusExpiry}>
                到期时间：{subscription.expiresAt}（剩余 {subscription.remainingDays} 天）
              </span>
            ) : null}
          </div>
          <button className={styles.redeemToggleButton} onClick={() => setShowRedeem((v) => !v)}>
            <Gift className="size-4" />
            兑换码
          </button>
        </div>

        {showRedeem ? <RedeemCodePanel /> : null}

        <div className={styles.plansGrid}>
          {PLAN_ORDER.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              isCurrent={plan === currentType}
              onUpgrade={() => void handleUpgrade(plan)}
              disabled={Boolean(upgradingPlan)}
            />
          ))}
        </div>

        <InviteSharePanel />

        <section className={styles.faqSection}>
          <h3 className={styles.faqTitle}>常见问题</h3>
          {[
            { q: '订阅到期后怎么办？', a: '到期后会自动回到免费版，数据不会丢失，可随时续费。' },
            { q: '兑换码可以叠加吗？', a: '可以，兑换码会在当前有效期基础上叠加对应时长。' },
            { q: '如何获得兑换码？', a: '可通过活动、邀请奖励或联系客服获取。' },
            { q: '支持退款吗？', a: '订阅购买后暂不支持退款，请按需选择方案。' },
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
      {paymentOrder ? (
        <WechatPayModal order={paymentOrder} checking={checkingPayment} onClose={() => setPaymentOrder(null)} />
      ) : null}
    </AppShell>
  );
}
