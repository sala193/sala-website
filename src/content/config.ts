import { defineCollection, z } from 'astro:content';

// 社區資料庫 —— 開箱文格式,每個社區一個永久頁面
const communities = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    community_name: z.string(),
    region: z.string(),
    developer: z.string().optional(),
    year_built: z.number().optional(),
    address: z.string().optional(),
    units: z.number().optional(),
    floors: z.number().optional(),
    parking_type: z.string().optional(),
    public_ratio: z.string().optional(),
    management_fee: z.string().optional(),
    nearby_mrt: z.string().optional(),
    author: z.string().default('蔡莎拉'),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    cover_image: z.string().optional(),
  }),
});

// 不動產知識 / 莎拉說房市 —— 問題型文章、地域知識文章
const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    region: z.string().optional(),
    category: z.enum(['買房', '賣房', '稅費', '法律', '土地廠房', '新聞時事']).default('買房'),
    author: z.string().default('蔡莎拉'),
    date: z.date(),
    tags: z.array(z.string()).default([]),

    // ---- 文章模板欄位（都是選填；寫法見 src/content/articles/_文章模板.md）----
    seo_title: z.string().optional(), // 網頁標題（搜尋結果用，關鍵字＋年份）；沒填就用 title
    subtitle: z.string().optional(), // 副標：把關鍵數字直接寫出來
    updated: z.date().optional(), // 最近更新日期
    cover: z.string().optional(), // 封面圖，例如 /images/articles/xxx.jpg
    cover_alt: z.string().optional(), // 封面圖替代文字（寫成完整一句話）
    tldr: z.array(z.string()).default([]), // 「本文重點」：3～7 條，不看內文也懂
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]), // 常見問題（同時輸出 FAQPage 結構化資料）
    sources: z.string().optional(), // 資料來源與假設（灰色小字）
    related: z.array(z.string()).default([]), // 延伸閱讀：其他文章的網址代號（slug）
    cta_tool: z.object({ label: z.string(), href: z.string(), text: z.string().optional() }).optional(), // 文末的工具連結卡
  }),
});

export const collections = { communities, articles };
