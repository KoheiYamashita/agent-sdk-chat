export interface UsageMetric {
  utilization: number;
  resets_at: string | null;
}

export interface ExtraUsage {
  is_enabled: boolean;
  monthly_limit: number;
  used_credits: number;
  utilization: number | null;
}

export interface UsageData {
  five_hour: UsageMetric | null;
  seven_day: UsageMetric | null;
  seven_day_opus: UsageMetric | null;
  seven_day_sonnet: UsageMetric | null;
  extra_usage: ExtraUsage | null;
}
