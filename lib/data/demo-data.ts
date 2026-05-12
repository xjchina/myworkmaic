/**
 * Built-in demo data for classroom and exercise features.
 * All users can click to preview these without any setup.
 *
 * The demo classroom uses real PPTist Canvas slide data,
 * identical to what the AI generates, so users see the authentic experience.
 */

import type { QuizQuestion, Scene, Stage } from '@/lib/types/stage';
import type { Slide, SlideTheme, SlideBackground, PPTTextElement, PPTShapeElement, PPTCodeElement } from '@/lib/types/slides';

// ── Constants ───────────────────────────────────────────────

export const DEMO_STAGE_ID = 'demo-classroom-python-functions';

export const DEMO_CLASSROOM_TITLE = 'Python 编程基础 · 函数与模块';
export const DEMO_CLASSROOM_DESC = '内置示例课堂，展示教案课堂的完整交互效果：幻灯片翻页、随堂测验、圆桌讨论。';

// ── Shared theme ────────────────────────────────────────────

const DEMO_THEME: SlideTheme = {
  backgroundColor: '#ffffff',
  themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4'],
  fontColor: '#333333',
  fontName: 'Microsoft YaHei',
  outline: { color: '#d14424', width: 2, style: 'solid' },
  shadow: { h: 0, v: 0, blur: 10, color: '#000000' },
};

// ── Helper: text element ────────────────────────────────────

function textEl(
  id: string,
  left: number, top: number, width: number, height: number,
  content: string,
  opts: Partial<PPTTextElement> & { defaultColor?: string; defaultFontName?: string; fill?: string; textType?: PPTTextElement['textType'] } = {},
): PPTTextElement {
  return {
    type: 'text',
    id,
    left, top, width, height,
    rotate: 0,
    content,
    defaultFontName: opts.defaultFontName ?? 'Microsoft YaHei',
    defaultColor: opts.defaultColor ?? '#333333',
    fill: opts.fill,
    textType: opts.textType,
    lineHeight: opts.lineHeight ?? 1.5,
    wordSpace: opts.wordSpace ?? 0,
    paragraphSpace: opts.paragraphSpace ?? 5,
    opacity: opts.opacity,
    ...opts,
  };
}

// ── Helper: shape element (rectangle) ──────────────────────

function rectShape(
  id: string,
  left: number, top: number, width: number, height: number,
  fill: string,
  opts: Partial<PPTShapeElement> = {},
): PPTShapeElement {
  return {
    type: 'shape',
    id,
    left, top, width, height,
    rotate: 0,
    viewBox: [1000, 1000],
    path: 'M0,0 L1000,0 L1000,1000 L0,1000 Z',
    fixedRatio: false,
    fill,
    opacity: opts.opacity,
    ...opts,
  };
}

// ── Helper: code element ────────────────────────────────────

function codeEl(
  id: string,
  left: number, top: number, width: number, height: number,
  language: string,
  lines: string[],
  opts: Partial<PPTCodeElement> = {},
): PPTCodeElement {
  return {
    type: 'code',
    id,
    left, top, width, height,
    rotate: 0,
    language,
    lines: lines.map((c, i) => ({ id: `L${i + 1}`, content: c })),
    fileName: opts.fileName,
    showLineNumbers: opts.showLineNumbers ?? true,
    fontSize: opts.fontSize ?? 14,
    ...opts,
  };
}

// ── Slide 1: Cover ──────────────────────────────────────────

const SLIDE_COVER_BG: SlideBackground = {
  type: 'gradient',
  gradient: {
    type: 'linear',
    colors: [
      { pos: 0, color: '#4338ca' },
      { pos: 50, color: '#6d28d9' },
      { pos: 100, color: '#db2777' },
    ],
    rotate: 135,
  },
};

