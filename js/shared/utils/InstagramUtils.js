/**
 * Instagram投稿取得・表示ユーティリティ（LP側用）
 * @version 3.0.0 - Supabase完全統合版
 */

import { getInstagramSupabaseService } from '../services/InstagramSupabaseService.js';

// Supabaseサービスインスタンス
let instagramService = null;

/**
 * Supabaseサービス初期化
 */
async function initInstagramService() {
  if (!instagramService) {
    instagramService = getInstagramSupabaseService();
    await instagramService.init();
  }
  return instagramService;
}

/**
 * LP側でInstagram投稿を取得（Supabaseから）
 * @param {Object} options - 取得オプション
 * @param {number} options.limit - 最大取得数（デフォルト: 6）
 * @param {boolean} options.featuredFirst - 注目投稿を先頭に表示（デフォルト: true）
 * @param {boolean} options.shuffleOrder - 表示順をランダムにするか（デフォルト: false）
 * @returns {Array} アクティブなInstagram投稿配列
 */
export async function getInstagramPosts(options = {}) {
  try {
    console.log('📊 Instagram投稿取得開始 (Supabase)', { options });
    
    // Supabaseサービス初期化
    const service = await initInstagramService();
    
    // Supabaseから投稿データを取得
    const posts = await service.getAllPosts();
    
    console.log('📊 Supabaseから取得した投稿データ:', {
      isArray: Array.isArray(posts),
      length: Array.isArray(posts) ? posts.length : 'N/A',
      samplePost: Array.isArray(posts) && posts[0] ? {
        id: posts[0].id,
        hasEmbedCode: !!posts[0].embed_code,
        status: posts[0].status,
        featured: posts[0].featured
      } : 'なし'
    });
    
    if (!Array.isArray(posts)) {
      console.warn('📷 Instagram投稿データの形式が正しくありません');
      return [];
    }

    const {
      limit = window.CONFIG?.instagram?.display?.defaultCount || 6,
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
    if (featuredFirst) {
      activePosts.sort((a, b) => {
        // 注目投稿を先頭に
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        // 最終的に更新日時でソート
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA;
      });
    }

    // ランダムソート（オプション）
    if (shuffleOrder) {
      activePosts = shuffleArray(activePosts);
    }

    // 指定された数まで制限
    const result = activePosts.slice(0, limit);
    
    console.log(`📷 Instagram投稿取得完了: ${result.length}件 (全${posts.length}件中、アクティブ${activePosts.length}件)`);
    return result;

  } catch (error) {
    console.error('❌ Instagram投稿取得エラー:', error);
    return [];
  }
}

/**
 * Instagram投稿を横スクロール形式でLP側に表示
 * @param {string} containerId - 表示先コンテナのID
 * @param {Object} options - 表示オプション
 */
export async function initInstagramPostsDisplay(containerId = 'instagram-posts-section', options = {}) {
  try {
    console.log('📷 Instagram投稿表示初期化開始 (Supabase)');
    console.log('🔧 初期化パラメータ:', { containerId, options });
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`📷 Instagram投稿コンテナが見つかりません: ${containerId}`);
      return;
    }

    const scrollContainer = container.querySelector('#instagram-posts-scroll');
    const loadingElement = container.querySelector('#instagram-posts-loading');
    const emptyElement = container.querySelector('#instagram-posts-empty');
    const prevButton = container.querySelector('#instagram-scroll-prev');
    const nextButton = container.querySelector('#instagram-scroll-next');
    const indicatorsContainer = container.querySelector('#instagram-scroll-indicators');

    console.log('🔍 DOM要素確認:', {
      container: !!container,
      scrollContainer: !!scrollContainer,
      loadingElement: !!loadingElement,
      emptyElement: !!emptyElement,
      prevButton: !!prevButton,
      nextButton: !!nextButton,
      indicatorsContainer: !!indicatorsContainer
    });

    if (!scrollContainer) {
      console.warn('📷 Instagram投稿スクロールコンテナが見つかりません');
      return;
    }

    // ローディング表示
    showLoading(loadingElement, emptyElement, scrollContainer);
    container.style.display = 'block';

    // Instagram投稿データを取得（Supabaseから）
    console.log('📊 Instagram投稿データ取得開始 (Supabase)...');
    const posts = await getInstagramPosts({
      limit: options.limit || window.CONFIG?.instagram?.display?.defaultCount || 6,
      featuredFirst: true
    });

    console.log('📊 取得結果:', {
      postsCount: posts.length,
      posts: posts.map(p => ({ 
        id: p.id, 
        hasEmbedCode: !!p.embed_code,
        embedCodeLength: p.embed_code?.length || 0,
        status: p.status,
        featured: p.featured
      }))
    });

    if (posts.length === 0) {
      console.warn('📷 表示可能なInstagram投稿がありません');
      showEmpty(loadingElement, emptyElement, scrollContainer);
      return;
    }

    // 投稿を表示
    console.log('🎨 Instagram投稿描画開始...');
    renderInstagramPosts(scrollContainer, posts);
    
    // ナビゲーション機能を初期化
    initScrollNavigation(scrollContainer, prevButton, nextButton, indicatorsContainer, posts.length);
    
    // ローディングを非表示
    hideLoading(loadingElement, emptyElement, scrollContainer);
    
    // Instagram埋め込みスクリプトを処理
    setTimeout(() => {
      processInstagramEmbeds();
    }, 100);

    console.log('✅ Instagram投稿表示初期化完了');

  } catch (error) {
    console.error('❌ Instagram投稿表示初期化エラー:', error);
    
    // エラー時の表示
    const container = document.getElementById(containerId);
    if (container) {
      const loadingElement = container.querySelector('#instagram-posts-loading');
      const emptyElement = container.querySelector('#instagram-posts-empty');
      const scrollContainer = container.querySelector('#instagram-posts-scroll');
      
      showEmpty(loadingElement, emptyElement, scrollContainer);
    }
  }
}

