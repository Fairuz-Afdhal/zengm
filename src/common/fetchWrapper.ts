export const fetchWrapper = async ({
	url,
	method,
	headers,
	data,
	credentials,
	accessToken,
}: {
	url: string;
	method: "GET" | "POST" | "PUT" | "DELETE";
	headers?: Record<string, string>;
	data?: FormData | URLSearchParams | Record<string, string>;
	credentials?: "include";
	accessToken?: string;
}): Promise<any> => {
	let body: FormData | URLSearchParams | undefined;

	if (data instanceof FormData || data instanceof URLSearchParams) {
		body = data;
	} else if (data !== undefined) {
		body = new URLSearchParams(data);
	}

	// GET requests can't have a body — append data to query string instead
	if (method === "GET" && body !== undefined) {
		url += `?${body.toString()}`;
		body = undefined;
	}

	const mergedHeaders: Record<string, string> = { ...headers };
	if (accessToken) {
		mergedHeaders["Authorization"] = `Bearer ${accessToken}`;
	}

	const response = await fetch(url, {
		method,
		headers:
			Object.keys(mergedHeaders).length > 0
				? new Headers(mergedHeaders)
				: undefined,
		body,
		credentials,
	});

	if (!response.ok) {
		throw new Error(`HTTP error ${response.status}`);
	}

	if (response.status === 204) {
		return undefined;
	}

	return response.json();
};
