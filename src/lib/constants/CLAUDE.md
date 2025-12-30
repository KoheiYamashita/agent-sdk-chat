# src/lib/constants/

アプリケーション全体で使用する定数を定義しています。

## ファイル構成

- `tools.ts` - Claude SDKで使用可能なツールの定義（名前、説明、危険度フラグ）
- `title-generation.ts` - タイトル自動生成のデフォルト設定とプロンプトテンプレート
- `workspace-claude-md.ts` - ワークスペースに自動作成されるCLAUDE.mdのデフォルトテンプレート

## 注意事項

- ツールの追加・変更時は`tools.ts`を更新してください
- `dangerousTools`フラグは承認ワークフローに影響します
- `Skill`ツールは常に自動許可されます（スキル実行用）
- タイトル生成のプロンプト変更時は`title-generation.ts`を更新してください
