'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { listStages } from '@/lib/utils/stage-storage';
import { readQuizSessions } from '@/lib/quiz/persistence';
import styles from './page.module.css';

const ROUNDTABLE_STORAGE_KEYS = ['roundtableDebates:v2', 'roundtableDebates:v1'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

interface RoundtableSessionLike {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}

function startOfDayMs(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function readRoundtableSessions(): RoundtableSessionLike[] {
  if (typeof window === 'undefined') return [];
  const byId = new Map<string, RoundtableSessionLike>();
  try {
    for (const key of ROUNDTABLE_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { sessions?: unknown[] };
      if (!Array.isArray(parsed.sessions)) continue;
      for (const item of parsed.sessions) {
        if (!item || typeof item !== 'object') continue;
        const session = item as RoundtableSessionLike;
        const sessionId = typeof session.id === 'string' ? session.id : '';
        if (!sessionId) continue;
        byId.set(sessionId, session);
      }
    }
    return Array.from(byId.values());
  } catch {
    return [];
  }
}

function computeLearningStreak(timestamps: number[]): number {
  if (!timestamps.length) return 0;
  const daySet = new Set<number>();
  for (const ts of timestamps) {
    if (!Number.isFinite(ts)) continue;
    daySet.add(startOfDayMs(ts));
  }
  if (!daySet.size) return 0;

  let cursor = startOfDayMs(Date.now());
  if (!daySet.has(cursor)) {
    cursor -= DAY_MS;
  }

  let streak = 0;
  while (daySet.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

export default function HomePage() {
  const { isLoggedIn } = useAuthGuard();
  const [stats, setStats] = useState({
    completedClassrooms: 0,
    practiceQuestionCount: 0,
    discussionTopics: 0,
    continuousLearningDays: 0,
  });

  const readLocalStats = useCallback(async () => {
    const stages = await listStages();
    const quizzes = readQuizSessions();
    const roundtableSessions = readRoundtableSessions();
    const completedClassrooms = stages.length;
    const practiceQuestionCount = quizzes.reduce(
      (sum, item) => sum + (Number.isFinite(item.questionCount) ? item.questionCount : 0),
      0,
    );
    const discussionTopics = roundtableSessions.length;

    const activityTimestamps = [
      ...stages.map((stage) => stage.updatedAt || stage.createdAt),
      ...quizzes.map((quiz) => quiz.updatedAt || quiz.createdAt),
      ...roundtableSessions.map((session) => session.updatedAt || session.createdAt),
    ].filter((ts): ts is number => Number.isFinite(ts));
    const continuousLearningDays = computeLearningStreak(activityTimestamps);

    return { completedClassrooms, practiceQuestionCount, discussionTopics, continuousLearningDays };
  }, []);

  const refreshStats = useCallback(async () => {
    const localStats = await readLocalStats();
    try {
      const response = await fetch('/api/dashboard/stats', { method: 'GET' });
      const result = (await response.json()) as {
        success?: boolean;
        data?: {
          completedClassrooms?: number;
          practiceQuestionCount?: number;
          discussionTopics?: number;
          continuousLearningDays?: number;
        };
      };

      if (response.ok && result.success && result.data) {
        const backendStats = {
          completedClassrooms: Number(result.data.completedClassrooms ?? 0),
          practiceQuestionCount: Number(result.data.practiceQuestionCount ?? 0),
          discussionTopics: Number(result.data.discussionTopics ?? 0),
          continuousLearningDays: Number(result.data.continuousLearningDays ?? 0),
        };
        // Prefer backend as source of truth (already includes membership-level visibility limits).
        setStats(backendStats);
        return;
      }
    } catch {
      // Fallback to local stats below.
    }

    setStats(localStats);
  }, [readLocalStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshStats().catch(() => undefined);
    }, 0);

    const onFocus = () => {
      refreshStats().catch(() => undefined);
    };
    const onStorage = () => {
      refreshStats().catch(() => undefined);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshStats]);

  if (!isLoggedIn) return null;
  return (
    <AppShell
      activeKey="home"
      title="欢迎回来，小明"
      description="今天是学习的好日子，继续加油。"
      actions={
        <>
          <button className={styles.btn + ' ' + styles.btnOutline} type="button">
            数据报告
          </button>
          <Link className={styles.btn + ' ' + styles.btnPrimary} href="/classroom">
            快速开始
          </Link>
        </>
      }
    >
      <div className={styles.featureGrid}>
        <Link href="/classroom" className={styles.featureCard}>
          <div className={styles.featureIcon + ' ' + styles.iClassroom}>📘</div>
          <div className={styles.featureTitle}>教案课堂</div>
          <div className={styles.featureDesc}>上传老师教案 PDF，AI 智能讲解授课，支持互动实验。</div>
          <div className={styles.featureTags}>
            <span className={styles.featureTag}>PDF 教案</span>
            <span className={styles.featureTag}>智能讲解</span>
          </div>
        </Link>

        <Link href="/exercise" className={styles.featureCard + ' ' + styles.featureCardActive}>
          <div className={styles.featureIcon + ' ' + styles.iExercise}>📝</div>
          <div className={styles.featureTitle}>互动练习</div>
          <div className={styles.featureDesc}>上传练习 PDF，AI 严格按原题生成测验并批改。</div>
          <div className={styles.featureTags}>
            <span className={styles.featureTag}>PDF 练习题</span>
            <span className={styles.featureTag}>AI 解析</span>
          </div>
        </Link>

        <Link href="/roundtable" className={styles.featureCard}>
          <div className={styles.featureIcon + ' ' + styles.iRoundtable}>💬</div>
          <div className={styles.featureTitle}>圆桌讨论</div>
          <div className={styles.featureDesc}>围绕学生提问发起讨论，老师与 AI 学生多视角协作推理。</div>
          <div className={styles.featureTags}>
            <span className={styles.featureTag}>同学互助</span>
            <span className={styles.featureTag}>讨论学习</span>
          </div>
        </Link>
      </div>

      <div className={styles.quickSection}>
        <div className={styles.quickTitle}>快捷工具</div>
        <div className={styles.quickGrid}>
          <Link href="/pdf-tools" className={styles.quickItem}>
            <div className={styles.quickIcon + ' ' + styles.q1}>📄</div>
            <div className={styles.quickLabel}>Word 转 PDF</div>
          </Link>
          <Link href="/knowledge-select" className={styles.quickItem}>
            <div className={styles.quickIcon + ' ' + styles.q2}>🌌</div>
            <div className={styles.quickLabel}>知识宇宙</div>
          </Link>
          <Link href="/knowledge-tree" className={styles.quickItem}>
            <div className={styles.quickIcon + ' ' + styles.q3}>🌳</div>
            <div className={styles.quickLabel}>知识树</div>
          </Link>
        </div>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.statCard}>
          <div className={styles.statIcon + ' ' + styles.s1}>📘</div>
          <div className={styles.statValue}>{stats.completedClassrooms}</div>
          <div className={styles.statLabel}>已完成教案</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon + ' ' + styles.s2}>📝</div>
          <div className={styles.statValue}>{stats.practiceQuestionCount}</div>
          <div className={styles.statLabel}>练习题数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon + ' ' + styles.s3}>💬</div>
          <div className={styles.statValue}>{stats.discussionTopics}</div>
          <div className={styles.statLabel}>讨论话题</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon + ' ' + styles.s4}>🔥</div>
          <div className={styles.statValue}>{stats.continuousLearningDays}</div>
          <div className={styles.statLabel}>连续学习(天)</div>
        </div>
      </div>
    </AppShell>
  );
}
