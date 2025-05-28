/**
 * ニュースカードコンポーネント
 * ニュース記事の表示用カード
 */
class NewsCard extends Component {
  /**
   * @param {Object} article - 記事データ
   * @param {Object} config - 設定オプション
   */
  constructor(article, config = {}) {
    super({
      dateFormat: 'YYYY.MM.DD',
      enableHoverEffects: true,
      enableClickNavigation: true,
      autoInit: false, // 手動で初期化
      ...config
    });
    
    this.article = this.validateArticle(article);
    
    // カテゴリー色の設定
    this.categoryColors = {
      'announcement': '#4a90e2',
      'event': '#50c8a3',
      'media': '#9b59b6',
      'important': '#e74c3c',
      'default': '#6c757d'
    };
    
    // 初期化
    this.init();
  }

  /**
   * 記事データを検証
   * @param {Object} article - 記事データ
   * @returns {Object} 検証済み記事データ
   */
  validateArticle(article) {
    if (!article || typeof article !== 'object') {
      throw new Error('NewsCard: 有効な記事データが必要です');
    }

    const requiredFields = ['id', 'title', 'date', 'category'];
    const missingFields = requiredFields.filter(field => !article[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`NewsCard: 必須フィールドが不足しています: ${missingFields.join(', ')}`);
    }

    return {
      id: article.id,
      title: article.title || '',
      date: article.date,
      category: article.category,
      categoryName: article.categoryName || article.category,
      excerpt: article.excerpt || '',
      ...article
    };
  }

  /**
   * 初期化処理
   */
  doInit() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  /**
   * カード要素を作成
   * @returns {Element} 作成されたカード要素
   */
  createElement() {
    try {
      const card = document.createElement('article');
      card.className = 'news-card';
      card.setAttribute('data-category', this.article.category);
      card.setAttribute('data-article-id', this.article.id);
      
      // アクセシビリティ属性
      card.setAttribute('role', 'article');
      card.setAttribute('tabindex', '0');
      
      const categoryColor = this.getCategoryColor(this.article.category);
      const formattedDate = this.formatDate(this.article.date);
      
      card.innerHTML = this.buildCardHTML(formattedDate, categoryColor);
      
      this.emit('newsCard:created', { article: this.article });
      
      return card;
    } catch (error) {
      console.error('NewsCard: カード作成エラー:', error);
      return this.createErrorCard(error);
    }
  }

  /**
   * カードHTMLを構築
   * @param {string} formattedDate - フォーマット済み日付
   * @param {string} categoryColor - カテゴリー色
   * @returns {string} カードHTML
   */
  buildCardHTML(formattedDate, categoryColor) {
    const safeTitle = RBSHelpers.sanitizeString(this.article.title);
    const safeCategoryName = RBSHelpers.sanitizeString(this.article.categoryName);
    const safeExcerpt = RBSHelpers.sanitizeString(this.article.excerpt);
    
    return `
      <div class="news-card-header">
        <div class="news-meta">
          <time class="news-date" datetime="${this.article.date}">${formattedDate}</time>
          <span 
            class="news-category ${this.article.category}" 
            style="background: ${categoryColor};"
            aria-label="カテゴリー: ${safeCategoryName}"
          >
            ${safeCategoryName}
          </span>
        </div>
        <h2 class="news-title">${safeTitle}</h2>
      </div>
      <div class="news-card-body">
        <p class="news-excerpt">${safeExcerpt}</p>
        <a 
          href="news-detail.html?id=${encodeURIComponent(this.article.id)}" 
          class="news-read-more"
          aria-label="${safeTitle}の詳細を読む"
        >
          続きを読む
        </a>
      </div>
    `;
  }

  /**
   * エラーカードを作成
   * @param {Error} error - エラーオブジェクト
   * @returns {Element} エラーカード要素
   */
  createErrorCard(error) {
    const card = document.createElement('article');
    card.className = 'news-card news-card--error';
    card.setAttribute('role', 'alert');
    card.innerHTML = `
      <div class="news-card-header">
        <h2 class="news-title">記事の読み込みエラー</h2>
      </div>
      <div class="news-card-body">
        <p class="news-excerpt">この記事を表示できませんでした。</p>
      </div>
    `;
    return card;
  }

