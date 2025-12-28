'use client';

/**
 * 画像を最適化（リサイズ・圧縮）してBase64 data URLを返す
 * @param file アップロードされたファイル
 * @param maxSize 最大サイズ（ピクセル）- デフォルト128px
 * @param quality 圧縮品質（0-1）- デフォルト0.8
 * @returns 最適化されたBase64 data URL
 */
export function optimizeImage(
  file: File,
  maxSize: number = 128,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // リサイズ計算
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        // Canvasで描画・圧縮
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 高品質なリサイズのための設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // PNG形式の場合はそのまま、それ以外はWebPまたはJPEGに変換
        let outputFormat = 'image/webp';
        let outputQuality = quality;

        // WebP非対応ブラウザ用のフォールバック
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        if (!testCanvas.toDataURL('image/webp').startsWith('data:image/webp')) {
          outputFormat = 'image/jpeg';
        }

        // 透過PNGの場合はPNGを維持
        if (file.type === 'image/png') {
          // 透過があるかチェック
          const imageData = ctx.getImageData(0, 0, width, height);
          const hasAlpha = imageData.data.some((_, i) => i % 4 === 3 && imageData.data[i] < 255);
          if (hasAlpha) {
            outputFormat = 'image/png';
            outputQuality = 1; // PNGは品質パラメータを使わない
          }
        }

        const dataUrl = canvas.toDataURL(outputFormat, outputQuality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 画像URLが有効かどうかを検証
 * data: URLまたはhttps: URLのみ許可
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
