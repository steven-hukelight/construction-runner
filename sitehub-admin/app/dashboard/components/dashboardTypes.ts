export type TimestampLike = string | { toDate?: () => Date } | Date | number | null | undefined;

export interface DashboardDataSite {
  id: string;
  name?: string;
  created_at?: TimestampLike;
  createdAt?: TimestampLike;
}

export interface DashboardDataRams {
  id: string;
  title?: string;
  status?: string;
  created_at?: TimestampLike;
  createdAt?: TimestampLike;
}

export interface DashboardDataUser {
  id: string;
  name?: string;
  display_name?: string;
  created_at?: TimestampLike;
  createdAt?: TimestampLike;
}

export interface DashboardDataTask {
  id: string;
  status?: string;
  created_at?: TimestampLike;
  createdAt?: TimestampLike;
}
