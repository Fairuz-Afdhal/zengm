import { checkAccount } from "../util/checkAccount.ts";
import type { Conditions, UpdateEvents } from "../../common/types.ts";

const updateAccountUpdateCard = async (
	inputs: unknown,
	updateEvents: UpdateEvents,
	state: unknown,
	conditions: Conditions,
) => {
	if (updateEvents.includes("firstRun") || updateEvents.includes("account")) {
		const partialTopMenu = await checkAccount(conditions);

		return {
			goldCancelled: partialTopMenu.goldCancelled,
			last4: "????",
			expMonth: "??",
			expYear: "????",
			username: partialTopMenu.username,
		};
	}
};

export default updateAccountUpdateCard;
