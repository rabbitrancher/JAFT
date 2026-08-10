import type { AccountType, AccountId } from "../accounts";
import type {
	DataPoint,
	TimeRange,
	AccountSeries,
	AccountTypeSeries,
	CategoryPoint,
} from "./types";

export type NetWorthChartProps = {
	points: DataPoint[];
	timeRange?: TimeRange;
	accountSeries?: AccountSeries[] | null;
	accountTypeSeries?: AccountTypeSeries[] | null;
	byTypePerAccount?: Record<AccountType, Record<AccountId, DataPoint[]>> | null;
	selectedAccountType?: AccountType | null;
};

export type CategoryChartProps = {
	points: CategoryPoint[];
	timeRange?: TimeRange;
};
