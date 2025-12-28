'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { optimizeImage, isValidImageUrl } from '@/lib/image-utils';
import {
  Bot,
  Brain,
  Code,
  Sparkles,
  Wand2,
  MessageCircle,
  Zap,
  Star,
  Lightbulb,
  BookOpen,
  FileCode,
  Shield,
  Target,
  Rocket,
  ImagePlus,
  X,
  Loader2,
} from 'lucide-react';

interface IconPickerProps {
  value: string;
  color: string;
  imageUrl?: string;
  onChange: (icon: string, color: string, imageUrl?: string) => void;
  disabled?: boolean;
}

const ICONS = [
  { name: 'bot', Icon: Bot },
  { name: 'brain', Icon: Brain },
  { name: 'code', Icon: Code },
  { name: 'sparkles', Icon: Sparkles },
  { name: 'wand', Icon: Wand2 },
  { name: 'message', Icon: MessageCircle },
  { name: 'zap', Icon: Zap },
  { name: 'star', Icon: Star },
  { name: 'lightbulb', Icon: Lightbulb },
  { name: 'book', Icon: BookOpen },
  { name: 'file-code', Icon: FileCode },
  { name: 'shield', Icon: Shield },
  { name: 'target', Icon: Target },
  { name: 'rocket', Icon: Rocket },
];

const COLORS = [
  { name: 'text-primary', label: 'Primary', bg: 'bg-primary' },
  { name: 'text-blue-500', label: 'Blue', bg: 'bg-blue-500' },
  { name: 'text-green-500', label: 'Green', bg: 'bg-green-500' },
  { name: 'text-yellow-500', label: 'Yellow', bg: 'bg-yellow-500' },
  { name: 'text-orange-500', label: 'Orange', bg: 'bg-orange-500' },
  { name: 'text-red-500', label: 'Red', bg: 'bg-red-500' },
  { name: 'text-purple-500', label: 'Purple', bg: 'bg-purple-500' },
  { name: 'text-pink-500', label: 'Pink', bg: 'bg-pink-500' },
];

export function IconPicker({
  value,
  color,
  imageUrl,
  onChange,
  disabled = false,
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedIcon = ICONS.find((i) => i.name === value) ?? ICONS[0];
  const selectedColor = COLORS.find((c) => c.name === color) ?? COLORS[0];
  const IconComponent = selectedIcon.Icon;

  const hasValidImage = imageUrl && isValidImageUrl(imageUrl) && !imageError;
  const activeTab = hasValidImage ? 'image' : 'icon';

  const handleIconChange = (newIcon: string, newColor: string) => {
    onChange(newIcon, newColor, undefined);
    setImageError(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const optimizedDataUrl = await optimizeImage(file, 128, 0.85);
      onChange(value, color, optimizedDataUrl);
      setImageError(false);
    } catch (error) {
      console.error('Failed to optimize image:', error);
      setImageError(true);
    } finally {
      setIsUploading(false);
      // ファイル入力をリセット（同じファイルを再選択可能に）
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearImage = () => {
    onChange(value, color, undefined);
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-3"
          disabled={disabled}
        >
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 overflow-hidden'
            )}
          >
            {hasValidImage ? (
              <Image
                src={imageUrl}
                alt="Icon"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                onError={handleImageError}
                unoptimized
              />
            ) : (
              <IconComponent className={cn('h-4 w-4', selectedColor.name)} />
            )}
          </div>
          <span className="text-sm">
            {hasValidImage
              ? '画像アイコン'
              : `${selectedIcon.name} / ${selectedColor.label}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <Tabs defaultValue={activeTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="icon">アイコン</TabsTrigger>
            <TabsTrigger value="image">画像</TabsTrigger>
          </TabsList>
          <TabsContent value="icon" className="space-y-4 pt-4">
            <div>
              <h4 className="text-sm font-medium mb-2">アイコン</h4>
              <div className="grid grid-cols-7 gap-1">
                {ICONS.map(({ name, Icon }) => (
                  <Button
                    key={name}
                    type="button"
                    variant={value === name && !hasValidImage ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleIconChange(name, color)}
                  >
                    <Icon className={cn('h-4 w-4', selectedColor.name)} />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">色</h4>
              <div className="flex gap-1">
                {COLORS.map(({ name, label, bg }) => (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      bg,
                      color === name
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    )}
                    onClick={() => handleIconChange(value, name)}
                    title={label}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="image" className="space-y-4 pt-4">
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={disabled || isUploading}
                className="hidden"
                id="icon-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    画像を選択
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF, WebP形式に対応（128pxに最適化）
              </p>
            </div>
            {hasValidImage && (
              <div className="space-y-3">
                <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-background ring-2 ring-border">
                    <Image
                      src={imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      onError={handleImageError}
                      unoptimized
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleClearImage}
                >
                  <X className="h-4 w-4 mr-2" />
                  画像を削除してアイコンに戻す
                </Button>
              </div>
            )}
            {imageError && (
              <p className="text-xs text-destructive text-center">
                画像を読み込めませんでした
              </p>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
