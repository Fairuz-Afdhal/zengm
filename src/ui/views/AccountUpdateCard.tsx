import useTitleBar from "../hooks/useTitleBar.tsx";
import type { View } from "../../common/types.ts";

const AccountUpdateCard = (_props: View<"accountUpdateCard">) => {
	useTitleBar({ title: "Update Card", hideNewWindow: true });

	return <p>This feature has been removed.</p>;
};

export default AccountUpdateCard;
