// run-my-agents.flisk.si -> the Render service. Render's free workspace allows two custom domains and they are taken, so
// Cloudflare terminates run-my-agents.flisk.si and this Worker forwards every request to the service's onrender.com address.
// The page is the same; PUBLIC_URL on the service says run-my-agents.flisk.si, so canonical links are right.
const ORIGIN = "run-my-agents.onrender.com";

export default {
	async fetch(request) {
		const url = new URL(request.url);
		url.protocol = "https:";
		url.hostname = ORIGIN;
		url.port = "";
		const forwarded = new Request(url, request);
		forwarded.headers.set("x-forwarded-host", new URL(request.url).hostname);
		return fetch(forwarded);
	},
};