/**
 * Instagram投稿をHTMLとして描画
 * @param {HTMLElement} container - 描画先コンテナ
 * @param {Array} posts - 投稿データ配列
 */
function renderInstagramPosts(container, posts) {
  try {
    console.log('🎨 Instagram投稿描画開始:', posts.length + '件');
    
    const postsHTML = posts.map((post, index) => {
      const embedCode = post.embed_code || '';
      
      return `
        <div class="instagram-post-item" data-post-id="${post.id}" data-index="${index}">
          <div class="instagram-embed-container">
            ${embedCode}
          </div>
          ${post.featured ? '<div class="instagram-featured-badge">注目</div>' : ''}
        </div>
      `;
    }).join('');
    
    container.innerHTML = postsHTML;
    
    console.log('✅ Instagram投稿描画完了');
    
  } catch (error) {
    console.error('❌ Instagram投稿描画エラー:', error);
    container.innerHTML = '<div class="instagram-error">投稿の表示に失敗しました</div>';
  }
}

/**
 * スクロールナビゲーション初期化
 * @param {HTMLElement} scrollContainer - スクロールコンテナ
 * @param {HTMLElement} prevButton - 前へボタン
 * @param {HTMLElement} nextButton - 次へボタン
 * @param {HTMLElement} indicatorsContainer - インジケーターコンテナ
 * @param {number} totalPosts - 総投稿数
 */
function initScrollNavigation(scrollContainer, prevButton, nextButton, indicatorsContainer, totalPosts) {
  if (!scrollContainer) return;
  
  let currentIndex = 0;
  const itemWidth = 300; // 投稿アイテムの幅
  const gap = 20; // アイテム間のギャップ
  
  function scrollToIndex(index) {
    const scrollLeft = index * (itemWidth + gap);
    scrollContainer.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
    currentIndex = index;
    updateIndicators();
    updateNavigationButtons();
  }
  
  function updateIndicators() {
    if (!indicatorsContainer) return;
    
    const indicators = indicatorsContainer.querySelectorAll('.scroll-indicator');
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === currentIndex);
    });
  }
  
  function updateNavigationButtons() {
    if (prevButton) {
      prevButton.disabled = currentIndex === 0;
    }
    if (nextButton) {
      nextButton.disabled = currentIndex >= totalPosts - 1;
    }
  }
  
  // ボタンイベント
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      if (currentIndex > 0) {
        scrollToIndex(currentIndex - 1);
      }
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (currentIndex < totalPosts - 1) {
        scrollToIndex(currentIndex + 1);
      }
    });
  }
  
  // インジケーター生成
  if (indicatorsContainer && totalPosts > 1) {
    const indicatorsHTML = Array.from({ length: totalPosts }, (_, index) => 
      `<button class="scroll-indicator ${index === 0 ? 'active' : ''}" data-index="${index}"></button>`
    ).join('');
    
    indicatorsContainer.innerHTML = indicatorsHTML;
    
    // インジケータークリックイベント
    indicatorsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('scroll-indicator')) {
        const index = parseInt(e.target.dataset.index);
        scrollToIndex(index);
      }
    });
  }
  
  // 初期状態設定
  updateNavigationButtons();
}

