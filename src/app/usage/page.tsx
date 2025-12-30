'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUsage } from '@/hooks/useUsage';
import { useSettings } from '@/hooks/useSettings';
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
  resetLabel: string;
  usedLabel: string;
  utilizationLabel: string;
}

interface ExtraUsageCardProps {
  extraUsage: ExtraUsage;
  translations: {
    title: string;
    description: string;
    usedLimit: string;
    status: string;
    enabled: string;
    disabled: string;
  };
}

function formatResetTime(isoString: string | null, locale: string): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString(locale, {
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

function UsageMetricCard({ title, description, utilization, resetsAt, resetLabel, usedLabel, utilizationLabel }: UsageMetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{utilizationLabel}</span>
          <span className="font-medium">{usedLabel}</span>
        </div>
        <Progress
          value={utilization}
          className="h-3"
          indicatorClassName={getProgressColor(utilization)}
        />
        {resetsAt && (
          <p className="text-xs text-muted-foreground">
            {resetLabel}: {resetsAt}
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

function ExtraUsageCard({ extraUsage, translations }: ExtraUsageCardProps) {
  const utilization = extraUsage.monthly_limit > 0
    ? (extraUsage.used_credits / extraUsage.monthly_limit) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{translations.usedLimit}</span>
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
          {translations.status}: {extraUsage.is_enabled ? translations.enabled : translations.disabled}
        </p>
      </CardContent>
    </Card>
  );
}

export default function UsagePage() {
  const t = useTranslations('usage');
  const router = useRouter();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const { usage, isLoading, error, refetch } = useUsage();

  const showUsage = settings?.danger?.showUsage ?? false;

  // Get locale for date formatting
  const locale = settings?.general?.language === 'zh' ? 'zh-CN' : settings?.general?.language === 'en' ? 'en-US' : 'ja-JP';

  // Redirect to settings page if showUsage is disabled
  useEffect(() => {
    if (!isSettingsLoading && !showUsage) {
      router.replace('/settings/danger');
    }
  }, [isSettingsLoading, showUsage, router]);

  // Show loading while checking settings
  if (isSettingsLoading || !showUsage) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          <UsageMetricSkeleton />
          <UsageMetricSkeleton />
        </div>
      </div>
    );
  }

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
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to get formatted used label
  const getUsedLabel = (value: number) => t('used', { value: value.toFixed(0) });

  // Extra credits translations
  const extraCreditsTranslations = {
    title: t('extraCredits.title'),
    description: t('extraCredits.description'),
    usedLimit: t('extraCredits.usedLimit'),
    status: t('extraCredits.status'),
    enabled: t('extraCredits.enabled'),
    disabled: t('extraCredits.disabled'),
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('overview')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('overviewDescription')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
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
              title={t('fiveHour.title')}
              description={t('fiveHour.description')}
              utilization={usage.five_hour.utilization}
              resetsAt={formatResetTime(usage.five_hour.resets_at, locale)}
              resetLabel={t('reset')}
              usedLabel={getUsedLabel(usage.five_hour.utilization)}
              utilizationLabel={t('utilization')}
            />
          )}
          {usage.seven_day && (
            <UsageMetricCard
              title={t('sevenDay.title')}
              description={t('sevenDay.description')}
              utilization={usage.seven_day.utilization}
              resetsAt={formatResetTime(usage.seven_day.resets_at, locale)}
              resetLabel={t('reset')}
              usedLabel={getUsedLabel(usage.seven_day.utilization)}
              utilizationLabel={t('utilization')}
            />
          )}
          {usage.seven_day_sonnet && (
            <UsageMetricCard
              title={t('sevenDaySonnet.title')}
              description={t('sevenDaySonnet.description')}
              utilization={usage.seven_day_sonnet.utilization}
              resetsAt={formatResetTime(usage.seven_day_sonnet.resets_at, locale)}
              resetLabel={t('reset')}
              usedLabel={getUsedLabel(usage.seven_day_sonnet.utilization)}
              utilizationLabel={t('utilization')}
            />
          )}
          {usage.seven_day_opus && (
            <UsageMetricCard
              title={t('sevenDayOpus.title')}
              description={t('sevenDayOpus.description')}
              utilization={usage.seven_day_opus.utilization}
              resetsAt={formatResetTime(usage.seven_day_opus.resets_at, locale)}
              resetLabel={t('reset')}
              usedLabel={getUsedLabel(usage.seven_day_opus.utilization)}
              utilizationLabel={t('utilization')}
            />
          )}
          {usage.extra_usage && usage.extra_usage.is_enabled && (
            <ExtraUsageCard extraUsage={usage.extra_usage} translations={extraCreditsTranslations} />
          )}
        </div>
      ) : null}
    </div>
  );
}
