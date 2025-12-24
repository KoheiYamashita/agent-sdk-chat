'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  BUILTIN_TOOLS,
  getToolsByCategory,
  type ToolDefinition,
} from '@/lib/constants/tools';

interface DefaultToolsCheckboxGroupProps {
  selectedTools: string[];
  onChange: (tools: string[]) => void;
  disabled?: boolean;
}

export function DefaultToolsCheckboxGroup({
  selectedTools,
  onChange,
  disabled = false,
}: DefaultToolsCheckboxGroupProps) {
  const handleToolToggle = (toolName: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedTools, toolName]);
    } else {
      onChange(selectedTools.filter((t) => t !== toolName));
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const categoryTools = BUILTIN_TOOLS.filter((t) => t.category === category).map(
      (t) => t.name
    );
    if (checked) {
      onChange([...new Set([...selectedTools, ...categoryTools])]);
    } else {
      onChange(selectedTools.filter((t) => !categoryTools.includes(t)));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onChange(BUILTIN_TOOLS.map((t) => t.name));
    } else {
      onChange([]);
    }
  };

  const toolsByCategory = getToolsByCategory();
  const allSelected = BUILTIN_TOOLS.every((t) => selectedTools.includes(t.name));
  const someSelected =
    BUILTIN_TOOLS.some((t) => selectedTools.includes(t.name)) && !allSelected;

  return (
    <div className="space-y-6">
      {/* Select All */}
      <div className="flex items-center space-x-2 pb-2 border-b">
        <Checkbox
          id="select-all-tools"
          checked={allSelected}
          ref={(el) => {
            if (el) {
              (el as unknown as HTMLButtonElement).dataset.state = someSelected
                ? 'indeterminate'
                : allSelected
                  ? 'checked'
                  : 'unchecked';
            }
          }}
          onCheckedChange={(checked) => handleSelectAll(!!checked)}
          disabled={disabled}
        />
        <Label htmlFor="select-all-tools" className="font-medium cursor-pointer">
          すべて選択
        </Label>
      </div>

      {/* Category Groups */}
      {toolsByCategory.map(({ category, label, tools }) => {
        const categoryAllSelected = tools.every((t) =>
          selectedTools.includes(t.name)
        );
        const categorySomeSelected =
          tools.some((t) => selectedTools.includes(t.name)) && !categoryAllSelected;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={categoryAllSelected}
                ref={(el) => {
                  if (el) {
                    (el as unknown as HTMLButtonElement).dataset.state =
                      categorySomeSelected
                        ? 'indeterminate'
                        : categoryAllSelected
                          ? 'checked'
                          : 'unchecked';
                  }
                }}
                onCheckedChange={(checked) =>
                  handleCategoryToggle(category, !!checked)
                }
                disabled={disabled}
              />
              <Label
                htmlFor={`category-${category}`}
                className="font-medium cursor-pointer"
              >
                {label}
              </Label>
            </div>
            <div className="ml-6 space-y-2">
              {tools.map((tool) => (
                <ToolCheckboxItem
                  key={tool.name}
                  tool={tool}
                  checked={selectedTools.includes(tool.name)}
                  onCheckedChange={(checked) => handleToolToggle(tool.name, checked)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ToolCheckboxItem({
  tool,
  checked,
  onCheckedChange,
  disabled,
}: {
  tool: ToolDefinition;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start space-x-3">
      <Checkbox
        id={`tool-${tool.name}`}
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(!!c)}
        disabled={disabled}
      />
      <Label htmlFor={`tool-${tool.name}`} className="flex-1 cursor-pointer">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{tool.displayName}</span>
          {tool.isDangerous && (
            <Badge variant="destructive" className="text-xs py-0">
              注意
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{tool.description}</p>
      </Label>
    </div>
  );
}
