/**
 * ニュース詳細ページ専用JavaScript v2.1
 * 改善されたArticleService v2.0対応
 */

// グローバル変数
let currentArticle = null;

// URLパラメータから記事IDを取得
function getArticleId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// 記事を表示
async function displayArticle(article) {
  try {
    console.log('📰 記事表示開始:', article.title);
    
    // パンくずナビを更新
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = article.title;
    }
    
    // 記事ヘッダーを更新
    updateArticleHeader(article);
    
    // 記事本文を表示
    await displayArticleContent(article);
    
    // メタデータを更新
    updateMetadata(article);
    
    // シェアセクションを表示
    showShareSection();
    
    // 関連記事を表示
    displayRelatedArticles(article);
    
    console.log('✅ 記事表示完了');
    
  } catch (error) {
    console.error('❌ 記事表示エラー:', error);
    showContentError(error.message);
  }
}

// 記事ヘッダーを更新
function updateArticleHeader(article) {
  const articleDate = document.getElementById('article-date');
  const articleTitle = document.getElementById('article-title');
  const categoryElement = document.getElementById('article-category');
  
  if (articleDate) {
    articleDate.textContent = article.formattedDate || article.date;
  }
  
  if (articleTitle) {
    articleTitle.textContent = article.title;
  }
  
  if (categoryElement) {
    categoryElement.textContent = article.categoryName || article.category;
    categoryElement.className = `article-category ${article.category}`;
    
    // カテゴリー色を設定
    const categoryColors = {
      announcement: '#4299e1',
      event: '#38b2ac', 
      media: '#9f7aea',
      important: '#f56565'
    };
    
    categoryElement.style.backgroundColor = categoryColors[article.category] || categoryColors.announcement;
  }
}

// 記事本文を表示
async function displayArticleContent(article) {
  const contentElement = document.getElementById('article-content');
  
  if (!contentElement) {
    throw new Error('記事コンテンツ要素が見つかりません');
  }
  
  try {
    // ArticleService v2.0のgetArticleContentメソッドを使用
    const htmlContent = await window.articleService.getArticleContent(article.id);
    
    if (!htmlContent || htmlContent.trim() === '') {
      throw new Error('記事コンテンツが空です');
    }
    
    contentElement.innerHTML = htmlContent;
    console.log('✅ 記事コンテンツを表示しました');
    
  } catch (contentError) {
    console.error('❌ 記事コンテンツの取得に失敗:', contentError);
    throw contentError;
  }
}

// シェアセクションを表示
function showShareSection() {
  const shareSection = document.getElementById('share-section');
  if (shareSection) {
    shareSection.style.display = 'block';
  }
}

// メタデータを更新
function updateMetadata(article) {
  const textContent = (article.content || article.summary || article.excerpt || '')
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    .substring(0, 150);
  
  // ページタイトルを更新
  document.title = `${article.title} - RBS陸上教室`;
  
  // メタタグを動的に作成・更新
  updateMetaTag('description', textContent || 'RBS陸上教室のニュース詳細');
  updateMetaTag('keywords', 'RBS陸上教室, 陸上教室, お知らせ, ' + (article.category || ''));
  
  // OGPタグを動的に作成・更新
  updateOGPTag('title', article.title);
  updateOGPTag('description', textContent || 'RBS陸上教室のニュース詳細');
  updateOGPTag('type', 'article');
  updateOGPTag('url', window.location.href);
  updateOGPTag('image', '../assets/images/lp-logo.png');
  updateOGPTag('site_name', 'RBS陸上教室');
  
  // Twitter Cardタグを動的に作成・更新
  updateTwitterTag('card', 'summary_large_image');
  updateTwitterTag('title', article.title);
  updateTwitterTag('description', textContent || 'RBS陸上教室のニュース詳細');
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
  if (!window.articleService || !window.articleService.isInitialized) {
    console.warn('⚠️ ArticleServiceが初期化されていません');
    return;
  }
  
  try {
    // 同じカテゴリーの他の記事を取得（最大3件）
    const relatedArticles = window.articleService.getArticlesByCategory(currentArticle.category)
      .filter(article => article.id !== currentArticle.id)
      .slice(0, 3);
    
    if (relatedArticles.length === 0) {
      console.log('関連記事が見つかりません');
      return; // 関連記事がない場合は非表示のまま
    }
    
    const container = document.getElementById('related-articles-container');
    const relatedSection = document.getElementById('related-articles');
    
    if (container && relatedSection) {
      const html = relatedArticles.map(article => createRelatedArticleCard(article)).join('');
      container.innerHTML = html;
      relatedSection.style.display = 'block';
      
      // ホバーエフェクトを追加
      addRelatedCardHoverEffects(container);
      
      console.log(`✅ 関連記事を${relatedArticles.length}件表示しました`);
    }
    
  } catch (error) {
    console.error('❌ 関連記事の表示エラー:', error);
  }
}