  /**
   * イベントリスナーをセットアップ
   */
  setupEventListeners() {
    if (!this.element) return;
    
    if (this.config.enableClickNavigation) {
      this.setupClickNavigation();
    }
    
    if (this.config.enableHoverEffects) {
      this.setupHoverEffects();
    }
    
    this.setupKeyboardNavigation();
  }

  /**
   * クリックナビゲーションをセットアップ
   */
  setupClickNavigation() {
    const clickHandler = (e) => {
      // リンク以外の部分をクリックした場合も詳細ページに遷移
      if (e.target.tagName !== 'A' && !e.target.closest('a')) {
        e.preventDefault();
        this.navigateToDetail();
      }
    };
    
    this.addEventListener(this.element, 'click', clickHandler);
  }

  /**
   * ホバー効果をセットアップ
   */
  setupHoverEffects() {
    const mouseEnterHandler = () => {
      this.element.style.cursor = 'pointer';
      this.emit('newsCard:hovered', { article: this.article });
    };
    
    const mouseLeaveHandler = () => {
      this.emit('newsCard:unhovered', { article: this.article });
    };
    
    this.addEventListener(this.element, 'mouseenter', mouseEnterHandler);
    this.addEventListener(this.element, 'mouseleave', mouseLeaveHandler);
  }

  /**
   * キーボードナビゲーションをセットアップ
   */
  setupKeyboardNavigation() {
    const keydownHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.navigateToDetail();
      }
    };
    
    this.addEventListener(this.element, 'keydown', keydownHandler);
  }

  /**
   * 詳細ページに遷移
   */
  navigateToDetail() {
    try {
      const link = this.element.querySelector('.news-read-more');
      if (link && link.href) {
        this.emit('newsCard:navigating', { 
          article: this.article, 
          url: link.href 
        });
        window.location.href = link.href;
      }
    } catch (error) {
      console.error('NewsCard: ナビゲーションエラー:', error);
    }
  }

  /**
   * 日付をフォーマット
   * @param {string} dateString - 日付文字列
   * @returns {string} フォーマット済み日付
   */
  formatDate(dateString) {
    try {
      return RBSHelpers.formatDate(dateString, this.config.dateFormat);
    } catch (error) {
      console.error('NewsCard: 日付フォーマットエラー:', error);
      return dateString;
    }
  }

  /**
   * カテゴリーの色を取得
   * @param {string} category - カテゴリー
   * @returns {string} カテゴリー色
   */
  getCategoryColor(category) {
    return this.categoryColors[category] || this.categoryColors.default;
  }

  /**
   * カテゴリー色を設定
   * @param {string} category - カテゴリー
   * @param {string} color - 色
   */
  setCategoryColor(category, color) {
    this.categoryColors[category] = color;
    this.updateCategoryColor();
  }

  /**
   * カテゴリー色を更新
   */
  updateCategoryColor() {
    if (!this.element) return;
    
    const categoryElement = this.element.querySelector('.news-category');
    if (categoryElement) {
      const newColor = this.getCategoryColor(this.article.category);
      categoryElement.style.background = newColor;
    }
  }

  /**
   * カードを更新
   * @param {Object} article - 新しい記事データ
   */
  update(article) {
    try {
      const oldArticle = this.article;
      this.article = this.validateArticle(article);
      
      if (this.element) {
        const newElement = this.createElement();
        this.element.replaceWith(newElement);
        this.element = newElement;
        this.setupEventListeners();
        
        this.emit('newsCard:updated', { 
          oldArticle, 
          newArticle: this.article 
        });
      }
    } catch (error) {
      console.error('NewsCard: 更新エラー:', error);
      this.emit('newsCard:updateError', { error, article });
    }
  }

  /**
   * 記事データを取得
   * @returns {Object} 記事データ
   */
  getArticle() {
    return { ...this.article };
  }

  /**
   * フォーカスを設定
   */
  focus() {
    if (this.element && this.element.focus) {
      this.element.focus();
    }
  }
}

// グローバルに公開
window.NewsCard = NewsCard; 