const SLIDE_COVER: Slide = {
  id: 'demo_slide_1',
  viewportSize: 1000,
  viewportRatio: 0.5625,
  theme: DEMO_THEME,
  background: SLIDE_COVER_BG,
  type: 'cover',
  elements: [
    rectShape('cover_bar', 0, 360, 1000, 6, 'rgba(255,255,255,0.25)'),
    textEl('cover_tag', 340, 200, 320, 40,
      '<p style="text-align:center;"><span style="font-size:16px;color:rgba(255,255,255,0.8);">内置示例课堂</span></p>',
      { defaultColor: 'rgba(255,255,255,0.8)', fill: 'transparent' }),
    textEl('cover_title', 100, 250, 800, 80,
      '<p style="text-align:center;"><span style="font-size:40px;font-weight:bold;color:#ffffff;">Python 编程基础</span></p>',
      { defaultColor: '#ffffff', fill: 'transparent', textType: 'title' }),
    textEl('cover_subtitle', 200, 340, 600, 50,
      '<p style="text-align:center;"><span style="font-size:22px;color:rgba(255,255,255,0.7);">第3章 · 函数与模块</span></p>',
      { defaultColor: 'rgba(255,255,255,0.7)', fill: 'transparent', textType: 'subtitle' }),
  ],
};

// ── Slide 2: 什么是函数？ ──────────────────────────────────

const SLIDE_WHAT_FUNC: Slide = {
  id: 'demo_slide_2',
  viewportSize: 1000,
  viewportRatio: 0.5625,
  theme: DEMO_THEME,
  type: 'content',
  elements: [
    textEl('s2_title', 60, 30, 880, 60,
      '<p><span style="font-size:28px;font-weight:bold;color:#4338ca;">什么是函数？</span></p>',
      { defaultColor: '#4338ca', textType: 'title' }),
    rectShape('s2_divider', 60, 90, 120, 4, '#6366f1'),
    textEl('s2_desc', 60, 110, 880, 40,
      '<p><span style="font-size:18px;color:#555555;">函数是组织好的、可重复使用的代码块，用于实现单一或相关联的功能。</span></p>',
      { defaultColor: '#555555' }),
    textEl('s2_adv1_title', 60, 180, 420, 35,
      '<p><span style="font-size:18px;font-weight:bold;color:#4338ca;">💡 核心优势</span></p>',
      { defaultColor: '#4338ca' }),
    textEl('s2_adv1', 80, 220, 400, 140,
      '<p><span style="font-size:16px;color:#333333;">• <b>代码复用</b> — 写一次，用多次<br/>• <b>逻辑清晰</b> — 将复杂问题拆解为小步骤<br/>• <b>易于维护</b> — 修改一处即可全局生效<br/>• <b>降低耦合</b> — 模块化设计的基础</span></p>',
      { defaultColor: '#333333', lineHeight: 1.8 }),
    rectShape('s2_card_bg', 530, 170, 420, 210, '#eef2ff', { opacity: 1 }),
    textEl('s2_example_title', 550, 185, 380, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#4338ca;">📝 示例</span></p>',
      { defaultColor: '#4338ca' }),
    codeEl('s2_code', 550, 220, 380, 140, 'python', [
      '# 内置函数',
      'print(len("Hello"))  # 5',
      '',
      '# 自定义函数',
      'def greet(name):',
      '    return f"你好，{name}！"',
    ], { fontSize: 13 }),
  ],
};

// ── Slide 3: 函数定义语法 ──────────────────────────────────

const SLIDE_SYNTAX: Slide = {
  id: 'demo_slide_3',
  viewportSize: 1000,
  viewportRatio: 0.5625,
  theme: DEMO_THEME,
  type: 'content',
  elements: [
    textEl('s3_title', 60, 30, 880, 60,
      '<p><span style="font-size:28px;font-weight:bold;color:#334155;">函数定义语法</span></p>',
      { defaultColor: '#334155', textType: 'title' }),
    rectShape('s3_divider', 60, 90, 120, 4, '#64748b'),
    rectShape('s3_card_bg', 60, 120, 420, 230, '#f8fafc', { opacity: 1 }),
    textEl('s3_syntax_label', 80, 135, 380, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#334155;">📐 基本语法</span></p>',
      { defaultColor: '#334155' }),
    codeEl('s3_syntax_code', 80, 170, 380, 160, 'python', [
      'def function_name(parameters):',
      '    """文档字符串"""',
      '    # 函数体',
      '    return result',
    ], { fontSize: 14 }),
    rectShape('s3_example_bg', 520, 120, 420, 230, '#fffbeb', { opacity: 1 }),
    textEl('s3_example_label', 540, 135, 380, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#92400e;">▶ 运行示例</span></p>',
      { defaultColor: '#92400e' }),
    codeEl('s3_example_code', 540, 170, 380, 160, 'python', [
      'def greet(name):',
      '    return f"你好，{name}！"',
      '',
      'print(greet("小明"))',
      '# 输出：你好，小明！',
    ], { fontSize: 14 }),
    textEl('s3_note', 60, 370, 880, 40,
      '<p><span style="font-size:14px;color:#94a3b8;">💡 注意：Python 使用缩进（4空格）表示代码块，而非花括号</span></p>',
      { defaultColor: '#94a3b8' }),
  ],
};

