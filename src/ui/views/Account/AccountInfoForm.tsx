import clsx from "clsx";
import { type ChangeEvent, useState } from "react";
import { ACCOUNT_API_URL } from "../../../common/constants.ts";
import { ActionButton } from "../../components/ActionButton.tsx";
import { helpers } from "../../util/helpers.ts";
import { realtimeUpdate } from "../../util/realtimeUpdate.ts";
import { ajaxErrorMsg } from "../LoginOrRegister/index.tsx";
import { fields } from "../LoginOrRegister/Register.tsx";
import { fetchWrapper } from "../../../common/fetchWrapper.ts";
import { getAccessToken } from "../../util/auth.ts";

const formGroupStyle = {
	width: 300,
};

const AccountInfoForm = ({
	initialEmail,
	initialUsername,
}: {
	initialEmail: string;
	initialUsername: string;
}) => {
	const [state, setState] = useState({
		submitting: false,
		errorMessageOverall: undefined as string | undefined,
		errorMessageEmail: undefined as string | undefined,
		errorMessageNewPassword: undefined as string | undefined,
		errorMessageNewPassword2: undefined as string | undefined,
		errorMessageCurrentPassword: undefined as string | undefined,

		editEmail: false,
		editPassword: false,

		email: initialEmail,
		newPassword: "",
		newPassword2: "",
		currentPassword: "",
	});

	const handleChange =
		(field: "email" | "newPassword" | "newPassword2" | "currentPassword") =>
		(event: ChangeEvent<HTMLInputElement>) => {
			setState({
				...state,
				[field]: event.target.value,
			});
		};

	const handleEditCancel = (field: "email" | "password") => () => {
		const editField = `edit${helpers.upperCaseFirstLetter(field)}` as const;

		if (state[editField]) {
			const newState = {
				...state,
				[editField]: false,
			};

			if (field === "email") {
				newState.email = initialEmail;
				newState.errorMessageEmail = undefined;
			} else if (field === "password") {
				newState.newPassword = "";
				newState.newPassword2 = "";
				newState.errorMessageNewPassword = undefined;
				newState.errorMessageNewPassword2 = undefined;
			}

			setState(newState);
		} else {
			setState({
				...state,
				[editField]: true,
			});
		}
	};

	return (
		<form
			onSubmit={async (event) => {
				event.preventDefault();

				setState((state2) => ({
					...state2,
					submitting: true,
					errorMessageEmail: undefined,
					errorMessageOverall: undefined,
					errorMessageNewPassword: undefined,
					errorMessageNewPassword2: undefined,
					errorMessageCurrentPassword: undefined,
				}));

				const toSubmit: Record<string, string> = {
					current_password: state.currentPassword,
				};

				if (state.editEmail) {
					toSubmit.email = state.email;
				}
				if (state.editPassword) {
					toSubmit.password = state.newPassword;
					toSubmit.password2 = state.newPassword2;
				}

				try {
					const accessToken = await getAccessToken();
					const data = await fetchWrapper({
						url: `${ACCOUNT_API_URL}/account`,
						method: "PUT",
						data: toSubmit,
						accessToken: accessToken ?? undefined,
					});

					if (data.success) {
						await realtimeUpdate(["account"], "/account");

						setState((state2) => ({
							...state2,
							editEmail: false,
							editPassword: false,
							currentPassword: "",
							submitting: false,
						}));
					} else {
						const updatedState: Partial<typeof state> = {};

						for (const error of Object.keys(data.errors)) {
							if (error === "email") {
								updatedState.errorMessageEmail = data.errors[error];
							} else if (error === "password") {
								updatedState.errorMessageNewPassword = data.errors[error];
							} else if (error === "password2") {
								updatedState.errorMessageNewPassword2 = data.errors[error];
							} else if (error === "passwords") {
								updatedState.errorMessageNewPassword =
									updatedState.errorMessageNewPassword ?? "";
								updatedState.errorMessageNewPassword2 = data.errors[error];
							} else if (error === "current_password") {
								updatedState.errorMessageCurrentPassword = data.errors[error];
							} else if (error === "overall") {
								updatedState.errorMessageOverall = data.errors[error];
							}
						}

						setState((state2) => ({
							...state2,
							...updatedState,
							submitting: false,
						}));
					}
				} catch (error) {
					console.error(error);
					setState((state2) => ({
						...state2,
						submitting: false,
						errorMessageOverall: ajaxErrorMsg,
					}));
				}
			}}
		>
			<p className="text-body-secondary mb-3">
				Username: <b>{initialUsername}</b>
			</p>

			<div
				className="d-md-flex"
				style={{
					gap: "3rem",
				}}
			>
				<div style={formGroupStyle}>
					<div className="mb-3" style={formGroupStyle}>
						<label className="form-label" htmlFor="account-email">
							Email
						</label>
						<div className="input-group">
							<input
								className={clsx("form-control", {
									"is-invalid": state.errorMessageEmail !== undefined,
								})}
								id="account-email"
								{...fields.email.inputProps}
								value={state.email}
								onChange={handleChange("email")}
								disabled={!state.editEmail}
								required={state.editEmail}
							/>
							<button
								className="btn btn-secondary"
								type="button"
								onClick={handleEditCancel("email")}
							>
								{state.editEmail ? "Cancel" : "Edit"}
							</button>
						</div>
						<span
							className={clsx("form-text", {
								"text-danger": state.errorMessageEmail,
							})}
						>
							{state.errorMessageEmail}
						</span>
					</div>
				</div>

				<div style={formGroupStyle}>
					<div className="mb-3" style={formGroupStyle}>
						<label className="form-label" htmlFor="account-new-password">
							New Password
						</label>
						<div className="input-group">
							<input
								className={clsx("form-control", {
									"is-invalid": state.errorMessageNewPassword !== undefined,
								})}
								id="account-new-password"
								{...fields.password.inputProps}
								value={state.newPassword}
								onChange={handleChange("newPassword")}
								disabled={!state.editPassword}
								required={state.editPassword}
								autoComplete="new-password"
							/>
							<button
								className="btn btn-secondary"
								type="button"
								onClick={handleEditCancel("password")}
							>
								{state.editPassword ? "Cancel" : "Edit"}
							</button>
						</div>
						<span
							className={clsx("form-text", {
								"text-danger": state.errorMessageNewPassword,
							})}
						>
							{state.errorMessageNewPassword}
						</span>
					</div>

					<div className="mb-3" style={formGroupStyle}>
						<label className="form-label" htmlFor="account-new-password-2">
							Repeat New Password
						</label>
						<input
							className={clsx("form-control", {
								"is-invalid": state.errorMessageNewPassword2 !== undefined,
							})}
							id="account-new-password-2"
							{...fields.password.inputProps}
							value={state.newPassword2}
							onChange={handleChange("newPassword2")}
							disabled={!state.editPassword}
							required={state.editPassword}
							autoComplete="new-password"
						/>
						<span
							className={clsx("form-text", {
								"text-danger": state.errorMessageNewPassword2,
							})}
						>
							{state.errorMessageNewPassword2}
						</span>
					</div>
				</div>
			</div>

			<div className="mb-3" style={formGroupStyle}>
				<label className="form-label" htmlFor="account-current-password">
					Confirm Current Password
				</label>
				<input
					className={clsx("form-control", {
						"is-invalid": state.errorMessageCurrentPassword !== undefined,
					})}
					id="account-current-password"
					{...fields.password.inputProps}
					value={state.currentPassword}
					onChange={handleChange("currentPassword")}
					autoComplete="current-password"
				/>
				<span
					className={clsx("form-text", {
						"text-danger": state.errorMessageCurrentPassword,
					})}
				>
					{state.errorMessageCurrentPassword}
				</span>
			</div>

			<ActionButton
				type="submit"
				processing={state.submitting}
				disabled={!state.editEmail && !state.editPassword}
			>
				Save Changes
			</ActionButton>
			{state.errorMessageOverall ? (
				<p className="text-danger mt-3 mb-0">{state.errorMessageOverall}</p>
			) : null}
		</form>
	);
};

export default AccountInfoForm;
