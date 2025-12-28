'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CsvPreviewProps {
  content: string;
  className?: string;
}

interface ParsedCsv {
  headers: string[];
  rows: string[][];
  error: string | null;
}

function parseCsv(content: string): ParsedCsv {
  try {
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      return { headers: [], rows: [], error: null };
    }

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (inQuotes) {
          if (char === '"' && nextChar === '"') {
            current += '"';
            i++;
          } else if (char === '"') {
            inQuotes = false;
          } else {
            current += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
      }

      // クォートが閉じられていない場合はエラー
      if (inQuotes) {
        throw new Error('クォートが閉じられていません');
      }

      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);

    return { headers, rows, error: null };
  } catch (err) {
    return {
      headers: [],
      rows: [],
      error: err instanceof Error ? err.message : 'CSVの解析に失敗しました',
    };
  }
}

export function CsvPreview({ content, className }: CsvPreviewProps) {
  const { headers, rows, error } = useMemo(() => parseCsv(content), [content]);

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 px-4', className)}>
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive font-medium">CSVの解析に失敗しました</p>
        <pre className="mt-2 text-xs text-muted-foreground max-w-full overflow-auto whitespace-pre-wrap">
          {error}
        </pre>
      </div>
    );
  }

  if (headers.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-muted-foreground', className)}>
        <p className="text-sm">CSVデータがありません</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center bg-muted/50">#</TableHead>
            {headers.map((header, index) => (
              <TableHead key={index} className="bg-muted/50 font-semibold">
                {header || `列${index + 1}`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-muted/30">
              <TableCell className="text-center text-muted-foreground text-xs">
                {rowIndex + 1}
              </TableCell>
              {headers.map((_, colIndex) => (
                <TableCell key={colIndex} className="text-sm">
                  {row[colIndex] ?? ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-4 py-2 text-xs text-muted-foreground border-t">
        {rows.length} 行 × {headers.length} 列
      </div>
    </div>
  );
}