// ── Slide 4: 参数类型详解 ──────────────────────────────────

const SLIDE_PARAMS: Slide = {
  id: 'demo_slide_4',
  viewportSize: 1000,
  viewportRatio: 0.5625,
  theme: DEMO_THEME,
  type: 'content',
  elements: [
    textEl('s4_title', 60, 30, 880, 60,
      '<p><span style="font-size:28px;font-weight:bold;color:#059669;">参数类型详解</span></p>',
      { defaultColor: '#059669', textType: 'title' }),
    rectShape('s4_divider', 60, 90, 120, 4, '#10b981'),
    // Card 1: 位置参数
    rectShape('s4_card1_bg', 60, 115, 280, 190, '#ecfdf5', { opacity: 1 }),
    textEl('s4_card1_title', 80, 125, 240, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#059669;">1️⃣ 位置参数</span></p>',
      { defaultColor: '#059669' }),
    textEl('s4_card1_desc', 80, 155, 240, 25,
      '<p><span style="font-size:13px;color:#666666;">按顺序传递</span></p>',
      { defaultColor: '#666666' }),
    codeEl('s4_card1_code', 80, 180, 240, 110, 'python', [
      'def add(a, b):',
      '    return a + b',
      '',
      'add(3, 5)  # 8',
    ], { fontSize: 12, showLineNumbers: false }),
    // Card 2: 默认参数
    rectShape('s4_card2_bg', 360, 115, 280, 190, '#fef3c7', { opacity: 1 }),
    textEl('s4_card2_title', 380, 125, 240, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#d97706;">2️⃣ 默认参数</span></p>',
      { defaultColor: '#d97706' }),
    textEl('s4_card2_desc', 380, 155, 240, 25,
      '<p><span style="font-size:13px;color:#666666;">可省略，使用默认值</span></p>',
      { defaultColor: '#666666' }),
    codeEl('s4_card2_code', 380, 180, 240, 110, 'python', [
      'def greet(name,',
      '         msg="你好"):',
      '    return f"{msg}，{name}"',
    ], { fontSize: 12, showLineNumbers: false }),
    // Card 3: 可变参数
    rectShape('s4_card3_bg', 660, 115, 280, 190, '#ede9fe', { opacity: 1 }),
    textEl('s4_card3_title', 680, 125, 240, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#7c3aed;">3️⃣ 可变参数</span></p>',
      { defaultColor: '#7c3aed' }),
    textEl('s4_card3_desc', 680, 155, 240, 25,
      '<p><span style="font-size:13px;color:#666666;">*args / **kwargs</span></p>',
      { defaultColor: '#666666' }),
    codeEl('s4_card3_code', 680, 180, 240, 110, 'python', [
      'def total(*nums):',
      '    return sum(nums)',
      '',
      'total(1,2,3)  # 6',
    ], { fontSize: 12, showLineNumbers: false }),
  ],
};

// ── Slide 5: 模块与导入 ────────────────────────────────────

const SLIDE_MODULES: Slide = {
  id: 'demo_slide_5',
  viewportSize: 1000,
  viewportRatio: 0.5625,
  theme: DEMO_THEME,
  type: 'content',
  elements: [
    textEl('s5_title', 60, 30, 880, 60,
      '<p><span style="font-size:28px;font-weight:bold;color:#d97706;">模块与导入</span></p>',
      { defaultColor: '#d97706', textType: 'title' }),
    rectShape('s5_divider', 60, 90, 120, 4, '#f59e0b'),
    textEl('s5_desc', 60, 110, 880, 40,
      '<p><span style="font-size:18px;color:#555555;">模块是包含 Python 定义和语句的文件。</span></p>',
      { defaultColor: '#555555' }),
    // Import methods
    textEl('s5_import_label', 60, 165, 420, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#d97706;">📦 导入方式</span></p>',
      { defaultColor: '#d97706' }),
    codeEl('s5_import_code', 60, 200, 420, 120, 'python', [
      '# 导入整个模块',
      'import math',
      '',
      '# 导入特定对象',
      'from math import pi',
      '',
      '# 使用别名',
      'import numpy as np',
    ], { fontSize: 13 }),
    // Common modules
    rectShape('s5_modules_bg', 530, 160, 420, 180, '#fffbeb', { opacity: 1 }),
    textEl('s5_modules_label', 550, 175, 380, 30,
      '<p><span style="font-size:16px;font-weight:bold;color:#d97706;">🔧 标准库常用模块</span></p>',
      { defaultColor: '#d97706' }),
    textEl('s5_modules_list', 550, 210, 380, 120,
      '<p><span style="font-size:16px;color:#333333;line-height:2;">os · sys · json · datetime<br/>collections · itertools<br/>re · pathlib · typing</span></p>',
      { defaultColor: '#333333', lineHeight: 2.0 }),
  ],
};

