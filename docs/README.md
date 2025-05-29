# RBS陸上教室システム リファクタリング後の構造

## 📁 新しいディレクトリ構造

```
src/public/js/
├── app/                          # アプリケーションコア
│   ├── Application.js           # メインアプリケーションクラス
│   ├── Router.js               # ルーティング
│   ├── index.js                # インデックスページ
│   └── index-main.js           # インデックスページ詳細実装
│
├── modules/                     # 機能別モジュール
│   ├── admin/                  # 管理機能
│   │   ├── actions/           # アクション処理
│   │   ├── core/              # コア機能
│   │   │   ├── AdminCore.js   # 管理コア
│   │   │   ├── UIManager.js   # UI管理
│   │   │   └── DataManager.js # データ管理
│   │   ├── forms/             # フォーム管理
│   │   ├── utils/             # ユーティリティ
│   │   └── admin.js           # 管理画面エントリーポイント
│   │
│   ├── auth/                   # 認証機能
│   │   └── AdminAuth.js       # 管理者認証
│   │
│   └── news/                  # ニュース機能
│       ├── article-service.js # 記事サービス
│       ├── news.js           # ニュース一覧
│       └── news-detail.js    # ニュース詳細
│
└── shared/                     # 共通機能
    ├── base/                  # 基底クラス
    ├── components/            # 共通コンポーネント
    │   ├── business/         # ビジネスロジック系
    │   ├── layout/           # レイアウト系
    │   ├── ui/               # UI系
    │   └── BaseComponent.js  # 基底コンポーネント
    ├── constants/             # 定数・設定
    │   └── config.js         # アプリケーション設定
    ├── services/              # 共通サービス
    │   ├── EventBus.js       # イベントバス
    │   ├── StorageService.js # ストレージ
    │   └── lesson-status-manager.js # レッスン状況管理
    ├── utils/                 # ユーティリティ
    │   └── helpers.js        # ヘルパー関数
    └── ModuleLoader.js        # モジュールローダー
```

## 🎯 モジュール分割の方針

### app/
- アプリケーションの起動・初期化
- ルーティング
- ページ固有の処理

### modules/
- **admin/**: 管理画面関連の全機能（core、actions、forms、utils）
- **auth/**: 認証・認可機能
- **news/**: ニュース・記事関連機能

### shared/
- **constants/**: 設定値・定数
- **services/**: 複数モジュールで使用するサービス
- **components/**: 再利用可能なコンポーネント
- **utils/**: 汎用的なユーティリティ関数

## 📝 リファクタリングで実施したこと

### ✅ 統合・削除
- 重複するファイルの統合
- 古い/未使用ファイルの削除
- 機能の重複排除
- 空のcontentモジュールの削除

### ✅ 構造化
- 機能別モジュール分割
- 共通機能の shared への集約
- import文の最適化

### ✅ 最適化
- ファイル配置の論理的整理
- 依存関係の明確化
- メンテナンス性の向上

## 🔄 import文の更新

リファクタリングに伴い、以下のファイルのimport文が更新されました：

- `app/Application.js`: config.jsパスの更新
- `modules/admin/core/AdminCore.js`: AdminAuth.jsパスの更新

## 📊 最終的なファイル統計

- **総ファイル数**: 30個のJavaScriptファイル
- **モジュール構成**: 3つのメインモジュール（admin、auth、news）
- **共通機能**: sharedディレクトリに集約
- **重複ファイル**: すべて解決済み

## 🚀 次のステップ

1. **テストの追加**: 各モジュールのユニットテスト
2. **ドキュメントの充実**: 各モジュールのAPI文書化
3. **パフォーマンス最適化**: 遅延読み込みの実装
4. **新機能追加**: 必要に応じてcontentモジュールの追加 