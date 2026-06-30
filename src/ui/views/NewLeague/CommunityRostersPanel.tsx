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
	category: string;
};

const RAW =
	"https://raw.githubusercontent.com/alexnoob/BasketBall-GM-Rosters/master";
const REL =
	"https://github.com/alexnoob/BasketBall-GM-Rosters/releases/download";

const COMMUNITY_ROSTERS: CommunityRoster[] = [
	// NBA — recent seasons via release assets
	{
		id: "nba-2025-26",
		name: "2025-26 NBA",
		description: "by alexnoob",
		url: `${REL}/2026.0.7/2025-26.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2024-25",
		name: "2024-25 NBA",
		description: "by alexnoob",
		url: `${REL}/2025.0.1/2024-25.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2023-24",
		name: "2023-24 NBA",
		description: "by alexnoob",
		url: `${REL}/2024.0.1/2023-24.NBA.Roster.json`,
		category: "NBA",
	},
	// NBA — historical seasons from master branch
	{
		id: "nba-2020-21",
		name: "2020-21 NBA",
		description: "by alexnoob",
		url: `${RAW}/2020-21.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2019-20",
		name: "2019-20 NBA",
		description: "by alexnoob",
		url: `${RAW}/2019-20.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2018-19",
		name: "2018-19 NBA",
		description: "by alexnoob",
		url: `${RAW}/2018-19.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2017-18",
		name: "2017-18 NBA",
		description: "by alexnoob",
		url: `${RAW}/2017-18.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2016-17",
		name: "2016-17 NBA",
		description: "by alexnoob",
		url: `${RAW}/2016-17.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2015-16",
		name: "2015-16 NBA",
		description: "by alexnoob",
		url: `${RAW}/2015-16.NBA.Roster.json`,
		category: "NBA",
	},
	{
		id: "nba-2009-10",
		name: "2009-10 NBA",
		description: "by alexnoob",
		url: `${RAW}/2009-10%20Rosters.json`,
		category: "NBA",
	},
	{
		id: "nba-1995-96",
		name: "1995-96 NBA",
		description: "by alexnoob",
		url: `${RAW}/1995-96.NBA.Roster.json`,
		category: "NBA",
	},
	// G-League / D-League
	{
		id: "gleague-2018-19",
		name: "2018-19 G-League",
		description: "by alexnoob",
		url: `${RAW}/2018-19%20GLeague%20Roster.json`,
		category: "G-League",
	},
	{
		id: "dleague-2016-17",
		name: "2016-17 D-League",
		description: "by alexnoob",
		url: `${RAW}/2016-17.DLeague.Roster.json`,
		category: "G-League",
	},
	{
		id: "dleague-2001-02",
		name: "2001-02 NBA D-League",
		description: "by alexnoob",
		url: `${RAW}/2001-02.NBADLeague.json`,
		category: "G-League",
	},
	// EuroLeague
	{
		id: "euroleague-2025-26",
		name: "2025-26 EuroLeague",
		description: "by TheOfficialKG7",
		url: "https://raw.githubusercontent.com/TheOfficialKG7/BBGM-Euroleague-Rosters/main/Euroleague_2025-26.json",
		category: "EuroLeague",
	},
];

const CATEGORIES = Array.from(
	new Set(COMMUNITY_ROSTERS.map((r) => r.category)),
);

const CommunityRostersPanel = ({
	onLoading,
	onDone,
}: {
	onLoading: () => void;
	onDone: (output: Error | LeagueFileUploadOutput) => void;
}) => {
	const [category, setCategory] = useState(CATEGORIES[0]!);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const leagueCreationID = useId();
	const { leagueCreation, leagueCreationPercent } = useLocal([
		"leagueCreation",
		"leagueCreationPercent",
	]);

	const filtered = COMMUNITY_ROSTERS.filter((r) => r.category === category);

	const handleCategoryChange = (newCategory: string) => {
		setCategory(newCategory);
		setSelectedId(null);
	};

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
			<div className="mb-3">
				<label className="form-label small">League</label>
				<select
					className="form-select form-select-sm"
					value={category}
					onChange={(e) => handleCategoryChange(e.target.value)}
				>
					{CATEGORIES.map((cat) => (
						<option key={cat} value={cat}>
							{cat}
						</option>
					))}
				</select>
			</div>
			<div className="list-group mb-3">
				{filtered.map((roster) => (
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
