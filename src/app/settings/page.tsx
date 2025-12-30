'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Settings,
  MessageSquare,
  FolderCog,
  Palette,
  Bot,
  Wand2,
  Shield,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SettingsCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  manageText: string;
  variant?: 'default' | 'danger';
}

function SettingsCard({ href, icon, title, description, manageText, variant = 'default' }: SettingsCardProps) {
  const isDanger = variant === 'danger';

  return (
    <Card className={isDanger
      ? "border-destructive/50 bg-destructive/5 hover:bg-destructive/10 transition-colors duration-300"
      : "bg-card/80 hover:bg-card transition-colors duration-300"
    }>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isDanger ? 'text-destructive' : ''}`}>
          {icon}
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className={`w-full justify-between ${isDanger ? 'border-destructive/30 hover:border-destructive/50' : ''}`}
          asChild
        >
          <Link href={href}>
            <div className="flex items-center gap-3">
              {icon}
              <span>{manageText}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SettingsCard
        href="/settings/general"
        icon={<Settings className="h-4 w-4 text-primary" />}
        title={t('general.title')}
        description={t('general.description')}
        manageText={t('general.manage')}
      />

      <SettingsCard
        href="/settings/chat"
        icon={<MessageSquare className="h-4 w-4 text-primary" />}
        title={t('chat.title')}
        description={t('chat.description')}
        manageText={t('chat.manage')}
      />

      <SettingsCard
        href="/settings/workspace"
        icon={<FolderCog className="h-4 w-4 text-primary" />}
        title={t('workspace.title')}
        description={t('workspace.description')}
        manageText={t('workspace.manage')}
      />

      <SettingsCard
        href="/settings/appearance"
        icon={<Palette className="h-4 w-4 text-primary" />}
        title={t('appearance.title')}
        description={t('appearance.description')}
        manageText={t('appearance.manage')}
      />

      <SettingsCard
        href="/settings/models"
        icon={<Bot className="h-4 w-4 text-primary" />}
        title={t('customModels.title')}
        description={t('customModels.description')}
        manageText={t('customModels.manage')}
      />

      <SettingsCard
        href="/settings/skills"
        icon={<Wand2 className="h-4 w-4 text-primary" />}
        title={t('skills.title')}
        description={t('skills.description')}
        manageText={t('skills.manage')}
      />

      <SettingsCard
        href="/settings/permissions"
        icon={<Shield className="h-4 w-4 text-primary" />}
        title={t('permissions.title')}
        description={t('permissions.description')}
        manageText={t('permissions.manage')}
      />

      <SettingsCard
        href="/settings/danger"
        icon={<AlertTriangle className="h-4 w-4" />}
        title={t('danger.title')}
        description={t('danger.description')}
        manageText={t('danger.manage')}
        variant="danger"
      />
    </div>
  );
}
