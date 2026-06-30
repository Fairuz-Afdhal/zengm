import { ACCOUNT_API_URL } from "./constants.ts";
import { fetchWrapper } from "./fetchWrapper.ts";

export const analyticsEventLocal = async (
	type: "new_league" | "completed_season",
) => {
	try {
		await fetchWrapper({
			url: `${ACCOUNT_API_URL}/analytics`,
			method: "POST",
			data: {
				sport: process.env.SPORT ?? "",
				type,
			},
		});
	} catch (error) {
		console.error(error);
	}
};
