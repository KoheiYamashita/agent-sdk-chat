# src/components/settings/

設定画面に関するコンポーネントを格納しています。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `AppearanceSettingsForm.tsx` | 外観設定フォーム（ユーザー/Claudeアイコン、カラーテーマ） |
| `CustomModelCard.tsx` | カスタムモデルカード（一覧表示用） |
| `CustomModelForm.tsx` | カスタムモデル作成・編集フォーム |
| `IconPicker.tsx` | アイコン選択UI（Lucideアイコン、絵文字、画像URL） |
| `DefaultToolsCheckboxGroup.tsx` | デフォルト許可ツールのチェックボックス群 |
| `PermissionModeRadioGroup.tsx` | 権限モード選択（normal/auto）のラジオボタン |
| `SandboxSettingsForm.tsx` | サンドボックス設定フォーム |
| `SkillCard.tsx` | スキルカード（一覧表示用） |
| `SkillForm.tsx` | スキル作成・編集フォーム |
| `SkillSettingsEditor.tsx` | スキル設定エディター（モデル・セッション単位の有効/無効設定） |
| `TitleGenerationSettingsForm.tsx` | タイトル自動生成設定フォーム（有効/無効、モデル選択、プロンプト編集） |

## 注意事項

- 設定変更は`useSettings`フック経由でAPIに保存されます
- カスタムモデルは`/api/models/custom`で管理されます
- スキルは`/api/skills`で管理されます
