/**
 * Instagram投稿取得・表示ユーティリティ（LP側用）
 * @description CONFIG統一ストレージキーを使用してInstagram投稿を取得・表示
 * @version 2.0.0 - 埋め込みコード対応
 */

/**
 * LP側でInstagram投稿を取得
 * @param {Object} options - 取得オプション
 * @param {number} options.limit - 最大取得数（デフォルト: 6）
 * @param {boolean} options.featuredFirst - 注目投稿を先頭に表示（デフォルト: true）
 * @param {boolean} options.shuffleOrder - 表示順をランダムにするか（デフォルト: false）
 * @returns {Array} アクティブなInstagram投稿配列
 */
export function getInstagramPosts(options = {}) {
  try {
    // CONFIG統一キーを確認
    if (!window.CONFIG || !window.CONFIG.storage || !window.CONFIG.storage.keys) {
      console.warn('📷 CONFIG設定が見つかりません');
      return [];
    }

    const storageKey = window.CONFIG.storage.keys.instagramPosts;
    if (!storageKey) {
      console.warn('📷 Instagram投稿用ストレージキーが設定されていません');
      return [];
    }

    // ローカルストレージからデータ取得
    const data = localStorage.getItem(storageKey);
    if (!data) {
      console.log('📷 Instagram投稿データが見つかりません');
      return [];
    }

    const posts = JSON.parse(data);
    if (!Array.isArray(posts)) {
      console.warn('📷 Instagram投稿データの形式が正しくありません');
      return [];
    }

    const {
      limit = window.CONFIG.instagram?.posts?.defaultDisplayPosts || 6,
      featuredFirst = true,
      shuffleOrder = false
    } = options;

    // アクティブな投稿のみフィルタリング
    let activePosts = posts.filter(post => post.status === 'active');

    if (activePosts.length === 0) {
      console.log('📷 表示可能なInstagram投稿がありません');
      return [];
    }

    // ソート処理
    if (!shuffleOrder) {
      activePosts.sort((a, b) => {
        // 注目投稿を先頭に
        if (featuredFirst) {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
        }

        // 表示順序でソート
        const orderDiff = (a.order || 999) - (b.order || 999);
        if (orderDiff !== 0) return orderDiff;

        // 更新日時でソート（新しいものが先頭）
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      });
    } else {
      // ランダムソート
      activePosts = shuffleArray(activePosts);
    }

    const result = activePosts.slice(0, limit);
    console.log(`📷 Instagram投稿取得完了: ${result.length}件 (全${posts.length}件中)`);
    
    return result;

  } catch (error) {
    console.error('❌ Instagram投稿取得エラー:', error);
    return [];
  }
}

/**
 * Instagram投稿をHTMLとして生成
 * @param {Array} posts - Instagram投稿配列
 * @param {Object} options - 生成オプション
 * @param {string} options.containerClass - コンテナのCSSクラス
 * @param {string} options.itemClass - 個別投稿のCSSクラス
 * @param {boolean} options.loadScript - Instagram埋め込みスクリプトを読み込むか
 * @returns {string} 生成されたHTML
 */
export function generateInstagramHTML(posts, options = {}) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return `<div class="instagram-empty">Instagram投稿がありません</div>`;
  }

  const {
    containerClass = 'instagram-posts-container',
    itemClass = 'instagram-post-item',
    loadScript = true
  } = options;

  let html = `<div class="${containerClass}">`;

  posts.forEach(post => {
    if (post.embedCode) {
      html += `<div class="${itemClass}" data-post-id="${post.id}">`;
      html += post.embedCode;
      html += `</div>`;
    }
  });

  html += `</div>`;

  // Instagram埋め込みスクリプトの追加
  if (loadScript && !document.querySelector('script[src*="instagram.com/embed.js"]')) {
    html += `<script async defer src="//www.instagram.com/embed.js"></script>`;
  }

  return html;
}

/**
 * Instagram投稿をDOM要素に埋め込み
 * @param {string|HTMLElement} container - 埋め込み先のコンテナ
 * @param {Object} options - 表示オプション
 * @param {number} options.limit - 最大表示数
 * @param {boolean} options.featuredFirst - 注目投稿を先頭に
 * @param {string} options.containerClass - コンテナのCSSクラス
 * @param {string} options.itemClass - 個別投稿のCSSクラス
 * @returns {boolean} 成功・失敗
 */
export function embedInstagramPosts(container, options = {}) {
  try {
    // コンテナの取得
    const containerElement = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;

    if (!containerElement) {
      console.warn('📷 Instagram投稿の埋め込み先が見つかりません:', container);
      return false;
    }

    // Instagram投稿データを取得
    const posts = getInstagramPosts(options);

    if (posts.length === 0) {
      containerElement.innerHTML = `<div class="instagram-empty">Instagram投稿がありません</div>`;
      return true;
    }

    // HTMLを生成して埋め込み
    const html = generateInstagramHTML(posts, options);
    containerElement.innerHTML = html;

    // Instagram埋め込みスクリプトの処理
    loadInstagramScript();

    console.log(`📷 Instagram投稿埋め込み完了: ${posts.length}件`);
    return true;

  } catch (error) {
    console.error('❌ Instagram投稿埋め込みエラー:', error);
    return false;
  }
}

/**
 * Instagram埋め込みスクリプトを読み込み
 * @private
 */
function loadInstagramScript() {
  if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = '//www.instagram.com/embed.js';
    document.head.appendChild(script);
  } else if (window.instgrm) {
    // 既にスクリプトが読み込まれている場合は再処理
    window.instgrm.Embeds.process();
  }
}

/**
 * 配列をシャッフル
 * @private
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Instagram投稿の統計情報を取得
 * @returns {Object} 統計情報
 */
export function getInstagramStats() {
  try {
    const storageKey = window.CONFIG.storage.keys.instagramPosts;
    const data = localStorage.getItem(storageKey);
    
    if (!data) return { total: 0, active: 0, featured: 0 };

    const posts = JSON.parse(data);
    if (!Array.isArray(posts)) return { total: 0, active: 0, featured: 0 };

    const stats = {
      total: posts.length,
      active: posts.filter(p => p.status === 'active').length,
      featured: posts.filter(p => p.featured).length,
      inactive: posts.filter(p => p.status === 'inactive').length
    };

    return stats;

  } catch (error) {
    console.error('❌ Instagram統計取得エラー:', error);
    return { total: 0, active: 0, featured: 0 };
  }
}

// 後方互換性のためのグローバル関数
if (typeof window !== 'undefined') {
  window.getInstagramPosts = getInstagramPosts;
  window.embedInstagramPosts = embedInstagramPosts;
  window.getInstagramStats = getInstagramStats;
} 