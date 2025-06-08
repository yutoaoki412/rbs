# Instagram投稿統合ガイド

## 概要
RBS陸上教室のInstagram投稿管理システムをLP側で使用するためのガイドです。
CONFIG統一ストレージキー（`rbs_instagram_posts`）を使用して、管理画面で登録されたInstagram投稿をLP側で表示できます。

## 基本的な使用方法

### 1. ユーティリティの読み込み
```html
<!-- CONFIG設定ファイル -->
<script src="js/shared/constants/config.js"></script>

<!-- Instagram表示ユーティリティ -->
<script src="js/shared/utils/InstagramUtils.js" type="module"></script>
```

### 2. Instagram投稿をHTMLに埋め込む

#### 簡単な方法（推奨）
```html
<div id="instagram-container"></div>

<script type="module">
import { embedInstagramPosts } from './js/shared/utils/InstagramUtils.js';

// Instagram投稿を自動で埋め込み（6件表示）
embedInstagramPosts('#instagram-container');
</script>
```

#### オプション付きの方法
```html
<div id="instagram-posts"></div>

<script type="module">
import { embedInstagramPosts } from './js/shared/utils/InstagramUtils.js';

// オプション付きで埋め込み
embedInstagramPosts('#instagram-posts', {
  limit: 9,                    // 最大9件表示
  featuredFirst: true,         // 注目投稿を先頭に
  containerClass: 'my-instagram-grid',
  itemClass: 'instagram-item'
});
</script>
```

### 3. データを取得してカスタム表示

```html
<script type="module">
import { getInstagramPosts, generateInstagramHTML } from './js/shared/utils/InstagramUtils.js';

// Instagram投稿データを取得
const posts = getInstagramPosts({
  limit: 6,
  featuredFirst: true
});

// カスタムHTMLを生成
const html = generateInstagramHTML(posts, {
  containerClass: 'custom-instagram-container',
  itemClass: 'custom-instagram-item'
});

document.getElementById('my-container').innerHTML = html;

// Instagram埋め込みスクリプトの処理（カスタム表示時は手動で呼ぶ）
if (window.instgrm) {
  window.instgrm.Embeds.process();
}
</script>
```

## ストレージキーの統一

### 管理画面側
```javascript
// InstagramDataService.js
this.storageKeys = {
  posts: CONFIG.storage.keys.instagramPosts,      // 'rbs_instagram_posts'
  settings: CONFIG.storage.keys.instagramSettings, // 'rbs_instagram_settings'
  backup: CONFIG.storage.keys.instagramBackup     // 'rbs_instagram_backup'
};
```

### LP側
```javascript
// InstagramUtils.js
const storageKey = window.CONFIG.storage.keys.instagramPosts; // 'rbs_instagram_posts'
const data = localStorage.getItem(storageKey);
```

## データ形式

### 保存されるデータ構造
```javascript
[
  {
    "id": "unique_id_123",
    "embedCode": "<blockquote class=\"instagram-media\" ...>...</blockquote>",
    "status": "active",        // 'active' | 'inactive'
    "featured": false,         // 注目投稿フラグ
    "order": 0,               // 表示順序
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### フィルタリング
- LP側では`status: 'active'`の投稿のみ表示
- `featured: true`の投稿を先頭に表示（オプション）
- `order`値でソート、同じ場合は`updatedAt`で新しい順

## CSS例

```css
/* Instagram投稿グリッド */
.instagram-posts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.instagram-post-item {
  display: flex;
  justify-content: center;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .instagram-posts-container {
    grid-template-columns: 1fr;
    gap: 15px;
  }
}

/* 空状態 */
.instagram-empty {
  text-align: center;
  padding: 40px 20px;
  color: #666;
  font-size: 14px;
}
```

## パフォーマンス最適化

### 1. 遅延読み込み
```html
<script type="module">
// ページが読み込まれてからInstagram投稿を表示
document.addEventListener('DOMContentLoaded', () => {
  embedInstagramPosts('#instagram-container');
});
</script>
```

### 2. エラーハンドリング
```javascript
import { embedInstagramPosts, getInstagramStats } from './js/shared/utils/InstagramUtils.js';

// 統計情報を確認
const stats = getInstagramStats();
console.log(`Instagram投稿統計: アクティブ${stats.active}件, 非表示${stats.inactive}件 / 全${stats.total}件`);

// 投稿が存在する場合のみ表示
if (stats.active > 0) {
  embedInstagramPosts('#instagram-container');
} else {
  document.getElementById('instagram-container').innerHTML = 
    '<div class="instagram-empty">Instagram投稿は準備中です</div>';
}
```

## トラブルシューティング

### よくある問題

1. **投稿が表示されない**
   - CONFIG設定が正しく読み込まれているか確認
   - `localStorage`に`rbs_instagram_posts`キーが存在するか確認
   - 管理画面で投稿のステータスが`active`になっているか確認

2. **埋め込みが正しく表示されない**
   - Instagram埋め込みスクリプト（`//www.instagram.com/embed.js`）が読み込まれているか確認
   - ネットワーク接続を確認

3. **スタイルが崩れる**
   - CSSでInstagram投稿用のスタイルを適切に設定
   - 親要素の幅制限を確認

### デバッグ方法

```javascript
// デバッグ情報の表示
import { getInstagramPosts, getInstagramStats } from './js/shared/utils/InstagramUtils.js';

const stats = getInstagramStats();
console.log('Instagram統計:', stats);
console.log(`アクティブ投稿: ${stats.active}件, 非表示投稿: ${stats.inactive}件, 注目投稿: ${stats.featured}件`);
console.log('取得可能投稿:', getInstagramPosts({ limit: 100 }));
console.log('ストレージキー:', window.CONFIG.storage.keys.instagramPosts);
console.log('ストレージデータ:', localStorage.getItem(window.CONFIG.storage.keys.instagramPosts));
```

## セキュリティ注意事項

- Instagram埋め込みコードは信頼できるソースからのみ使用
- XSS攻撃を防ぐため、埋め込みコードの検証を実施
- 適切なCSP（Content Security Policy）の設定を推奨 