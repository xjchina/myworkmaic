/**
 * Built-in demo data: 生物
 *
 * Source: local generated classroom YgiLLt32K4, exported from browser IndexedDB.
 * This file is generated from real classroom scene data so the demo matches user-created content.
 */

import type { Scene, Stage } from '@/lib/types/stage';

export const BIOLOGY_STAGE_ID = 'builtin-demo-biology';

export const BIOLOGY_STAGE: Stage = {
  "id": "builtin-demo-biology",
  "name": "生物",
  "description": "???????????????1???????????????????????",
  "createdAt": 1779067580557,
  "updatedAt": 1779067923382,
  "languageDirective": "该课程需完全使用中文进行教学。课程内容来自人教版生物学必修1《分子与细胞》第1章第1节《细胞是生命活动的基本单位》的PDF讲义。所有讲解、术语和概念均使用中文。在介绍科学家姓名时（如施莱登、施旺、虎克、魏尔肖），可使用中文译名并适当提及原名。对于专业术语如'细胞学说'、'归纳法'、'生命系统'等，直接使用中文术语。完全按照PDF讲义内容组织课堂，不补充任何额外知识点。不允许出现任何形式的随堂测验或quiz题目。",
  "style": "professional",
  "agentIds": [
    "default-1",
    "default-2",
    "default-5"
  ],
  "interactiveMode": false
} as Stage;

