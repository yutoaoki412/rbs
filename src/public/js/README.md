# RBS JavaScript アーキテクチャ v2.0

## 概要

RBSアプリケーションのJavaScriptコードを、保守性、可読性、拡張性を重視して抜本的にリファクタリングしました。新しいアーキテクチャは、モジュラー設計、依存性注入、イベント駆動アーキテクチャを採用しています。

## フォルダ構成

```
js/
├── core/                    # コアシステム
│   ├── base/               # 基底クラス・抽象クラス
│   │   └── Component.js    # コンポーネント基底クラス
│   ├── events/             # イベント管理システム
│   │   └── EventBus.js     # イベントバス
│   ├── utils/              # 汎用ユーティリティ
│   │   └── helpers.js      # ヘルパー関数
│   ├── config/             # 設定管理
│   │   └── config.js       # アプリケーション設定
│   ├── Application.js      # アプリケーションメインクラス
│   └── ModuleLoader.js     # モジュールローダー
├── components/             # UIコンポーネント
│   ├── ui/                 # 基本UIコンポーネント
│   │   ├── NewsCard.js     # ニュースカード
│   │   └── UIInteractionManager.js # UI相互作用管理
│   ├── layout/             # レイアウトコンポーネント
│   └── business/           # ビジネスロジックコンポーネント
│       └── StatusBanner.js # ステータスバナー
├── services/               # ビジネスロジック・データ管理
│   ├── data/               # データ管理
│   ├── api/                # API関連
│   └── business/           # ビジネスロジック
│       └── lesson-status-manager.js # レッスンステータス管理
├── pages/                  # ページ固有のロジック
│   ├── index/              # トップページ
│   │   └── main.js         # インデックスページロジック
│   ├── news/               # ニュースページ
│   └── admin/              # 管理画面
├── shared/                 # 共有リソース
│   ├── constants/          # 定数
│   ├── types/              # 型定義（JSDoc用）
│   └── mixins/             # ミックスイン
├── index.js                # メインエントリーポイント
└── README.md               # このファイル
```

## 主要な改善点

### 1. アーキテクチャの改善

- **モジュラー設計**: 機能ごとに明確に分離
- **依存性注入**: コンポーネント間の疎結合を実現
- **イベント駆動**: EventBusによる統一されたイベント管理
- **基底クラス**: 共通機能の再利用とコードの統一

### 2. コード品質の向上

- **エラーハンドリング**: 包括的なエラー処理
- **型安全性**: JSDocによる型注釈
- **メモリ管理**: 適切なクリーンアップ処理
- **パフォーマンス**: 最適化されたイベント処理

### 3. 開発体験の向上

- **デバッグ機能**: 詳細なログとデバッグツール
- **ホットリロード対応**: 開発時の効率向上
- **モジュール管理**: 動的読み込みと依存関係管理

## 使用方法

### 基本的な使用方法

HTMLファイルでメインエントリーポイントを読み込むだけです：

```html
<script src="/src/public/js/index.js"></script>
```

### カスタムコンポーネントの作成

```javascript
class MyComponent extends Component {
  constructor(config = {}) {
    super(config);
  }
  
  doInit() {
    // 初期化処理
    this.element = this.createElement();
    this.setupEventListeners();
  }
  
  createElement() {
    const element = document.createElement('div');
    element.className = 'my-component';
    return element;
  }
  
  setupEventListeners() {
    this.addEventListener(this.element, 'click', () => {
      this.emit('myComponent:clicked');
    });
  }
}
```

### イベントの使用

```javascript
// イベントを発火
eventBus.emit('custom:event', { data: 'value' });

// イベントを監視
eventBus.on('custom:event', (data) => {
  console.log('イベント受信:', data);
});

// 一度だけ監視
eventBus.once('custom:event', (data) => {
  console.log('一度だけ実行:', data);
});
```

### モジュールの動的読み込み

```javascript
// 単一モジュール読み込み
await moduleLoader.load('components/ui/NewsCard');

// 複数モジュール読み込み
await moduleLoader.load([
  'components/ui/NewsCard',
  'components/business/StatusBanner'
]);

// 条件付き読み込み
await moduleLoader.loadIf('admin/AdminPanel', () => {
  return window.location.pathname.includes('admin');
});
```

