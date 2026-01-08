import { MarbleClient } from "../src";

function fakeFetchSequence(
	responses: Array<{ ok: boolean; status: number; body?: unknown }>,
): typeof fetch {
	let i = 0;
	return (async () => {
		const r = responses[Math.min(i++, responses.length - 1)];
		if (!r) {
			throw new Error("No response object available");
		}
		const body = JSON.stringify(r.body ?? {});
		return new Response(body, {
			status: r.status,
			headers: { "Content-Type": "application/json" },
		}) as Response;
	}) as typeof fetch;
}

(async () => {
	const seq = [
		{ ok: false, status: 503, body: { msg: "down" } },
		{ ok: false, status: 429, body: { msg: "rate" } },
		{
			ok: true,
			status: 200,
			body: {
				posts: [],
				pagination: {
					limit: 0,
					currentPage: 1,
					nextPage: null,
					previousPage: null,
					totalItems: 0,
					totalPages: 1,
				},
			},
		},
	];
	const marble = new MarbleClient({
		baseUrl: "https://fake",
		fetchImpl: fakeFetchSequence(seq),
	});
	const r = await marble.listPosts({});
	console.log("✅ retry path reached success: posts =", r.posts.length);
})();