export const BIOLOGY_SCENES: Scene[] = [
  {
    "id": "_QzNQH4LzFEuAhAdo3IAr",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "课程导入",
    "order": 0,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "_IHa_2T2EypJIs31_2cck",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "shape_58LCiZs_",
            "type": "shape",
            "left": 60,
            "top": 70,
            "width": 6,
            "height": 40,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#2b579a",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_qmrb76fT",
            "type": "text",
            "left": 80,
            "top": 62,
            "width": 860,
            "height": 58,
            "content": "<p style=\"font-size: 28px; color: #2b579a;\"><strong>第1章  走近细胞</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#2b579a",
            "rotate": 0
          },
          {
            "id": "text_lutGiInW",
            "type": "text",
            "left": 80,
            "top": 128,
            "width": 860,
            "height": 64,
            "content": "<p style=\"font-size: 24px;\">第1节  细胞是生命活动的基本单位</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_aUmXnjHU",
            "type": "shape",
            "left": 80,
            "top": 200,
            "width": 840,
            "height": 2,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#d0d0d0",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_P7nSnbOo",
            "type": "text",
            "left": 60,
            "top": 230,
            "width": 880,
            "height": 52,
            "content": "<p style=\"font-size: 20px; color: #333333;\"><strong>核心问题</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_dLAGtUkH",
            "type": "shape",
            "left": 100,
            "top": 290,
            "width": 800,
            "height": 70,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#eef3fa",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_-FJ8ujXP",
            "type": "text",
            "left": 120,
            "top": 306,
            "width": 760,
            "height": 42,
            "content": "<p style=\"font-size: 20px; text-align: center; color: #1a3a5c;\">为什么说细胞是生命活动的基本单位？</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1a3a5c",
            "rotate": 0
          },
          {
            "id": "text_HXABl1qZ",
            "type": "text",
            "left": 60,
            "top": 400,
            "width": 880,
            "height": 52,
            "content": "<p style=\"font-size: 20px; color: #333333;\"><strong>本节聚焦</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_eoJ_1V2k",
            "type": "text",
            "left": 60,
            "top": 455,
            "width": 880,
            "height": 43,
            "content": "<p style=\"font-size: 16px;\">• 细胞学说      — 揭示细胞统一性和生物体结构的统一性</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_D36yh0j9",
            "type": "text",
            "left": 60,
            "top": 495,
            "width": 880,
            "height": 43,
            "content": "<p style=\"font-size: 16px;\">• 细胞学说建立过程  — 理解科学认识的发展与进步</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#ffffff"
        }
      }
    },
    "actions": [
      {
        "id": "action_she_0ZcG",
        "type": "spotlight",
        "elementId": "text_qmrb76fT"
      },
      {
        "id": "action_QS5JeJzX",
        "type": "speech",
        "text": "同学们好，欢迎来到生物学课堂！从今天开始，我们将一起走进《分子与细胞》这本教材的学习。首先，让我们翻开第1章——走近细胞。"
      },
      {
        "id": "action_3UKzH6BL",
        "type": "spotlight",
        "elementId": "text_lutGiInW"
      },
      {
        "id": "action_j7ybciPM",
        "type": "speech",
        "text": "这一章的第一节，标题是——细胞是生命活动的基本单位。这个名字本身就告诉我们一个非常重要的观点：所有生命活动，最终都要落脚到细胞这个层次上。"
      },
      {
        "id": "action_DGipLA5i",
        "type": "spotlight",
        "elementId": "text_P7nSnbOo"
      },
      {
        "id": "action_3AbTRrF4",
        "type": "speech",
        "text": "那么，大家有没有想过一个问题：为什么偏偏是细胞，而不是其他什么东西，成为生命活动的基本单位呢？这就是我们这节课要探讨的核心问题。"
      },
      {
        "id": "action_idcqa_gd",
        "type": "spotlight",
        "elementId": "text_-FJ8ujXP"
      },
      {
        "id": "action_lEN6LZ87",
        "type": "speech",
        "text": "请大家看这里——“为什么说细胞是生命活动的基本单位？”带着这个问题，我们将通过两个主要方向来寻找答案。"
      },
      {
        "id": "action_L8G-WnEP",
        "type": "spotlight",
        "elementId": "text_eoJ_1V2k"
      },
      {
        "id": "action_loxf3rMX",
        "type": "speech",
        "text": "第一个方向，是学习细胞学说。这个学说揭示了细胞的统一性，也揭示了生物体在结构上的统一性。简单来说，它告诉我们：所有生物，无论大小、复杂还是简单，都是由细胞构成的。"
      },
      {
        "id": "action_jnnwCwNH",
        "type": "spotlight",
        "elementId": "text_D36yh0j9"
      },
      {
        "id": "action_w6zSN_ON",
        "type": "speech",
        "text": "第二个方向，是了解细胞学说的建立过程。这个过程本身，就是一个绝佳的例子，让我们看到科学认识是如何一步步发展和进步的。通过回顾历史，我们也能更好地理解细胞学说今天的地位。"
      },
      {
        "id": "action_BRDW59zp",
        "type": "speech",
        "text": "好了，明确了今天的学习目标，接下来我们就正式进入本节课的第一个重点——细胞学说的建立者及其核心要点。"
      }
    ],
    "createdAt": 1779067605068,
    "updatedAt": 1779067605068
  },
  {
    "id": "2QsRXD93T7P1diMo4QbP1",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "细胞学说的建立者与要点",
    "order": 1,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "3SiabS6Bvvzwy2rUx8TGT",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "text_q0xPGeVE",
            "type": "text",
            "left": 60,
            "top": 50,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size:32px;\"><strong>细胞学说的建立者与要点</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_MYkcXP-C",
            "type": "text",
            "left": 60,
            "top": 136,
            "width": 880,
            "height": 64,
            "content": "<p style=\"font-size:24px;\">建立者：施莱登  &amp;  施旺（德国科学家）</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#5b9bd5",
            "rotate": 0
          },
          {
            "id": "shape_i0dtnG0y",
            "type": "shape",
            "left": 60,
            "top": 230,
            "width": 280,
            "height": 150,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "shape_6_NM0Xs4",
            "type": "shape",
            "left": 360,
            "top": 230,
            "width": 280,
            "height": 150,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#dcfce7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "shape_57vpggnr",
            "type": "shape",
            "left": 660,
            "top": 230,
            "width": 280,
            "height": 150,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#fef3c7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_HYzFef-f",
            "type": "text",
            "left": 80,
            "top": 240,
            "width": 240,
            "height": 52,
            "content": "<p style=\"font-size:20px; text-align:center;\"><strong>要点一</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "text_3wTGnGDc",
            "type": "text",
            "left": 80,
            "top": 298,
            "width": 240,
            "height": 70,
            "content": "<p style=\"font-size:16px; text-align:center;\">细胞是一个有机体，一切动植物都由细胞发育而来</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_f7UNNdIX",
            "type": "text",
            "left": 380,
            "top": 240,
            "width": 240,
            "height": 52,
            "content": "<p style=\"font-size:20px; text-align:center;\"><strong>要点二</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#166534",
            "rotate": 0
          },
          {
            "id": "text_KDOW_3s0",
            "type": "text",
            "left": 380,
            "top": 298,
            "width": 240,
            "height": 70,
            "content": "<p style=\"font-size:16px; text-align:center;\">细胞是一个相对独立的单位，对整体生命起作用</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_wdZ2eNmD",
            "type": "text",
            "left": 680,
            "top": 240,
            "width": 240,
            "height": 52,
            "content": "<p style=\"font-size:20px; text-align:center;\"><strong>要点三</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#92400e",
            "rotate": 0
          },
          {
            "id": "text_LMJtgbHt",
            "type": "text",
            "left": 680,
            "top": 298,
            "width": 240,
            "height": 70,
            "content": "<p style=\"font-size:16px; text-align:center;\">新细胞是由老细胞分裂产生的</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_Rgzw_ptY",
            "type": "shape",
            "left": 100,
            "top": 420,
            "width": 800,
            "height": 2,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#cccccc",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_sFgZoKvi",
            "type": "text",
            "left": 60,
            "top": 445,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size:18px;\">意义：细胞学说揭示了动物和植物的统一性，从而阐明了生物界的统一性。</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#ffffff"
        }
      }
    },
    "actions": [
      {
        "id": "action_VU2ARjOh",
        "type": "spotlight",
        "elementId": "text_q0xPGeVE"
      },
      {
        "id": "action_Cekg4fRk",
        "type": "speech",
        "text": "好的，接下来我们首先来看一看细胞学说的建立者。大家知道，这个伟大的学说是由两位德国科学家共同创立的。"
      },
      {
        "id": "action_VBqusIXK",
        "type": "spotlight",
        "elementId": "text_MYkcXP-C"
      },
      {
        "id": "action_Scxl2VjW",
        "type": "speech",
        "text": "就是施莱登和施旺。施莱登是一位植物学家，而施旺是一位动物学家，他们两个人的工作合在一起，奠定了细胞学说的基础。"
      },
      {
        "id": "action_VuceWDX1",
        "type": "spotlight",
        "elementId": "text_HYzFef-f"
      },
      {
        "id": "action_bluH_Swh",
        "type": "speech",
        "text": "接下来我们看细胞学说的第一个要点。细胞是一个有机体，一切动植物都由细胞发育而来，并由细胞和细胞产物所构成。这个要点告诉我们，细胞是所有生物体结构和功能的基本单位。"
      },
      {
        "id": "action_1bqhLvHe",
        "type": "spotlight",
        "elementId": "text_3wTGnGDc"
      },
      {
        "id": "action_8gbdv8KD",
        "type": "speech",
        "text": "换句话说，你、我、窗外的树木、水里的鱼——所有动植物，它们的身体最初都是从一个小小的细胞开始，慢慢发育而成的。"
      },
      {
        "id": "action_w_HkNi_o",
        "type": "spotlight",
        "elementId": "text_f7UNNdIX"
      },
      {
        "id": "action_U1uj7vtc",
        "type": "speech",
        "text": "第二个要点：细胞是一个相对独立的单位，既有它自己的生命，又对与其他细胞共同组成的整体的生命起作用。这怎么理解呢？每个细胞其实都在做自己的事情——呼吸、获取营养、排出废物，它有自己的一套生命活动。但同时，它不是一个孤岛，它要和周围的细胞互相配合。"
      },
      {
        "id": "action_ZwpKkp-L",
        "type": "spotlight",
        "elementId": "text_KDOW_3s0"
      },
      {
        "id": "action_49bmTHnp",
        "type": "speech",
        "text": "比如我们身体里的心肌细胞，它们各自都在收缩，但必须协调一致，心脏才能有节律地跳动。这就是既独立又合作的关系。"
      },
      {
        "id": "action_onDfR2-4",
        "type": "spotlight",
        "elementId": "text_wdZ2eNmD"
      },
      {
        "id": "action_1xw_mKqV",
        "type": "speech",
        "text": "第三个要点：新细胞是由老细胞分裂产生的。这个今天听起来好像很自然，对吧？但在当时，人们还相信“自然发生说”，认为小虫子可以从脏东西里凭空产生。施莱登和施旺的这个观点，实际上彻底推翻了生命可以自发产生的错误认识。"
      },
      {
        "id": "action_XkCWUYoo",
        "type": "spotlight",
        "elementId": "text_LMJtgbHt"
      },
      {
        "id": "action_nczqViAO",
        "type": "speech",
        "text": "所有的新细胞，都来自于已经存在的细胞。这意味着生命是连续的，是代代相传的。好了，以上三个要点，就是细胞学说的核心内容。"
      }
    ],
    "createdAt": 1779067620682,
    "updatedAt": 1779067620682
  },
  {
    "id": "PsEnOCZRneCoc9Ppg2Ppm",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "细胞学说建立过程",
    "order": 2,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "8bhltjNR4WfqKK4hY25WF",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "shape_-NOeAQ3b",
            "type": "shape",
            "left": 50,
            "top": 40,
            "width": 900,
            "height": 76,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#2c3e50",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_tvGOPo4Z",
            "type": "text",
            "left": 80,
            "top": 52,
            "width": 840,
            "height": 52,
            "content": "<p style=\"font-size:28px; color:#ffffff;\"><strong>细胞学说建立过程</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#ffffff",
            "rotate": 0
          },
          {
            "id": "line_wT10sOnw",
            "type": "line",
            "left": 100,
            "top": 160,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              800,
              0
            ],
            "style": "solid",
            "color": "#3498db",
            "points": [
              "dot",
              "dot"
            ],
            "rotate": 0
          },
          {
            "id": "shape_xQZUKKjg",
            "type": "shape",
            "left": 100,
            "top": 159,
            "width": 800,
            "height": 3,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#3498db",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "shape_eucEoV1J",
            "type": "shape",
            "left": 60,
            "top": 200,
            "width": 280,
            "height": 200,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#d4e6f1",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_f0sYEz_Z",
            "type": "text",
            "left": 80,
            "top": 210,
            "width": 240,
            "height": 52,
            "content": "<p style=\"font-size:20px; text-align:center;\"><strong>17世纪 · 虎克</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1a5276",
            "rotate": 0
          },
          {
            "id": "text_WFdXcxXI",
            "type": "text",
            "left": 80,
            "top": 270,
            "width": 240,
            "height": 112,
            "content": "<p style=\"font-size:16px; text-align:center;\">• 用自制的显微镜</p><p style=\"font-size:16px; text-align:center;\">• 观察软木薄片</p><p style=\"font-size:16px; text-align:center;\">• 发现并命名为“细胞”</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#2c3e50",
            "rotate": 0
          },
          {
            "id": "shape_8kZmY-mi",
            "type": "shape",
            "left": 360,
            "top": 200,
            "width": 280,
            "height": 200,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#d5f5e3",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_LsgbivVK",
            "type": "text",
            "left": 380,
            "top": 210,
            "width": 240,
            "height": 52,
            "content": "<p style=\"font-size:20px; text-align:center;\"><strong>19世纪 · 施莱登 &amp; 施旺</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e8449",
            "rotate": 0
          },
          {
            "id": "text_fHd3U5yp",
            "type": "text",
            "left": 380,
            "top": 270,
            "width": 240,
            "height": 112,
            "content": "<p style=\"font-size:16px; text-align:center;\">• 施莱登：植物由细胞构成</p><p style=\"font-size:16px; text-align:center;\">• 施旺：动物由细胞构成</p><p style=\"font-size:16px; text-align:center;\">• 共同提出细胞学说</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#2c3e50",
            "rotate": 0
          },
          {
            "id": "shape_e_Q6gVZ2",
            "type": "shape",
            "left": 660,
            "top": 200,
            "width": 280,
            "height": 200,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#fadbd8",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_4GkO0IMY",
            "type": "text",
            "left": 680,
            "top": 210,
            "width": 240,
            "height": 52,
            "content": "<p style=\"font-size:20px; text-align:center;\"><strong>19世纪 · 魏尔肖</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#922b21",
            "rotate": 0
          },
          {
            "id": "text_wC9_6sZ9",
            "type": "text",
            "left": 680,
            "top": 270,
            "width": 240,
            "height": 112,
            "content": "<p style=\"font-size:16px; text-align:center;\">• 总结前人研究</p><p style=\"font-size:16px; text-align:center;\">• 细胞通过分裂</p><p style=\"font-size:16px; text-align:center;\">• 产生新细胞</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#2c3e50",
            "rotate": 0
          },
          {
            "id": "shape_VreiDaEG",
            "type": "shape",
            "left": 50,
            "top": 440,
            "width": 900,
            "height": 90,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#eaf2f8",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text__O31zxbD",
            "type": "text",
            "left": 80,
            "top": 452,
            "width": 840,
            "height": 64,
            "content": "<p style=\"font-size:18px; text-align:center;\"><strong>核心结论：</strong>细胞学说指出——一切动植物都是由细胞发育而来，</p><p style=\"font-size:18px; text-align:center;\">并由细胞和细胞产物所构成。</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1a5276",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#f8f9fa"
        }
      }
    },
    "actions": [
      {
        "id": "action_YKkuJyXj",
        "type": "spotlight",
        "elementId": "text_tvGOPo4Z"
      },
      {
        "id": "action_yTeXoAlw",
        "type": "speech",
        "text": "刚才我们梳理了细胞学说的三个核心要点。接下来，我们沿着时间线，具体看看细胞学说在历史上是怎样一步步建立起来的。这个过程非常精彩，它凝聚了几代科学家的智慧与努力。"
      },
      {
        "id": "action_OIGQH63b",
        "type": "spotlight",
        "elementId": "text_f0sYEz_Z"
      },
      {
        "id": "action_pwjTm3VQ",
        "type": "speech",
        "text": "首先，时间回到17世纪。英国科学家罗伯特·虎克，他利用自制的显微镜，对软木薄片进行了观察。他发现软木上有很多像蜂巢一样的小格子，于是便将它们命名为“细胞”。这就是“cell”这个词的由来。不过要注意，虎克当时看到的，其实是已经死去的植物细胞的细胞壁。"
      },
      {
        "id": "action_8_0I9wlH",
        "type": "laser",
        "elementId": "text_WFdXcxXI"
      },
      {
        "id": "action_F9anjm_4",
        "type": "speech",
        "text": "虎克的贡献在于他第一次揭示了微观世界的基本单元——细胞的存在，为我们打开了一扇全新的认知大门。这一发现意义重大，可以说是细胞学说的起点。"
      },
      {
        "id": "action_Sb4cKS_D",
        "type": "spotlight",
        "elementId": "text_LsgbivVK"
      },
      {
        "id": "action_4JugGBxz",
        "type": "speech",
        "text": "时间又过了一百多年，到了19世纪。德国的两位科学家——施莱登和施旺，在前人大量观察的基础上，对细胞进行了更深入的研究。施莱登主要研究植物，他发现植物体都是由细胞构成的；而施旺则把目光转向了动物，同样发现动物体也是由细胞构成的。"
      },
      {
        "id": "action_jA7QkT2P",
        "type": "laser",
        "elementId": "text_fHd3U5yp"
      },
      {
        "id": "action_3yzb_KB_",
        "type": "speech",
        "text": "于是，这两位科学家进行了交流和总结，共同提出了一个重大的科学理论——细胞学说。它的核心思想就是：一切动植物都是由细胞发育而来，并且由细胞和细胞产物所构成。这个理论第一次从细胞层面，把看似截然不同的植物界和动物界统一了起来。"
      },
      {
        "id": "action_yDspSM_9",
        "type": "spotlight",
        "elementId": "text_4GkO0IMY"
      },
      {
        "id": "action_aOF5P3dD",
        "type": "speech",
        "text": "细胞学说并没有就此止步。又过了几十年，同样是德国科学家，魏尔肖对细胞学说进行了重要的补充。他总结了前人的研究，提出了一个著名论断：\"细胞通过分裂产生新细胞\"。"
      },
      {
        "id": "action_nLbG6M34",
        "type": "laser",
        "elementId": "text_wC9_6sZ9"
      },
      {
        "id": "action_DojzASg5",
        "type": "speech",
        "text": "这个补充非常关键，它解释了细胞来源的问题——新细胞不是凭空产生的，而是由已有的老细胞分裂而来。这一观点完善了细胞学说，使得整个理论体系更加完整、严谨。"
      },
      {
        "id": "action_rLOFpIn0",
        "type": "spotlight",
        "elementId": "text__O31zxbD"
      },
      {
        "id": "action_OF36QV3m",
        "type": "speech",
        "text": "好了，我们来回顾一下这个建立过程：从虎克的发现，到施莱登和施旺共同提出学说，再到魏尔肖的补充完善。最终形成了我们今天看到的细胞学说核心结论：一切动植物都是由细胞发育而来，并由细胞和细胞产物所构成。这为后续的生物学研究奠定了坚实的基础。"
      }
    ],
    "createdAt": 1779067636567,
    "updatedAt": 1779067636567
  },
  {
    "id": "Bsw0f5knyurMxO9xsFTQT",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "细胞学说的意义",
    "order": 3,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "thN-enIpbyoCpUkbodYGG",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "text_TzPbfZTg",
            "type": "text",
            "left": 60,
            "top": 50,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size:32px;\"><strong>细胞学说的意义</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_Pgh1HSV_",
            "type": "text",
            "left": 60,
            "top": 130,
            "width": 880,
            "height": 52,
            "content": "<p style=\"font-size:20px;\">四大贡献：奠定现代生物学的基石</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#555555",
            "rotate": 0
          },
          {
            "id": "line_lles7xi1",
            "type": "line",
            "left": 60,
            "top": 170,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              880,
              0
            ],
            "style": "dashed",
            "color": "#cccccc",
            "points": [
              "",
              ""
            ],
            "rotate": 0
          },
          {
            "id": "shape_96ufpKXD",
            "type": "shape",
            "left": 60,
            "top": 200,
            "width": 430,
            "height": 120,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#dbeafe",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_bRxL_Wch",
            "type": "text",
            "left": 80,
            "top": 222,
            "width": 390,
            "height": 76,
            "content": "<p style=\"font-size:18px;\"><strong>1. 揭示统一性</strong></p><p style=\"font-size:16px;\">揭示动物和植物结构上的统一性，阐明生物界的统一性</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "shape_3DpwJ7Tm",
            "type": "shape",
            "left": 510,
            "top": 200,
            "width": 430,
            "height": 120,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#dcfce7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_9LcqAXeI",
            "type": "text",
            "left": 530,
            "top": 222,
            "width": 390,
            "height": 76,
            "content": "<p style=\"font-size:18px;\"><strong>2. 催生生物学</strong></p><p style=\"font-size:16px;\">认识动植物共同的结构基础，催生生物学的问世</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#166534",
            "rotate": 0
          },
          {
            "id": "shape_khv60khl",
            "type": "shape",
            "left": 60,
            "top": 350,
            "width": 430,
            "height": 120,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#fef3c7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_b7INIEkT",
            "type": "text",
            "left": 80,
            "top": 372,
            "width": 390,
            "height": 76,
            "content": "<p style=\"font-size:18px;\"><strong>3. 进入细胞水平</strong></p><p style=\"font-size:16px;\">研究由器官、组织水平进入细胞水平，为分子水平打下基础</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#92400e",
            "rotate": 0
          },
          {
            "id": "shape_9Gvq1QV7",
            "type": "shape",
            "left": 510,
            "top": 350,
            "width": 430,
            "height": 120,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#fce7f3",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_Nu8nrUyV",
            "type": "text",
            "left": 530,
            "top": 372,
            "width": 390,
            "height": 76,
            "content": "<p style=\"font-size:18px;\"><strong>4. 埋下进化论伏笔</strong></p><p style=\"font-size:16px;\">为后来生物进化论的确立提供了重要的理论基础</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#9d174d",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#ffffff"
        }
      }
    },
    "actions": [
      {
        "id": "action_p-P9gGMX",
        "type": "spotlight",
        "elementId": "text_TzPbfZTg"
      },
      {
        "id": "action_l_rh1gCd",
        "type": "speech",
        "text": "好，了解了细胞学说的建立过程之后，我们接下来看看它到底有什么重大的意义。可以说，细胞学说的提出，是整个生物学发展史上一个里程碑式的成就。我们来看一下。"
      },
      {
        "id": "action_jYq3cfT3",
        "type": "spotlight",
        "elementId": "text_bRxL_Wch"
      },
      {
        "id": "action_vBWy5r79",
        "type": "speech",
        "text": "第一，它揭示了动物和植物的统一性。在细胞学说之前，人们认为动物和植物是截然不同的两个世界。但施莱登和施旺告诉我们，无论是参天大树还是奔跑的猎豹，它们的基本结构和功能单位都是细胞。这就阐明了生物界的统一性，把整个生物界联系在了一起。"
      },
      {
        "id": "action_pysKgOEI",
        "type": "spotlight",
        "elementId": "text_9LcqAXeI"
      },
      {
        "id": "action_IsiAVCpX",
        "type": "speech",
        "text": "第二，正因为认识到动植物有共同的结构基础，人们才开始有意识地把对动物和植物的研究放在一起考虑，这就直接催生了现代生物学这门独立学科的诞生。可以说，没有细胞学说，就没有我们现在所说的“生物学”。"
      },
      {
        "id": "action_Tcf1m-p6",
        "type": "spotlight",
        "elementId": "text_b7INIEkT"
      },
      {
        "id": "action_ztCI8J7g",
        "type": "speech",
        "text": "第三，它把研究的层次极大地推进了。在细胞学说建立之前，人们研究生命，基本停留在器官或者组织水平，比如研究心脏的功能、叶片的结构。而现在，我们知道一切生命活动的基础在细胞里，这就促使研究深入到细胞水平，也为后来我们进入分子水平，去研究DNA、蛋白质这些更微观的东西，打下了坚实的基础。"
      },
      {
        "id": "action_4-kG0QhF",
        "type": "spotlight",
        "elementId": "text_Nu8nrUyV"
      },
      {
        "id": "action_62Q5aNoX",
        "type": "speech",
        "text": "第四点非常重要，它还为后来达尔文进化论的提出埋下了伏笔。你想，既然所有动植物都由细胞构成，那这些生物之间就一定存在着某种亲缘关系。正是这种统一性的思想，为进化论——也就是“所有生物都是由共同祖先进化而来”的伟大理论，提供了重要的理论基础。"
      },
      {
        "id": "action_JML9h4Rd",
        "type": "spotlight",
        "elementId": "text_Pgh1HSV_"
      },
      {
        "id": "action_klz_Zsae",
        "type": "speech",
        "text": "总之一句话，细胞学说的这四大贡献——揭示统一性、催生生物学、深入细胞水平、埋下进化论伏笔——共同奠定了现代生物学的基石。"
      }
    ],
    "createdAt": 1779067650804,
    "updatedAt": 1779067650804
  },
  {
    "id": "z-0wrFeIlZaYAAjtJBYKb",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "归纳法介绍",
    "order": 4,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "gkSSBTs3Gez_8tJMWjefm",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "text_M37sS4DN",
            "type": "text",
            "left": 60,
            "top": 50,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size:32px;\"><strong>归纳法介绍</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_Rjy2JEuX",
            "type": "text",
            "left": 60,
            "top": 100,
            "width": 880,
            "height": 52,
            "content": "<p style=\"font-size:20px;\">概念 · 分类 · 应用</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#666666",
            "rotate": 0
          },
          {
            "id": "shape_NC_qGIHe",
            "type": "shape",
            "left": 60,
            "top": 140,
            "width": 880,
            "height": 2,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#5b9bd5",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_Yw32pmza",
            "type": "text",
            "left": 60,
            "top": 170,
            "width": 880,
            "height": 58,
            "content": "<p style=\"font-size:24px;\"><strong>什么是归纳法？</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_OK8wTJSs",
            "type": "shape",
            "left": 60,
            "top": 210,
            "width": 880,
            "height": 100,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_GPctOc3q",
            "type": "text",
            "left": 80,
            "top": 233,
            "width": 840,
            "height": 52,
            "content": "<p style=\"font-size:20px;\">由一系列<span style=\"color:#ed7d31;\"><strong>具体事实</strong></span>推出<span style=\"color:#ed7d31;\"><strong>一般结论</strong></span>的思维方法</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_e0EX2dV7",
            "type": "text",
            "left": 60,
            "top": 340,
            "width": 880,
            "height": 58,
            "content": "<p style=\"font-size:24px;\"><strong>分类</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_QXsQJqe0",
            "type": "shape",
            "left": 60,
            "top": 380,
            "width": 420,
            "height": 120,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#dbeafe",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_LAqeLhka",
            "type": "text",
            "left": 80,
            "top": 390,
            "width": 380,
            "height": 52,
            "content": "<p style=\"font-size:20px;text-align:center;\"><strong>完全归纳法</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e3a5f",
            "rotate": 0
          },
          {
            "id": "text_Bcbf0-17",
            "type": "text",
            "left": 80,
            "top": 430,
            "width": 380,
            "height": 52,
            "content": "<p style=\"font-size:16px;text-align:center;\">考察全部对象 → 推出一般结论</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_sKBsxjUh",
            "type": "shape",
            "left": 520,
            "top": 380,
            "width": 420,
            "height": 120,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#dcfce7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_wiIe7ror",
            "type": "text",
            "left": 540,
            "top": 390,
            "width": 380,
            "height": 52,
            "content": "<p style=\"font-size:20px;text-align:center;\"><strong>不完全归纳法</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#166534",
            "rotate": 0
          },
          {
            "id": "text_1lSL6Jhz",
            "type": "text",
            "left": 540,
            "top": 430,
            "width": 380,
            "height": 52,
            "content": "<p style=\"font-size:16px;text-align:center;\">考察部分对象 → 推出一般结论</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_dzxWRNFa",
            "type": "text",
            "left": 60,
            "top": 530,
            "width": 880,
            "height": 58,
            "content": "<p style=\"font-size:24px;\"><strong>科学研究中的使用</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_ylA8wjl8",
            "type": "text",
            "left": 80,
            "top": 580,
            "width": 840,
            "height": 76,
            "content": "<p style=\"font-size:18px;\">• <strong>常用方法</strong>：科学研究中经常运用不完全归纳法</p><p style=\"font-size:18px;\">• <strong>结论可信</strong>：其结论很可能是可信的，可用于预测和判断</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_p_vv4wbx",
            "type": "shape",
            "left": 65,
            "top": 650,
            "width": 4,
            "height": 30,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#ed7d31",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_mNlJMUx3",
            "type": "text",
            "left": 80,
            "top": 650,
            "width": 840,
            "height": 43,
            "content": "<p style=\"font-size:18px;\"><span style=\"color:#ed7d31;\">⚠ 注意：</span>不完全归纳得出的结论也可能存在<span style=\"color:#ed7d31;\"><strong>例外</strong></span></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#ffffff"
        }
      }
    },
    "actions": [
      {
        "id": "action_dLInYm9V",
        "type": "spotlight",
        "elementId": "text_M37sS4DN"
      },
      {
        "id": "action_TeFcL-XB",
        "type": "speech",
        "text": "好，刚才我们详细了解了细胞学说的建立过程，知道了科学家们是如何一步步得出那些重要结论的。那么，他们究竟是用什么样的思维方法，从纷繁复杂的生物体中提炼出普遍规律的？这种方法就叫——归纳法。"
      },
      {
        "id": "action_HbQ_U2uF",
        "type": "spotlight",
        "elementId": "text_Yw32pmza"
      },
      {
        "id": "action_UkpqUfQy",
        "type": "speech",
        "text": "什么是归纳法呢？简单来说，它就是一种从个别到一般的思维方法。它不是凭空猜想，而是从大量具体的、个别的事实出发，通过分析和总结，最终推出一个一般性的结论。比如，你观察了家里的猫、邻居的猫、路边的流浪猫，发现它们都吃鱼、都喵喵叫，你就可以归纳出“猫”这类动物的一些共同特征。"
      },
      {
        "id": "action_n7WW3G2A",
        "type": "spotlight",
        "elementId": "text_GPctOc3q"
      },
      {
        "id": "action_yX03IQwb",
        "type": "speech",
        "text": "所以归纳法的核心，就是“由一系列具体事实，推出一般结论”。它在我们学习和研究中非常常用，尤其是在生物科学领域，因为我们往往无法观察到每一个生物个体，只能基于观察到的样本进行推理。"
      },
      {
        "id": "action_p9o13JsA",
        "type": "spotlight",
        "elementId": "text_e0EX2dV7"
      },
      {
        "id": "action_Da2y7aGB",
        "type": "speech",
        "text": "归纳法还可以进一步分类，主要分为两大类。我们先看第一种：完全归纳法。"
      },
      {
        "id": "action_8q8QX4II",
        "type": "spotlight",
        "elementId": "text_LAqeLhka"
      },
      {
        "id": "action_-qVoLk84",
        "type": "speech",
        "text": "完全归纳法，顾名思义，就是考察了某类事物的全部对象，然后才推出一般结论。这种方法的优点是结论非常可靠，没有例外。但缺点是，在很多情况下，我们不可能做到考察全部对象。比如“所有天鹅都是白色的”，在人类发现黑天鹅之前，我们没法考察所有天鹅，所以这个方法有它的局限性。"
      },
      {
        "id": "action_HfrUXnua",
        "type": "spotlight",
        "elementId": "text_Bcbf0-17"
      },
      {
        "id": "action_6gWdS2h6",
        "type": "speech",
        "text": "再看第二种，不完全归纳法。它只考察了部分对象，就据此推出一般结论。这听起来好像不太严谨，但恰恰是在科学研究中最常用的方法。"
      },
      {
        "id": "action_bALXzDYs",
        "type": "spotlight",
        "elementId": "text_wiIe7ror"
      },
      {
        "id": "action_gRhGnMGI",
        "type": "speech",
        "text": "比如，施莱登只观察了一部分植物细胞，就提出了“植物体都是由细胞构成的”这一结论。这个结论在当时就是通过不完全归纳法得到的。虽然它不像完全归纳法那样百分百确定，但基于大量观察和科学推理，它的结论通常是很可信的，能够帮助我们进行预测和判断。"
      },
      {
        "id": "action_x1T1AsBK",
        "type": "spotlight",
        "elementId": "text_1lSL6Jhz"
      },
      {
        "id": "action_YN_nitv5",
        "type": "speech",
        "text": "但是，这里有一个非常重要的提醒：不完全归纳法得出的结论不一定永远正确，它也可能存在例外。就像我们刚才说的“天鹅”的例子，在没有发现黑天鹅之前，人们一直以为天鹅都是白的。所以，对于通过不完全归纳法得出的结论，我们要持一种“在证伪之前暂时接受”的科学态度。"
      },
      {
        "id": "action_bt9eiJi1",
        "type": "spotlight",
        "elementId": "text_mNlJMUx3"
      },
      {
        "id": "action_u8kGBneD",
        "type": "speech",
        "text": "总结一下：归纳法是我们从个别事实中发现普遍规律的重要工具。其中，完全归纳法可靠但使用范围有限；而不完全归纳法虽然存在风险，但却是推动科学发现的主要方法。了解了这个思维工具后，我们再来看看细胞学说到底揭示了生物界的什么秘密，它又给我们带来了哪些深远的意义。"
      }
    ],
    "createdAt": 1779067667467,
    "updatedAt": 1779067667467
  },
  {
    "id": "LnPnEiiuXzubiBn7Uld-M",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "细胞与生命活动的关系",
    "order": 5,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "cis0BMQ6J20plfoBTFdWX",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "text_r5W3xecK",
            "type": "text",
            "left": 60,
            "top": 50,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size:32px;\"><strong>细胞与生命活动的关系</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_i-jfPkse",
            "type": "shape",
            "left": 70,
            "top": 132,
            "width": 860,
            "height": 3,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#5b9bd5",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_eq8tLhjL",
            "type": "text",
            "left": 60,
            "top": 162,
            "width": 880,
            "height": 52,
            "content": "<p style=\"font-size:20px;\">从单细胞生物和多细胞生物两个角度理解</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#555555",
            "rotate": 0
          },
          {
            "id": "shape_LU7603-Z",
            "type": "shape",
            "left": 60,
            "top": 240,
            "width": 430,
            "height": 240,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_u8N3c3AQ",
            "type": "text",
            "left": 80,
            "top": 256,
            "width": 390,
            "height": 58,
            "content": "<p style=\"font-size:24px;\"><strong>单细胞生物</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "shape_pKvpl994",
            "type": "shape",
            "left": 80,
            "top": 320,
            "width": 390,
            "height": 2,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#5b9bd5",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_F9oPGwwX",
            "type": "text",
            "left": 80,
            "top": 340,
            "width": 390,
            "height": 130,
            "content": "<p style=\"font-size:18px;\">• 一个细胞即是一个完整个体</p><p style=\"font-size:18px;\">• 能独立完成代谢、遗传等生命活动</p><p style=\"font-size:18px;\">• 举例：草履虫、变形虫、细菌</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_0YwuKhli",
            "type": "shape",
            "left": 510,
            "top": 240,
            "width": 430,
            "height": 240,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#fef3c7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_9fwXAJzG",
            "type": "text",
            "left": 530,
            "top": 256,
            "width": 390,
            "height": 58,
            "content": "<p style=\"font-size:24px;\"><strong>多细胞生物</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#92400e",
            "rotate": 0
          },
          {
            "id": "shape_iylZ3hlf",
            "type": "shape",
            "left": 530,
            "top": 320,
            "width": 390,
            "height": 2,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#ed7d31",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_7hO-jgF4",
            "type": "text",
            "left": 530,
            "top": 340,
            "width": 390,
            "height": 130,
            "content": "<p style=\"font-size:18px;\">• 由许多分化的细胞构成</p><p style=\"font-size:18px;\">• 细胞分工合作，共同完成复杂生命活动</p><p style=\"font-size:18px;\">• 举例：人体、植物</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_H0JBsL_2",
            "type": "shape",
            "left": 100,
            "top": 510,
            "width": 800,
            "height": 1,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#cccccc",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_vqV6C9kU",
            "type": "text",
            "left": 60,
            "top": 526,
            "width": 880,
            "height": 36,
            "content": "<p style=\"font-size:16px; text-align:center;\">结论：细胞是生命活动的基本单位，生命活动离不开细胞</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#ffffff"
        }
      }
    },
    "actions": [
      {
        "id": "action_OFXCXItu",
        "type": "spotlight",
        "elementId": "text_r5W3xecK"
      },
      {
        "id": "action_czRLTwIo",
        "type": "speech",
        "text": "接下来，我们来看一个非常根本的问题——细胞与生命活动之间到底是什么关系？了解了这个问题，大家就能更深刻地理解为什么细胞学说如此重要。"
      },
      {
        "id": "action_bDDMoQ4-",
        "type": "spotlight",
        "elementId": "text_eq8tLhjL"
      },
      {
        "id": "action_DRasAS7A",
        "type": "speech",
        "text": "我们可以从两个角度来思考这个问题：一是单细胞生物，二是多细胞生物。我们先看单细胞生物。"
      },
      {
        "id": "action_RZiJiUS0",
        "type": "spotlight",
        "elementId": "text_u8N3c3AQ"
      },
      {
        "id": "action_aTcuXbus",
        "type": "speech",
        "text": "单细胞生物，顾名思义，整个身体只由一个细胞构成。比如草履虫、变形虫、细菌等。你能想象吗？一个细胞就构成了一个完整的个体。"
      },
      {
        "id": "action_mxg8tzHJ",
        "type": "laser",
        "elementId": "text_F9oPGwwX"
      },
      {
        "id": "action_aN8qnY2f",
        "type": "speech",
        "text": "看这里，它要独立完成代谢、生长、繁殖、遗传变异等一切生命活动。一个细胞，就是一个完整的生命世界。这最有力地说明了——细胞本身就能独立承担生命活动的全部功能。"
      },
      {
        "id": "action_GxAlZQ3x",
        "type": "spotlight",
        "elementId": "text_9fwXAJzG"
      },
      {
        "id": "action_nFOYFh_9",
        "type": "speech",
        "text": "再来看多细胞生物，比如我们人类、动物、植物。我们由数万亿个细胞构成，这些细胞各不相同——有神经细胞、肌肉细胞、表皮细胞等等。它们是分化了的细胞。"
      },
      {
        "id": "action_UqyKgVrf",
        "type": "laser",
        "elementId": "text_7hO-jgF4"
      },
      {
        "id": "action_NPt3PO59",
        "type": "speech",
        "text": "这些分化的细胞并不是各自为政，而是分工合作、密切配合，共同完成一系列复杂的生命活动。比如，你的红细胞负责运输氧气，心肌细胞负责收缩泵血，神经元负责传递信息。虽然每个细胞分工不同，但离开任何一个细胞群体的协作，生命活动就无法正常进行。"
      },
      {
        "id": "action_fsfMRX8l",
        "type": "spotlight",
        "elementId": "text_vqV6C9kU"
      },
      {
        "id": "action_hPUcgRKA",
        "type": "speech",
        "text": "所以，结论就非常清晰了：无论是单细胞生物还是多细胞生物，细胞都是生命活动的基本单位，生命活动离不开细胞。简单来说，没有细胞，就没有生命。"
      }
    ],
    "createdAt": 1779067681038,
    "updatedAt": 1779067681038
  },
  {
    "id": "X7_2eGp56wkC58YJeIdBx",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "系统与生命系统的结构层次",
    "order": 6,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "1_gmlgHMQKp1uwrJOnTqA",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "text_D9Zm4S_A",
            "type": "text",
            "left": 60,
            "top": 50,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size: 32px;\"><strong>系统与生命系统的结构层次</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_Ezt0qhD5",
            "type": "text",
            "left": 60,
            "top": 128,
            "width": 880,
            "height": 52,
            "content": "<p style=\"font-size: 20px;\">系统 — 相互依赖的组分有规律地形成整体</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#666666",
            "rotate": 0
          },
          {
            "id": "shape_6pHxXX8-",
            "type": "shape",
            "left": 80,
            "top": 196,
            "width": 840,
            "height": 2,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#cccccc",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_o0UPnsZl",
            "type": "text",
            "left": 80,
            "top": 220,
            "width": 840,
            "height": 76,
            "content": "<p style=\"font-size: 18px;\"><span style=\"color:#5b9bd5;\">●</span> 系统：彼此间相互作用、相互依赖的组分有规律地结合形成的整体</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_1R2lAzua",
            "type": "text",
            "left": 80,
            "top": 300,
            "width": 840,
            "height": 76,
            "content": "<p style=\"font-size: 18px;\"><span style=\"color:#5b9bd5;\">●</span> 细胞是有生命的，细胞是一个生命系统</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_R5zSseWG",
            "type": "shape",
            "left": 80,
            "top": 396,
            "width": 840,
            "height": 2,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#cccccc",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_8SjP9uAC",
            "type": "text",
            "left": 60,
            "top": 416,
            "width": 880,
            "height": 52,
            "content": "<p style=\"font-size: 20px;\"><strong>生命系统的结构层次</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "shape_BqqZdmlz",
            "type": "shape",
            "left": 60,
            "top": 480,
            "width": 170,
            "height": 130,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text__9bV0vc-",
            "type": "text",
            "left": 80,
            "top": 514,
            "width": 130,
            "height": 64,
            "content": "<p style=\"font-size: 16px; text-align: center;\"><strong>细胞</strong></p><p style=\"font-size: 14px; text-align: center;\">→ 组织</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "line_L3s8y6_Y",
            "type": "line",
            "left": 230,
            "top": 530,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              40,
              0
            ],
            "style": "solid",
            "color": "#5b9bd5",
            "points": [
              "",
              "arrow"
            ],
            "rotate": 0
          },
          {
            "id": "shape_thyj15zH",
            "type": "shape",
            "left": 270,
            "top": 480,
            "width": 170,
            "height": 130,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_G_BSH0_S",
            "type": "text",
            "left": 290,
            "top": 514,
            "width": 130,
            "height": 64,
            "content": "<p style=\"font-size: 16px; text-align: center;\"><strong>组织</strong></p><p style=\"font-size: 14px; text-align: center;\">→ 器官</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "line_XyxW4GYp",
            "type": "line",
            "left": 440,
            "top": 530,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              40,
              0
            ],
            "style": "solid",
            "color": "#5b9bd5",
            "points": [
              "",
              "arrow"
            ],
            "rotate": 0
          },
          {
            "id": "shape_02DhZZxK",
            "type": "shape",
            "left": 480,
            "top": 480,
            "width": 170,
            "height": 130,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_tw13WsSk",
            "type": "text",
            "left": 500,
            "top": 514,
            "width": 130,
            "height": 64,
            "content": "<p style=\"font-size: 16px; text-align: center;\"><strong>器官</strong></p><p style=\"font-size: 14px; text-align: center;\">→ 系统</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "line_hXRMvMTa",
            "type": "line",
            "left": 650,
            "top": 530,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              40,
              0
            ],
            "style": "solid",
            "color": "#5b9bd5",
            "points": [
              "",
              "arrow"
            ],
            "rotate": 0
          },
          {
            "id": "shape_5S2F0Dsz",
            "type": "shape",
            "left": 690,
            "top": 480,
            "width": 170,
            "height": 130,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_d3L_C82z",
            "type": "text",
            "left": 710,
            "top": 514,
            "width": 130,
            "height": 64,
            "content": "<p style=\"font-size: 16px; text-align: center;\"><strong>系统</strong></p><p style=\"font-size: 14px; text-align: center;\">→ 个体</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "line_VHFmm6LQ",
            "type": "line",
            "left": 860,
            "top": 530,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              40,
              0
            ],
            "style": "solid",
            "color": "#5b9bd5",
            "points": [
              "",
              "arrow"
            ],
            "rotate": 0
          },
          {
            "id": "shape_HlM6S_H_",
            "type": "shape",
            "left": 900,
            "top": 480,
            "width": 150,
            "height": 130,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#e8f4fd",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_NkIfSSG7",
            "type": "text",
            "left": 925,
            "top": 514,
            "width": 100,
            "height": 64,
            "content": "<p style=\"font-size: 16px; text-align: center;\"><strong>个体</strong></p><p style=\"font-size: 14px; text-align: center;\">→ 种群</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#ffffff"
        }
      }
    },
    "actions": [
      {
        "id": "action_WTr1Il2T",
        "type": "spotlight",
        "elementId": "text_D9Zm4S_A"
      },
      {
        "id": "action_zuAeyrNw",
        "type": "speech",
        "text": "好，我们再深入一步。刚才我们一直在讲细胞，细胞是生命活动的基本单位。但是，细胞不是孤零零存在的，对吧？在生物体内，细胞们会组织起来，形成更大的结构。这就引出了我们今天要讨论的一个非常重要的概念——系统，以及生命系统的结构层次。"
      },
      {
        "id": "action_if8_gw0-",
        "type": "spotlight",
        "elementId": "text_Ezt0qhD5"
      },
      {
        "id": "action_Vh1FG7vU",
        "type": "speech",
        "text": "首先，什么是系统？看这里，系统是指——相互依赖的组分有规律地结合而形成的整体。这个定义里有两个关键词：第一，\"相互依赖\"，说明组分之间不是简单的堆砌，它们彼此有联系、有作用；第二，\"有规律地结合\"，说明这个结合是有序的、是有结构的，而不是随意的。比如你课桌上的各种零件散落一地，那是杂乱无章的，但一旦按照图纸把它们组装成一台显微镜，这些零件就\"相互依赖\"且\"有规律地结合\"了，它们就变成了一个整体——一台显微镜，这就是一个系统。"
      },
      {
        "id": "action_UJCsJXSx",
        "type": "spotlight",
        "elementId": "text_1R2lAzua"
      },
      {
        "id": "action_j3fB9MXe",
        "type": "speech",
        "text": "那么好，从这个定义出发，我们再回头看细胞。细胞是不是一个系统？当然是。细胞膜、细胞质、细胞核、各种细胞器，这些组分彼此之间相互作用、相互依赖，有规律地结合在一起，形成了细胞这个整体。更重要的是，细胞是有生命的。所以，我们不只是说细胞是一个系统，而是说——细胞是一个生命系统。"
      },
      {
        "id": "action_m2uBNGH0",
        "type": "spotlight",
        "elementId": "text_8SjP9uAC"
      },
      {
        "id": "action_-7EHinJd",
        "type": "speech",
        "text": "既然细胞是最基本的生命系统，那么比细胞更大的生命系统是什么呢？这就是我们接下来要看的——生命系统的结构层次。整个生物界，从微观到宏观，可以分为这几个层次。"
      },
      {
        "id": "action_ytOybzLZ",
        "type": "spotlight",
        "elementId": "text__9bV0vc-"
      },
      {
        "id": "action_qJunsmHG",
        "type": "speech",
        "text": "最底层，也是最基本的层次，就是细胞。一群形态相似、功能相同的细胞，结合在一起就构成了组织。比如我们之前提到过的肌肉组织、神经组织，都属于组织这一层。"
      },
      {
        "id": "action_QDgvosnf",
        "type": "spotlight",
        "elementId": "text_G_BSH0_S"
      },
      {
        "id": "action_Z-gywVt0",
        "type": "speech",
        "text": "好，再到下一层。不同的组织按照一定的顺序结合起来，共同完成某一种特定的生理功能，这就形成了器官。比如心脏，它主要由心肌组织构成，同时还有神经组织、结缔组织等，共同配合完成泵血的功能。"
      },
      {
        "id": "action_e_Knurzh",
        "type": "spotlight",
        "elementId": "text_tw13WsSk"
      },
      {
        "id": "action_SCNvFym0",
        "type": "speech",
        "text": "再往上，能够共同完成一种或几种生理功能的多个器官，按照一定的顺序排列，就构成了系统。比如我们的消化系统，就包含了口腔、食管、胃、小肠、大肠、肝脏、胰腺等多个器官，它们分工协作来完成消化和吸收的功能。"
      },
      {
        "id": "action_c_T6FLsn",
        "type": "spotlight",
        "elementId": "text_d3L_C82z"
      },
      {
        "id": "action_etGMFxW_",
        "type": "speech",
        "text": "然后呢，由各个系统共同配合，就构成了一个完整的生物个体。比如你、我，就是一个个的个体。到这里还只是个体水平。比个体更大的，是由同种生物的许多个体在一定的区域内组成的种群。比如一个池塘里所有的鲤鱼，就是一个鲤鱼种群。再往后，还有群落、生态系统，一直到最大的生物圈，我们生物书后面会详细讲到。"
      },
      {
        "id": "action_YAm6L2hA",
        "type": "speech",
        "text": "所以，大家可以看到一个清晰的脉络：从微观的细胞开始，一步一步地，像搭积木一样，构建出越来越复杂的生命体系。而这个链条上最基本的起点，就是细胞。下一节课，我们还会专门来探讨，为什么说细胞是基本的生命系统。"
      }
    ],
    "createdAt": 1779067702378,
    "updatedAt": 1779067702378
  },
  {
    "id": "OFCApb9QFrfPFkXZLTXpW",
    "stageId": "builtin-demo-biology",
    "type": "slide",
    "title": "细胞：基本的生命系统",
    "order": 7,
    "content": {
      "type": "slide",
      "canvas": {
        "id": "_JnENP_0-Y_op6XyMDCln",
        "viewportSize": 1000,
        "viewportRatio": 0.5625,
        "theme": {
          "backgroundColor": "#ffffff",
          "themeColors": [
            "#5b9bd5",
            "#ed7d31",
            "#a5a5a5",
            "#ffc000",
            "#4472c4"
          ],
          "fontColor": "#333333",
          "fontName": "Microsoft YaHei",
          "outline": {
            "color": "#d14424",
            "width": 2,
            "style": "solid"
          },
          "shadow": {
            "h": 0,
            "v": 0,
            "blur": 10,
            "color": "#000000"
          }
        },
        "elements": [
          {
            "id": "text_S_ksExWY",
            "type": "text",
            "left": 60,
            "top": 50,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size:32px;\"><strong>细胞：基本的生命系统</strong></p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          },
          {
            "id": "text_SjdJctDE",
            "type": "text",
            "left": 60,
            "top": 106,
            "width": 880,
            "height": 76,
            "content": "<p style=\"font-size:20px;\">回顾与总结：为什么细胞是最基本的生命系统？</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#5b9bd5",
            "rotate": 0
          },
          {
            "id": "shape_t1hMzgvg",
            "type": "shape",
            "left": 70,
            "top": 170,
            "width": 860,
            "height": 3,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#5b9bd5",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "shape_IMwmwbws",
            "type": "shape",
            "left": 60,
            "top": 200,
            "width": 280,
            "height": 140,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#dbeafe",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "shape_CvisrMSJ",
            "type": "shape",
            "left": 360,
            "top": 200,
            "width": 280,
            "height": 140,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#dcfce7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "shape_flruihqf",
            "type": "shape",
            "left": 660,
            "top": 200,
            "width": 280,
            "height": 140,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#fef3c7",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_tkIlWeXc",
            "type": "text",
            "left": 80,
            "top": 232,
            "width": 240,
            "height": 76,
            "content": "<p style=\"font-size:18px; text-align:center;\"><strong>结构基础</strong></p><p style=\"font-size:16px; text-align:center;\">细胞是构成生物体的基本结构单位</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#1e40af",
            "rotate": 0
          },
          {
            "id": "text_EW_0fmRj",
            "type": "text",
            "left": 380,
            "top": 232,
            "width": 240,
            "height": 76,
            "content": "<p style=\"font-size:18px; text-align:center;\"><strong>功能基础</strong></p><p style=\"font-size:16px; text-align:center;\">各生命活动都以细胞为基础</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#166534",
            "rotate": 0
          },
          {
            "id": "text_r0U91ktH",
            "type": "text",
            "left": 680,
            "top": 232,
            "width": 240,
            "height": 76,
            "content": "<p style=\"font-size:18px; text-align:center;\"><strong>系统基础</strong></p><p style=\"font-size:16px; text-align:center;\">各层次生命系统都建立在细胞之上</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#92400e",
            "rotate": 0
          },
          {
            "id": "line_JbyD7hlY",
            "type": "line",
            "left": 340,
            "top": 270,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              20,
              0
            ],
            "style": "solid",
            "color": "#5b9bd5",
            "points": [
              "",
              "arrow"
            ],
            "rotate": 0
          },
          {
            "id": "line_cjXP65lX",
            "type": "line",
            "left": 640,
            "top": 270,
            "width": 3,
            "start": [
              0,
              0
            ],
            "end": [
              20,
              0
            ],
            "style": "solid",
            "color": "#5b9bd5",
            "points": [
              "",
              "arrow"
            ],
            "rotate": 0
          },
          {
            "id": "shape_fdPuKXQr",
            "type": "shape",
            "left": 60,
            "top": 370,
            "width": 880,
            "height": 103,
            "path": "M 0 0 L 1 0 L 1 1 L 0 1 Z",
            "viewBox": [
              1,
              1
            ],
            "fill": "#f5f5f5",
            "fixedRatio": false,
            "rotate": 0
          },
          {
            "id": "text_oZNiMiDc",
            "type": "text",
            "left": 80,
            "top": 386,
            "width": 840,
            "height": 70,
            "content": "<p style=\"font-size:18px;\"><strong>核心观点：</strong> 细胞是基本的生命系统</p><p style=\"font-size:16px;\">原因：各层次生命系统的形成、维持和运转，都是以细胞为基础的</p>",
            "defaultFontName": "Microsoft YaHei",
            "defaultColor": "#333333",
            "rotate": 0
          }
        ],
        "background": {
          "type": "solid",
          "color": "#ffffff"
        }
      }
    },
    "actions": [
      {
        "id": "action_WGkvFgcm",
        "type": "spotlight",
        "elementId": "text_S_ksExWY"
      },
      {
        "id": "action_YnQcWFBr",
        "type": "speech",
        "text": "好了，同学们，经过前面几页的学习，我们一起走过了从细胞学说建立的历史，到生命系统层层递进的结构层次。现在，我们终于来到了这个单元最关键的问题：为什么说细胞是最基本的生命系统？"
      },
      {
        "id": "action_BxHybAwF",
        "type": "spotlight",
        "elementId": "text_EW_0fmRj"
      },
      {
        "id": "action_fyeoKWyB",
        "type": "speech",
        "text": "首先，从结构上看，细胞是构成生物体的基本结构单位。无论是单细胞的草履虫，还是由数万亿细胞组成的人体，它们的基础都是细胞。没有细胞，就没有这些复杂的生命体。"
      },
      {
        "id": "action_gJ9BcinS",
        "type": "spotlight",
        "elementId": "text_r0U91ktH"
      },
      {
        "id": "action_YMmvd4a7",
        "type": "speech",
        "text": "其次，从功能上看，各项生命活动都是以细胞为基础来进行的。比如，我们思考需要神经细胞，消化食物需要消化道上皮细胞，运动需要肌肉细胞。细胞是各项生命功能真正得到执行的场所。"
      },
      {
        "id": "action_Dh_yLjJZ",
        "type": "spotlight",
        "elementId": "text_oZNiMiDc"
      },
      {
        "id": "action_Vgwy_ww-",
        "type": "speech",
        "text": "最后，也是最重要的一点，回顾我们上一页学习过的生命系统结构层次——从细胞、组织、器官、系统，一直到个体、种群、群落和生态系统。你会发现，这个金字塔的基石，就是细胞。没有细胞，上面所有的层次都无从谈起。所以，细胞是各层次生命系统形成、维持和运转的根本。"
      },
      {
        "id": "action__dwT5CcB",
        "type": "spotlight",
        "elementId": "text_SjdJctDE"
      },
      {
        "id": "action_a8s8ifT_",
        "type": "speech",
        "text": "所以，今天这节课的核心观点就是：细胞不仅是生物体的结构和功能单位，更是整个生命系统的起点和基石。希望同学们能够牢牢记住这个概念。它就像一个大楼的地基，虽然看起来不起眼，但整个大厦的稳固全在于此。那么，我们今天的课程就到这里，大家辛苦了！我们下节课再见！"
      }
    ],
    "createdAt": 1779067714370,
    "updatedAt": 1779067714370
  }
] as unknown as Scene[];