## API リファレンス

### Component (基底クラス)

すべてのコンポーネントの基底クラス。

#### メソッド

- `init()`: コンポーネントを初期化
- `createElement()`: DOM要素を作成（サブクラスで実装）
- `addEventListener(target, event, handler)`: イベントリスナーを追加
- `emit(eventName, detail)`: カスタムイベントを発火
- `destroy()`: コンポーネントを破棄

### EventBus

アプリケーション全体のイベント管理。

#### メソッド

- `emit(eventName, data)`: イベントを発火
- `on(eventName, handler)`: イベントを監視
- `once(eventName, handler)`: 一度だけイベントを監視
- `off(eventName, handler)`: イベント監視を解除
- `waitFor(eventName, timeout)`: イベント待機（Promise）

### Application

アプリケーション全体の管理。

#### メソッド

- `init()`: アプリケーションを初期化
- `registerModule(name, module)`: モジュールを登録
- `getModule(name)`: モジュールを取得
- `getInfo()`: アプリケーション情報を取得
- `debug()`: デバッグ情報を出力

## デバッグ

### デバッグモードの有効化

```javascript
// URLパラメータで有効化
// http://localhost:3000?debug=true

// または直接設定
eventBus.setDebugMode(true);
```

### デバッグ情報の確認

```javascript
// アプリケーション全体のデバッグ情報
RBS.debug();

// 個別のデバッグ情報
app.debug();
eventBus.debug();
moduleLoader.debug();
```

## パフォーマンス

### 最適化のポイント

1. **遅延読み込み**: 必要な時にモジュールを読み込み
2. **イベントの効率化**: デバウンス・スロットルの活用
3. **メモリ管理**: 適切なクリーンアップ
4. **DOM操作の最適化**: バッチ処理とリフロー最小化

### パフォーマンス監視

```javascript
// 初期化時間の確認
document.addEventListener('rbs:ready', (event) => {
  console.log('初期化時間:', event.detail.loadTime, 'ms');
});

// アプリケーション情報の確認
console.log(app.getInfo());
```

## 移行ガイド

### 旧バージョンからの移行

1. **HTMLの更新**: 新しいエントリーポイントを使用
   ```html
   <!-- 旧 -->
   <script src="/js/main.js"></script>
   <script src="/utils/helpers.js"></script>
   
   <!-- 新 -->
   <script src="/src/public/js/index.js"></script>
   ```

2. **グローバル関数**: 既存のグローバル関数は後方互換性を保持
   ```javascript
   // これらの関数は引き続き使用可能
   toggleMobileMenu();
   scrollToTop();
   toggleFaq();
   ```

3. **イベント**: 新しいイベントシステムの活用
   ```javascript
   // 旧
   document.addEventListener('customEvent', handler);
   
   // 新（推奨）
   eventBus.on('customEvent', handler);
   ```

## トラブルシューティング

### よくある問題

1. **モジュール読み込みエラー**
   - パスの確認
   - 依存関係の確認
   - ネットワークエラーの確認

2. **イベントが発火しない**
   - イベント名の確認
   - リスナー登録のタイミング確認
   - デバッグモードでの確認

3. **メモリリーク**
   - コンポーネントの適切な破棄
   - イベントリスナーのクリーンアップ
   - タイマーの適切な停止

### デバッグ手順

1. デバッグモードを有効化
2. コンソールでエラーを確認
3. `RBS.debug()`でシステム状態を確認
4. 個別コンポーネントの状態を確認

## 今後の拡張

### 予定されている機能

1. **TypeScript対応**: 型安全性の向上
2. **テストフレームワーク**: 自動テストの導入
3. **バンドラー対応**: Webpack/Viteとの統合
4. **PWA対応**: Service Workerとの統合

### 拡張のガイドライン

1. **新しいコンポーネント**: `Component`クラスを継承
2. **新しいサービス**: 適切なフォルダに配置
3. **イベント**: 統一されたイベント命名規則を使用
4. **ドキュメント**: JSDocコメントを必須とする

## ライセンス

このプロジェクトは内部使用のためのものです。 