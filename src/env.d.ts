/// <reference types="astro/client" />

// Bindings et secrets Cloudflare exposes via locals.runtime.env.
interface Env {
  DB: D1Database
  TRACKING_DB?: D1Database
  ADMIN_PASSWORD?: string
  ADMIN_SESSION_SECRET?: string
  MOLLIE_API_KEY?: string
  MOLLIE_API_KEY_TEST?: string
  KIT_API_SECRET?: string
  META_CAPI_TOKEN?: string
  GA4_API_SECRET?: string
  RESEND_API_KEY?: string
  LEAD_NOTIFY_EMAIL?: string
  CF_API_TOKEN?: string
  CF_ACCOUNT_ID?: string
}

type D1Database = import('@cloudflare/workers-types').D1Database

declare namespace App {
  interface Locals {
    runtime: { env: Env }
    visitorId?: string
    attribution?: Record<string, string | null>
  }
}
