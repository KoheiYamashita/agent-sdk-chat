'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSkills } from '@/hooks/useSkills';
import { SkillForm } from '@/components/settings/SkillForm';
import { SkillCard } from '@/components/settings/SkillCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus } from 'lucide-react';
import type { Skill, SkillCreateRequest } from '@/types';

export default function SkillsSettingsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const {
    skills,
    isLoading,
    createSkill,
    isCreating: isCreatingSkill,
    updateSkill,
    isUpdating,
    deleteSkill,
    isDeleting,
  } = useSkills();

  const isMutating = isCreatingSkill || isUpdating || isDeleting;

  const handleCreate = async (data: SkillCreateRequest) => {
    await createSkill(data);
    setIsCreating(false);
  };

  const handleUpdate = async (data: SkillCreateRequest) => {
    if (!editingSkill) return;
    await updateSkill(editingSkill.id, data);
    setEditingSkill(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このスキルを削除してもよろしいですか？')) {
      await deleteSkill(id);
    }
  };

  const handleToggleEnabled = async (skill: Skill) => {
    await updateSkill(skill.id, { isEnabled: !skill.isEnabled });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            設定に戻る
          </Link>
        </Button>
      </div>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
                Skills
              </CardTitle>
              <CardDescription>
                Claude Agent SDKのSkillsを管理します。Skillsは再利用可能な指示をClaudeに提供します。
              </CardDescription>
            </div>
            {!isCreating && !editingSkill && (
              <Button onClick={() => setIsCreating(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                新規作成
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCreating && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">新規Skill</CardTitle>
              </CardHeader>
              <CardContent>
                <SkillForm
                  onSubmit={handleCreate}
                  onCancel={() => setIsCreating(false)}
                  disabled={isMutating}
                />
              </CardContent>
            </Card>
          )}

          {editingSkill && (
            <Card className="border-dashed border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Skillを編集: {editingSkill.displayName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillForm
                  skill={editingSkill}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingSkill(null)}
                  disabled={isMutating}
                />
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : skills.length === 0 && !isCreating ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Skillがまだありません。</p>
              <p className="text-sm mt-1">
                「新規作成」ボタンから作成してください。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onEdit={() => setEditingSkill(skill)}
                  onDelete={() => handleDelete(skill.id)}
                  onToggleEnabled={() => handleToggleEnabled(skill)}
                  disabled={isMutating || !!editingSkill}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
