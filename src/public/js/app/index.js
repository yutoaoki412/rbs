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
  actionHandler.registerMultiple({
    // ステータス切り替え
    'toggle-status': (element) => {
      const statusContent = document.querySelector('.status-content');
      const toggleIcon = element.querySelector('.toggle-icon');
      
      if (statusContent && toggleIcon) {
        const isExpanded = statusContent.style.display !== 'none';
        
        statusContent.style.display = isExpanded ? 'none' : 'block';
        toggleIcon.textContent = isExpanded ? '▼' : '▲';
        element.setAttribute('aria-expanded', !isExpanded);
        
        // アニメーション効果
        if (!isExpanded) {
          statusContent.style.animation = 'fadeInDown 0.3s ease-out';
        }
      }
    },

    // ニュースデバッグ表示
    'show-news-debug': () => {
      EventBus.emit('debug:show-news-info');
    }
  });
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
    // レッスン状況の読み込み
    EventBus.emit('lesson-status:load-for-index');
    
  } catch (error) {
    console.error('レッスン状況の初期化に失敗:', error);
  }
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
  console.log('�� インデックスページ破棄中');
}