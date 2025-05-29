/**
 * RBS陸上教室 インデックスページ v3.0
 * メインページの機能を統合管理
 */

import { actionHandler } from '../shared/services/ActionHandler.js';
import { EventBus } from '../shared/services/EventBus.js';

/**
 * インデックスページ初期化
 */
export async function init(app) {
  console.log('📄 インデックスページ初期化開始');
  
  // インデックス固有のアクション登録
  registerIndexActions();
  
  // ページ固有の初期化処理
  await initializePageFeatures();
  
  console.log('✅ インデックスページ初期化完了');
}

/**
 * インデックスページ固有のアクションを登録
 */
function registerIndexActions() {
  // ActionHandlerが使用可能かチェック
  if (typeof actionHandler === 'undefined' || !actionHandler) {
    console.warn('⚠️ ActionHandlerが使用できません。フォールバック処理を実行します。');
    registerFallbackActions();
    return;
  }

  console.log('🔧 インデックス固有アクション登録開始');
  
  actionHandler.registerMultiple({
    // ステータス切り替え（シンプル版）
    'toggle-status': (element) => {
      const statusBanner = document.getElementById('today-status');
      
      if (statusBanner) {
        // CSSの.status-banner.activeクラスを使用してトグル
        const isActive = statusBanner.classList.contains('active');
        
        if (isActive) {
          statusBanner.classList.remove('active');
          element.setAttribute('aria-expanded', 'false');
        } else {
          statusBanner.classList.add('active');
          element.setAttribute('aria-expanded', 'true');
        }
        
        console.log(`🔄 レッスン状況トグル: ${isActive ? 'クローズ' : 'オープン'}`);
      } else {
        console.warn('⚠️ ステータスバナー要素が見つかりません');
      }
    },

    // ニュースデバッグ表示
    'show-news-debug': () => {
      EventBus.emit('debug:show-news-info');
    }
  });
  
  console.log('✅ インデックス固有アクション登録完了');
}

/**
 * フォールバック用のアクション登録
 */
function registerFallbackActions() {
  console.log('🔧 フォールバック版アクション登録開始');
  
  // 直接イベントリスナーを設定
  const statusToggleElement = document.querySelector('[data-action="toggle-status"]');
  if (statusToggleElement) {
    statusToggleElement.addEventListener('click', (event) => {
      event.preventDefault();
      
      const statusBanner = document.getElementById('today-status');
      
      if (statusBanner) {
        const isActive = statusBanner.classList.contains('active');
        
        if (isActive) {
          statusBanner.classList.remove('active');
          statusToggleElement.setAttribute('aria-expanded', 'false');
        } else {
          statusBanner.classList.add('active');
          statusToggleElement.setAttribute('aria-expanded', 'true');
        }
        
        console.log('📱 フォールバック版レッスン状況トグル実行');
      }
    });
  }
  
  console.log('✅ フォールバック版アクション登録完了');
}

/**
 * ページ固有の機能を初期化
 */
async function initializePageFeatures() {
  // ヒーロービデオの処理
  initializeHeroVideo();
  
  // スクロールアニメーション
  initializeScrollAnimations();
  
  // FAQ機能
  initializeFAQ();
  
  // ニュースセクション
  await initializeNewsSection();
  
  // レッスン状況の読み込み
  await initializeLessonStatus();
}

/**
 * ヒーロービデオの初期化
 */
function initializeHeroVideo() {
  const heroVideo = document.getElementById('hero-video');
  if (heroVideo) {
    // ビデオのロード完了を待つ
    heroVideo.addEventListener('loadeddata', () => {
      console.log('📹 ヒーロービデオ読み込み完了');
    });
    
    // ビデオエラーハンドリング
    heroVideo.addEventListener('error', (e) => {
      console.warn('⚠️ ヒーロービデオの読み込みに失敗:', e);
      heroVideo.style.display = 'none';
    });
  }
}

/**
 * スクロールアニメーションの初期化
 */
function initializeScrollAnimations() {
  const animateElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animateElements.length === 0) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  animateElements.forEach(element => {
    observer.observe(element);
  });
}

/**
 * FAQ機能の初期化
 */
function initializeFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  if (faqItems.length === 0) {
    console.warn('⚠️ FAQ項目が見つかりません');
    return;
  }
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const icon = item.querySelector('.faq-icon');
    
    if (question && icon) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // 他のFAQを閉じる
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherQuestion = otherItem.querySelector('.faq-question');
            const otherIcon = otherItem.querySelector('.faq-icon');
            if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
            if (otherIcon) otherIcon.textContent = '+';
          }
        });
        
        // 現在のFAQをトグル
        if (isActive) {
          item.classList.remove('active');
          question.setAttribute('aria-expanded', 'false');
          icon.textContent = '+';
        } else {
          item.classList.add('active');
          question.setAttribute('aria-expanded', 'true');
          icon.textContent = '−';
        }
        
        console.log(`FAQ ${isActive ? 'クローズ' : 'オープン'}: ${question.textContent}`);
      });
      
      // 初期設定
      question.setAttribute('aria-expanded', 'false');
      icon.textContent = '+';
    }
  });
  
  console.log(`✅ FAQ機能初期化完了 - ${faqItems.length}項目`);
}

/**
 * ニュースセクションの初期化
 */
async function initializeNewsSection() {
  try {
    console.log('📰 トップページニュースセクション初期化開始');
    
    // ニュース読み込み状況を表示
    const newsLoadingStatus = document.getElementById('news-loading-status');
    const newsStatusText = document.getElementById('news-status-text');
    
    if (newsStatusText) {
      newsStatusText.textContent = 'ニュースを読み込み中...';
    }
    

    // ArticleServiceが利用可能か確認（Application.jsで初期化済み）
    let articleService = window.articleService;
    
    if (!articleService) {
      console.warn('⚠️ ArticleServiceが初期化されていません。Application.jsの初期化を待機中...');
      if (newsStatusText) {
        newsStatusText.textContent = 'ArticleServiceの初期化を待機中...';
      }
      
      // 短時間待機してからリトライ
      await new Promise(resolve => setTimeout(resolve, 1000));
      articleService = window.articleService;
      
      // まだない場合は手動初期化を試行
      if (!articleService) {
        console.log('🔄 ArticleServiceを手動初期化中...');
        try {
          const { default: ArticleService } = await import('../modules/news/article-service.js');
          articleService = new ArticleService();
          await articleService.init();
          window.articleService = articleService;
          console.log('✅ ArticleService手動初期化完了');
        } catch (error) {
          console.error('❌ ArticleServiceの初期化に失敗:', error);
          showNewsError('記事システムの初期化に失敗しました');
          return;
        }
      }
    }
    
    // ArticleServiceが初期化されていない場合は初期化
    if (articleService && !articleService.isInitialized) {
      console.log('🔄 ArticleServiceを初期化中...');
      if (newsStatusText) {
        newsStatusText.textContent = 'ArticleServiceを初期化中...';
      }
      
      try {
        await articleService.init();
        console.log('✅ ArticleService初期化完了');
      } catch (error) {
        console.error('❌ ArticleService初期化失敗:', error);
        showNewsError('記事システムの初期化に失敗しました');
        return;
      }
    }
    
    // データの最新化を確認
    if (articleService && articleService.refresh) {
      await articleService.refresh();
    }
    
    // 記事を読み込んで表示
    await displayIndexNews(articleService);
    
    // デバッグ機能（開発時のみ）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const adminLink = document.getElementById('news-admin-link');
      if (adminLink) {
        adminLink.style.display = 'flex';
      }
    }
    
    // デバッグ情報のイベントリスナー
    EventBus.on('debug:show-news-info', () => {
      showNewsDebugInfo();
    });
    
    console.log('✅ トップページニュースセクション初期化完了');
    
  } catch (error) {
    console.error('❌ ニュースセクションの初期化に失敗:', error);
    showNewsError('ニュースの読み込みに失敗しました');
  }
}

/**
 * トップページ用ニュース表示
 */
async function displayIndexNews(articleService) {
  const newsList = document.getElementById('news-list');
  const newsLoadingStatus = document.getElementById('news-loading-status');
  
  if (!newsList) {
    console.warn('⚠️ news-list要素が見つかりません');
    return;
  }
  
  try {
    // 最新記事を取得（最大3件）
    const latestArticles = articleService.getLatestArticles(3);
    
    console.log('📰 トップページに表示する記事:', latestArticles.length, '件');
    
    if (latestArticles.length === 0) {
      // 記事がない場合の表示
      newsList.innerHTML = `
        <div class="no-news-message">
          <div style="text-align: center; padding: 60px 20px; color: var(--gray-medium);">
            <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
            <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 15px; color: var(--navy-dark);">記事がまだありません</h3>
            <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.6;">
              現在公開中の記事がありません。<br>
              新しい情報が追加されるまでお待ちください。
            </p>
            <a href="admin.html" class="btn" style="display: inline-block; padding: 12px 24px; background: var(--primary-blue); color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              管理画面で記事を作成
            </a>
          </div>
        </div>
      `;
    } else {
      // 記事を表示
      newsList.innerHTML = '';
      
      latestArticles.forEach((article, index) => {
        const newsCard = createIndexNewsCard(article);
        newsList.appendChild(newsCard);
        
        // アニメーション効果
        setTimeout(() => {
          newsCard.classList.add('fade-in');
        }, index * 200);
      });
    }
    
    // ローディング状態を非表示
    if (newsLoadingStatus) {
      newsLoadingStatus.style.display = 'none';
    }
    
  } catch (error) {
    console.error('❌ トップページニュース表示エラー:', error);
    showNewsError('記事の表示に失敗しました');
  }
}

