import { useState, useEffect, type MouseEvent } from "react";
import { ACCOUNT_API_URL } from "../../../common/constants.ts";
import useTitleBar from "../../hooks/useTitleBar.tsx";
import { toWorker } from "../../util/toWorker.ts";
import { realtimeUpdate } from "../../util/realtimeUpdate.ts";
import type { View } from "../../../common/types.ts";
import { ajaxErrorMsg } from "../LoginOrRegister/index.tsx";
import AccountInfoForm from "./AccountInfoForm.tsx";
import DeleteAccountForm from "./DeleteAccountForm.tsx";
import { fetchWrapper } from "../../../common/fetchWrapper.ts";
import { getAccessToken, clearAccessToken } from "../../util/auth.ts";

type Session = {
	id: number;
	createdAt: number;
	expiresAt: number;
	isCurrent: boolean;
};

const formatDate = (ts: number) =>
	new Date(ts * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

const SessionsSection = () => {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();

	const fetchSessions = async () => {
		setLoading(true);
		setError(undefined);
		try {
			const accessToken = await getAccessToken();
			if (!accessToken) {
				setLoading(false);
				return;
			}
			const response = await fetch(`${ACCOUNT_API_URL}/account/sessions`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (!response.ok) throw new Error("Failed to load sessions");
			setSessions(await response.json());
		} catch {
			setError("Failed to load sessions.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSessions();
	}, []);

	const revoke = async (id: number, isCurrent: boolean) => {
		if (
			isCurrent &&
			!confirm("This will log you out of the current session. Continue?")
		) {
			return;
		}

		try {
			const accessToken = await getAccessToken();
			await fetch(`${ACCOUNT_API_URL}/account/sessions/${id}`, {
				method: "DELETE",
				headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
			});

			if (isCurrent) {
				clearAccessToken();
				await toWorker("main", "checkAccount", undefined);
				await toWorker("main", "realtimeUpdate", ["account"]);
				await realtimeUpdate([], "/");
			} else {
				setSessions((prev) => prev.filter((s) => s.id !== id));
			}
		} catch {
			setError("Failed to revoke session.");
		}
	};

	const revokeAll = async () => {
		if (
			!confirm("Revoke all sessions? You will be logged out on all devices.")
		) {
			return;
		}

		try {
			const accessToken = await getAccessToken();
			await fetch(`${ACCOUNT_API_URL}/account/sessions`, {
				method: "DELETE",
				headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
			});
			clearAccessToken();
			await toWorker("main", "checkAccount", undefined);
			await toWorker("main", "realtimeUpdate", ["account"]);
			await realtimeUpdate([], "/");
		} catch {
			setError("Failed to revoke sessions.");
		}
	};

	if (loading) return <p>Loading sessions…</p>;
	if (error) return <p className="text-danger">{error}</p>;
	if (sessions.length === 0)
		return <p className="text-muted">No active sessions.</p>;

	return (
		<>
			<table className="table table-sm" style={{ maxWidth: 600 }}>
				<thead>
					<tr>
						<th>Created</th>
						<th>Expires</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{sessions.map((s) => (
						<tr key={s.id}>
							<td>
								{formatDate(s.createdAt)}
								{s.isCurrent ? (
									<span className="badge bg-success ms-2">current</span>
								) : null}
							</td>
							<td>{formatDate(s.expiresAt)}</td>
							<td>
								<button
									className="btn btn-sm btn-outline-danger"
									onClick={() => revoke(s.id, s.isCurrent)}
								>
									Revoke
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{sessions.length > 1 ? (
				<button className="btn btn-sm btn-danger" onClick={revokeAll}>
					Revoke all sessions
				</button>
			) : null}
		</>
	);
};

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
					<h2 className="mt-5">Cloud Saves</h2>

					<p>
						Back up your leagues to the cloud and restore them on any device.{" "}
						<a href="/account/cloud_saves">Manage cloud saves →</a>
					</p>

					<h2 className="mt-5">Update Account Info</h2>

					<AccountInfoForm initialEmail={email} initialUsername={username} />

					<h2 className="mt-5">Active Sessions</h2>

					<SessionsSection />

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
