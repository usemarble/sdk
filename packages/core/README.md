# Marble Core SDK

The official TypeScript Core SDK for [Marble](https://marblecms.com).  
Provides a strongly typed client, pagination helpers, retry/backoff, and webhook verification utilities.

---

## ✨ Features

- 📦 **@usemarble/core** – base SDK package with:
  - `MarbleClient` – typed API client for posts, tags, categories, authors
  - Runtime validation with Zod
  - Pagination helpers (iteratePostPages, paginatePosts, etc.)
  - Retry & backoff with exponential jitter
  - Webhook verification with HMAC + timestamp tolerance
- 🧪 Unit tests powered by Vitest
- 📚 API docs via TypeDoc

## 🚀 Getting Started

### 1. Install

```bash
npm install @usemarble/core
# or
pnpm add @usemarble/core
# or
yarn add @usemarble/core
```

---

## 🧪 Example Usage

```ts
import { MarbleClient } from "@usemarble/core";

const marble = new MarbleClient({
  baseUrl: "https://api.marble.com",
  apiKey: "sk_123",
});

// List posts
const { posts, pagination } = await marble.listPosts({ limit: 5 });
console.log(posts.map((p) => p.title));

// Fetch a single post
const { post } = await marble.getPost("hello-world");
console.log(post.title);

// Stream posts page-by-page
for await (const page of marble.iteratePostPages({})) {
  console.log("Page", page.pagination.currentPage, "posts:", page.posts.length);
}
```

---

## 🔔 Webhooks

Verify incoming Marble webhook requests:

```ts
import { verifyMarbleSignature, parseWebhookEvent } from "@usemarble/core";

const rawBody =
  '{"id":"evt_1","type":"post.published","createdAt":"2024-01-01T00:00:00Z","data":{"id":"123"}}';

const headers = {
  "x-marble-signature": "t=1690000000,v1=abc123...",
  "x-marble-timestamp": "1690000000",
};

verifyMarbleSignature(rawBody, headers, "whsec_123");

const evt = parseWebhookEvent<{ id: string }>(
  rawBody,
  (d) => d as { id: string }
);
console.log(evt.type, evt.data.id);
```

---
