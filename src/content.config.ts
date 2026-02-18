import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    youtubeId: z.string().optional(),
    author: z.string().default('LAOM'),
    locale: z.enum(['fr', 'en']).default('fr'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
})

const newsletters = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    url: z.string().url(),
    description: z.string().optional(),
    locale: z.enum(['fr', 'en']).optional(),
  }),
})

export const collections = {
  blog,
  newsletters,
}
