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
    
    // デバッグ: LocalStorageの直接確認
    console.group('🔍 LocalStorage デバッグ情報');
    try {
      const articlesKey = CONFIG.storage.keys.articles;
      console.log('📝 使用中のキー:', articlesKey);
      
      const rawData = localStorage.getItem(articlesKey);
      console.log('💾 Raw データ長:', rawData ? rawData.length : 0);
      
      if (rawData) {
        const parsedData = JSON.parse(rawData);
        console.log('📊 パースされたデータ:', {
          type: Array.isArray(parsedData) ? 'Array' : typeof parsedData,
          length: Array.isArray(parsedData) ? parsedData.length : 'N/A',
          sample: Array.isArray(parsedData) && parsedData.length > 0 ? 
            parsedData.slice(0, 2).map(a => ({
              id: a?.id,
              title: a?.title?.substring(0, 30) + '...',
              status: a?.status,
              category: a?.category
            })) : 'データなし'
        });
      } else {
        console.log('⚠️ LocalStorageにデータが見つかりません');
      }
      
      // 全LocalStorageキーを確認
      const allKeys = Object.keys(localStorage);
      const rbsKeys = allKeys.filter(key => key.includes('rbs') || key.includes('article'));
      console.log('🗂️ 関連キー一覧:', rbsKeys);
      
    } catch (error) {
      console.error('❌ LocalStorage確認エラー:', error);
    }
    console.groupEnd();
    
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

/**
 * 統合ニュースシステムの動作確認
 * 各ページでlocal storageの参照状況を確認
 */
export function verifyNewsSystemIntegration() {
  try {
    console.group('🔍 統合ニュースシステム動作確認');
    
    // 1. CONFIG確認
    console.log('📋 CONFIG確認:');
    console.log('  - storage key:', CONFIG.storage.keys.articles);
    console.log('  - debug enabled:', CONFIG.debug.enabled);
    
    // 2. Local Storage確認
    console.log('💾 Local Storage確認:');
    const articlesData = localStorage.getItem(CONFIG.storage.keys.articles);
    const articleCount = articlesData ? JSON.parse(articlesData).length : 0;
    console.log(`  - ${CONFIG.storage.keys.articles}:`, articleCount + '件の記事');
    
    // 3. サービス確認
    console.log('🔧 サービス確認:');
    const newsService = getUnifiedNewsService();
    console.log('  - UnifiedNewsService初期化:', newsService?.initialized || false);
    console.log('  - ページタイプ:', newsService?.pageType || 'unknown');
    console.log('  - 記事数:', newsService?.articles?.length || 0);
    
    // 4. DOM要素確認
    console.log('🎯 DOM要素確認:');
    const pageType = newsService?.pageType || 'unknown';
    const targetElements = getTargetElementsForPage(pageType);
    Object.entries(targetElements).forEach(([key, selector]) => {
      const element = document.querySelector(selector);
      console.log(`  - ${key} (${selector}):`, element ? '✅ 存在' : '❌ 未発見');
    });
    
    // 5. イベントバス確認
    console.log('📡 EventBus確認:');
    const eventBusStatus = EventBus.getStatus?.() || { listeners: 'unknown' };
    console.log('  - イベントリスナー数:', eventBusStatus.listeners || 'unknown');
    
    console.groupEnd();
    
    return {
      configOk: !!CONFIG.storage.keys.articles,
      storageOk: articleCount > 0,
      serviceOk: newsService?.initialized || false,
      domOk: Object.values(targetElements).some(selector => document.querySelector(selector)),
      pageType,
      articleCount
    };
    
  } catch (error) {
    console.error('❌ 統合ニュースシステム確認エラー:', error);
    return { error: error.message };
  }
}

/**
 * ページタイプ別のターゲット要素を取得
 * @private
 */
function getTargetElementsForPage(pageType) {
  const commonTargets = {
    newsSection: '#news, [data-news-dynamic="true"]',
    newsContainer: '.news-container, .news-section'
  };
  
  switch (pageType) {
    case 'home':
      return {
        ...commonTargets,
        newsList: '#news-list',
        newsLoadingStatus: '#news-loading-status'
      };
    case 'news-list':
      return {
        ...commonTargets,
        newsGrid: '#news-grid',
        filterButtons: '.filter-btn[data-category]',
        searchResults: '#search-results'
      };
    case 'news-detail':
      return {
        ...commonTargets,
        articleContent: '#article-content',
        articleTitle: '#article-title',
        relatedArticles: '#related-articles-container'
      };
    case 'admin':
      return {
        newsEditor: '#news-content',
        newsList: '#news-list',
        newsFilter: '#news-filter'
      };
    default:
      return commonTargets;
  }
}

