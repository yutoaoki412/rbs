/**
 * RBS陸上教室 トップページ専用JavaScript v2.0
 * ArticleService v2.0に対応した最新版
 */

/**
 * アプリケーション初期化
 */
async function initializeApp() {
  console.log('🚀 RBS陸上教室トップページ v2.0 初期化開始');
  
  // 設定の確認
  if (!window.RBSConfig) {
    console.error('RBSConfig が見つかりません。config.js を先に読み込んでください。');
    return;
  }
  
  // 基本機能の初期化
  initializeNavigation();
  initializeStatusBanner();
  initializeFAQ();
  initializeAnimations();
  
  // ニュースセクションの初期化（ArticleService v2.0対応）
  await initializeNewsSection();
  
  console.log('✅ RBS陸上教室トップページ初期化完了');
}

/**
 * ナビゲーション機能の初期化
 */
function initializeNavigation() {
  // スムーススクロール
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        const headerHeight = 120;
        const targetPosition = targetElement.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // モバイルメニュー
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinksContainer = document.querySelector('.nav-links');
  
  if (mobileMenuBtn && navLinksContainer) {
    mobileMenuBtn.addEventListener('click', function() {
      navLinksContainer.classList.toggle('active');
      this.setAttribute('aria-expanded', navLinksContainer.classList.contains('active'));
    });
  }
}

/**
 * ステータスバナー機能の初期化
 */
function initializeStatusBanner() {
  console.log('📊 ステータスバナー機能初期化開始');
  try {
    // LessonStatusManagerを初期化
    if (typeof LessonStatusManager !== 'undefined') {
      window.lessonStatusManager = new LessonStatusManager();
      console.log('✅ LessonStatusManager初期化完了');
    } else {
      console.warn('⚠️ LessonStatusManagerが見つかりません');
    }
    // ステータスコンテンツを動的に読み込み
    loadStatusContent();
    // HTMLで定義されているtoggleStatus()を使用（UIInteractionManagerで実装済み）
    console.log('📊 ステータストグル機能: UIInteractionManagerで管理');
  } catch (error) {
    console.error('❌ ステータスバナー初期化エラー:', error);
  }
}

/**
 * ステータスコンテンツを動的に読み込み
 */
async function loadStatusContent() {
  try {
    console.log('📊 ステータスコンテンツ読み込み開始');
    const statusDetails = document.getElementById('status-details');
    const statusIndicator = document.getElementById('global-status-indicator');
    if (!statusDetails || !statusIndicator) {
      console.warn('⚠️ ステータス表示要素が見つかりません');
      return;
    }
    if (window.lessonStatusManager) {
      const today = window.lessonStatusManager.getTodayDate();
      const statusData = window.lessonStatusManager.getLessonStatus(today);
      console.log('📊 取得したステータスデータ:', statusData);
      updateStatusIndicator(statusIndicator, statusData);
      updateStatusDetails(statusDetails, statusData);
      console.log('✅ ステータスコンテンツ更新完了');
    } else {
      displayDefaultStatusContent(statusDetails, statusIndicator);
    }
  } catch (error) {
    console.error('❌ ステータスコンテンツ読み込みエラー:', error);
    displayStatusError(document.getElementById('status-details'));
  }
}

/**
 * ステータスインジケーターを更新
 */
function updateStatusIndicator(indicator, statusData) {
  if (!indicator) return;
  
  const statusText = getStatusDisplayText(statusData.globalStatus);
  const statusClass = getStatusClass(statusData.globalStatus);
  
  indicator.textContent = statusText;
  indicator.className = `status-indicator ${statusClass}`;
}

/**
 * ステータス詳細を更新
 */