/**
 * ローディング表示
 */
function showLoading(loadingElement, emptyElement, scrollContainer) {
  if (loadingElement) loadingElement.style.display = 'block';
  if (emptyElement) emptyElement.style.display = 'none';
  if (scrollContainer) scrollContainer.style.display = 'none';
}

/**
 * 空状態表示
 */
function showEmpty(loadingElement, emptyElement, scrollContainer) {
  if (loadingElement) loadingElement.style.display = 'none';
  if (emptyElement) emptyElement.style.display = 'block';
  if (scrollContainer) scrollContainer.style.display = 'none';
}

/**
 * ローディング非表示
 */
function hideLoading(loadingElement, emptyElement, scrollContainer) {
  if (loadingElement) loadingElement.style.display = 'none';
  if (emptyElement) emptyElement.style.display = 'none';
  if (scrollContainer) scrollContainer.style.display = 'block';
}

/**
 * Instagram埋め込みスクリプト処理
 */
function processInstagramEmbeds() {
  try {
    console.log('📸 Instagram埋め込み処理開始');
    
    // Instagram埋め込みスクリプトが既に読み込まれているかチェック
    if (window.instgrm && window.instgrm.Embeds) {
      window.instgrm.Embeds.process();
      console.log('✅ Instagram埋め込み処理完了（既存スクリプト使用）');
    } else {
      // スクリプトを動的に読み込み
      ensureInstagramScript();
    }
    
  } catch (error) {
    console.error('❌ Instagram埋め込み処理エラー:', error);
  }
}

/**
 * Instagram埋め込みスクリプトを確実に読み込み
 */
function ensureInstagramScript() {
  const existingScript = document.querySelector('script[src*="embed.js"]');
  
  if (!existingScript) {
    console.log('📸 Instagram埋め込みスクリプトを動的読み込み');
    loadInstagramScript();
  } else {
    // 既存スクリプトがある場合は処理を再実行
    setTimeout(() => {
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
        console.log('✅ Instagram埋め込み処理完了（再実行）');
      }
    }, 500);
  }
}

/**
 * Instagram埋め込みスクリプトを読み込み
 */
function loadInstagramScript() {
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = 'https://www.instagram.com/embed.js';
  
  script.addEventListener('load', () => {
    console.log('✅ Instagram埋め込みスクリプト読み込み完了');
    setTimeout(() => {
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
        console.log('✅ Instagram埋め込み処理完了');
      }
    }, 100);
  });
  
  script.addEventListener('error', (e) => {
    console.warn('⚠️ Instagram埋め込みスクリプト読み込み失敗:', e);
  });
  
  document.head.appendChild(script);
}

/**
 * Instagram投稿HTMLを生成（汎用）
 * @param {Array} posts - 投稿データ配列
 * @param {Object} options - 表示オプション
 * @returns {string} HTML文字列
 */
export function generateInstagramHTML(posts, options = {}) {
  const { showFeaturedBadge = true, containerClass = 'instagram-posts-grid' } = options;
  
  if (!posts || posts.length === 0) {
    return '<div class="instagram-empty">Instagram投稿がありません</div>';
  }
  
  const postsHTML = posts.map(post => `
    <div class="instagram-post-item" data-post-id="${post.id}">
      <div class="instagram-embed-container">
        ${post.embed_code || ''}
      </div>
      ${showFeaturedBadge && post.featured ? '<div class="instagram-featured-badge">注目</div>' : ''}
    </div>
  `).join('');
  
  return `<div class="${containerClass}">${postsHTML}</div>`;
}

/**
 * Instagram投稿を指定コンテナに埋め込み
 * @param {HTMLElement|string} container - コンテナ要素またはID
 * @param {Object} options - オプション
 */
