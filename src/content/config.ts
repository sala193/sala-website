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
  }),
});

export const collections = { communities, articles };
