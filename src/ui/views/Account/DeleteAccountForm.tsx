import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal.tsx";
import { ACCOUNT_API_URL, GAME_NAME } from "../../../common/constants.ts";
import { toWorker } from "../../util/toWorker.ts";
import { realtimeUpdate } from "../../util/realtimeUpdate.ts";
import { ajaxErrorMsg } from "../LoginOrRegister/index.tsx";
import { fetchWrapper } from "../../../common/fetchWrapper.ts";
import { getAccessToken, clearAccessToken } from "../../util/auth.ts";

const Dialog = ({
	username,
	show,
	cancel,
	ok,
}: {
	username: string;
	show: boolean;
	cancel: (errorMessage?: string) => void;
	ok: () => void;
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	const [invalidPassword, setInvalidPassword] = useState(false);
	const [password, setPassword] = useState("");

	useEffect(() => {
		if (show) {
			setInvalidPassword(false);
			setPassword("");
		}
	}, [show]);

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.select();
		}
	}, []);

	const deleteAccount = async () => {
		setInvalidPassword(false);

		let response;
		try {
			const accessToken = await getAccessToken();
			response = await fetchWrapper({
				url: `${ACCOUNT_API_URL}/account`,
				method: "DELETE",
				data: { password },
				accessToken: accessToken ?? undefined,
			});
		} catch (error) {
			console.error(error);
			cancel(ajaxErrorMsg);
			return;
		}

		if (response.success) {
			clearAccessToken();
			ok();
		} else if (response.errors?.password) {
			setInvalidPassword(true);
		} else {
			cancel(response.errors?.overall ?? "Unknown error");
		}
	};

	return (
		<Modal animation show={show} onHide={cancel}>
			<Modal.Header closeButton>
				<Modal.Title>Delete account</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<p>
					This will delete your account with username <b>{username}</b>,
					including all your achievements for any ZenGM games you earned while
					logged into your account.
				</p>
				<p>Enter your password below to confirm.</p>
				<form
					className="mt-3"
					onSubmit={(event) => {
						event.preventDefault();
						deleteAccount();
					}}
				>
					<input
						ref={inputRef}
						type="password"
						className={clsx("form-control", {
							"is-invalid": invalidPassword,
						})}
						onChange={(event) => {
							setPassword(event.target.value);
						}}
						placeholder="Password"
						value={password}
					/>
					{invalidPassword ? (
						<div className="text-danger form-text">Invalid password</div>
					) : null}
				</form>
			</Modal.Body>

			<Modal.Footer>
				<button
					className="btn btn-secondary"
					onClick={() => {
						cancel();
					}}
				>
					Cancel
				</button>
				<button className="btn btn-danger" onClick={deleteAccount}>
					Delete account
				</button>
			</Modal.Footer>
		</Modal>
	);
};

const DeleteAccountForm = ({ username }: { username: string }) => {
	const [errorMessage, setErrorMessage] = useState<string | undefined>();
	const [showDialog, setShowDialog] = useState(false);

	return (
		<>
			<p>
				This will delete your account with username <b>{username}</b> for{" "}
				{GAME_NAME} and all other ZenGM games.
			</p>
			<p>
				This only affects your achievements, not your leagues. Leagues are
				stored locally on your device, independent of your account. To delete
				your leagues, <a href="/">go to the main page</a> and either delete them
				individually or go to Tools &gt; Delete All Leagues.
			</p>

			<button
				className="btn btn-danger"
				onClick={async () => {
					setShowDialog(true);
				}}
			>
				Delete account
			</button>

			{errorMessage ? (
				<div className="text-danger mt-3">{errorMessage}</div>
			) : null}

			<Dialog
				show={showDialog}
				username={username}
				cancel={(errorMessage) => {
					if (errorMessage) {
						setErrorMessage(errorMessage);
					}
					setShowDialog(false);
				}}
				ok={async () => {
					setErrorMessage(undefined);
					setShowDialog(false);

					await toWorker("main", "checkAccount", undefined);
					await toWorker("main", "realtimeUpdate", ["account"]);
					await realtimeUpdate([], "/");
				}}
			/>
		</>
	);
};

export default DeleteAccountForm;
