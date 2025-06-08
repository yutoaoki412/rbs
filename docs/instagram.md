# Instagram投稿の埋め込み - 公式ガイド

## 📋 公式ドキュメントリンク

### Meta開発者向けドキュメント
- **Instagram Platform - Embed Button**: `https://developers.facebook.com/docs/instagram-platform/embed-button/`
- **Instagram Platform - oEmbed**: `https://developers.facebook.com/docs/instagram-platform/oembed/`
- **Instagram Platform - Overview**: `https://developers.facebook.com/docs/instagram-platform/`

### Instagram公式ヘルプ
- **投稿の埋め込み方法**: `https://help.instagram.com/620154495870484`

⚠️ **注意**: 現在これらの公式ドキュメントにアクセス制限がかかっている場合があります。

---

## 🛠️ 1. 公式埋め込み方法（手動）

### ステップ1: 埋め込みコードの取得
1. `https://www.instagram.com` でInstagramにアクセス
2. 埋め込みたい投稿を開く
3. 投稿の右上にある **「...」** （3つの点）をクリック
4. **「埋め込み」** を選択
5. 表示されたHTMLコードをコピー

### ステップ2: ウェブサイトへの貼り付け
```html
<!-- 生成された埋め込みコード例 -->
<blockquote class="instagram-media" 
    data-instgrm-captioned 
    data-instgrm-permalink="https://www.instagram.com/p/POST_ID/" 
    data-instgrm-version="14">
    <!-- 投稿内容 -->
</blockquote>

<!-- 必須JavaScript -->
<script async src="//www.instagram.com/embed.js"></script>
```

---

## 🔗 2. oEmbed API使用方法

### エンドポイント
```
GET https://www.instagram.com/oembed/?url={INSTAGRAM_URL}
```

### JavaScript例
```javascript
const instagramUrl = 'https://www.instagram.com/p/POST_ID/';
const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(instagramUrl)}`;

fetch(oembedUrl)
  .then(response => response.json())
  .then(data => {
    // data.html に埋め込みコードが含まれる
    document.getElementById('container').innerHTML = data.html;
  })
  .catch(error => console.error('Error:', error));
```

### レスポンス例
```json
{
  "version": "1.0",
  "title": "投稿タイトル",
  "author_name": "アカウント名",
  "author_url": "https://www.instagram.com/username/",
  "author_id": 123456,
  "media_id": "POST_ID",
  "provider_name": "Instagram",
  "provider_url": "https://www.instagram.com/",
  "type": "rich",
  "width": null,
  "height": null,
  "html": "<blockquote class=\"instagram-media\"...>...</blockquote>",
  "thumbnail_url": "https://scontent.cdninstagram.com/...",
  "thumbnail_width": 640,
  "thumbnail_height": 640
}
```

---

## 📱 3. 埋め込みコードの構造

### 基本構造
```html
<blockquote class="instagram-media" 
    data-instgrm-captioned           <!-- キャプション表示 -->
    data-instgrm-permalink="URL"     <!-- 投稿URL -->
    data-instgrm-version="14"        <!-- APIバージョン -->
    style="...">                     <!-- インラインスタイル -->
    
    <div style="padding:16px;">
        <a href="URL" target="_blank">
            <!-- 投稿プレビューコンテンツ -->
        </a>
        <p style="...">
            <a href="URL" target="_blank">
                アカウント名(@username)がシェアした投稿
            </a>
        </p>
    </div>
</blockquote>

<!-- 必須JavaScript -->
<script async src="//www.instagram.com/embed.js"></script>
```

### 重要な属性
- `data-instgrm-captioned`: キャプションを表示
- `data-instgrm-permalink`: 投稿の永続的URL
- `data-instgrm-version`: Instagram Embed APIのバージョン

---

## ⚙️ 4. 技術仕様

### 必須要件
- **JavaScript**: `embed.js` の読み込みが必須
- **公開投稿**: プライベートアカウントの投稿は埋め込み不可
- **レスポンシブ**: 自動的にモバイル対応

### サポートされるコンテンツ
- ✅ 写真投稿
- ✅ 動画投稿
- ✅ カルーセル投稿（複数画像/動画）
- ✅ リール投稿
- ❌ ストーリー（24時間で消える）
- ❌ プライベートアカウントの投稿

---

## 🎨 5. カスタマイズオプション

### CSSでのスタイル調整
```css
/* Instagram埋め込みのカスタマイズ */
.instagram-media {
    margin: 20px auto !important;
    max-width: 540px !important;
    border-radius: 10px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .instagram-media {
        max-width: 100% !important;
        margin: 10px auto !important;
    }
}
```

### プログラマティック初期化
```javascript
// Instagram埋め込みの手動初期化
if (window.instgrm && window.instgrm.Embeds) {
    window.instgrm.Embeds.process();
}