// ── Slide 6: 本节小结 ───────────────────────────────────────

const SLIDE_SUMMARY_BG: SlideBackground = {
  type: 'gradient',
  gradient: {
    type: 'linear',
    colors: [
      { pos: 0, color: '#ede9fe' },
      { pos: 100, color: '#fce7f3' },
    ],
    rotate: 135,
  },
};

const SLIDE_SUMMARY: Slide = {
  id: 'demo_slide_6',
  viewportSize: 1000,
  viewportRatio: 0.5625,
  theme: DEMO_THEME,
  background: SLIDE_SUMMARY_BG,
  type: 'end',
  elements: [
    textEl('s6_title', 60, 40, 880, 60,
      '<p><span style="font-size:28px;font-weight:bold;color:#7c3aed;">本节小结</span></p>',
      { defaultColor: '#7c3aed', textType: 'title' }),
    rectShape('s6_divider', 60, 100, 120, 4, '#a78bfa'),
    textEl('s6_points', 100, 130, 800, 180,
      '<p><span style="font-size:20px;color:#333333;line-height:2;">✅ 函数是代码复用的核心机制<br/>✅ <b>def</b> 关键字定义，<b>return</b> 返回结果<br/>✅ 支持位置参数、默认参数、可变参数<br/>✅ 模块化让代码更易组织和维护</span></p>',
      { defaultColor: '#333333', lineHeight: 2.0 }),
    rectShape('s6_next_bg', 100, 340, 800, 50, 'rgba(255,255,255,0.6)', { opacity: 1 }),
    textEl('s6_next', 120, 350, 760, 30,
      '<p><span style="font-size:16px;color:#7c3aed;">📖 下一章：面向对象编程 — 类与继承</span></p>',
      { defaultColor: '#7c3aed' }),
  ],
};

// ── Demo Quiz Questions ──────────────────────────────────────

