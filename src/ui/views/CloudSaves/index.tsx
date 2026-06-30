import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { ACCOUNT_API_URL, GAME_NAME } from "../../../common/constants.ts";
import type { View } from "../../../common/types.ts";
import useTitleBar from "../../hooks/useTitleBar.tsx";
import { getAccessToken } from "../../util/auth.ts";
import { useLocal } from "../../util/local.ts";

type CloudSaveEntry = {
	id: string;
	name: string;
	sport: string;
	season: number | null;
	teamName: string | null;
	updatedAt: number;
	versionCount: number;
};

type SaveVersion = {
	version: number;
	season: number | null;
	teamName: string | null;
	createdAt: number;
};

const formatDate = (ts: number) =>
	new Date(ts * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

const VersionHistory = ({
	saveId,
	onRestored,
}: {
	saveId: string;
	onRestored: () => void;
}) => {
	const [versions, setVersions] = useState<SaveVersion[]>([]);
	const [loading, setLoading] = useState(true);
	const [restoring, setRestoring] = useState<number | undefined>();

	useEffect(() => {
		const load = async () => {
			const accessToken = await getAccessToken();
			if (!accessToken) return;
			try {
				const data = await fetch(
					`${ACCOUNT_API_URL}/saves/${saveId}/versions`,
					{
						headers: { Authorization: `Bearer ${accessToken}` },
					},
				).then((r) => r.json());
				setVersions(data);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [saveId]);

	const restore = async (version: number) => {
		if (
			!confirm(
				`Restore version ${version}? This will overwrite the current save.`,
			)
		)
			return;
		setRestoring(version);
		try {
			const accessToken = await getAccessToken();
			await fetch(`${ACCOUNT_API_URL}/saves/${saveId}/restore/${version}`, {
				method: "POST",
				headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
			});
			onRestored();
		} finally {
			setRestoring(undefined);
		}
	};

	if (loading)
		return <p className="text-muted small mt-1">Loading versions…</p>;
	if (versions.length === 0)
		return <p className="text-muted small mt-1">No version history.</p>;

	return (
		<table className="table table-sm table-borderless mt-2 mb-0">
			<thead>
				<tr className="text-muted small">
					<th>Ver</th>
					<th>Date</th>
					<th>Season</th>
					<th>Team</th>
					<th />
				</tr>
			</thead>
			<tbody>
				{versions.map((v) => (
					<tr key={v.version} className="small">
						<td>#{v.version}</td>
						<td>{formatDate(v.createdAt)}</td>
						<td>{v.season ?? "—"}</td>
						<td>{v.teamName ?? "—"}</td>
						<td>
							<button
								className="btn btn-xs btn-outline-secondary"
								onClick={() => restore(v.version)}
								disabled={restoring === v.version}
							>
								{restoring === v.version ? "Restoring…" : "Restore"}
							</button>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

const SaveCard = ({
	save,
	lid,
	linkedSaveId,
	onDeleted,
	onRestored,
	onLinkChanged,
}: {
	save: CloudSaveEntry;
	lid: number | undefined;
	linkedSaveId: string | null | undefined;
	onDeleted: (id: string) => void;
	onRestored: () => void;
	onLinkChanged: (saveId: string | null) => void;
}) => {
	const [showVersions, setShowVersions] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [linking, setLinking] = useState(false);

	const isLinked = linkedSaveId === save.id;

	const linkSave = async () => {
		if (!lid) return;
		setLinking(true);
		try {
			const accessToken = await getAccessToken();
			if (!accessToken) return;
			const formData = new FormData();
			formData.append("lid", String(lid));
			formData.append("saveId", save.id);
			const response = await fetch(`${ACCOUNT_API_URL}/saves/link`, {
				method: "POST",
				headers: { Authorization: `Bearer ${accessToken}` },
				body: formData,
			});
			if (response.ok) onLinkChanged(save.id);
		} finally {
			setLinking(false);
		}
	};

	const unlinkSave = async () => {
		if (!lid) return;
		setLinking(true);
		try {
			const accessToken = await getAccessToken();
			if (!accessToken) return;
			const response = await fetch(`${ACCOUNT_API_URL}/saves/link/${lid}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (response.ok) onLinkChanged(null);
		} finally {
			setLinking(false);
		}
	};

	const download = async () => {
		setDownloading(true);
		try {
			const accessToken = await getAccessToken();
			const response = await fetch(`${ACCOUNT_API_URL}/saves/${save.id}`, {
				headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
			});
			if (!response.ok) throw new Error("Download failed");
			const json = await response.text();
			const url = URL.createObjectURL(
				new Blob([json], { type: "application/json" }),
			);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${save.name}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch {
			alert("Download failed. Please try again.");
		} finally {
			setDownloading(false);
		}
	};

	const deleteSave = async () => {
		if (!confirm(`Delete "${save.name}"? This cannot be undone.`)) return;
		setDeleting(true);
		try {
			const accessToken = await getAccessToken();
			const response = await fetch(`${ACCOUNT_API_URL}/saves/${save.id}`, {
				method: "DELETE",
				headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
			});
			if (!response.ok) throw new Error("Delete failed");
			onDeleted(save.id);
		} catch {
			alert("Delete failed. Please try again.");
			setDeleting(false);
		}
	};

	return (
		<div className="card mb-3">
			<div className="card-body">
				<div className="d-flex justify-content-between align-items-start">
					<div>
						<h5 className="card-title mb-1">{save.name}</h5>
						<p className="card-text text-muted small mb-0">
							{save.sport}
							{save.season ? ` · Season ${save.season}` : ""}
							{save.teamName ? ` · ${save.teamName}` : ""}
							{" · "}Updated {formatDate(save.updatedAt)}
							{" · "}
							{save.versionCount} version{save.versionCount !== 1 ? "s" : ""}
						</p>
					</div>
					<div className="d-flex gap-2 ms-3 flex-shrink-0">
						<button
							className="btn btn-sm btn-outline-primary"
							onClick={download}
							disabled={downloading}
						>
							{downloading ? "Downloading…" : "Download"}
						</button>
						{lid !== undefined ? (
							isLinked ? (
								<button
									className="btn btn-sm btn-success"
									onClick={unlinkSave}
									disabled={linking}
									title="Disable auto-save for current league"
								>
									{linking ? "…" : "Auto-save: On"}
								</button>
							) : (
								<button
									className="btn btn-sm btn-outline-secondary"
									onClick={linkSave}
									disabled={linking}
									title="Enable auto-save for current league"
								>
									{linking ? "…" : "Auto-save: Off"}
								</button>
							)
						) : null}
						<button
							className="btn btn-sm btn-outline-secondary"
							onClick={() => setShowVersions((v) => !v)}
						>
							{showVersions ? "Hide versions" : "Versions"}
						</button>
						<button
							className="btn btn-sm btn-outline-danger"
							onClick={deleteSave}
							disabled={deleting}
						>
							{deleting ? "Deleting…" : "Delete"}
						</button>
					</div>
				</div>
				{showVersions ? (
					<VersionHistory saveId={save.id} onRestored={onRestored} />
				) : null}
			</div>
		</div>
	);
};

const UploadForm = ({
	onUploaded,
}: {
	onUploaded: (save: CloudSaveEntry) => void;
}) => {
	const [name, setName] = useState("");
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const fileRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && !name) {
			setName(file.name.replace(/\.json$/i, ""));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const file = fileRef.current?.files?.[0];
		if (!file) return;

		setUploading(true);
		setError(undefined);

		try {
			const text = await file.text();

			let sport = process.env.SPORT ?? "";
			let season: number | null = null;
			let teamName: string | null = null;

			try {
				const parsed = JSON.parse(text);
				const attrs: { key: string; value: unknown }[] =
					parsed.gameAttributes ?? [];
				for (const { key, value } of attrs) {
					if (key === "season" && typeof value === "number") season = value;
					if (key === "teamName" && typeof value === "string") teamName = value;
				}
			} catch {
				// Ignore parse errors — still upload with defaults
			}

			const accessToken = await getAccessToken();
			const formData = new FormData();
			formData.append("name", name);
			formData.append("sport", sport);
			if (season !== null) formData.append("season", String(season));
			if (teamName !== null) formData.append("teamName", teamName);
			formData.append("data", text);

			const response = await fetch(`${ACCOUNT_API_URL}/saves`, {
				method: "POST",
				headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
				body: formData,
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error ?? "Upload failed");
			}

			const { id } = await response.json();
			onUploaded({
				id,
				name,
				sport,
				season,
				teamName,
				updatedAt: Math.floor(Date.now() / 1000),
				versionCount: 1,
			});
			setName("");
			if (fileRef.current) fileRef.current.value = "";
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="card mb-4">
			<div className="card-body">
				<h5 className="card-title">Upload Save</h5>
				<p className="text-muted small">
					Export a league from <b>Tools → Export League</b>, then upload the
					JSON file here.
				</p>
				<form onSubmit={handleSubmit}>
					<div className="row g-2 align-items-end">
						<div className="col-sm-4">
							<label className="form-label small">Save name</label>
							<input
								className="form-control form-control-sm"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="My League 2031"
								required
							/>
						</div>
						<div className="col-sm-5">
							<label className="form-label small">League JSON file</label>
							<input
								ref={fileRef}
								className="form-control form-control-sm"
								type="file"
								accept=".json,application/json"
								onChange={handleFileChange}
								required
							/>
						</div>
						<div className="col-sm-3">
							<button
								className="btn btn-sm btn-primary w-100"
								type="submit"
								disabled={uploading}
							>
								{uploading ? "Uploading…" : "Upload"}
							</button>
						</div>
					</div>
					{error ? (
						<p className="text-danger mt-2 mb-0 small">{error}</p>
					) : null}
				</form>
			</div>
		</div>
	);
};

const CloudSaves = ({ loggedIn, username }: View<"cloudSaves">) => {
	useTitleBar({ title: "Cloud Saves", hideNewWindow: true });

	const { lid } = useLocal(["lid"]);
	const [saves, setSaves] = useState<CloudSaveEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState<string | undefined>();
	const [linkedSaveId, setLinkedSaveId] = useState<string | null | undefined>(
		undefined,
	);

	useEffect(() => {
		if (!loggedIn || lid === undefined) {
			setLinkedSaveId(null);
			return;
		}
		const fetchLink = async () => {
			const accessToken = await getAccessToken();
			if (!accessToken) return;
			const response = await fetch(`${ACCOUNT_API_URL}/saves/link/${lid}`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (response.ok) {
				const data = await response.json();
				setLinkedSaveId((data as { saveId: string | null }).saveId ?? null);
			} else {
				setLinkedSaveId(null);
			}
		};
		fetchLink();
	}, [loggedIn, lid]);

	const fetchSaves = async () => {
		setLoading(true);
		setFetchError(undefined);
		try {
			const accessToken = await getAccessToken();
			if (!accessToken) {
				setLoading(false);
				return;
			}
			const response = await fetch(`${ACCOUNT_API_URL}/saves`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (!response.ok) throw new Error("Failed to load saves");
			setSaves(await response.json());
		} catch {
			setFetchError("Failed to load cloud saves. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (loggedIn) {
			fetchSaves();
		} else {
			setLoading(false);
		}
	}, [loggedIn]);

	if (!loggedIn) {
		return (
			<p>
				You must{" "}
				<a href="/account/login_or_register">log in or create an account</a> to
				use cloud saves.
			</p>
		);
	}

	return (
		<>
			<p className="text-muted">
				Logged in as <b>{username}</b>. Cloud saves are stored on the{" "}
				{GAME_NAME} servers and can be restored from any device.
			</p>

			<UploadForm onUploaded={(save) => setSaves((prev) => [save, ...prev])} />

			{loading ? (
				<p>Loading…</p>
			) : fetchError ? (
				<p className="text-danger">{fetchError}</p>
			) : saves.length === 0 ? (
				<p className="text-muted">No cloud saves yet. Upload one above.</p>
			) : (
				<>
					<h4 className="mb-3">Your Saves ({saves.length})</h4>
					{saves.map((save) => (
						<SaveCard
							key={save.id}
							save={save}
							lid={lid}
							linkedSaveId={linkedSaveId}
							onDeleted={(id) =>
								setSaves((prev) => prev.filter((s) => s.id !== id))
							}
							onRestored={fetchSaves}
							onLinkChanged={setLinkedSaveId}
						/>
					))}
				</>
			)}
		</>
	);
};

export default CloudSaves;
