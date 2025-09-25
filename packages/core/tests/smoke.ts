import { MarbleClient, verifyMarbleSignature, parseWebhookEvent } from "../src";
import type { PostsListParams } from "../src";

function makeFakeFetch(responseBody: unknown, status = 200): typeof fetch {
  return (async (_input: unknown, _init?: RequestInit) => {
    const body = JSON.stringify(responseBody);
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json" },
    }) as Response;
  }) as typeof fetch;
}

async function testListPosts() {
  const fake = {
    posts: [
      {
        id: "1",
        slug: "hello-world",
        title: "Hello",
        content: "Body",
        description: "Desc",
        coverImage: "",
        publishedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        authors: [{ id: "a1", name: "Author", image: null }],
        category: { id: "c1", name: "Cat", slug: "cat" },
        tags: [{ id: "t1", name: "TS", slug: "ts" }],
        attribution: { author: "Someone", url: "https://x.y" },
      },
    ],
    pagination: {
      limit: 10,
      currentPage: 1,
      nextPage: null,
      previousPage: null,
      totalItems: 1,
      totalPages: 1,
    },
  };

  const marble = new MarbleClient({
    baseUrl: "https://fake.local",
    fetchImpl: makeFakeFetch(fake),
  });

  const out = await marble.listPosts({ limit: 10 } as PostsListParams);

  if (out.posts.length !== 1) throw new Error("Expected 1 post");
  const first = out.posts[0];
  if (!first) throw new Error("No first post");
  if (!(first.publishedAt instanceof Date))
    throw new Error("Date conversion failed");

  console.log("✅ listPosts ok");
}

async function testWebhook() {
  const secret = "shh";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify({
    id: "evt_1",
    type: "post.published",
    createdAt: new Date().toISOString(),
    data: { id: "1" },
  });

  const crypto = await import("node:crypto");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const headers = {
    "x-marble-signature": `t=${timestamp},v1=${sig}`,
    "x-marble-timestamp": timestamp,
  };

  verifyMarbleSignature(rawBody, headers, secret, { toleranceSeconds: 300 });
  const evt = parseWebhookEvent(rawBody, (d) => d as { id: string });
  if (evt.data.id !== "1") throw new Error("Webhook mapping failed");
  console.log("✅ webhook ok");
}

(async () => {
  await testListPosts();
  await testWebhook();
  console.log("✅ all smoke tests passed");
})();
