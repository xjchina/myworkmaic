'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { listStages } from '@/lib/utils/stage-storage';
import { readQuizSessions } from '@/lib/quiz/persistence';
import styles from './page.module.css';

const ROUNDTABLE_STORAGE_KEY = 'roundtableDebates:v1';

function readRoundtableTopicCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(ROUNDTABLE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { sessions?: unknown[] };
    return Array.isArray(parsed.sessions) ? parsed.sessions.length : 0;
  } catch {
    return 0;
  }
}

export default function HomePage() {
  const { isLoggedIn } = useAuthGuard();
  const [stats, setStats] = useState({
    completedClassrooms: 0,
    practiceQuestionCount: 0,
    discussionTopics: 0,
  });

  const refreshStats = useCallback(async () => {
    const stages = await listStages();
    const completedClassrooms = stages.length;
    const practiceQuestionCount = readQuizSessions().reduce(
      (sum, item) => sum + (Number.isFinite(item.questionCount) ? item.questionCount : 0),
      0,
    );
    const discussionTopics = readRoundtableTopicCount();
    setStats({ completedClassrooms, practiceQuestionCount, discussionTopics });
  }, []);

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
          <div className={styles.statValue}>7</div>
          <div className={styles.statLabel}>连续学习(天)</div>
        </div>
      </div>
    </AppShell>
  );
}