function updateStatusDetails(detailsElement, statusData) {
  if (!detailsElement) return;
  
  const { date, globalStatus, globalMessage, courses } = statusData;
  const formattedDate = formatDisplayDate(date);
  
  let html = `
    <div class="status-header-info">
      <h4>${formattedDate}のレッスン状況</h4>
      ${globalMessage ? `<p class="global-message">${escapeHtml(globalMessage)}</p>` : ''}
    </div>
    <div class="courses-status">
  `;
  
  // ベーシックコース
  if (courses.basic) {
    html += createCourseStatusHTML(courses.basic, 'ベーシック');
  }
  
  // アドバンスコース
  if (courses.advance) {
    html += createCourseStatusHTML(courses.advance, 'アドバンス');
  }
  
  html += `
    </div>
    <div class="status-footer">
      <p class="last-updated">最終更新: ${formatLastUpdated(statusData.lastUpdated)}</p>
    </div>
  `;
  
  detailsElement.innerHTML = html;
}

/**
 * コース別ステータスHTMLを作成
 */
function createCourseStatusHTML(courseData, courseName) {
  const statusText = getStatusDisplayText(courseData.status);
  const statusClass = getStatusClass(courseData.status);
  return `
    <div class="course-item">
      <div class="course-header">
        <div class="course-info">
          <h5>${courseData.name}</h5>
          <span class="course-time">${courseData.time}</span>
        </div>
        <span class="course-status ${statusClass}">${statusText}</span>
      </div>
      ${courseData.message ? `<div class="course-message">${escapeHtml(courseData.message)}</div>` : ''}
    </div>
  `;
}

/**
 * デフォルトステータスコンテンツを表示
 */
function displayDefaultStatusContent(detailsElement, indicator) {
  if (indicator) {
    indicator.textContent = '通常通り開催';
    indicator.className = 'status-indicator running';
  }
  if (detailsElement) {
    const today = new Date();
    const formattedDate = formatDisplayDate(today.toISOString().split('T')[0]);
    detailsElement.innerHTML = `
      <div class="status-header-info">
        <h4>${formattedDate}のレッスン状況</h4>
        <p class="default-message">本日のレッスンは通常通り開催予定です。</p>
      </div>
      <div class="courses-status">
        <div class="course-item">
          <div class="course-header">
            <div class="course-info">
              <h5>ベーシックコース（年長〜小3）</h5>
              <span class="course-time">17:00-17:50</span>
            </div>
            <span class="course-status running">開催予定</span>
          </div>
        </div>
        <div class="course-item">
          <div class="course-header">
            <div class="course-info">
              <h5>アドバンスコース（小4〜小6）</h5>
              <span class="course-time">18:00-18:50</span>
            </div>
            <span class="course-status running">開催予定</span>
          </div>
        </div>
      </div>
      <div class="status-footer">
        <p class="update-note">変更がある場合は開始1時間半前までにお知らせいたします。</p>
      </div>
    `;
  }
}

/**
 * ステータス表示エラーを表示
 */
function displayStatusError(detailsElement) {
  if (!detailsElement) return;
  
  detailsElement.innerHTML = `
    <div class="status-error">
      <div style="font-size: 32px; margin-bottom: 15px;">⚠️</div>
      <h4>ステータス情報の読み込みに失敗しました</h4>
      <p>システムエラーが発生しました。しばらく経ってから再度お試しください。</p>
      <button onclick="loadStatusContent()" class="retry-btn">再試行</button>
    </div>
  `;
}

/**
 * ユーティリティ関数群
 */

function getStatusDisplayText(status) {
  const textMap = {
    'scheduled': '開催予定',
    'cancelled': '中止',
    'indoor': '屋内開催',
    'postponed': '延期'
  };
  return textMap[status] || '開催予定';
}

function getStatusClass(status) {
  const classMap = {
    'scheduled': 'running',
    'cancelled': 'cancelled',
    'indoor': 'running',
    'postponed': 'cancelled'
  };
  return classMap[status] || 'running';
}

