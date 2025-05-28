/**
 * ニュース詳細ページ専用JavaScript
 */

// グローバル変数
let articleManager = null;
let currentArticle = null;

// URLパラメータから記事IDを取得
function getArticleId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// 記事を表示
async function displayArticle(article) {
  try {
    console.log('記事表示開始:', article.title);
    
    // パンくずナビを更新
    document.getElementById('breadcrumb-title').textContent = article.title;
    
    // 記事ヘッダーを更新
    document.getElementById('article-date').textContent = formatDate(article.date);
    document.getElementById('article-title').textContent = article.title;
    
    const categoryElement = document.getElementById('article-category');
    categoryElement.textContent = getCategoryName(article.category);
    categoryElement.className = `article-category ${article.category}`;
    
    // 記事本文を表示
    const contentElement = document.getElementById('article-content');
    
    if (article.content) {
      // 管理画面で作成された記事のコンテンツを表示
      contentElement.innerHTML = articleManager.parser.parse(article.content);
      console.log('記事コンテンツを表示しました');
    } else {
      // コンテンツが見つからない場合
      contentElement.innerHTML = `
        <div class="empty-content">
          <h3>記事内容がありません</h3>
          <p>この記事のコンテンツが正しく保存されていません。管理画面から記事を編集してください。</p>
          <a href="admin.html" class="btn-secondary">管理画面へ</a>
        </div>
      `;
      console.warn('記事にコンテンツがありません');
    }
    
    // メタデータを更新
    updateMetadata(article);
    
    // シェアセクションを表示
    document.getElementById('share-section').style.display = 'block';
    
    // 関連記事を表示
    displayRelatedArticles(article);
    
    console.log('記事表示完了');
    
  } catch (error) {
    console.error('記事表示エラー:', error);
    showContentError();
  }
}

// メタデータを更新
function updateMetadata(article) {
  const textContent = (article.content || article.summary || '').replace(/<[^>]*>/g, '').substring(0, 150);
  
  // ページタイトルを更新
  document.title = `${article.title} - RBS陸上教室`;
  
  // メタタグを動的に作成・更新
  updateMetaTag('description', textContent);
  updateMetaTag('keywords', 'RBS陸上教室, 陸上教室, お知らせ');
  
  // OGPタグを動的に作成・更新
  updateOGPTag('title', article.title);
  updateOGPTag('description', textContent);
  updateOGPTag('type', 'article');
  updateOGPTag('url', window.location.href);
  updateOGPTag('image', '../assets/images/lp-logo.png');
  updateOGPTag('site_name', 'RBS陸上教室');
  
  // Twitter Cardタグを動的に作成・更新
  updateTwitterTag('card', 'summary_large_image');
  updateTwitterTag('title', article.title);
  updateTwitterTag('description', textContent);
  updateTwitterTag('image', '../assets/images/lp-logo.png');
}

