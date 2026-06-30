import { ACCOUNT_API_URL } from "../../common/constants.ts";

let cachedToken: string | undefined;
let tokenExpiry = 0;

// Returns a valid access token, refreshing via httpOnly cookie if needed.
// Returns undefined if not logged in.
export async function getAccessToken(): Promise<string | undefined> {
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
		tokenExpiry = now + 14 * 60; // 14 min (15 min token with 1 min buffer)
		return cachedToken;
	} catch {
		cachedToken = undefined;
		return undefined;
	}
}

export function setAccessToken(token: string): void {
	cachedToken = token;
	tokenExpiry = Date.now() / 1000 + 14 * 60;
}

export function clearAccessToken(): void {
	cachedToken = undefined;
	tokenExpiry = 0;
}
