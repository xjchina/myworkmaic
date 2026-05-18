import type { QuizQuestion } from '@/lib/types/stage';

export interface DemoQuizPreset {
  id: 'chinese' | 'math' | 'english';
  title: string;
  summary: string;
  sourceName: string;
  subject: string;
  questions: QuizQuestion[];
}

const CHINESE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'cn_q1',
    type: 'single',
    question: '下列句子中，加点成语使用恰当的一项是（）。',
    options: [
      { label: 'A. 他做题总是粗心大意，却总说自己胸有成竹。', value: 'A' },
      { label: 'B. 面对新题型，老师建议我们按部就班地分析条件。', value: 'B' },
      { label: 'C. 这道题太简单了，大家都望而却步。', value: 'C' },
      { label: 'D. 同学们讨论十分热烈，教室里鸦雀无声。', value: 'D' },
    ],
    answer: ['B'],
    analysis: '“按部就班”表示按照一定步骤进行，语境恰当。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'cn_q2',
    type: 'single',
    question: '“落霞与孤鹜齐飞，秋水共长天一色”出自哪篇作品？',
    options: [
      { label: 'A.《岳阳楼记》', value: 'A' },
      { label: 'B.《滕王阁序》', value: 'B' },
      { label: 'C.《兰亭集序》', value: 'C' },
      { label: 'D.《醉翁亭记》', value: 'D' },
    ],
    answer: ['B'],
    analysis: '该名句出自王勃《滕王阁序》。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'cn_q3',
    type: 'multiple',
    question: '下列属于描写方法的是（多选）。',
    options: [
      { label: 'A. 动作描写', value: 'A' },
      { label: 'B. 心理描写', value: 'B' },
      { label: 'C. 议论', value: 'C' },
      { label: 'D. 外貌描写', value: 'D' },
    ],
    answer: ['A', 'B', 'D'],
    analysis: '动作、心理、外貌都属于描写方法；“议论”是表达方式。',
    hasAnswer: true,
    points: 3,
  },
  {
    id: 'cn_q4',
    type: 'single',
    question: '下列句子中没有语病的一项是（）。',
    options: [
      { label: 'A. 通过这次活动，使我明白了合作的重要性。', value: 'A' },
      { label: 'B. 我们要养成认真预习和按时完成作业。', value: 'B' },
      { label: 'C. 同学们在操场上尽情地奔跑、欢笑。', value: 'C' },
      { label: 'D. 这本书的内容和插图都很丰富。', value: 'D' },
    ],
    answer: ['C'],
    analysis: 'A 缺主语，B 成分残缺，D 搭配不当。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'cn_q5',
    type: 'short_answer',
    question: '请用 50 字左右概括“认真审题”对语文阅读答题的作用。',
    answer: ['认真审题能明确题目要求、答题方向和关键词，避免答非所问，提高答题准确性和得分率。'],
    analysis: '答案要点：明确要求、避免偏题、提升准确率。',
    commentPrompt: '请从“审题作用”角度给出简洁评价。',
    hasAnswer: true,
    points: 4,
  },
];

const MATH_QUESTIONS: QuizQuestion[] = [
  {
    id: 'math_q1',
    type: 'single',
    question: '方程 3x - 5 = 16 的解是（）。',
    options: [
      { label: 'A. x=5', value: 'A' },
      { label: 'B. x=6', value: 'B' },
      { label: 'C. x=7', value: 'C' },
      { label: 'D. x=8', value: 'D' },
    ],
    answer: ['C'],
    analysis: '3x=21，所以 x=7。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'math_q2',
    type: 'single',
    question: '已知 a:b=2:3，且 a+b=25，则 a 的值是（）。',
    options: [
      { label: 'A. 8', value: 'A' },
      { label: 'B. 10', value: 'B' },
      { label: 'C. 12', value: 'C' },
      { label: 'D. 15', value: 'D' },
    ],
    answer: ['B'],
    analysis: '设 a=2k,b=3k，则 5k=25，k=5，所以 a=10。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'math_q3',
    type: 'multiple',
    question: '下列等式中属于一元一次方程的是（多选）。',
    options: [
      { label: 'A. 2x+1=7', value: 'A' },
      { label: 'B. x^2-1=0', value: 'B' },
      { label: 'C. 3y-6=0', value: 'C' },
      { label: 'D. x+z=5', value: 'D' },
    ],
    answer: ['A', 'C'],
    analysis: 'A、C 都是一个未知数且最高次数为 1；B 为二次，D 有两个未知数。',
    hasAnswer: true,
    points: 3,
  },
  {
    id: 'math_q4',
    type: 'single',
    question: '点 P(2, -3) 位于第几象限？',
    options: [
      { label: 'A. 第一象限', value: 'A' },
      { label: 'B. 第二象限', value: 'B' },
      { label: 'C. 第三象限', value: 'C' },
      { label: 'D. 第四象限', value: 'D' },
    ],
    answer: ['D'],
    analysis: 'x>0 且 y<0，在第四象限。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'math_q5',
    type: 'short_answer',
    question: '简述解一元一次方程的一般步骤（写出 3-4 步即可）。',
    answer: ['去分母、去括号、移项、合并同类项、系数化为 1，最后检验。'],
    analysis: '核心步骤：化简与变形，最终得到 x=... 并检验。',
    commentPrompt: '请根据是否覆盖关键步骤给出评价。',
    hasAnswer: true,
    points: 4,
  },
];