// メタタグ更新ヘルパー関数
function updateMetaTag(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function updateOGPTag(property, content) {
  let meta = document.querySelector(`meta[property="og:${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', `og:${property}`);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function updateTwitterTag(name, content) {
  let meta = document.querySelector(`meta[name="twitter:${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = `twitter:${name}`;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

// 関連記事を表示
function displayRelatedArticles(currentArticle) {
  if (!articleManager?.articles) return;
  
  // 同じカテゴリーの他の記事を取得（最大3件）
  const relatedArticles = articleManager.articles
    .filter(article => 
      article.id !== currentArticle.id && 
      article.category === currentArticle.category
    )
    .slice(0, 3);
  
  if (relatedArticles.length === 0) {
    return; // 関連記事がない場合は非表示のまま
  }
  
  const container = document.getElementById('related-articles-container');
  const html = relatedArticles.map(article => `
    <div class="related-card">
      <div class="related-card-header">
        <div class="related-meta">
          <div class="related-date">${formatDate(article.date)}</div>
          <div class="related-category ${article.category}">
            ${getCategoryName(article.category)}
          </div>
        </div>
        <a href="news-detail.html?id=${article.id}" class="related-title-link">${escapeHtml(article.title)}</a>
      </div>
      <div class="related-card-body">
        <p class="related-excerpt">${escapeHtml((article.summary || '').substring(0, 100))}...</p>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
  document.getElementById('related-articles').style.display = 'block';
}

// ユーティリティ関数
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '.');
}

function getCategoryName(category) {
  const categories = {
    'announcement': 'お知らせ',
    'event': '体験会',
    'media': 'メディア',
    'important': '重要'
  };
  return categories[category] || category;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// エラー表示
function showNotFoundError() {
  const contentElement = document.getElementById('article-content');
  contentElement.innerHTML = `
    <div class="error-message">
      <h3>記事が見つかりません</h3>
      <p>指定された記事は存在しないか、削除された可能性があります。</p>
      <a href="news.html" class="btn-primary">ニュース一覧に戻る</a>
    </div>
  `;
  
  document.getElementById('article-title').textContent = '記事が見つかりません';
  document.getElementById('breadcrumb-title').textContent = '記事が見つかりません';
}

function showLoadError() {
  const contentElement = document.getElementById('article-content');
  contentElement.innerHTML = `
    <div class="error-message">
      <h3>読み込みエラー</h3>
      <p>記事の読み込みに失敗しました。</p>
      <p>しばらく時間をおいてから再度お試しください。</p>
      <button onclick="location.reload()" class="retry-btn">再読み込み</button>
    </div>
  `;
}

function showContentError() {
  const contentElement = document.getElementById('article-content');
  contentElement.innerHTML = `
    <div class="error-message">
      <h3>コンテンツエラー</h3>
      <p>記事の内容を表示できませんでした。</p>
      <a href="admin.html" class="btn-secondary">管理画面で確認</a>
    </div>
  `;
}

function showInvalidIdError() {
  const contentElement = document.getElementById('article-content');
  contentElement.innerHTML = `
    <div class="error-message">
      <h3>無効なURLです</h3>
      <p>記事IDが指定されていません。正しいURLでアクセスしてください。</p>
      <a href="news.html" class="btn-primary">ニュース一覧に戻る</a>
    </div>
  `;
  
  document.getElementById('article-title').textContent = '無効なURL';
  document.getElementById('breadcrumb-title').textContent = '無効なURL';
}

// SNSシェア機能
function shareTwitter() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(document.getElementById('article-title').textContent);
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

function shareFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareLine() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(document.getElementById('article-title').textContent);
  window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`, '_blank');
}

function copyUrl() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert('URLをコピーしました！');
  }).catch(() => {
    // フォールバック
    const textArea = document.createElement('textarea');
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('URLをコピーしました！');
  });
}

// 記事詳細を読み込み・表示
async function loadArticleDetail() {
  try {
    console.log('記事詳細読み込み開始');
    
    const articleId = getArticleId();
    
    // 記事IDが指定されていない場合
    if (!articleId) {
      console.warn('記事IDが指定されていません');
      showInvalidIdError();
      return;
    }
    
    console.log('要求された記事ID:', articleId);
    
    // ArticleManagerクラスが利用可能になるまで待機
    let attempts = 0;
    const maxAttempts = 100; // 10秒間待機
    
    while (typeof ArticleManager === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof ArticleManager === 'undefined') {
      throw new Error('ArticleManagerクラスが読み込まれませんでした');
    }
    
    console.log('ArticleManagerクラスが利用可能になりました');
    
    // ArticleManagerのインスタンスを作成
    articleManager = new ArticleManager();
    
    // 管理画面からの記事データを読み込み
    await articleManager.loadArticles();
    
    console.log('記事データ読み込み完了:', articleManager.articles.length, '件');
    console.log('記事データ詳細:', articleManager.articles);
    
    // 指定されたIDの記事を取得
    const article = articleManager.getArticleById(articleId);
    
    if (!article) {
      console.warn('記事が見つかりません:', articleId);
      showNotFoundError();
      return;
    }

    console.log('記事を表示します:', article.title);
    currentArticle = article;
    
    // 記事を表示
    await displayArticle(article);
    
  } catch (error) {
    console.error('記事の読み込みに失敗しました:', error);
    showLoadError();
  }
}

// ページ初期化
async function initNewsDetailPage() {
  console.log('記事詳細ページ初期化開始');
  
  // ヘッダーとフッターを直接読み込み
  try {
    const templateLoader = new TemplateLoader();
    await templateLoader.loadAll({
      currentPage: 'news-detail',
      logoPath: 'index.html',
      activeSection: 'news'
    });
    console.log('ヘッダー・フッター読み込み完了');
    
    // ヘッダーが確実に読み込まれるまで少し待機
    setTimeout(() => {
      if (window.CommonHeader) {
        const header = new window.CommonHeader();
        header.init({ currentPage: 'news-detail' });
        console.log('CommonHeader初期化完了');
      }
    }, 100);
    
  } catch (error) {
    console.error('ヘッダー・フッター読み込みエラー:', error);
  }
  
  // PageInitializerの初期化
  if (typeof PageInitializer !== 'undefined') {
    PageInitializer.init({
      currentPage: 'news-detail',
      pageTitle: '記事詳細 - RBS陸上教室',
      hasStatusBanner: false
    });
  }
  
  // 記事詳細を読み込み
  await loadArticleDetail();
  
  console.log('記事詳細ページ初期化完了');
}

// DOMContentLoadedイベントでページを初期化
document.addEventListener('DOMContentLoaded', initNewsDetailPage);

// グローバルに公開（他のスクリプトからアクセス可能にする）
window.NewsDetailPage = {
  initNewsDetailPage,
  loadArticleDetail,
  displayArticle,
  shareTwitter,
  shareFacebook,
  shareLine,
  copyUrl
}; 