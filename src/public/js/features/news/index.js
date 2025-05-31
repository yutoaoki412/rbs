/**
 * ニュース機能統合インデックス
 * 統合記事管理システム対応版
 * @version 3.0.0
 */

// 統合サービス
export { default as NewsDataService, getNewsDataService } from './services/NewsDataService.js';

// 統合コンポーネント
export { default as NewsDisplayComponent, getNewsDisplayComponent } from './components/NewsDisplayComponent.js';

// 既存コントローラー（後方互換性）
export { default as NewsDetailController, initNewsDetailPage } from './controllers/NewsDetailController.js';

// 既存サービス（後方互換性）
export { default as MetadataService } from './services/MetadataService.js';
export { default as ShareService } from './services/ShareService.js';
export { default as NewsActionService, newsActionService } from './services/NewsActionService.js';

// 既存コンポーネント（後方互換性）
export { default as ArticleDisplay } from './components/ArticleDisplay.js';
export { default as RelatedArticles } from './components/RelatedArticles.js';
export { default as ShareButtons } from './components/ShareButtons.js';

/**
 * ニュース機能を初期化（統合版）
 * ページタイプに応じて適切な初期化を実行
 */
export async function initNewsFeature() {
  try {
    console.log('📰 統合ニュース機能初期化開始');
    
    // ページタイプを判定
    const currentPage = getCurrentPageType();
    console.log(`🎯 検出されたページタイプ: ${currentPage}`);
    
    // 統合ニュース表示コンポーネントの初期化
    const { getNewsDisplayComponent } = await import('./components/NewsDisplayComponent.js');
    const newsDisplayComponent = getNewsDisplayComponent();
    
    // ページタイプに関係なく統合コンポーネントを初期化
    if (currentPage !== 'unknown') {
      await newsDisplayComponent.init();
      
      // グローバルアクセス用に登録
      window.newsDisplayComponent = newsDisplayComponent;
    }
    
    // ページ固有の追加初期化
    switch (currentPage) {
      case 'news-detail':
        await initializeNewsDetailSpecific();
        break;
      
      case 'news-list':
        await initializeNewsListSpecific();
        break;
      
      case 'home':
        await initializeHomeNewsSpecific();
        break;
      
      default:
        console.log('📰 追加の初期化は不要なページです');
        break;
    }
    
    console.log('✅ 統合ニュース機能初期化完了');
    
  } catch (error) {
    console.error('❌ ニュース機能の初期化に失敗:', error);
    // エラーが発生してもページ全体の動作は継続
  }
}

/**
 * ニュース詳細ページ固有の初期化
 * @private
 */
async function initializeNewsDetailSpecific() {
  try {
    // ニュースアクションサービスの初期化（シェアボタンなど）
    const { newsActionService } = await import('./services/NewsActionService.js');
    
    // アクションサービスが初期化されていない場合のみ初期化
    if (!newsActionService.initialized) {
      newsActionService.init();
    }
    
    console.log('✅ ニュース詳細ページ固有の初期化完了');
    
  } catch (error) {
    console.warn('⚠️ ニュース詳細ページ初期化エラー:', error);
  }
}

/**
 * ニュース一覧ページ固有の初期化
 * @private
 */
async function initializeNewsListSpecific() {
  try {
    // 必要に応じて一覧ページ固有の機能を初期化
    console.log('✅ ニュース一覧ページ固有の初期化完了');
    
  } catch (error) {
    console.warn('⚠️ ニュース一覧ページ初期化エラー:', error);
  }
}

/**
 * ホームページニュース固有の初期化
 * @private
 */
async function initializeHomeNewsSpecific() {
  try {
    // 必要に応じてホームページ固有の機能を初期化
    console.log('✅ ホームページニュース固有の初期化完了');
    
  } catch (error) {
    console.warn('⚠️ ホームページニュース初期化エラー:', error);
  }
}

/**
 * 現在のページタイプを取得
 * @returns {string}
 */
function getCurrentPageType() {
  const pathname = window.location.pathname.toLowerCase();
  
  // より正確な判定ロジック
  if (pathname.includes('news-detail') || pathname.includes('news_detail')) {
    return 'news-detail';
  } else if (pathname.includes('news.html') || pathname.endsWith('/news')) {
    return 'news-list';
  } else if (pathname.includes('index.html') || pathname === '/' || pathname.endsWith('/') || pathname === '') {
    return 'home';
  } else if (pathname.includes('admin.html') || pathname.includes('admin')) {
    return 'admin';
  }
  
  return 'unknown';
}

/**
 * レガシー初期化関数（後方互換性）
 * @deprecated 新しいinitNewsFeature()を使用してください
 */
export async function initLegacyNewsDetailPage() {
  console.warn('⚠️ initLegacyNewsDetailPage() は非推奨です。initNewsFeature() を使用してください。');
  
  try {
    const { initNewsDetailPage } = await import('./controllers/NewsDetailController.js');
    return await initNewsDetailPage();
  } catch (error) {
    console.error('❌ レガシーニュース詳細ページ初期化エラー:', error);
    throw error;
  }
}

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
  window.NewsFeature = {
    // 新しい統合API
    initNewsFeature,
    getNewsDataService: async () => {
      const { getNewsDataService } = await import('./services/NewsDataService.js');
      return getNewsDataService();
    },
    getNewsDisplayComponent: async () => {
      const { getNewsDisplayComponent } = await import('./components/NewsDisplayComponent.js');
      return getNewsDisplayComponent();
    },
    
    // レガシーAPI（後方互換性）
    async initNewsDetailPage() {
      return await initLegacyNewsDetailPage();
    }
  };
  
  // デバッグ用ヘルパー
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugNewsFeature = async () => {
      try {
        const newsDataService = await window.NewsFeature.getNewsDataService();
        const newsDisplayComponent = await window.NewsFeature.getNewsDisplayComponent();
        
        console.group('📰 ニュース機能デバッグ情報');
        console.log('データサービス:', newsDataService);
        console.log('表示コンポーネント:', newsDisplayComponent);
        console.log('統計情報:', newsDataService.getStats());
        console.log('初期化状態:', {
          dataService: newsDataService.initialized,
          displayComponent: newsDisplayComponent.initialized
        });
        console.groupEnd();
        
      } catch (error) {
        console.error('❌ デバッグ情報取得エラー:', error);
      }
    };
  }
} 