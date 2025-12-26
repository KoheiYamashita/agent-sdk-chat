'use client';

import { useUsage } from '@/hooks/useUsage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { ExtraUsage } from '@/types';

interface UsageMetricCardProps {
  title: string;
  description: string;
  utilization: number;
  resetsAt: string | null;
}

interface ExtraUsageCardProps {
  extraUsage: ExtraUsage;
}

function formatResetTime(isoString: string | null): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function getProgressColor(value: number): string {
  if (value >= 90) return 'bg-destructive';
  if (value >= 70) return 'bg-yellow-500';
  return 'bg-primary';
}

function UsageMetricCard({ title, description, utilization, resetsAt }: UsageMetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>使用率</span>
          <span className="font-medium">{utilization.toFixed(0)}% used</span>
        </div>
        <Progress
          value={utilization}
          className="h-3"
          indicatorClassName={getProgressColor(utilization)}
        />
        {resetsAt && (
          <p className="text-xs text-muted-foreground">
            リセット: {formatResetTime(resetsAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UsageMetricSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function ExtraUsageCard({ extraUsage }: ExtraUsageCardProps) {
  const utilization = extraUsage.monthly_limit > 0
    ? (extraUsage.used_credits / extraUsage.monthly_limit) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">追加クレジット</CardTitle>
        <CardDescription>月間追加クレジットの使用状況</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>使用済み / 月間上限</span>
          <span className="font-medium">
            ${(extraUsage.used_credits / 100).toFixed(2)} / ${(extraUsage.monthly_limit / 100).toFixed(2)}
          </span>
        </div>
        <Progress
          value={utilization}
          className="h-3"
          indicatorClassName={getProgressColor(utilization)}
        />
        <p className="text-xs text-muted-foreground">
          ステータス: {extraUsage.is_enabled ? '有効' : '無効'}
        </p>
      </CardContent>
    </Card>
  );
}

export default function UsagePage() {
  const { usage, isLoading, error, refetch } = useUsage();

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">使用量の概要</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Claude Codeの使用状況を確認できます
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <UsageMetricSkeleton />
          <UsageMetricSkeleton />
          <UsageMetricSkeleton />
        </div>
      ) : usage ? (
        <div className="space-y-4">
          {usage.five_hour && (
            <UsageMetricCard
              title="5時間セッション使用量"
              description="現在のセッションでの使用量（5時間ローリングウィンドウ）"
              utilization={usage.five_hour.utilization}
              resetsAt={usage.five_hour.resets_at}
            />
          )}
          {usage.seven_day && (
            <UsageMetricCard
              title="7日間 全モデル使用量"
              description="過去7日間の全モデル合計使用量"
              utilization={usage.seven_day.utilization}
              resetsAt={usage.seven_day.resets_at}
            />
          )}
          {usage.seven_day_sonnet && (
            <UsageMetricCard
              title="7日間 Sonnet使用量"
              description="過去7日間のSonnetモデル使用量"
              utilization={usage.seven_day_sonnet.utilization}
              resetsAt={usage.seven_day_sonnet.resets_at}
            />
          )}
          {usage.seven_day_opus && (
            <UsageMetricCard
              title="7日間 Opus使用量"
              description="過去7日間のOpusモデル使用量（Maxプラン向け）"
              utilization={usage.seven_day_opus.utilization}
              resetsAt={usage.seven_day_opus.resets_at}
            />
          )}
          {usage.extra_usage && usage.extra_usage.is_enabled && (
            <ExtraUsageCard extraUsage={usage.extra_usage} />
          )}
        </div>
      ) : null}
    </div>
  );
}
