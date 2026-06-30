import { useState, useId } from "react";
import { LEAGUE_DATABASE_VERSION } from "../../../common/constants.ts";
import simpleGameAttributesUpgrade from "../../../common/simpleGameAttributesUpgrade.ts";
import { ProgressBarText } from "../../components/ProgressBarText.tsx";
import { type LeagueFileUploadOutput } from "../../components/LeagueFileUpload.tsx";
import { localActions, useLocal } from "../../util/local.ts";
import { toWorker } from "../../util/toWorker.ts";

type CommunityRoster = {
	id: string;
	name: string;
	description: string;
	url: string;
};

const COMMUNITY_ROSTERS: CommunityRoster[] = [
	{
		id: "euroleague-2025-26",
		name: "EuroLeague 2025-26",
		description: "EuroLeague rosters by TheOfficialKG7",
		url: "https://raw.githubusercontent.com/TheOfficialKG7/BBGM-Euroleague-Rosters/main/Euroleague_2025-26.json",
	},
	{
		id: "nba-2020-21",
		name: "NBA 2020-21",
		description: "Historical NBA rosters by alexnoob",
		url: "https://raw.githubusercontent.com/alexnoob/BasketBall-GM-Rosters/main/2020-21.NBA.Roster.json",
	},
	{
		id: "nba-2019-20",
		name: "NBA 2019-20",
		description: "Historical NBA rosters by alexnoob",
		url: "https://raw.githubusercontent.com/alexnoob/BasketBall-GM-Rosters/main/2019-20.NBA.Roster.json",
	},
	{
		id: "nba-2018-19",
		name: "NBA 2018-19",
		description: "Historical NBA rosters by alexnoob",
		url: "https://raw.githubusercontent.com/alexnoob/BasketBall-GM-Rosters/main/2018-19.NBA.Roster.json",
	},
];

const CommunityRostersPanel = ({
	onLoading,
	onDone,
}: {
	onLoading: () => void;
	onDone: (output: Error | LeagueFileUploadOutput) => void;
}) => {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const leagueCreationID = useId();
	const { leagueCreation, leagueCreationPercent } = useLocal([
		"leagueCreation",
		"leagueCreationPercent",
	]);

	const handleLoad = async () => {
		const roster = COMMUNITY_ROSTERS.find((r) => r.id === selectedId);
		if (!roster) return;

		setLoading(true);
		setError(null);
		onLoading();

		try {
			const { basicInfo } = await toWorker("leagueFileUpload", "initialCheck", {
				file: roster.url,
				leagueCreationID,
			});

			if (basicInfo?.gameAttributes) {
				simpleGameAttributesUpgrade(
					basicInfo.gameAttributes,
					basicInfo.version,
				);
			}

			if (
				basicInfo?.version !== undefined &&
				basicInfo.version > LEAGUE_DATABASE_VERSION
			) {
				const err = new Error(
					`Roster file format (v${basicInfo.version}) is newer than this version of the game supports (v${LEAGUE_DATABASE_VERSION}).`,
				);
				setError(err.message);
				onDone(err);
				return;
			}

			localActions.update({
				leagueCreation: undefined,
				leagueCreationPercent: undefined,
			});

			await onDone({ basicInfo, url: roster.url });
		} catch (err) {
			const e = err instanceof Error ? err : new Error("Failed to load roster");
			setError(e.message);
			onDone(e);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<div className="list-group mb-3">
				{COMMUNITY_ROSTERS.map((roster) => (
					<button
						key={roster.id}
						type="button"
						className={`list-group-item list-group-item-action${selectedId === roster.id ? " active" : ""}`}
						onClick={() => setSelectedId(roster.id)}
					>
						<div className="fw-bold">{roster.name}</div>
						<small className={selectedId === roster.id ? "" : "text-muted"}>
							{roster.description}
						</small>
					</button>
				))}
			</div>
			<button
				className="btn btn-primary"
				type="button"
				onClick={handleLoad}
				disabled={!selectedId || loading}
			>
				{loading ? "Loading…" : "Load Roster"}
			</button>
			{loading ? (
				<div className="alert alert-info mt-3" style={{ maxWidth: 400 }}>
					{leagueCreationPercent?.id === leagueCreationID ||
					leagueCreation?.id === leagueCreationID ? (
						<ProgressBarText
							text={`Validating ${leagueCreation?.status ?? "league file"}…`}
							percent={leagueCreationPercent?.percent ?? 0}
						/>
					) : (
						"Fetching roster…"
					)}
				</div>
			) : null}
			{error ? <p className="alert alert-danger mt-3">Error: {error}</p> : null}
		</div>
	);
};

export default CommunityRostersPanel;
