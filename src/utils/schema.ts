import type {
  ImageObject,
  Organization,
  Thing,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts'

// Site constants
const SITE_URL = 'https://laom.fr/'
const SITE_NAME = 'Laom'
const LOGO_URL = `${SITE_URL}logo.svg`

// Helper to ensure trailing slash
export const ensureTrailingSlash = (urlString: string | URL): string => {
  const str = urlString.toString()
  if (/\.[a-zA-Z0-9]+$/.test(str)) return str
  return str.endsWith('/') ? str : `${str}/`
}

// Default organization schema
export const defaultOrganization: Organization = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: LOGO_URL,
    contentUrl: LOGO_URL,
    width: '200',
    height: '60',
  } as ImageObject,
  sameAs: [],
}

// Create a WebSite schema
export function createWebSiteSchema(options?: {
  url?: string
  description?: string
  searchUrlTemplate?: string
}): WithContext<WebSite> {
  const url = options?.url || SITE_URL
  const description = options?.description || 'A sanctuary for your soul'

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: ensureTrailingSlash(url),
    description,
    publisher: defaultOrganization,
  }
}

// Create a WebPage schema
export function createWebPageSchema(options: {
  name: string
  url: string
  description: string
  image?: string
}): WithContext<WebPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: options.name,
    url: ensureTrailingSlash(options.url),
    description: options.description,
    publisher: defaultOrganization,
    ...(options.image && { image: options.image }),
  }
}

// Create an Organization schema (standalone)
export function createOrganizationSchema(options?: {
  name?: string
  url?: string
  logo?: string
  description?: string
  sameAs?: string[]
}): WithContext<Organization> {
  const logoUrl = options?.logo || LOGO_URL
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options?.name || SITE_NAME,
    url: options?.url || SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
      contentUrl: logoUrl,
    } as ImageObject,
    ...(options?.description && { description: options.description }),
    sameAs: options?.sameAs || [],
  }
}

// Type for JSON-LD that can be used in components
export type JsonLdSchema =
  | WithContext<WebSite>
  | WithContext<WebPage>
  | WithContext<Organization>
  | WithContext<Thing>

// Re-export types that pages might need
export type {
  ImageObject,
  Organization,
  WebPage,
  WebSite,
  WithContext,
}
