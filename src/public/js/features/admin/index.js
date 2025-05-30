/**
 * 管理機能メインエントリーポイント
 * 管理画面関連のサービスとコンポーネントを統合管理
 * @version 2.0.0
 */

import { articleDataService } from './services/ArticleDataService.js';
import { instagramDataService } from './services/InstagramDataService.js';
import { lessonStatusService } from './services/LessonStatusService.js';
import { uiManagerService } from './services/UIManagerService.js';
import { adminSystemService } from './services/AdminSystemService.js';
import { newsFormManager } from './components/NewsFormManager.js';
import { getCurrentPageType } from '../../shared/utils/urlUtils.js';

/**
 * 管理機能を初期化
 * @returns {Promise<void>}
 */
export async function initAdminFeature() {
  console.log('👨‍💼 管理機能初期化開始 v2.0');
  
  try {
    const pageType = getCurrentPageType();
    
    // 新しい統合管理システムで初期化
    await adminSystemService.init();
    
    // ページ固有の追加初期化
    switch (pageType) {
      case 'admin':
        await initAdminDashboard();
        break;
        
      case 'admin-news-editor':
        await initNewsEditor();
        break;
        
      default:
        console.log('👨‍💼 基本管理機能のみ初期化');
        break;
    }
    
    console.log('✅ 管理機能初期化完了');
    
  } catch (error) {
    console.error('❌ 管理機能初期化エラー:', error);
    
    // フォールバック: 個別サービスの初期化を試行
    await initFallbackServices();
    throw error;
  }
}

/**
 * フォールバック用の個別サービス初期化
 * @private
 */
async function initFallbackServices() {
  console.log('🔄 フォールバックモードで管理サービスを初期化中...');
  
  try {
    // 最低限のサービスを個別に初期化
    if (!articleDataService.initialized) {
      articleDataService.init();
    }
    
    if (!uiManagerService.initialized) {
      uiManagerService.init();
    }
    
    console.log('✅ フォールバックサービス初期化完了');
  } catch (error) {
    console.error('❌ フォールバックサービス初期化も失敗:', error);
  }
}

/**
 * 管理ダッシュボードの初期化
 * @private
 */
async function initAdminDashboard() {
  console.log('📊 管理ダッシュボード初期化中...');
  
  // 統計情報の表示
  await displayDashboardStats();
  
  // 最近の活動の表示
  await displayRecentActivity();
  
  console.log('✅ 管理ダッシュボード初期化完了');
}

/**
 * ニュースエディターの初期化
 * @private
 */
async function initNewsEditor() {
  console.log('📝 ニュースエディター初期化中...');
  
  // フォーム管理の初期化（AdminSystemServiceで既に初期化済み）
  if (!newsFormManager.initialized) {
    newsFormManager.init();
  }
  
  console.log('✅ ニュースエディター初期化完了');
}

/**
 * ダッシュボード統計情報を表示
 * @private
 */
async function displayDashboardStats() {
  try {
    const articleStats = articleDataService.getStats();
    const instagramStats = instagramDataService.getStats();
    const lessonStats = lessonStatusService.getStats();
    
    console.log('📊 統計情報:', {
      articles: articleStats,
      instagram: instagramStats,
      lessons: lessonStats
    });
    
    // UIManagerServiceを使用して統計情報を表示
    uiManagerService.updateStats({
      articles: articleStats,
      instagram: instagramStats,
      lessons: lessonStats
    });
    
  } catch (error) {
    console.error('❌ 統計情報表示エラー:', error);
    uiManagerService.showNotification('error', '統計情報の取得に失敗しました');
  }
}

/**
 * 最近の活動を表示
 * @private
 */
async function displayRecentActivity() {
  try {
    // 最近の記事
    const recentArticles = articleDataService.getArticles({ limit: 5 });
    
    // 最近のInstagram投稿
    const recentPosts = instagramDataService.getPosts({ limit: 5 });
    
    // 今後のレッスン状況
    const upcomingLessons = lessonStatusService.getUpcomingStatus(7);
    
    console.log('📈 最近の活動:', {
      articles: recentArticles.length,
      posts: recentPosts.length,
      lessons: Object.keys(upcomingLessons).length
    });
    
    // 活動情報をDOMに表示
    updateActivityDisplay({
      articles: recentArticles,
      posts: recentPosts,
      lessons: upcomingLessons
    });
    
  } catch (error) {
    console.error('❌ 最近の活動表示エラー:', error);
    uiManagerService.showNotification('warning', '一部の活動情報の取得に失敗しました');
  }
}

