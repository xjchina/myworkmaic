'use client';

import { useState, useCallback } from 'react';
import { useSubscriptionStore } from '@/lib/store/subscription';
import { UpgradeModal } from '@/components/membership/upgrade-modal';

/**
 * Hook to show upgrade modal when user hits usage limits.
 *
 * Usage:
 *   const { checkAndUpgrade, UpgradeModalRenderer, isLimitHit } = useUpgradeGuard();
 *
 *   // Before performing an action:
 *   if (await checkAndUpgrade('classroom')) {
 *     // can proceed
 *   }
 */
export function useUpgradeGuard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [feature, setFeature] = useState<string>('classroom');
  const checkUsage = useSubscriptionStore((s) => s.checkUsage);

  /**
   * Check if user can use a feature. Returns true if they can.
   * If limit reached, opens upgrade modal and returns false.
   */
  const checkAndUpgrade = useCallback(
    async (featureName: string): Promise<boolean> => {
      const result = await checkUsage(featureName);
      if (!result.canUse) {
        setFeature(featureName);
        setModalOpen(true);
        return false;
      }
      return true;
    },
    [checkUsage],
  );

  const forceShow = useCallback((featureName?: string) => {
    setFeature(featureName ?? 'classroom');
    setModalOpen(true);
  }, []);

  const renderer = (
    <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} feature={feature} />
  );

  return {
    /** Check usage and auto-show upgrade modal if limited. Returns `true` if allowed to proceed. */
    checkAndUpgrade,
    /** Force-show the upgrade modal for a specific feature */
    forceShow,
    /** Whether the upgrade modal is currently open */
    isOpen: modalOpen,
    /** Render this in your component tree (usually near root) */
    UpgradeModal: () => renderer,
  };
}