// 関連記事カードを作成
function createRelatedArticleCard(article) {
  const categoryColors = {
    announcement: '#4299e1',
    event: '#38b2ac', 
    media: '#9f7aea',
    important: '#f56565'
  };
  
  const categoryColor = categoryColors[article.category] || categoryColors.announcement;
  const excerpt = (article.excerpt || article.summary || '').substring(0, 80);
  
  return `
    <div class="related-card">
      <div class="related-card-header">
        <div class="related-meta">
          <div class="related-date">${escapeHtml(article.formattedDate || article.date)}</div>
          <div class="related-category ${article.category}" style="background: ${categoryColor}">
            ${escapeHtml(article.categoryName || article.category)}
          </div>
        </div>
        <a href="news-detail.html?id=${article.id}" class="related-title-link">${escapeHtml(article.title)}</a>
      </div>
      <div class="related-card-body">
        <p class="related-excerpt">${escapeHtml(excerpt)}${excerpt.length >= 80 ? '...' : ''}</p>
      </div>
    </div>
  `;
}

// 関連記事カードにホバーエフェクトを追加
function addRelatedCardHoverEffects(container) {
  container.querySelectorAll('.related-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
    });
  });
}

// ユーティリティ関数
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// エラー表示関数群
function showNotFoundError() {
  const articleContent = document.getElementById('article-content');
  if (articleContent) {
    articleContent.innerHTML = createErrorMessage(
      '🔍',
      '記事が見つかりません',
      '指定された記事は存在しないか、削除された可能性があります。',
      [
        { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-primary' },
        { text: 'ホームへ', href: '../pages/index.html', class: 'btn-secondary' }
      ]
    );
  }
}

function showLoadError(errorMessage = 'システムエラーが発生しました') {
  const articleContent = document.getElementById('article-content');
  if (articleContent) {
    articleContent.innerHTML = createErrorMessage(
      '⚠️',
      '記事の読み込みに失敗しました',
      errorMessage,
      [
        { text: '再読み込み', onclick: 'location.reload()', class: 'btn-primary' },
        { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-secondary' }
      ]
    );
  }
}

function showContentError(errorMessage = 'コンテンツの取得に失敗しました') {
  const articleContent = document.getElementById('article-content');
  if (articleContent) {
    articleContent.innerHTML = createErrorMessage(
      '📄',
      '記事内容の表示に失敗しました',
      errorMessage,
      [
        { text: '再読み込み', onclick: 'location.reload()', class: 'btn-primary' },
        { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-secondary' }
      ]
    );
  }
}

function showInvalidIdError() {
  const articleContent = document.getElementById('article-content');
  if (articleContent) {
    articleContent.innerHTML = createErrorMessage(
      '🔗',
      '無効なリンクです',
      '記事IDが指定されていないか、無効です。',
      [
        { text: 'ニュース一覧へ', href: 'news.html', class: 'btn-primary' },
        { text: 'ホームへ', href: '../pages/index.html', class: 'btn-secondary' }
      ]
    );
  }
}

// エラーメッセージHTMLを生成
function createErrorMessage(icon, title, message, actions = []) {
  const actionsHtml = actions.map(action => {
    if (action.onclick) {
      return `<button onclick="${action.onclick}" class="btn ${action.class}">${action.text}</button>`;
    } else {
      return `<a href="${action.href}" class="btn ${action.class}">${action.text}</a>`;
    }
  }).join('');
  
  return `
    <div class="error-message">
      <div style="font-size: 48px; margin-bottom: 20px;">${icon}</div>
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="error-actions">
        ${actionsHtml}
      </div>
    </div>
  `;
}

// デバッグ情報を表示
function showDebugInfo() {
  const debugInfo = {
    currentUrl: window.location.href,
    articleId: getArticleId(),
    currentArticle: currentArticle,
    articleServiceStatus: window.articleService ? 'loaded' : 'not loaded',
    articleServiceInitialized: window.articleService ? window.articleService.isInitialized : false,
    availableArticles: window.articleService ? window.articleService.getAllArticles().length : 0,
    timestamp: new Date().toISOString()
  };
  
  console.log('🐛 デバッグ情報:', debugInfo);
  
  const debugText = Object.entries(debugInfo)
    .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
    .join('\n');
  
  alert(`デバッグ情報:\n\n${debugText}\n\n詳細はコンソールを確認してください。`);
}

// ArticleServiceの手動初期化
async function initializeArticleServiceManually() {
  try {
    console.log('🔄 ArticleServiceの手動初期化を開始');
    
    if (!window.articleService) {
      throw new Error('ArticleServiceが読み込まれていません');
    }
    
    await window.articleService.init();
    console.log('✅ ArticleService手動初期化完了');
    
    // 記事を再読み込み
    await loadArticleDetail();
    
  } catch (error) {
    console.error('❌ ArticleService手動初期化エラー:', error);
    showLoadError('ArticleServiceの初期化に失敗しました: ' + error.message);
  }
}

// SNSシェア機能
function shareTwitter() {
  if (!currentArticle) {
    console.warn('現在の記事が設定されていません');
    return;
  }
  
  const text = `${currentArticle.title} - RBS陸上教室`;
  const url = window.location.href;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(twitterUrl, '_blank', 'width=600,height=400');
}

function shareFacebook() {
  if (!currentArticle) {
    console.warn('現在の記事が設定されていません');
    return;
  }
  
  const url = window.location.href;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(facebookUrl, '_blank', 'width=600,height=400');
}

function shareLine() {
  if (!currentArticle) {
    console.warn('現在の記事が設定されていません');
    return;
  }
  
  const text = `${currentArticle.title} - RBS陸上教室`;
  const url = window.location.href;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(lineUrl, '_blank', 'width=600,height=400');
}

function copyUrl() {
  if (!currentArticle) {
    console.warn('現在の記事が設定されていません');
    return;
  }
  
  navigator.clipboard.writeText(window.location.href).then(() => {
    showNotification('URLをコピーしました', 'success');
  }).catch(err => {
    console.error('URLのコピーに失敗:', err);
    showNotification('URLのコピーに失敗しました', 'error');
  });
}

// 通知を表示
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? 'var(--primary-blue)' : type === 'error' ? 'var(--primary-red)' : 'var(--gray-dark)'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// 記事詳細を読み込み
async function loadArticleDetail() {
  try {
    const articleId = getArticleId();
    
    if (!articleId) {
      console.error('❌ 記事IDが指定されていません');
      showInvalidIdError();
      return;
    }
    
    console.log('🔄 記事詳細読み込み開始 - ID:', articleId);
    
    // ArticleServiceが存在するかチェック
    if (!window.articleService) {
      throw new Error('ArticleServiceが利用できません');
    }
    
    // ArticleServiceが初期化されていない場合は初期化
    if (!window.articleService.isInitialized) {
      console.log('🔄 ArticleServiceを初期化中...');
      await window.articleService.init();
    }
    
    // 記事を取得
    const article = window.articleService.getArticleById(articleId);
    
    if (!article) {
      console.error('❌ 記事が見つかりません - ID:', articleId);
      showNotFoundError();
      return;
    }
    
    // グローバル変数に保存
    currentArticle = article;
    
    // 記事を表示
    await displayArticle(article);
    
    console.log('✅ 記事詳細読み込み完了');
    
  } catch (error) {
    console.error('❌ 記事詳細読み込みエラー:', error);
    showLoadError(error.message);
  }
}

// ページ初期化
async function initNewsDetailPage() {
  console.log('🚀 ニュース詳細ページ v2.1 初期化開始');
  
  try {
    // ヘッダーとフッターを読み込み
    await initializeTemplates();
    
    // ArticleServiceを初期化して記事を読み込み
    await initializeAndLoadArticle();
    
  } catch (error) {
    console.error('❌ ページ初期化失敗:', error);
    showLoadError(error.message);
  }
  
  console.log('🎉 ニュース詳細ページ初期化完了');
}

// テンプレートを初期化
async function initializeTemplates() {
  try {
    const templateLoader = new TemplateLoader();
    await templateLoader.loadAll({
      currentPage: 'news-detail',
      logoPath: '../index.html',
      activeSection: 'news'
    });
    console.log('✅ ヘッダー・フッター読み込み完了');
    
    // ヘッダーの初期化
    setTimeout(() => {
      if (window.CommonHeader) {
        const header = new window.CommonHeader();
        header.init({ currentPage: 'news-detail' });
        console.log('✅ CommonHeader初期化完了');
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ テンプレート読み込みエラー:', error);
  }
  
  // PageInitializerの初期化
  if (typeof PageInitializer !== 'undefined') {
    PageInitializer.init({
      currentPage: 'news-detail',
      pageTitle: 'ニュース詳細 - RBS陸上教室',
      hasStatusBanner: false
    });
  }
}

// ArticleServiceを初期化して記事を読み込み
async function initializeAndLoadArticle() {
  try {
    console.log('🔄 ArticleService初期化開始');
    
    // ArticleServiceが読み込まれるまで待機
    await waitForArticleService();
    
    await window.articleService.init();
    console.log('✅ ArticleService初期化完了');
    
    // 記事詳細を読み込み
    await loadArticleDetail();
    
  } catch (error) {
    console.error('❌ ArticleService初期化失敗:', error);
    throw error;
  }
}

// ArticleServiceの読み込みを待機
async function waitForArticleService() {
  if (window.articleService) {
    return;
  }
  
  let attempts = 0;
  const maxAttempts = 50; // 5秒間待機
  
  while (!window.articleService && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.articleService) {
    throw new Error('ArticleServiceが読み込まれませんでした');
  }
}

// DOMContentLoadedイベントでページを初期化
document.addEventListener('DOMContentLoaded', initNewsDetailPage);

// グローバルに公開
window.NewsDetailPage = {
  initNewsDetailPage,
  loadArticleDetail,
  displayArticle,
  showDebugInfo,
  initializeArticleServiceManually,
  shareTwitter,
  shareFacebook,
  shareLine,
  copyUrl
};

// スタイルを追加（通知アニメーション用）
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    to { 
      transform: translateX(100%); 
      opacity: 0; 
    }
  }
`;
document.head.appendChild(style); 