function formatDisplayDate(dateString) {
  try {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${month}月${day}日（${weekday}）`;
  } catch (error) {
    return dateString;
  }
}

function formatLastUpdated(timestamp) {
  try {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    return '不明';
  }
}

/**
 * FAQ機能の初期化
 */
function initializeFAQ() {
  try {
    console.log('❓ FAQ機能初期化開始');
    
    // FAQManagerが利用可能な場合は使用
    if (typeof FAQManager !== 'undefined') {
      // FAQ機能を初期化
      if (!window.rbsFAQManager) {
        window.rbsFAQManager = new FAQManager();
      }
      
      const isInitialized = window.rbsFAQManager.init();
      if (isInitialized) {
        console.log('✅ FAQManager による初期化が完了しました');
        return;
      }
    }
    
    // FAQManagerが利用できない場合は従来の方法で初期化
    console.log('⚠️ FAQManagerが利用できないため、従来の方法で初期化します');
    initializeFAQFallback();
    
  } catch (error) {
    console.error('❌ FAQ初期化エラー:', error);
    // エラーが発生した場合は従来の方法で初期化
    initializeFAQFallback();
  }
}

/**
 * FAQ機能のフォールバック初期化
 */
function initializeFAQFallback() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  if (faqItems.length === 0) {
    console.warn('⚠️ FAQ項目が見つかりません');
    return;
  }
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');
    
    if (question && answer && icon) {
      // 初期状態の設定
      item.classList.remove('active');
      icon.textContent = '+';
      
      // クリックイベントの追加
      question.addEventListener('click', (e) => {
        e.preventDefault();
        
        const isOpen = item.classList.contains('active');
        
        if (isOpen) {
          // 閉じる
          item.classList.remove('active');
          icon.textContent = '+';
        } else {
          // 開く
          item.classList.add('active');
          icon.textContent = '−';
        }
      });
    }
  });
  
  console.log(`✅ FAQ フォールバック初期化完了 - ${faqItems.length}項目`);
}

/**
 * アニメーション機能の初期化
 */
function initializeAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animatedElements.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          entry.target.classList.add('animated');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  animatedElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
  });
  
  console.log('✨ アニメーション機能初期化完了:', animatedElements.length, '個の要素');
}

/**
 * ニュースセクションの初期化（ArticleService v2.0対応）
 */
async function initializeNewsSection() {
  console.log('📰 ニュースセクション初期化開始');
  
  const newsContainer = document.getElementById('news-list');
  const loadingStatus = document.getElementById('news-loading-status');
  const statusText = document.getElementById('news-status-text');
  
  if (!newsContainer) {
    console.log('📰 ニュースコンテナが見つかりません（正常：このページにはニュースセクションがない）');
    return;
  }
  
  try {
    // ローディング状態を表示
    showNewsLoadingStatus('ArticleServiceを初期化中...');
    
    // ArticleServiceが存在するかチェック
    if (!window.articleService) {
      let attempts = 0;
      const maxAttempts = 50; // 5秒間待機
      
      while (!window.articleService && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        
        if (attempts % 10 === 0) {
          showNewsLoadingStatus(`ArticleServiceを待機中... (${attempts/10}秒)`);
        }
      }
      
      if (!window.articleService) {
        throw new Error('ArticleServiceが見つかりません');
      }
    }
    
    // ArticleServiceを初期化
    showNewsLoadingStatus('記事データを読み込み中...');
    
    if (!window.articleService.isInitialized) {
      await window.articleService.init();
    }
    
    // 最新記事を取得（最大3件）
    const latestArticles = window.articleService.getLatestArticles(3);
    
    console.log('📰 記事取得完了:', latestArticles.length, '件');
    
    // ローディング状態を非表示
    hideNewsLoadingStatus();
    
    // 記事を表示
    displayNewsArticles(latestArticles);
    
    // 管理画面リンクの表示制御
    updateAdminLinkVisibility();
    
    console.log('✅ ニュースセクション初期化完了');
    
  } catch (error) {
    console.error('❌ ニュースセクション初期化エラー:', error);
    showNewsError(error);
  }
}

/**
 * ニュース記事を表示
 */
function displayNewsArticles(articles) {
  const newsContainer = document.getElementById('news-list');
  
  if (!newsContainer) return;
  
  // 既存の内容をクリア
  newsContainer.innerHTML = '';
  
  if (articles.length === 0) {
    // 記事がない場合
    newsContainer.innerHTML = `
      <div class="no-news-message" style="text-align: center; padding: 40px 20px; color: var(--gray-medium);">
        <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: var(--navy-dark);">お知らせはまだありません</h3>
        <p style="font-size: 14px; line-height: 1.6;">管理画面から記事を作成・公開すると、こちらに表示されます。</p>
      </div>
    `;
    return;
  }
  
  // 記事カードを生成
  articles.forEach((article, index) => {
    const newsCard = createNewsCard(article);
    newsContainer.appendChild(newsCard);
    
    // アニメーション効果
    setTimeout(() => {
      newsCard.classList.add('fade-in');
    }, index * 150);
  });
  
  console.log('📰 記事表示完了:', articles.length, '件');
}

/**
 * ニュースカードを作成
 */
function createNewsCard(article) {
  const card = document.createElement('article');
  card.className = 'news-card';
  
  // 記事データから値を取得（ArticleService v2.0で正規化済み）
  const categoryColor = article.categoryColor || '#4299e1';
  const formattedDate = article.formattedDate || article.date;
  const categoryName = article.categoryName || article.category;
  const excerpt = article.excerpt || article.summary || '';
  
  card.innerHTML = `
    <div class="news-card-header">
      <div class="news-meta">
        <span class="news-date">${escapeHtml(formattedDate)}</span>
        <span class="news-category ${article.category}" style="background-color: ${categoryColor};">
          ${escapeHtml(categoryName)}
        </span>
      </div>
      <h3 class="news-title">
        <a href="news-detail.html?id=${article.id}">${escapeHtml(article.title)}</a>
      </h3>
    </div>
    <div class="news-card-body">
      <p class="news-excerpt">${escapeHtml(excerpt)}</p>
      <div class="news-actions">
        <a href="news-detail.html?id=${article.id}" class="news-read-more">続きを読む</a>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * ニュース読み込み状態を表示
 */
function showNewsLoadingStatus(message) {
  const loadingStatus = document.getElementById('news-loading-status');
  const statusText = document.getElementById('news-status-text');
  
  if (loadingStatus && statusText) {
    statusText.textContent = message;
    loadingStatus.style.display = 'block';
  }
}

/**
 * ニュース読み込み状態を非表示
 */
function hideNewsLoadingStatus() {
  const loadingStatus = document.getElementById('news-loading-status');
  
  if (loadingStatus) {
    loadingStatus.style.display = 'none';
  }
}

/**
 * ニュースエラーを表示
 */
function showNewsError(error) {
  const newsContainer = document.getElementById('news-list');
  const loadingStatus = document.getElementById('news-loading-status');
  
  if (loadingStatus) {
    loadingStatus.style.display = 'none';
  }
  
  if (newsContainer) {
    newsContainer.innerHTML = `
      <div class="news-error" style="text-align: center; padding: 40px 20px; color: var(--primary-red);">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 15px;">ニュースの読み込みに失敗しました</h3>
        <p style="font-size: 14px; margin-bottom: 10px; color: var(--gray-medium);">システムエラーが発生しました。</p>
        <p class="error-details" style="font-size: 12px; margin-bottom: 20px; color: var(--gray-medium); font-family: monospace;">エラー詳細: ${error.message}</p>
        <div class="error-actions" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button onclick="location.reload()" class="btn-retry" style="padding: 8px 16px; background: var(--primary-blue); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">再読み込み</button>
          <button onclick="showNewsDebugInfo()" class="btn-debug" style="padding: 8px 16px; background: var(--gray-light); color: var(--gray-dark); border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">デバッグ</button>
        </div>
      </div>
    `;
  }
}

/**
 * 管理画面リンクの表示制御
 */
function updateAdminLinkVisibility() {
  const adminLink = document.getElementById('news-admin-link');
  
  if (adminLink) {
    // 開発環境または管理者権限がある場合のみ表示
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.protocol === 'file:';
    
    if (isDevelopment) {
      adminLink.style.display = 'flex';
    }
  }
}

/**
 * デバッグ情報を表示
 */
function showNewsDebugInfo() {
  try {
    const debugInfo = window.articleService ? window.articleService.getDebugInfo() : null;
    const storageStatus = window.articleService ? window.articleService.checkStorageStatus() : null;
    
    console.log('🔍 トップページニュースデバッグ情報:', { debugInfo, storageStatus });
    
    let statusMessage = '';
    let recommendations = [];
    
    if (!window.articleService) {
      statusMessage = '❌ ArticleServiceが存在しません';
      recommendations.push('ページを再読み込みしてください');
    } else if (!debugInfo.isInitialized) {
      statusMessage = '⚠️ ArticleServiceが初期化されていません';
      recommendations.push('手動初期化を試してください');
    } else if (!storageStatus.hasData) {
      statusMessage = '📝 記事データがありません';
      recommendations.push('管理画面から記事を作成・公開してください');
    } else if (storageStatus.publishedArticles === 0) {
      statusMessage = '📋 公開済み記事がありません';
      recommendations.push('管理画面で記事を公開してください');
    } else {
      statusMessage = '✅ 正常に動作しています';
    }
    
    const debugContent = `
📊 トップページニュース診断結果

📁 記事データ統計:
・総記事数: ${storageStatus ? storageStatus.totalArticles : 0}件
・公開済み: ${storageStatus ? storageStatus.publishedArticles : 0}件
・下書き: ${storageStatus ? storageStatus.draftArticles : 0}件

🔧 システム状況:
・ArticleService存在: ${!!window.articleService ? 'はい' : 'いいえ'}
・ArticleService初期化: ${debugInfo ? debugInfo.isInitialized : false ? 'はい' : 'いいえ'}
・読み込み済み記事数: ${debugInfo ? debugInfo.articlesCount : 0}件

📋 診断結果: ${statusMessage}

${recommendations.length > 0 ? `
🔧 推奨アクション:
${recommendations.map(r => `・${r}`).join('\n')}
` : ''}

詳細はコンソールを確認してください。
    `;
    
    alert(debugContent);
    
    // 初期化されていない場合は手動初期化を提案
    if (window.articleService && !debugInfo.isInitialized) {
      if (confirm('ArticleServiceを手動で初期化しますか？')) {
        initializeArticleServiceManually();
      }
    }
    
  } catch (error) {
    console.error('デバッグ情報の取得に失敗:', error);
    alert(`デバッグ情報の取得に失敗しました: ${error.message}`);
  }
}

/**
 * ArticleServiceの手動初期化
 */
async function initializeArticleServiceManually() {
  try {
    console.log('🔄 ArticleServiceの手動初期化を開始...');
    showNewsLoadingStatus('ArticleServiceを手動初期化中...');
    
    if (!window.articleService) {
      throw new Error('ArticleServiceが存在しません');
    }
    
    await window.articleService.init();
    
    console.log('✅ ArticleServiceの手動初期化完了');
    
    // ニュースセクションを再初期化
    await initializeNewsSection();
    
    alert('✅ ArticleServiceの初期化が完了しました。ニュースを再読み込みしました。');
  } catch (error) {
    console.error('❌ ArticleServiceの手動初期化に失敗:', error);
    showNewsError(error);
    alert(`❌ ArticleServiceの初期化に失敗しました: ${error.message}`);
  }
}

/**
 * ユーティリティ関数
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ステータス関連関数をグローバルに公開
window.loadStatusContent = loadStatusContent;

// グローバルに公開（HTMLから呼び出し可能にする）
window.showNewsDebugInfo = showNewsDebugInfo;
window.initializeArticleServiceManually = initializeArticleServiceManually;
window.TopPageNews = {
  initializeNewsSection,
  displayNewsArticles,
  showNewsDebugInfo,
  initializeArticleServiceManually
};

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', initializeApp);

// スタイルを追加
const style = document.createElement('style');
style.textContent = `
  .news-card {
    transition: all 0.3s ease;
  }
  
  .news-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  .fade-in {
    animation: fadeInUp 0.6s ease-out;
  }
  
  @keyframes fadeInUp {
    from { 
      opacity: 0; 
      transform: translateY(20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  .btn-retry, .btn-debug {
    transition: all 0.3s ease;
  }
  
  .btn-retry:hover, .btn-debug:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
`;
document.head.appendChild(style);

console.log('📦 トップページ v2.0 JavaScript読み込み完了'); 