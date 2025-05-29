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
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        // 他のFAQを閉じる
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('open');
          }
        });
        
        // 現在のFAQをトグル
        item.classList.toggle('open');
      });
    }
  });
}

/**
 * ニュースセクションの初期化
 */
async function initializeNewsSection() {
  try {
    // ニュース一覧の読み込み
    EventBus.emit('news:load-for-index');
    
    // デバッグ情報のイベントリスナー
    EventBus.on('debug:show-news-info', () => {
      showNewsDebugInfo();
    });
    
  } catch (error) {
    console.error('ニュースセクションの初期化に失敗:', error);
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