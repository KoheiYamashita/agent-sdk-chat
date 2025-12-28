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

## 注意事項

- 設定変更は`useSettings`フック経由でAPIに保存されます
- カスタムモデルは`/api/models/custom`で管理されます