export async function embedInstagramPosts(container, options = {}) {
  try {
    const targetContainer = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
      
    if (!targetContainer) {
      console.warn('📷 Instagram埋め込み先コンテナが見つかりません');
      return;
    }
    
    const posts = await getInstagramPosts(options);
    const html = generateInstagramHTML(posts, options);
    
    targetContainer.innerHTML = html;
    
    // 埋め込み処理
    setTimeout(() => {
      processInstagramEmbeds();
    }, 100);
    
    console.log('✅ Instagram投稿埋め込み完了');
    
  } catch (error) {
    console.error('❌ Instagram投稿埋め込みエラー:', error);
  }
}

/**
 * Instagram投稿統計を取得（Supabaseから）
 * @returns {Object} 統計情報
 */
export async function getInstagramStats() {
  try {
    const service = await initInstagramService();
    const posts = await service.getAllPosts();
    
    const stats = {
      total: posts.length,
      active: posts.filter(p => p.status === 'active').length,
      featured: posts.filter(p => p.featured).length,
      inactive: posts.filter(p => p.status === 'inactive').length
    };
    
    console.log('📊 Instagram統計:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Instagram統計取得エラー:', error);
    return { total: 0, active: 0, featured: 0, inactive: 0 };
  }
}

/**
 * 配列をシャッフル
 * @param {Array} array - シャッフルする配列
 * @returns {Array} シャッフルされた配列
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =========================
// デバッグ用グローバル関数
// =========================

/**
 * Instagram投稿のデバッグ情報をコンソールに出力
 */
window.debugInstagramPosts = async function() {
  console.log('🔍 Instagram投稿デバッグ開始');
  
  try {
    // InstagramSupabaseServiceを使用
    const { getInstagramSupabaseService } = await import('../services/InstagramSupabaseService.js');
    const instagramService = await getInstagramSupabaseService();
    
    console.log('🌐 Instagram Service状況:', {
      serviceExists: !!instagramService,
      initialized: instagramService?.initialized || false
    });
    
    // Supabaseからデータ取得
    const result = await instagramService.getAllPosts();
    
    if (result.success) {
      const posts = result.data;
      console.log('📊 投稿データ:', {
        isArray: Array.isArray(posts),
        count: Array.isArray(posts) ? posts.length : 'N/A',
        posts: Array.isArray(posts) ? posts.map(p => ({
          id: p.id,
          hasEmbedCode: !!p.embed_code,
          embedLength: p.embed_code?.length || 0,
          status: p.status,
          featured: p.featured,
          createdAt: p.created_at
        })) : posts
      });
    } else {
      console.error('❌ データ取得エラー:', result.error);
    }
    
  } catch (error) {
    console.error('❌ デバッグ処理エラー:', error);
  }
  
  // DOM要素確認
  const container = document.getElementById('instagram-posts-section');
  console.log('🔍 DOM要素状況:', {
    container: !!container,
    scrollContainer: !!container?.querySelector('#instagram-posts-scroll'),
    loadingElement: !!container?.querySelector('#instagram-posts-loading'),
    emptyElement: !!container?.querySelector('#instagram-posts-empty'),
    renderedItems: container?.querySelectorAll('.instagram-post-item').length || 0,
    instagramBlockquotes: document.querySelectorAll('blockquote.instagram-media').length
  });
};

/**
 * Instagram投稿表示を強制的に再実行
 */
window.forceInstagramRender = function() {
  console.log('🔄 Instagram投稿表示強制実行');
  try {
    initInstagramPostsDisplay('instagram-posts-section', {
      limit: 6,
      featuredFirst: true
    });
  } catch (error) {
    console.error('❌ 強制実行エラー:', error);
  }
};

// テスト用Instagram投稿データ作成機能は削除されました
// データは管理画面からのみ作成・管理されます

console.log('🛠️ Instagram投稿デバッグ関数が利用可能です:');
console.log('  - window.debugInstagramPosts() : デバッグ情報表示');
console.log('  - window.forceInstagramRender() : 表示強制更新');
console.log('  - テストデータ作成機能は削除されました');

// 後方互換性のためのグローバル関数
if (typeof window !== 'undefined') {
  window.getInstagramPosts = getInstagramPosts;
  window.embedInstagramPosts = embedInstagramPosts;
  window.getInstagramStats = getInstagramStats;
} 