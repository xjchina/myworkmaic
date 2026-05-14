'use client';

import { X, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSubscriptionStore, PLAN_META, type SubscriptionType } from '@/lib/store/subscription';
import styles from './upgrade-modal.module.css';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const FEATURE_MESSAGES: Record<string, string> = {
  classroom: '今日教案课堂次数已用完',
  exercise: '今日练习次数已达上限',
  knowledge: '知识梳理步数已达限制',
  export: '数据导出为会员专属能力',
};

export function UpgradeModal({ open, onOpenChange, feature = 'classroom' }: UpgradeModalProps) {
  const subscription = useSubscriptionStore((s) => s.subscription);

  const currentType = subscription?.subscriptionType ?? 'free';
  const isVipCurrent = currentType === 'vip';
  const targetPlan: SubscriptionType = isVipCurrent ? 'sub' : currentType === 'sub' ? 'vip' : 'sub';

  const handleUpgrade = () => {
    onOpenChange(false);
    window.location.href = '/subscribe';
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className={styles.closeBtn} onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </button>

            <div className={styles.modalHeader}>
              <div className={styles.illustration} style={{ background: PLAN_META[targetPlan].gradient }}>
                {targetPlan === 'vip' ? <Crown className="size-10" /> : <Sparkles className="size-10" />}
              </div>
              <h2 className={styles.modalTitle}>升级到 {PLAN_META[targetPlan].label}</h2>
              <p className={styles.modalSubtitle}>{FEATURE_MESSAGES[feature] || '解锁更多使用次数'}</p>
            </div>

            <ul className={styles.benefitList}>
              {[
                '教案课堂更高额度或无限使用',
                '互动练习更多题量',
                '完整学习数据分析',
                '数据导出与历史留存',
              ].map((text) => (
                <li key={text} className={styles.benefitItem}>
                  <span className={styles.benefitCheck}>✓</span>
                  {text}
                </li>
              ))}
            </ul>

            <div className={styles.priceHighlight}>
              <span className={styles.priceLabel}>{PLAN_META[targetPlan].label}仅需</span>
              <span className={styles.priceAmount}>{PLAN_META[targetPlan].price}</span>
              <span className={styles.pricePeriod}>{PLAN_META[targetPlan].period}</span>
            </div>

            <button
              className={styles.upgradeButton}
              style={{ background: PLAN_META[targetPlan].gradient }}
              onClick={handleUpgrade}
            >
              立即升级
              <ArrowRight className="size-4" />
            </button>

            <p className={styles.footerHint}>支持兑换码激活 · 到期自动降级不丢失数据</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
