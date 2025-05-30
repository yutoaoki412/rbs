/**
 * ニュース機能統合インデックス
 * @version 2.0.0
 */

// コントローラー
export { default as NewsDetailController, initNewsDetailPage } from './controllers/NewsDetailController.js';

// サービス
export { default as MetadataService } from './services/MetadataService.js';
export { default as ShareService } from './services/ShareService.js';

// コンポーネント
export { default as ArticleDisplay } from './components/ArticleDisplay.js';
export { default as RelatedArticles } from './components/RelatedArticles.js';
export { default as ShareButtons } from './components/ShareButtons.js';

/**
 * ニュース機能を初期化
 * ページタイプに応じて適切な初期化を実行
 */
export async function initNewsFeature() {
  try {
    // ページタイプを判定
    const currentPage = getCurrentPageType();
    
    switch (currentPage) {
      case 'news-detail':
        await initNewsDetailPage();
        break;
      
      case 'news-list':
        // ニュース一覧ページの初期化（今後実装）
        console.log('📰 ニュース一覧ページの初期化は今後実装予定');
        break;
      
      default:
        console.log('📰 ニュース機能の初期化は不要なページです');
        break;
    }
    
  } catch (error) {
    console.error('❌ ニュース機能の初期化に失敗:', error);
  }
}

/**
 * 現在のページタイプを取得
 * @returns {string}
 */
function getCurrentPageType() {
  const pathname = window.location.pathname;
  
  if (pathname.includes('news-detail')) {
    return 'news-detail';
  } else if (pathname.includes('news.html')) {
    return 'news-list';
  }
  
  return 'other';
}

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
  window.NewsFeature = {
    initNewsFeature,
    initNewsDetailPage
  };
} 