/**
 * ニュースデータの詳細表示
 */
export function showNewsDataDetails() {
  if (!CONFIG.debug.enabled) {
    console.log('デバッグモードが無効です。CONFIG.debug.enabledをtrueに設定してください。');
    return;
  }
  
  try {
    const newsService = getUnifiedNewsService();
    const articles = newsService?.articles || [];
    
    console.group('📰 ニュースデータ詳細');
    console.log('記事一覧:', articles);
    
    if (articles.length > 0) {
      console.log('最新記事:', articles[0]);
      console.log('カテゴリー統計:', newsService.getCategoryStats());
    }
    
    // Local Storageの生データも表示
    const rawData = localStorage.getItem(CONFIG.storage.keys.articles);
    if (rawData) {
      console.log('Local Storage生データ:', JSON.parse(rawData));
    }
    
    console.groupEnd();
    
  } catch (error) {
    console.error('❌ ニュースデータ詳細表示エラー:', error);
  }
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
  window.verifyNewsSystem = verifyNewsSystemIntegration;
  window.showNewsDataDetails = showNewsDataDetails;
  window.debugUnifiedNews = debugNewsSystem;
  window.refreshNewsSystem = refreshNewsSystem;
  
  console.log('🔧 開発モード: ニュースシステム確認ヘルパー関数を設定しました');
  console.log('   - window.verifyNewsSystem() で統合確認');
  console.log('   - window.showNewsDataDetails() でデータ詳細表示');
  console.log('   - window.debugUnifiedNews() でデバッグ情報表示');
  console.log('   - window.refreshNewsSystem() でシステムリフレッシュ');
}

/**
 * 手動デバッグ関数 - ブラウザコンソールから実行可能
 */
export function manualDebugNews() {
  console.group('🔧 手動ニュースデバッグ');
  
  try {
    // 1. LocalStorage確認
    console.log('1️⃣ LocalStorage状況:');
    const articlesKey = CONFIG.storage.keys.articles;
    const rawData = localStorage.getItem(articlesKey);
    console.log('   キー:', articlesKey);
    console.log('   データ有無:', !!rawData);
    console.log('   データ長:', rawData ? rawData.length : 0);
    
    if (rawData) {
      const parsedData = JSON.parse(rawData);
      console.log('   記事数:', Array.isArray(parsedData) ? parsedData.length : 'N/A');
    }
    
    // 2. サービス状況
    console.log('\n2️⃣ サービス状況:');
    const newsService = window.UnifiedNewsService;
    console.log('   サービス有無:', !!newsService);
    if (newsService) {
      console.log('   初期化済み:', newsService.initialized);
      console.log('   記事数:', newsService.articles?.length || 0);
      console.log('   ページタイプ:', newsService.pageType);
    }
    
    // 3. DOM要素確認
    console.log('\n3️⃣ DOM要素確認:');
    const newsElements = {
      'news-list (ホーム)': document.getElementById('news-list'),
      'news-grid (一覧)': document.getElementById('news-grid'),
      'news-loading-status': document.getElementById('news-loading-status')
    };
    
    Object.entries(newsElements).forEach(([name, element]) => {
      console.log(`   ${name}:`, element ? '✅ 存在' : '❌ 未発見');
      if (element) {
        console.log(`     - 可視性: ${element.offsetHeight > 0 ? '可視' : '非可視'}`);
        console.log(`     - 子要素数: ${element.children.length}`);
      }
    });
    
    // 4. 記事カード確認
    console.log('\n4️⃣ 記事カード確認:');
    const cards = document.querySelectorAll('.news-card');
    console.log('   カード数:', cards.length);
    
    if (cards.length > 0) {
      const firstCard = cards[0];
      const style = window.getComputedStyle(firstCard);
      console.log('   最初のカード状態:');
      console.log('     - opacity:', style.opacity);
      console.log('     - transform:', style.transform);
      console.log('     - display:', style.display);
      console.log('     - 可視性:', firstCard.offsetHeight > 0 && firstCard.offsetWidth > 0);
    }
    
    // 5. CSS変数確認
    console.log('\n5️⃣ CSS変数確認:');
    const rootStyle = window.getComputedStyle(document.documentElement);
    const cssVars = ['--primary-blue', '--white', '--gray-light'];
    cssVars.forEach(varName => {
      const value = rootStyle.getPropertyValue(varName).trim();
      console.log(`   ${varName}: ${value || '未定義'}`);
    });
    
  } catch (error) {
    console.error('❌ デバッグ実行エラー:', error);
  }
  
  console.groupEnd();
}

// デバッグ関数をグローバルに公開
window.debugNews = manualDebugNews;