export const DEMO_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'demo_q1',
    type: 'single',
    question: '在 Python 中，以下哪个关键字用于定义函数？',
    options: [
      { label: 'function', value: 'A' },
      { label: 'def', value: 'B' },
      { label: 'func', value: 'C' },
      { label: 'define', value: 'D' },
    ],
    answer: ['B'],
    analysis: 'Python 使用 def 关键字定义函数，语法为 def function_name(params):',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'demo_q2',
    type: 'single',
    question: '以下哪种数据结构遵循"先进后出"（LIFO）原则？',
    options: [
      { label: '队列（Queue）', value: 'A' },
      { label: '栈（Stack）', value: 'B' },
      { label: '链表（LinkedList）', value: 'C' },
      { label: '哈希表（HashMap）', value: 'D' },
    ],
    answer: ['B'],
    analysis: '栈（Stack）遵循后进先出（LIFO）原则，最后入栈的元素最先出栈。队列则是先进先出（FIFO）。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'demo_q3',
    type: 'multiple',
    question: '以下哪些是面向对象编程的三大特征？（多选）',
    options: [
      { label: '封装', value: 'A' },
      { label: '继承', value: 'B' },
      { label: '多态', value: 'C' },
      { label: '递归', value: 'D' },
    ],
    answer: ['A', 'B', 'C'],
    analysis: '面向对象编程的三大特征是封装、继承和多态。递归是一种算法设计方法，不属于 OOP 特征。',
    hasAnswer: true,
    points: 3,
  },
  {
    id: 'demo_q4',
    type: 'single',
    question: 'HTTP 状态码 404 表示什么？',
    options: [
      { label: '服务器内部错误', value: 'A' },
      { label: '请求成功', value: 'B' },
      { label: '资源未找到', value: 'C' },
      { label: '请求被拒绝', value: 'D' },
    ],
    answer: ['C'],
    analysis: '404 Not Found 表示服务器无法找到请求的资源。200 表示成功，500 表示服务器内部错误，403 表示禁止访问。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'demo_q5',
    type: 'short_answer',
    question: '请简述什么是时间复杂度，并举一个 O(n) 的例子。',
    answer: ['时间复杂度是衡量算法运行时间随输入规模增长的变化趋势。O(n) 的例子：遍历一个长度为 n 的数组查找某个元素。'],
    analysis: '时间复杂度用大 O 表示法描述算法效率。O(n) 表示运行时间与输入规模 n 成线性关系，如单层循环遍历数组。',
    commentPrompt: '答案需包含时间复杂度定义和一个 O(n) 的例子',
    hasAnswer: true,
    points: 4,
  },
  {
    id: 'demo_q6',
    type: 'single',
    question: '在 SQL 中，用于从数据库表中删除数据的关键字是？',
    options: [
      { label: 'REMOVE', value: 'A' },
      { label: 'DELETE', value: 'B' },
      { label: 'DROP', value: 'C' },
      { label: 'CLEAR', value: 'D' },
    ],
    answer: ['B'],
    analysis: 'DELETE 用于删除表中的行数据，DROP 用于删除整个表或数据库对象，SQL 中没有 REMOVE 和 CLEAR 关键字。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'demo_q7',
    type: 'multiple',
    question: '以下哪些属于 JavaScript 的基本数据类型？（多选）',
    options: [
      { label: 'Number', value: 'A' },
      { label: 'String', value: 'B' },
      { label: 'Array', value: 'C' },
      { label: 'Boolean', value: 'D' },
    ],
    answer: ['A', 'B', 'D'],
    analysis: 'JavaScript 基本数据类型包括 Number、String、Boolean、null、undefined、Symbol、BigInt。Array 是引用类型（对象）。',
    hasAnswer: true,
    points: 3,
  },
  {
    id: 'demo_q8',
    type: 'single',
    question: 'Git 中，将本地分支推送到远程仓库的命令是？',
    options: [
      { label: 'git commit', value: 'A' },
      { label: 'git push', value: 'B' },
      { label: 'git pull', value: 'C' },
      { label: 'git merge', value: 'D' },
    ],
    answer: ['B'],
    analysis: 'git push 将本地分支的更新推送到远程仓库。git commit 提交到本地，git pull 拉取远程更新，git merge 合并分支。',
    hasAnswer: true,
    points: 2,
  },
];

export const DEMO_QUIZ_SUMMARY = `内置示例练习，共 ${DEMO_QUIZ_QUESTIONS.length} 题，涵盖 Python、数据结构、OOP、HTTP、SQL、JavaScript、Git 等基础知识。`;

// ── Assembled Demo Stage & Scenes ───────────────────────────
// These are the complete objects ready to be loaded into useStageStore.

const DEMO_SLIDES: Slide[] = [SLIDE_COVER, SLIDE_WHAT_FUNC, SLIDE_SYNTAX, SLIDE_PARAMS, SLIDE_MODULES, SLIDE_SUMMARY];

export const DEMO_STAGE: Stage = {
  id: DEMO_STAGE_ID,
  name: DEMO_CLASSROOM_TITLE,
  description: DEMO_CLASSROOM_DESC,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  languageDirective: 'zh-CN',
  style: 'professional',
  agentIds: ['default-1', 'default-2', 'default-3'],
};

export const DEMO_SCENES: Scene[] = [
  // Slide scenes
  ...DEMO_SLIDES.map((slide, index) => ({
    id: `demo_scene_${index + 1}`,
    stageId: DEMO_STAGE_ID,
    type: 'slide' as const,
    title: [
      'Python 编程基础',
      '什么是函数？',
      '函数定义语法',
      '参数类型详解',
      '模块与导入',
      '本节小结',
    ][index],
    order: index,
    content: {
      type: 'slide' as const,
      canvas: slide,
    },
    actions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })),
  // Quiz scene
  {
    id: 'demo_scene_quiz',
    stageId: DEMO_STAGE_ID,
    type: 'quiz',
    title: '随堂测验',
    order: DEMO_SLIDES.length,
    content: {
      type: 'quiz',
      questions: DEMO_QUIZ_QUESTIONS,
    },
    actions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