/**
 * トップページ用ニュースカードを作成
 */
function createIndexNewsCard(article) {
  const card = document.createElement('article');
  card.className = 'news-card';
  card.setAttribute('data-category', article.category);
  
  // カテゴリー色の設定
  const categoryColors = {
    'announcement': '#4299e1',
    'event': '#38b2ac',
    'media': '#9f7aea',
    'important': '#f56565'
  };
  
  const categoryColor = categoryColors[article.category] || categoryColors.announcement;
  const formattedDate = article.formattedDate || article.date;
  const categoryName = article.categoryName || article.category;
  const excerpt = article.excerpt || article.summary || '';
  
  card.innerHTML = `
    <div class="news-card-header">
      <div class="news-meta">
        <div class="news-date">${escapeHtml(formattedDate)}</div>
        <div class="news-category ${article.category}" style="background-color: ${categoryColor};">
          ${escapeHtml(categoryName)}
        </div>
      </div>
      <h2 class="news-title">
        <a href="news-detail.html?id=${article.id}">${escapeHtml(article.title)}</a>
      </h2>
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
 * ニュースエラーを表示
 */
function showNewsError(message) {
  const newsList = document.getElementById('news-list');
  const newsLoadingStatus = document.getElementById('news-loading-status');
  
  if (newsList) {
    newsList.innerHTML = `
      <div class="news-error">
        <div style="text-align: center; padding: 60px 20px; color: var(--primary-red);">
          <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
          <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 15px; color: var(--navy-dark);">ニュース読み込みエラー</h3>
          <p style="font-size: 16px; margin-bottom: 25px; line-height: 1.6;">${escapeHtml(message)}</p>
          <button onclick="window.location.reload()" class="btn" style="display: inline-block; padding: 12px 24px; background: var(--primary-blue); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            再読み込み
          </button>
        </div>
      </div>
    `;
  }
  
  if (newsLoadingStatus) {
    newsLoadingStatus.style.display = 'none';
  }
}

/**
 * レッスン状況の初期化
 */
async function initializeLessonStatus() {
  try {
    console.log('📅 レッスン状況初期化開始');
    
    // LessonStatusManagerを初期化
    let lessonStatusManager;
    if (typeof LessonStatusManager !== 'undefined') {
      lessonStatusManager = new LessonStatusManager();
    } else {
      // LessonStatusManagerが読み込まれていない場合は動的に読み込み
      try {
        const module = await import('../shared/services/lesson-status-manager.js');
        lessonStatusManager = new LessonStatusManager();
      } catch (error) {
        console.error('LessonStatusManagerの読み込みに失敗:', error);
        showLessonStatusError('レッスン状況管理システムの読み込みに失敗しました');
        return;
      }
    }
    
    // 今日のレッスン状況を取得
    const todayStatus = lessonStatusManager.getLessonStatus();
    console.log('📅 今日のレッスン状況:', todayStatus);
    
    // レッスン状況を表示
    displayLessonStatus(todayStatus, lessonStatusManager);
    
    // レッスン状況更新イベントのリスナーを設定
    window.addEventListener('lessonStatusUpdated', (event) => {
      console.log('📅 レッスン状況が更新されました:', event.detail);
      displayLessonStatus(event.detail, lessonStatusManager);
    });
    
    // LocalStorageの変更を監視（他のタブでの更新を検知）
    window.addEventListener('storage', (event) => {
      if (event.key === 'rbs_lesson_status') {
        console.log('📅 他のタブでレッスン状況が更新されました');
        const updatedStatus = lessonStatusManager.getLessonStatus();
        displayLessonStatus(updatedStatus, lessonStatusManager);
      }
    });
    
    console.log('✅ レッスン状況初期化完了');
    
  } catch (error) {
    console.error('レッスン状況の初期化に失敗:', error);
    showLessonStatusError('レッスン状況の読み込みに失敗しました');
  }
}

/**
 * レッスン状況を表示
 */
function displayLessonStatus(statusData, lessonStatusManager) {
  const statusIndicator = document.getElementById('global-status-indicator');
  const statusDetails = document.getElementById('status-details');
  
  if (!statusIndicator || !statusDetails) {
    console.warn('⚠️ レッスン状況表示要素が見つかりません');
    return;
  }
  
  // グローバルステータスの表示
  const globalStatusText = lessonStatusManager.getStatusText(statusData.globalStatus);
  const globalStatusIcon = lessonStatusManager.getStatusIcon(statusData.globalStatus);
  
  statusIndicator.textContent = globalStatusText;
  statusIndicator.className = `status-indicator ${statusData.globalStatus}`;
  
  // 詳細表示の構築（題名なし）
  let detailsHTML = '';
  
  // グローバルメッセージがある場合
  if (statusData.globalMessage) {
    detailsHTML += `
      <div class="global-message">
        <p>${escapeHtml(statusData.globalMessage)}</p>
      </div>
    `;
  }
  
  detailsHTML += `<div class="courses-status">`;
  
  // 各コースの状況を表示
  Object.entries(statusData.courses).forEach(([courseKey, courseData]) => {
    const statusText = lessonStatusManager.getStatusText(courseData.status);
    const statusIcon = lessonStatusManager.getStatusIcon(courseData.status);
    const statusColor = lessonStatusManager.getStatusColor(courseData.status);
    
    detailsHTML += `
      <div class="course-item">
        <div class="course-header">
          <div class="course-info">
            <h5>${escapeHtml(courseData.name)}</h5>
            <div class="course-time">${escapeHtml(courseData.time)}</div>
          </div>
          <div class="status-badge ${courseData.status}">
            ${statusText}
          </div>
        </div>
    `;
    
    // コース別メッセージがある場合
    if (courseData.message) {
      detailsHTML += `
        <div class="course-message">
          <p>${escapeHtml(courseData.message)}</p>
        </div>
      `;
    }
    
    detailsHTML += `</div>`;
  });
  
  detailsHTML += `</div>`;
  
  // フッター情報を追加
  detailsHTML += `
    <div class="status-footer">
      <div class="last-updated">最終更新: ${new Date().toLocaleString('ja-JP')}</div>
      <div class="update-note">※ 状況は随時更新されます</div>
    </div>
  `;
  
  statusDetails.innerHTML = detailsHTML;
}

/**
 * レッスン状況エラーを表示
 */
function showLessonStatusError(message) {
  const statusIndicator = document.getElementById('global-status-indicator');
  const statusDetails = document.getElementById('status-details');
  
  if (statusIndicator) {
    statusIndicator.textContent = 'エラー';
    statusIndicator.className = 'status-indicator error';
  }
  
  if (statusDetails) {
    statusDetails.innerHTML = `
      <div class="error-status">
        <p>${escapeHtml(message)}</p>
        <p>しばらく時間をおいてから再度お試しください。</p>
      </div>
    `;
  }
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * ニュースデバッグ情報を表示
 */
function showNewsDebugInfo() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    newsCount: document.querySelectorAll('.news-item').length,
    newsLoadingStatus: document.getElementById('news-loading-status')?.textContent,
    adminLinkVisible: document.getElementById('news-admin-link')?.style.display !== 'none'
  };
  
  const debugHTML = `
    <div class="debug-info">
      <h3>📊 ニュースデバッグ情報</h3>
      <ul>
        <li><strong>タイムスタンプ:</strong> ${debugInfo.timestamp}</li>
        <li><strong>表示記事数:</strong> ${debugInfo.newsCount}</li>
        <li><strong>読み込み状況:</strong> ${debugInfo.newsLoadingStatus || '不明'}</li>
        <li><strong>管理リンク表示:</strong> ${debugInfo.adminLinkVisible ? 'はい' : 'いいえ'}</li>
      </ul>
    </div>
  `;
  
  // モーダルまたは通知で表示
  actionHandler.showFeedback('デバッグ情報をコンソールに出力しました');
  console.log('🐛 ニュースデバッグ情報:', debugInfo);
}

/**
 * ページの破棄処理
 */
export function destroy() {
  console.log('🗑️ インデックスページ破棄中');
}