// 動的コンテンツの場合
function loadInstagramEmbed() {
    // 埋め込みコードを動的に追加した後
    if (window.instgrm) {
        window.instgrm.Embeds.process();
    } else {
        // embed.jsがまだ読み込まれていない場合
        const script = document.createElement('script');
        script.async = true;
        script.src = '//www.instagram.com/embed.js';
        document.head.appendChild(script);
    }
}
```

---

## 🚫 6. 制限事項

### APIの制限
- **アクセス頻度**: 過度なリクエストは制限される可能性
- **コンテンツ**: 削除された投稿は埋め込みも表示されなくなる
- **プライバシー**: プライベートアカウントは埋め込み不可

### 2024年の重要な変更
- **Instagram Basic Display API**: 2024年9月4日に非推奨化
- **新しい認証**: Instagram Graph APIへの移行が推奨
- **サードパーティツール**: 多くのツールがAPI変更の影響を受ける

---

## 📋 7. トラブルシューティング

### よくある問題

#### 1. 埋め込みが表示されない
```javascript
// 解決策1: 手動初期化
setTimeout(() => {
    if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
    }
}, 1000);

// 解決策2: スクリプトの再読み込み
function reloadInstagramScript() {
    const existingScript = document.querySelector('script[src*="embed.js"]');
    if (existingScript) {
        existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.async = true;
    script.src = '//www.instagram.com/embed.js';
    document.head.appendChild(script);
}
```

#### 2. レスポンシブが効かない
```css
/* 強制レスポンシブ */
.instagram-media {
    width: 100% !important;
    max-width: 540px !important;
    margin: 0 auto !important;
}
```

#### 3. 読み込み速度の最適化
```javascript
// 遅延読み込み
function lazyLoadInstagram() {
    const instagramEmbeds = document.querySelectorAll('.instagram-media');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (window.instgrm && window.instgrm.Embeds) {
                    window.instgrm.Embeds.process();
                }
                observer.unobserve(entry.target);
            }
        });
    });
    
    instagramEmbeds.forEach(embed => observer.observe(embed));
}
```

---

## 🌐 8. プラットフォーム別実装

### WordPress
```php
// functions.phpに追加
function add_instagram_embed_script() {
    wp_enqueue_script('instagram-embed', '//www.instagram.com/embed.js', array(), null, true);
}
add_action('wp_enqueue_scripts', 'add_instagram_embed_script');
```

### React
```jsx
import { useEffect, useRef } from 'react';

function InstagramEmbed({ url }) {
    const embedRef = useRef(null);
    
    useEffect(() => {
        if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
        }
    }, [url]);
    
    return (
        <div ref={embedRef}>
            <blockquote 
                className="instagram-media"
                data-instgrm-permalink={url}
                data-instgrm-version="14">
                {/* 埋め込みコンテンツ */}
            </blockquote>
        </div>
    );
}
```

### Next.js
```jsx
import { useEffect } from 'react';
import Script from 'next/script';

export default function InstagramPost({ embedCode }) {
    useEffect(() => {
        if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
        }
    }, []);
    
    return (
        <>
            <div dangerouslySetInnerHTML={{ __html: embedCode }} />
            <Script 
                src="//www.instagram.com/embed.js" 
                strategy="lazyOnload"
            />
        </>
    );
}
```

---

## 📚 参考リソース

### 公式リソース
- [Instagram Help Center](https://help.instagram.com)
- [Meta for Developers](https://developers.facebook.com)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)

### コミュニティリソース
- [Stack Overflow - Instagram Embed](https://stackoverflow.com/questions/tagged/instagram-embed)
- [GitHub - Instagram Embed Examples](https://github.com/search?q=instagram+embed)

### ツール＆ライブラリ
- [react-social-media-embed](https://www.npmjs.com/package/react-social-media-embed)
- [Iframely Instagram Embed](https://iframely.com/domains/instagram)
- [EmbedSocial](https://embedsocial.com)

---

> **重要**: Instagram APIは頻繁に変更されるため、最新の情報は常に公式ドキュメントで確認してください。