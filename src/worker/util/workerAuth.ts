import { ACCOUNT_API_URL } from "../../common/constants.ts";

let cachedToken: string | undefined;
let tokenExpiry = 0;

// Returns a valid access token for worker-side API calls, refreshing as needed.
// Returns undefined if not logged in or refresh fails.
export async function getWorkerToken(): Promise<string | undefined> {
	const now = Date.now() / 1000;
	if (cachedToken && now < tokenExpiry - 60) {
		return cachedToken;
	}
	try {
		const resp = await fetch(`${ACCOUNT_API_URL}/auth/refresh`, {
			method: "POST",
			credentials: "include",
		});
		if (!resp.ok) {
			cachedToken = undefined;
			return undefined;
		}
		const data = await resp.json();
		cachedToken = data.accessToken;
		tokenExpiry = now + 14 * 60;
		return cachedToken;
	} catch {
		cachedToken = undefined;
		return undefined;
	}
}

export function clearWorkerToken(): void {
	cachedToken = undefined;
	tokenExpiry = 0;
}
