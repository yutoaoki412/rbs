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
    console.log('📊 Instagram投稿取得開始', { options });
    
    // CONFIG統一キーを確認
    if (!window.CONFIG || !window.CONFIG.storage || !window.CONFIG.storage.keys) {
      console.warn('📷 CONFIG設定が見つかりません');
      console.log('🔍 window.CONFIG:', window.CONFIG);
      return [];
    }

    const storageKey = window.CONFIG.storage.keys.instagramPosts;
    if (!storageKey) {
      console.warn('📷 Instagram投稿用ストレージキーが設定されていません');
      console.log('🔍 利用可能なキー:', window.CONFIG.storage.keys);
      return [];
    }

    console.log('🔑 使用するストレージキー:', storageKey);

    // ローカルストレージからデータ取得
    const data = localStorage.getItem(storageKey);
    console.log('💾 LocalStorageからの取得結果:', {
      key: storageKey,
      dataExists: !!data,
      dataLength: data?.length || 0,
      dataPreview: data?.substring(0, 100) + (data?.length > 100 ? '...' : '')
    });
    
    if (!data) {
      console.log('📷 Instagram投稿データが見つかりません');
      // 全LocalStorageキーをデバッグ表示
      console.log('🔍 全LocalStorageキー:', Object.keys(localStorage));
      return [];
    }

    const posts = JSON.parse(data);
    console.log('📊 パースされた投稿データ:', {
      isArray: Array.isArray(posts),
      length: Array.isArray(posts) ? posts.length : 'N/A',
      samplePost: Array.isArray(posts) && posts[0] ? {
        id: posts[0].id,
        hasEmbedCode: !!posts[0].embedCode,
        status: posts[0].status,
        featured: posts[0].featured
      } : 'なし'
    });
    
    if (!Array.isArray(posts)) {
      console.warn('📷 Instagram投稿データの形式が正しくありません');
      console.log('🔍 実際のデータ型:', typeof posts, posts);
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
    if (featuredFirst) {
      activePosts.sort((a, b) => {
        // 注目投稿を先頭に
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        // 表示順序でソート
        const orderDiff = (a.order || 999) - (b.order || 999);
        if (orderDiff !== 0) return orderDiff;
        
        // 最終的に更新日時でソート
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
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
export function initInstagramPostsDisplay(containerId = 'instagram-posts-section', options = {}) {
  try {
    console.log('📷 Instagram投稿表示初期化開始');
    console.log('🔧 初期化パラメータ:', { containerId, options });
    console.log('🌐 CONFIG状況:', { 
      configExists: !!window.CONFIG, 
      storageExists: !!window.CONFIG?.storage,
      keysExists: !!window.CONFIG?.storage?.keys,
      instagramKey: window.CONFIG?.storage?.keys?.instagramPosts
    });
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`📷 Instagram投稿コンテナが見つかりません: ${containerId}`);
      console.log('🔍 利用可能なID一覧:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
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
      console.log('🔍 コンテナ内要素:', container.innerHTML);
      return;
    }

    // ローディング表示
    showLoading(loadingElement, emptyElement, scrollContainer);
    container.style.display = 'block';

    // Instagram投稿データを取得
    console.log('📊 Instagram投稿データ取得開始...');
    const posts = getInstagramPosts({
      limit: options.limit || window.CONFIG?.instagram?.posts?.defaultDisplayPosts || 6,
      featuredFirst: true
    });

    console.log('📊 取得結果:', {
      postsCount: posts.length,
      posts: posts.map(p => ({ 
        id: p.id, 
        hasEmbedCode: !!p.embedCode,
        embedCodeLength: p.embedCode?.length || 0,
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
    
    // Instagram埋め込みスクリプトを処理（シンプル版）
    console.log('📜 Instagram埋め込みスクリプト処理開始...');
    processInstagramEmbedsSimple();
    
    console.log('✅ Instagram投稿表示初期化完了');

  } catch (error) {
    console.error('❌ Instagram投稿表示初期化エラー:', error);
    console.error('📋 エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
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
 * Instagram投稿をHTML要素として描画（シンプル版）
 * @param {HTMLElement} container - 描画先コンテナ
 * @param {Array} posts - Instagram投稿データ配列
 */
function renderInstagramPosts(container, posts) {
  if (!container || !Array.isArray(posts)) {
    console.warn('📷 Instagram投稿描画: 無効なパラメータ');
    console.log('🔍 パラメータ詳細:', { 
      container: !!container, 
      containerTag: container?.tagName,
      posts: Array.isArray(posts) ? posts.length : typeof posts 
    });
    return;
  }

  console.log('🎨 Instagram投稿描画開始:', {
    postsCount: posts.length,
    containerElement: container.tagName + (container.id ? '#' + container.id : '') + (container.className ? '.' + container.className.split(' ').join('.') : '')
  });

  // Instagram埋め込みスクリプトを確実に読み込む
  ensureInstagramScript();

  const html = posts.map((post, index) => {
    if (!post.embedCode) {
      console.warn('📷 埋め込みコードが見つかりません:', post.id);
      return '';
    }

    console.log(`🎨 投稿${index + 1}描画:`, {
      id: post.id,
      embedCodeLength: post.embedCode.length,
      hasInstagramMedia: post.embedCode.includes('instagram-media'),
      hasBlockquote: post.embedCode.includes('<blockquote'),
      featured: post.featured
    });

    // 管理画面と同じシンプルな方法で表示
    return `
      <div class="instagram-post-item" data-post-id="${post.id}" data-featured="${post.featured || false}">
        <div class="instagram-embed-wrapper">
          ${post.embedCode}
        </div>
      </div>
    `;
  }).filter(html => html.length > 0);

  const finalHtml = html.join('');
  console.log('🎨 最終HTML生成:', {
    validItemsCount: html.length,
    finalHtmlLength: finalHtml.length,
    hasContent: finalHtml.length > 0
  });

  container.innerHTML = finalHtml;
  
  // 少し待機してからInstagram埋め込み処理を実行
  setTimeout(() => {
    processInstagramEmbedsSimple();
  }, 500);
  
  // 描画後のDOM状況を確認
  const renderedItems = container.querySelectorAll('.instagram-post-item');
  const instagramBlockquotes = container.querySelectorAll('blockquote.instagram-media');
  
  console.log('🎨 描画後DOM状況:', {
    renderedItems: renderedItems.length,
    instagramBlockquotes: instagramBlockquotes.length,
    containerChildren: container.children.length,
    containerHTML: container.innerHTML.substring(0, 200) + (container.innerHTML.length > 200 ? '...' : '')
  });
  
  console.log(`✅ Instagram投稿描画完了: ${posts.length}件 (有効: ${html.length}件)`);
}

/**
 * スクロールナビゲーション機能を初期化
 * @param {HTMLElement} scrollContainer - スクロールコンテナ
 * @param {HTMLElement} prevButton - 前へボタン
 * @param {HTMLElement} nextButton - 次へボタン
 * @param {HTMLElement} indicatorsContainer - インジケーターコンテナ
 * @param {number} totalPosts - 総投稿数
 */
function initScrollNavigation(scrollContainer, prevButton, nextButton, indicatorsContainer, totalPosts) {
  if (!scrollContainer) return;

  let currentIndex = 0;
  const itemWidth = 320; // CSS の instagram-post-item width に合わせる
  const gap = 20; // CSS の gap に合わせる

  // インジケーターを生成
  if (indicatorsContainer && totalPosts > 1) {
    const indicators = Array.from({ length: totalPosts }, (_, index) => {
      return `<div class="instagram-scroll-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
    }).join('');
    indicatorsContainer.innerHTML = indicators;

    // インジケータークリックイベント
    indicatorsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('instagram-scroll-dot')) {
        const targetIndex = parseInt(e.target.dataset.index);
        scrollToIndex(targetIndex);
      }
    });
  }

  // スクロール位置を更新
  function scrollToIndex(index) {
    if (index < 0 || index >= totalPosts) return;
    
    currentIndex = index;
    const scrollPosition = (itemWidth + gap) * index;
    scrollContainer.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
    
    updateIndicators();
    updateNavigationButtons();
  }

  // インジケーターを更新
  function updateIndicators() {
    if (!indicatorsContainer) return;
    
    const dots = indicatorsContainer.querySelectorAll('.instagram-scroll-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  // ナビゲーションボタンの状態を更新
  function updateNavigationButtons() {
    if (prevButton) {
      prevButton.classList.toggle('visible', currentIndex > 0);
    }
    if (nextButton) {
      nextButton.classList.toggle('visible', currentIndex < totalPosts - 1);
    }
  }

  // 前へボタン
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      if (currentIndex > 0) {
        scrollToIndex(currentIndex - 1);
      }
    });
  }

  // 次へボタン
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (currentIndex < totalPosts - 1) {
        scrollToIndex(currentIndex + 1);
      }
    });
  }

  // スクロールイベントを監視してインジケーターを更新
  let scrollTimeout;
  scrollContainer.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollLeft = scrollContainer.scrollLeft;
      const newIndex = Math.round(scrollLeft / (itemWidth + gap));
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalPosts) {
        currentIndex = newIndex;
        updateIndicators();
        updateNavigationButtons();
      }
    }, 100);
  });

  // 初期状態を設定
  updateNavigationButtons();
}

/**
 * ローディング状態を表示
 */
function showLoading(loadingElement, emptyElement, scrollContainer) {
  if (loadingElement) loadingElement.style.display = 'flex';
  if (emptyElement) emptyElement.style.display = 'none';
  if (scrollContainer) scrollContainer.style.display = 'none';
}

/**
 * 空状態を表示
 */
function showEmpty(loadingElement, emptyElement, scrollContainer) {
  if (loadingElement) loadingElement.style.display = 'none';
  if (emptyElement) emptyElement.style.display = 'block';
  if (scrollContainer) scrollContainer.style.display = 'none';
}

/**
 * ローディングを非表示にしてコンテンツを表示
 */
function hideLoading(loadingElement, emptyElement, scrollContainer) {
  if (loadingElement) loadingElement.style.display = 'none';
  if (emptyElement) emptyElement.style.display = 'none';
  if (scrollContainer) scrollContainer.style.display = 'flex';
}

/**
 * Instagram埋め込みスクリプトを処理
 */
function processInstagramEmbeds() {
  try {
    console.log('📜 Instagram埋め込みスクリプト処理開始');
    console.log('🔍 Instagram関連DOM要素:', {
      instagramBlockquotes: document.querySelectorAll('blockquote.instagram-media').length,
      instagramScripts: document.querySelectorAll('script[src*="instagram.com/embed.js"]').length,
      instgramObject: typeof window.instgrm,
      instgramEmbeds: !!(window.instgrm && window.instgrm.Embeds)
    });
    
    // Instagram埋め込みスクリプトが読み込まれているかチェック
    if (typeof window.instgrm === 'undefined') {
      console.log('📜 Instagramスクリプトが未読み込み、動的読み込み開始');
      // スクリプトがない場合は動的に読み込み
      loadInstagramScript();
      return;
    }

    // 既にスクリプトがある場合は埋め込みを処理
    if (window.instgrm && window.instgrm.Embeds) {
      console.log('📜 Instagram埋め込み処理実行中...');
      window.instgrm.Embeds.process();
      console.log('✅ Instagram埋め込み処理完了');
    } else {
      console.warn('⚠️ window.instgrm.Embedsが利用できません');
    }
  } catch (error) {
    console.error('❌ Instagram埋め込み処理エラー:', error);
    console.error('📋 エラー詳細:', {
      message: error.message,
      stack: error.stack
    });
  }
}

/**
 * シンプルなInstagram埋め込み処理（管理画面と同じ方法）
 */
function processInstagramEmbedsSimple() {
  try {
    console.log('📜 シンプルInstagram埋め込み処理開始');
    
    // DOM内のInstagram埋め込み要素を確認
    const blockquotes = document.querySelectorAll('blockquote.instagram-media');
    console.log(`🔍 発見されたInstagram埋め込み: ${blockquotes.length}個`);
    
    if (blockquotes.length === 0) {
      console.warn('📷 Instagram埋め込み要素が見つかりません');
      return;
    }
    
    // Instagramスクリプトが存在し、ready状態であることを確認
    if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === 'function') {
      console.log('📜 Instagram APIで埋め込み処理実行');
      window.instgrm.Embeds.process();
      console.log('✅ Instagram埋め込み処理完了');
    } else {
      console.log('📜 Instagramスクリプト読み込み中、2秒後に再試行');
      setTimeout(() => {
        if (window.instgrm && window.instgrm.Embeds) {
          window.instgrm.Embeds.process();
          console.log('✅ Instagram埋め込み処理完了（再試行）');
        } else {
          console.warn('⚠️ Instagramスクリプトの読み込みに失敗しました');
        }
      }, 2000);
    }
    
  } catch (error) {
    console.error('❌ シンプルInstagram埋め込み処理エラー:', error);
  }
}

/**
 * Instagram埋め込みスクリプトを確実に読み込む
 */
function ensureInstagramScript() {
  // 既にスクリプトが存在する場合は何もしない
  if (document.querySelector('script[src*="instagram.com/embed.js"]')) {
    console.log('📜 Instagramスクリプトは既に存在します');
    return;
  }
  
  console.log('📜 Instagram埋め込みスクリプトを追加');
  const script = document.createElement('script');
  script.async = true;
  script.src = '//www.instagram.com/embed.js';
  script.onload = () => {
    console.log('✅ Instagramスクリプト読み込み完了');
  };
  script.onerror = () => {
    console.error('❌ Instagramスクリプト読み込み失敗');
  };
  
  document.head.appendChild(script);
}

/**
 * Instagram埋め込みスクリプトを動的に読み込み
 */
function loadInstagramScript() {
  if (document.querySelector('script[src*="instagram.com/embed.js"]')) {
    console.log('📷 Instagramスクリプトは既に読み込まれています');
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = '//www.instagram.com/embed.js';
  script.onload = () => {
    console.log('📷 Instagramスクリプト読み込み完了');
    // スクリプト読み込み後に埋め込みを処理
    setTimeout(processInstagramEmbeds, 100);
  };
  script.onerror = () => {
    console.error('❌ Instagramスクリプト読み込みエラー');
  };
  
  document.head.appendChild(script);
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
window.debugInstagramPosts = function() {
  console.log('🔍 Instagram投稿デバッグ開始');
  
  // CONFIG確認
  console.log('🌐 CONFIG状況:', {
    configExists: !!window.CONFIG,
    storageExists: !!window.CONFIG?.storage,
    keysExists: !!window.CONFIG?.storage?.keys,
    instagramKey: window.CONFIG?.storage?.keys?.instagramPosts
  });
  
  // LocalStorage確認
  const storageKey = window.CONFIG?.storage?.keys?.instagramPosts || 'rbs_instagram_posts';
  const data = localStorage.getItem(storageKey);
  console.log('💾 LocalStorage状況:', {
    key: storageKey,
    dataExists: !!data,
    dataLength: data?.length || 0,
    allKeys: Object.keys(localStorage)
  });
  
  if (data) {
    try {
      const posts = JSON.parse(data);
      console.log('📊 投稿データ:', {
        isArray: Array.isArray(posts),
        count: Array.isArray(posts) ? posts.length : 'N/A',
        posts: Array.isArray(posts) ? posts.map(p => ({
          id: p.id,
          hasEmbedCode: !!p.embedCode,
          embedLength: p.embedCode?.length || 0,
          status: p.status,
          featured: p.featured
        })) : posts
      });
    } catch (e) {
      console.error('❌ データパースエラー:', e);
    }
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
  
  // Instagram埋め込みスクリプト確認
  console.log('📜 Instagram埋め込み状況:', {
    instgramObject: typeof window.instgrm,
    instgramEmbeds: !!(window.instgrm && window.instgrm.Embeds),
    instagramScripts: document.querySelectorAll('script[src*="instagram.com/embed.js"]').length
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

/**
 * テスト用Instagram投稿データを作成
 */
window.createTestInstagramData = function() {
  const testData = [
    {
      id: 'test1',
      embedCode: '<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/C8X6YyVy9aJ/" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/p/C8X6YyVy9aJ/" style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style="display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style="color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">この投稿をInstagramで見る</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style="width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style="width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style="background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style="width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/p/C8X6YyVy9aJ/" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">RADWIMPS(@radwimps_jp)がシェアした投稿</a></p></div></blockquote>',
      status: 'active',
      featured: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'test2', 
      embedCode: '<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/C8TsZ7DS5-H/" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/p/C8TsZ7DS5-H/" style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style="display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style="color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">この投稿をInstagramで見る</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style="width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style="width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style="background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style="width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style="background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/p/C8TsZ7DS5-H/" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">RADWIMPS(@radwimps_jp)がシェアした投稿</a></p></div></blockquote>',
      status: 'active',
      featured: false,
      createdAt: new Date().toISOString()
    }
  ];
  
  const storageKey = window.CONFIG?.storage?.keys?.instagramPosts || 'rbs_instagram_posts';
  localStorage.setItem(storageKey, JSON.stringify(testData));
  console.log('✅ テストデータを作成しました:', testData);
  
  // 表示を更新
  window.forceInstagramRender();
};

console.log('🛠️ Instagram投稿デバッグ関数が利用可能です:');
console.log('  - window.debugInstagramPosts() : デバッグ情報表示');
console.log('  - window.forceInstagramRender() : 表示強制更新');
console.log('  - window.createTestInstagramData() : テストデータ作成');

// 後方互換性のためのグローバル関数
if (typeof window !== 'undefined') {
  window.getInstagramPosts = getInstagramPosts;
  window.embedInstagramPosts = embedInstagramPosts;
  window.getInstagramStats = getInstagramStats;
} 