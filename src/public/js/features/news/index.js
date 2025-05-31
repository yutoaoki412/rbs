/**
 * 統合ニュース管理システム エントリーポイント
 * 洗練されたアーキテクチャで機能別に分割
 * @version 4.0.0 - リファクタリング完了版
 */

import { CONFIG } from '../../shared/constants/config.js';
import { EventBus } from '../../shared/services/EventBus.js';
import { getUnifiedNewsService } from './services/UnifiedNewsService.js';
import NewsPageRenderer from './components/NewsPageRenderer.js';

/**
 * 統合ニュースシステムの初期化
 * @returns {Promise<Object>} 初期化されたサービスとコンポーネント
 */
export async function initUnifiedNewsSystem() {
  try {
    console.log('🚀 統合ニュースシステム初期化開始');
    
    // 1. メインサービス初期化
    const newsService = getUnifiedNewsService();
    await newsService.init();
    
    // 2. ページレンダラー初期化
    const pageRenderer = new NewsPageRenderer(newsService);
    await pageRenderer.initializePage();
    
    // 3. グローバルアクセス設定
    window.UnifiedNewsService = newsService;
    window.NewsPageRenderer = pageRenderer;
    
    // 4. 開発環境での管理画面リンク表示
    if (CONFIG.debug.enabled) {
      showAdminLinksIfDev();
    }
    
    console.log('✅ 統合ニュースシステム初期化完了');
    
    // 初期化完了イベント
    EventBus.emit('unifiedNews:initialized', {
      service: newsService,
      renderer: pageRenderer,
      pageType: newsService.pageType
    });
    
    return {
      service: newsService,
      renderer: pageRenderer
    };
    
  } catch (error) {
    console.error('❌ 統合ニュースシステム初期化エラー:', error);
    throw error;
  }
}

/**
 * 開発環境での管理画面リンク表示
 * @private
 */
function showAdminLinksIfDev() {
  try {
    const adminLinks = document.querySelectorAll(
      '#news-admin-link, #admin-link, #admin-controls, [data-dev="admin-link"]'
    );
    
    adminLinks.forEach(link => {
      if (link) {
        link.style.display = 'block';
        link.style.opacity = '0.8';
        
        // 開発環境表示の明示
        if (!link.hasAttribute('data-dev-marked')) {
          link.title = '開発環境でのみ表示';
          link.setAttribute('data-dev-marked', 'true');
        }
      }
    });
    
    if (adminLinks.length > 0) {
      console.log('🔧 開発環境: 管理画面リンクを表示しました');
    }
    
  } catch (error) {
    console.warn('⚠️ 管理画面リンク表示エラー:', error);
  }
}

/**
 * ニュースシステムのリフレッシュ
 */
export async function refreshNewsSystem() {
  try {
    const newsService = getUnifiedNewsService();
    const pageRenderer = window.NewsPageRenderer;
    
    if (newsService && pageRenderer) {
      await newsService.refresh();
      await pageRenderer.refreshPage();
      console.log('🔄 ニュースシステムリフレッシュ完了');
    } else {
      console.warn('⚠️ ニュースシステムが初期化されていません');
    }
    
  } catch (error) {
    console.error('❌ ニュースシステムリフレッシュエラー:', error);
  }
}

/**
 * デバッグ情報を表示
 */
export function debugNewsSystem() {
  if (!CONFIG.debug.enabled) {
    console.log('デバッグモードが無効です');
    return;
  }
  
  const newsService = getUnifiedNewsService();
  const pageRenderer = window.NewsPageRenderer;
  
  console.group('🔍 統合ニュースシステム デバッグ情報');
  console.log('サービス初期化状態:', newsService?.initialized || false);
  console.log('ページタイプ:', newsService?.pageType || 'unknown');
  console.log('記事数:', newsService?.articles?.length || 0);
  console.log('レンダラー状態:', !!pageRenderer);
  console.log('カテゴリー統計:', newsService?.getCategoryStats() || {});
  console.groupEnd();
  
  return {
    service: newsService,
    renderer: pageRenderer,
    stats: newsService?.getCategoryStats()
  };
}

// 後方互換性用のエイリアス
export { initUnifiedNewsSystem as initNewsFeature };
export { getUnifiedNewsService as getNewsDataService };

// 主要なエクスポート
export { getUnifiedNewsService } from './services/UnifiedNewsService.js';
export { default as NewsPageRenderer } from './components/NewsPageRenderer.js';
export { default as NewsUtils } from './utils/NewsUtils.js';

// 開発環境でのグローバルヘルパー
if (CONFIG.debug.enabled && typeof window !== 'undefined') {
  window.debugUnifiedNews = debugNewsSystem;
  window.refreshNewsSystem = refreshNewsSystem;
  
  console.log('🔧 開発モード: グローバルヘルパー関数を設定しました');
  console.log('   - window.debugUnifiedNews() でデバッグ情報表示');
  console.log('   - window.refreshNewsSystem() でシステムリフレッシュ');
} 