const ENGLISH_QUESTIONS: QuizQuestion[] = [
  {
    id: 'en_q1',
    type: 'single',
    question: 'Choose the correct sentence.',
    options: [
      { label: 'A. He go to school every day.', value: 'A' },
      { label: 'B. He goes to school every day.', value: 'B' },
      { label: 'C. He going to school every day.', value: 'C' },
      { label: 'D. He gone to school every day.', value: 'D' },
    ],
    answer: ['B'],
    analysis: '一般现在时第三人称单数，谓语动词加 -s。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'en_q2',
    type: 'single',
    question: '“坚持”最合适的英文表达是（）。',
    options: [
      { label: 'A. give up', value: 'A' },
      { label: 'B. keep on', value: 'B' },
      { label: 'C. look up', value: 'C' },
      { label: 'D. turn off', value: 'D' },
    ],
    answer: ['B'],
    analysis: 'keep on 表示“继续、坚持”。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'en_q3',
    type: 'multiple',
    question: 'Which are adverbs? (Multiple choices)',
    options: [
      { label: 'A. quickly', value: 'A' },
      { label: 'B. happy', value: 'B' },
      { label: 'C. carefully', value: 'C' },
      { label: 'D. always', value: 'D' },
    ],
    answer: ['A', 'C', 'D'],
    analysis: 'quickly / carefully / always 都是副词；happy 是形容词。',
    hasAnswer: true,
    points: 3,
  },
  {
    id: 'en_q4',
    type: 'single',
    question: 'If it ___ tomorrow, we will stay at home.',
    options: [
      { label: 'A. rain', value: 'A' },
      { label: 'B. rains', value: 'B' },
      { label: 'C. rained', value: 'C' },
      { label: 'D. raining', value: 'D' },
    ],
    answer: ['B'],
    analysis: '主将从现：if 从句用一般现在时。',
    hasAnswer: true,
    points: 2,
  },
  {
    id: 'en_q5',
    type: 'short_answer',
    question: 'Use 1-2 English sentences to describe your favorite subject and why.',
    answer: ['My favorite subject is English because it helps me communicate with people from different countries.'],
    analysis: '要点：科目 + 原因，句子完整，语法基本正确。',
    commentPrompt: '请根据表达完整性和语法准确性给出评价。',
    hasAnswer: true,
    points: 4,
  },
];

export const DEMO_QUIZ_PRESETS: DemoQuizPreset[] = [
  {
    id: 'chinese',
    title: '语文基础练习',
    sourceName: '内置示例练习（语文）',
    subject: '语文',
    summary: `内置示例练习，共 ${CHINESE_QUESTIONS.length} 题，覆盖成语、名句、病句与阅读表达。`,
    questions: CHINESE_QUESTIONS,
  },
  {
    id: 'math',
    title: '数学基础练习',
    sourceName: '内置示例练习（数学）',
    subject: '数学',
    summary: `内置示例练习，共 ${MATH_QUESTIONS.length} 题，覆盖方程、比与比例、象限和解题步骤。`,
    questions: MATH_QUESTIONS,
  },
  {
    id: 'english',
    title: '英语基础练习',
    sourceName: '内置示例练习（英语）',
    subject: '英语',
    summary: `内置示例练习，共 ${ENGLISH_QUESTIONS.length} 题，覆盖时态、词汇、词性与写作表达。`,
    questions: ENGLISH_QUESTIONS,
  },
];
