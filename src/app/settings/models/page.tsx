'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCustomModels, useSupportedModels } from '@/hooks/useModels';
import { CustomModelForm } from '@/components/settings/CustomModelForm';
import { CustomModelCard } from '@/components/settings/CustomModelCard';
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
import type { CustomModel, CustomModelCreateRequest } from '@/types';

export default function ModelsSettingsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null);

  const {
    models: supportedModels,
    isLoading: isLoadingSupportedModels,
  } = useSupportedModels();

  const {
    models: customModels,
    isLoading: isLoadingCustomModels,
    createModel,
    isCreating: isCreatingModel,
    updateModel,
    isUpdating,
    deleteModel,
    isDeleting,
  } = useCustomModels();

  const isLoading = isLoadingSupportedModels || isLoadingCustomModels;
  const isMutating = isCreatingModel || isUpdating || isDeleting;

  const handleCreate = async (data: CustomModelCreateRequest) => {
    await createModel(data);
    setIsCreating(false);
  };

  const handleUpdate = async (data: CustomModelCreateRequest) => {
    if (!editingModel) return;
    await updateModel(editingModel.id, data);
    setEditingModel(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このカスタムモデルを削除してもよろしいですか？')) {
      await deleteModel(id);
    }
  };

  const handleToggleEnabled = async (model: CustomModel) => {
    await updateModel(model.id, { isEnabled: !model.isEnabled });
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
                カスタムモデル
              </CardTitle>
              <CardDescription>
                システムプロンプトを設定したカスタムモデルを作成・管理します。
              </CardDescription>
            </div>
            {!isCreating && !editingModel && (
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
                <CardTitle className="text-base">新規カスタムモデル</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomModelForm
                  supportedModels={supportedModels}
                  onSubmit={handleCreate}
                  onCancel={() => setIsCreating(false)}
                  disabled={isMutating}
                />
              </CardContent>
            </Card>
          )}

          {editingModel && (
            <Card className="border-dashed border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  モデルを編集: {editingModel.displayName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CustomModelForm
                  model={editingModel}
                  supportedModels={supportedModels}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingModel(null)}
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
          ) : customModels.length === 0 && !isCreating ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>カスタムモデルがまだありません。</p>
              <p className="text-sm mt-1">
                「新規作成」ボタンから作成してください。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customModels.map((model) => (
                <CustomModelCard
                  key={model.id}
                  model={model}
                  onEdit={() => setEditingModel(model)}
                  onDelete={() => handleDelete(model.id)}
                  onToggleEnabled={() => handleToggleEnabled(model)}
                  disabled={isMutating || !!editingModel}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            標準モデル
          </CardTitle>
          <CardDescription>
            利用可能な標準モデルの一覧です（読み取り専用）。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSupportedModels ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {supportedModels.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                >
                  <div>
                    <h4 className="font-medium">{model.displayName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {model.description}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                      {model.id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
