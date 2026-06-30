import { checkAccount } from "../util/checkAccount.ts";
import type { Conditions, UpdateEvents } from "../../common/types.ts";

const updateCloudSaves = async (
	inputs: unknown,
	updateEvents: UpdateEvents,
	state: unknown,
	conditions: Conditions,
) => {
	if (updateEvents.includes("firstRun") || updateEvents.includes("account")) {
		const partialTopMenu = await checkAccount(conditions);
		const loggedIn =
			partialTopMenu.username !== undefined &&
			partialTopMenu.username !== null &&
			partialTopMenu.username !== "";

		return {
			email: partialTopMenu.email,
			loggedIn,
			username: partialTopMenu.username,
		};
	}
};

export default updateCloudSaves;
