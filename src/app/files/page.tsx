'use client';

import { Suspense, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  FilePlus,
  FolderPlus,
  Upload,
  Loader2,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FileBrowserTree } from '@/components/workspace/FileBrowserTree';
import { FilePreview } from '@/components/workspace/FilePreview';
import type { DirectoryItem } from '@/types';

function FilesPageContent() {
  const t = useTranslations('files');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const workspacePath = searchParams.get('workspace') || undefined;
  const [selectedItem, setSelectedItem] = useState<DirectoryItem | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isTreeOpen, setIsTreeOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get parent path for new file/folder
  const getParentPath = useCallback(() => {
    if (!selectedItem) return '.';
    if (selectedItem.isDirectory) return selectedItem.path;
    // If file is selected, use its parent directory
    const parts = selectedItem.path.split('/');
    parts.pop();
    return parts.length > 0 ? parts.join('/') : '.';
  }, [selectedItem]);

  // Create file or folder
  const handleCreate = useCallback(async (isDirectory: boolean) => {
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/workspace/file/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPath: getParentPath(),
          name: newName.trim(),
          isDirectory,
          workspacePath,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create');
      }
      setNewName('');
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to create:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newName, getParentPath, workspacePath]);

  // Handle file upload
  const handleUpload = useCallback(async (files: FileList) => {
    const formData = new FormData();
    formData.append('path', getParentPath());
    if (workspacePath) formData.append('workspacePath', workspacePath);
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/workspace/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload');
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [getParentPath, workspacePath]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleUpload]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 pb-3 border-b mb-3">
        {isCreatingFile || isCreatingFolder ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={isCreatingFolder ? t('folderName') : t('fileName')}
              className="h-8 text-sm max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate(isCreatingFolder);
                } else if (e.key === 'Escape') {
                  setIsCreatingFile(false);
                  setIsCreatingFolder(false);
                  setNewName('');
                }
              }}
              disabled={isSubmitting}
            />
            <Button
              size="sm"
              className="h-8"
              onClick={() => handleCreate(isCreatingFolder)}
              disabled={!newName.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                tCommon('create')
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
                setNewName('');
              }}
            >
              {tCommon('cancel')}
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setIsCreatingFile(true)}
            >
              <FilePlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('newFile')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setIsCreatingFolder(true)}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('newFolder')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{t('upload')}</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setIsTreeOpen(!isTreeOpen)}
            >
              {isTreeOpen ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeft className="h-3.5 w-3.5" />
              )}
            </Button>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 border rounded-lg overflow-hidden">
        {/* File tree */}
        {isTreeOpen && (
          <>
            <div className="w-64 border-r flex-shrink-0 overflow-auto">
              <FileBrowserTree
                selectedItem={selectedItem}
                onSelect={setSelectedItem}
                onRefresh={handleRefresh}
                className="h-full"
                refreshKey={refreshKey}
                workspacePath={workspacePath}
              />
            </div>
            <Separator orientation="vertical" />
          </>
        )}

        {/* Preview pane */}
        <div className="flex-1 min-w-0 overflow-auto">
          <FilePreview
            item={selectedItem}
            onClose={handleClosePreview}
            workspacePath={workspacePath}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

function FilesPageFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<FilesPageFallback />}>
      <FilesPageContent />
    </Suspense>
  );
}
