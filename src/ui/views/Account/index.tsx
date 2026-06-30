import { useState } from "react";
import type { MouseEvent } from "react";
import { ACCOUNT_API_URL } from "../../../common/constants.ts";
import useTitleBar from "../../hooks/useTitleBar.tsx";
import { toWorker } from "../../util/toWorker.ts";
import { realtimeUpdate } from "../../util/realtimeUpdate.ts";
import type { View } from "../../../common/types.ts";
import { ajaxErrorMsg } from "../LoginOrRegister/index.tsx";
import AccountInfoForm from "./AccountInfoForm.tsx";
import DeleteAccountForm from "./DeleteAccountForm.tsx";
import { fetchWrapper } from "../../../common/fetchWrapper.ts";
import { clearAccessToken } from "../../util/auth.ts";

const UserInfo = ({
	loggedIn,
	username,
}: {
	loggedIn: boolean;
	username?: string;
}) => {
	const [logoutError, setLogoutError] = useState<string | undefined>();

	const handleLogout = async (event: MouseEvent) => {
		event.preventDefault();
		setLogoutError(undefined);

		try {
			await fetchWrapper({
				url: `${ACCOUNT_API_URL}/auth/logout`,
				method: "POST",
				credentials: "include",
			});
		} catch (error) {
			console.error(error);
			setLogoutError(ajaxErrorMsg);
			return;
		}

		clearAccessToken();
		await toWorker("main", "checkAccount", undefined);
		await toWorker("main", "realtimeUpdate", ["account"]);
		await realtimeUpdate([], "/");
	};

	return (
		<>
			{!loggedIn ? (
				<p>
					You are not logged in!{" "}
					<a href="/account/login_or_register">
						Click here to log in or create an account.
					</a>{" "}
					If you have an account, your achievements will be stored in the cloud,
					combining achievements from leagues in different browsers and
					different devices.
				</p>
			) : (
				<p>
					Logged in as: <b>{username}</b> (
					<a href="" onClick={handleLogout}>
						Logout
					</a>
					)
				</p>
			)}
			{logoutError ? <p className="text-danger">{logoutError}</p> : null}
		</>
	);
};

const Account = ({ email, loggedIn, username }: View<"account">) => {
	useTitleBar({
		title: "Your Account",
		hideNewWindow: true,
	});

	return (
		<>
			<div className="row">
				<div className="col-lg-8 col-md-10">
					<UserInfo loggedIn={loggedIn} username={username} />
				</div>
			</div>

			{loggedIn ? (
				<>
					<h2 className="mt-5">Update Account Info</h2>

					<AccountInfoForm initialEmail={email} initialUsername={username} />

					<h2 className="mt-5">Delete Account</h2>

					<div style={{ maxWidth: 648 }}>
						<DeleteAccountForm username={username} />
					</div>
				</>
			) : null}

			<h2 className="mt-5">Achievements</h2>

			<a href="/achievements">Click here to view your achievements.</a>
		</>
	);
};

export default Account;