/**
 * 活動情報をDOMに表示
 * @private
 * @param {Object} activity - 活動データ
 */
function updateActivityDisplay(activity) {
  // 最近の記事リスト
  const articlesContainer = document.querySelector('#recent-articles');
  if (articlesContainer) {
    articlesContainer.innerHTML = activity.articles.map(article => `
      <div class="recent-item">
        <h4>${escapeHtml(article.title)}</h4>
        <p>状態: ${article.status === 'published' ? '公開' : '下書き'}</p>
        <small>${formatDate(article.updatedAt)}</small>
      </div>
    `).join('');
  }
  
  // 最近のInstagram投稿リスト
  const postsContainer = document.querySelector('#recent-posts');
  if (postsContainer) {
    postsContainer.innerHTML = activity.posts.map(post => `
      <div class="recent-item">
        <p>${truncateText(post.caption || 'キャプションなし', 50)}</p>
        <small>${formatDate(post.createdAt)}</small>
      </div>
    `).join('');
  }
  
  // 今後のレッスン状況
  const lessonsContainer = document.querySelector('#upcoming-lessons');
  if (lessonsContainer) {
    const lessonItems = Object.entries(activity.lessons).map(([date, status]) => `
      <div class="recent-item">
        <p>${date}: ${getStatusLabel(status.status)}</p>
        ${status.message ? `<small>${escapeHtml(status.message)}</small>` : ''}
      </div>
    `).join('');
    
    lessonsContainer.innerHTML = lessonItems || '<p>予定されたレッスン状況の変更はありません</p>';
  }
}

/**
 * 管理機能の状態を取得
 * @returns {Object}
 */
export function getAdminStatus() {
  return {
    // 新しい統合システムの状態
    adminSystem: adminSystemService.getSystemStatus(),
    
    // 個別サービスの状態（後方互換性）
    services: {
      articleService: articleDataService.initialized,
      instagramService: instagramDataService.initialized,
      lessonService: lessonStatusService.initialized,
      uiManagerService: uiManagerService.initialized,
      newsFormManager: newsFormManager.initialized
    }
  };
}

/**
 * 管理システムのパフォーマンス情報を取得
 * @returns {Object}
 */
export function getAdminPerformanceInfo() {
  return adminSystemService.getPerformanceInfo();
}

/**
 * データをエクスポート
 * @returns {Object}
 */
export function exportAllAdminData() {
  return {
    articles: articleDataService.exportData(),
    instagram: instagramDataService.exportData(),
    lessons: lessonStatusService.exportData(),
    systemInfo: adminSystemService.getSystemStatus(),
    exportedAt: new Date().toISOString(),
    version: '2.0'
  };
}

/**
 * 管理システムのログアウト
 * @returns {Promise<void>}
 */
export async function logoutAdmin() {
  try {
    await adminSystemService.logout();
  } catch (error) {
    console.error('❌ 管理システムログアウトエラー:', error);
    throw error;
  }
}

/**
 * 管理機能を破棄
 */
export function destroyAdminFeature() {
  console.log('🗑️ 管理機能破棄開始');
  
  try {
    // 統合システムの破棄
    adminSystemService.destroy();
    
    console.log('✅ 管理機能破棄完了');
  } catch (error) {
    console.error('❌ 管理機能破棄エラー:', error);
    
    // フォールバック: 個別サービスの破棄
    try {
      articleDataService.destroy();
      instagramDataService.destroy();
      lessonStatusService.destroy();
      uiManagerService.destroy();
      newsFormManager.destroy();
    } catch (fallbackError) {
      console.error('❌ フォールバック破棄エラー:', fallbackError);
    }
  }
}

// ユーティリティ関数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusLabel(status) {
  const statusLabels = {
    normal: '通常開催',
    cancelled: '中止',
    indoor: '室内開催',
    delayed: '開始時刻変更',
    special: '特別プログラム'
  };
  return statusLabels[status] || status;
}

// 後方互換性のためのエクスポート
export {
  articleDataService,
  instagramDataService,
  lessonStatusService,
  uiManagerService,
  adminSystemService,
  newsFormManager
}; 