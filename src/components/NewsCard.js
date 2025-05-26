/**
 * NewsCard Component
 * ニュース記事カードを表示・管理するコンポーネント
 */
class NewsCard {
  constructor(article, options = {}) {
    this.article = article;
    this.options = {
      showExcerpt: true,
      showDate: true,
      showCategory: true,
      showImage: true,
      maxExcerptLength: 100,
      dateFormat: 'YYYY/MM/DD',
      linkTarget: '_self',
      ...options
    };
    
    this.cardElement = null;
  }

  /**
   * カードHTMLを生成
   */
  render() {
    const cardHTML = `
      <article class="news-card" data-article-id="${this.article.id}">
        ${this.renderImage()}
        <div class="news-card-content">
          ${this.renderHeader()}
          ${this.renderTitle()}
          ${this.renderExcerpt()}
          ${this.renderFooter()}
        </div>
      </article>
    `;
    
    // DOM要素を作成
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHTML;
    this.cardElement = tempDiv.firstElementChild;
    
    this.bindEvents();
    return this.cardElement;
  }

  /**
   * 画像部分をレンダリング
   */
  renderImage() {
    if (!this.options.showImage || !this.article.image) return '';
    
    return `
      <div class="news-card-image">
        <img src="${this.article.image}" alt="${this.article.title}" loading="lazy">
        ${this.renderImageOverlay()}
      </div>
    `;
  }

  /**
   * 画像オーバーレイをレンダリング
   */
  renderImageOverlay() {
    if (!this.options.showCategory || !this.article.category) return '';
    
    const categoryColor = this.getCategoryColor(this.article.category);
    return `
      <div class="image-overlay">
        <span class="category-badge" style="background: ${categoryColor};">
          ${this.article.categoryName || this.article.category}
        </span>
      </div>
    `;
  }

  /**
   * ヘッダー部分をレンダリング
   */
  renderHeader() {
    const parts = [];
    
    if (this.options.showDate && this.article.date) {
      parts.push(`<time class="news-date" datetime="${this.article.date}">${this.formatDate(this.article.date)}</time>`);
    }
    
    if (this.options.showCategory && this.article.category && !this.article.image) {
      const categoryColor = this.getCategoryColor(this.article.category);
      parts.push(`<span class="news-category" style="background: ${categoryColor};">${this.article.categoryName || this.article.category}</span>`);
    }
    
    if (parts.length === 0) return '';
    
    return `
      <div class="news-card-header">
        ${parts.join('')}
      </div>
    `;
  }

  /**
   * タイトル部分をレンダリング
   */
  renderTitle() {
    const linkUrl = this.getLinkUrl();
    
    return `
      <h3 class="news-title">
        <a href="${linkUrl}" target="${this.options.linkTarget}" class="news-link">
          ${this.escapeHtml(this.article.title)}
        </a>
      </h3>
    `;
  }

  /**
   * 抜粋部分をレンダリング
   */
  renderExcerpt() {
    if (!this.options.showExcerpt || !this.article.excerpt) return '';
    
    const excerpt = this.truncateText(this.article.excerpt, this.options.maxExcerptLength);
    
    return `
      <p class="news-excerpt">${this.escapeHtml(excerpt)}</p>
    `;
  }

  /**
   * フッター部分をレンダリング
   */
  renderFooter() {
    const parts = [];
    
    // 読了時間
    if (this.article.readTime) {
      parts.push(`<span class="read-time">📖 ${this.article.readTime}分で読める</span>`);
    }
    
    // タグ
    if (this.article.tags && this.article.tags.length > 0) {
      const tagsHtml = this.article.tags.slice(0, 3).map(tag => 
        `<span class="news-tag">#${this.escapeHtml(tag)}</span>`
      ).join('');
      parts.push(`<div class="news-tags">${tagsHtml}</div>`);
    }
    
    if (parts.length === 0) return '';
    
    return `
      <div class="news-card-footer">
        ${parts.join('')}
      </div>
    `;
  }

  /**
   * リンクURLを取得
   */
  getLinkUrl() {
    if (this.article.url) {
      return this.article.url;
    }
    return `news-detail.html?id=${this.article.id}`;
  }

  /**
   * カテゴリの色を取得
   */
  getCategoryColor(category) {
    const categoryColors = {
      'news': 'var(--primary-blue)',
      'event': 'var(--primary-teal)',
      'notice': 'var(--primary-orange)',
      'update': 'var(--primary-purple)',
      'achievement': 'var(--success)',
      'important': 'var(--primary-red)',
      'general': 'var(--gray-medium)'
    };
    
    return categoryColors[category] || categoryColors['general'];
  }

  /**
   * 日付をフォーマット
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    
    switch (this.options.dateFormat) {
      case 'YYYY/MM/DD':
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      case 'MM/DD':
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      case 'relative':
        return this.getRelativeTime(date);
      default:
        return date.toLocaleDateString('ja-JP');
    }
  }

  /**
   * 相対時間を取得
   */
  getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  }

  /**
   * テキストを切り詰め
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * イベントリスナーを設定
   */
  bindEvents() {
    if (!this.cardElement) return;
    
    // カードクリック時のナビゲーション
    this.cardElement.addEventListener('click', (event) => {
      // リンク要素のクリックは除外
      if (event.target.tagName === 'A') return;
      
      const linkUrl = this.getLinkUrl();
      if (this.options.linkTarget === '_blank') {
        window.open(linkUrl, '_blank');
      } else {
        window.location.href = linkUrl;
      }
    });
    
    // ホバー効果
    this.cardElement.addEventListener('mouseenter', () => {
      this.cardElement.classList.add('hovered');
    });
    
    this.cardElement.addEventListener('mouseleave', () => {
      this.cardElement.classList.remove('hovered');
    });
    
    // キーボードナビゲーション
    this.cardElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const linkUrl = this.getLinkUrl();
        if (this.options.linkTarget === '_blank') {
          window.open(linkUrl, '_blank');
        } else {
          window.location.href = linkUrl;
        }
      }
    });
    
    // アクセシビリティ
    this.cardElement.setAttribute('tabindex', '0');
    this.cardElement.setAttribute('role', 'button');
    this.cardElement.setAttribute('aria-label', `記事を読む: ${this.article.title}`);
  }

  /**
   * カードを更新
   */
  update(newArticle) {
    this.article = { ...this.article, ...newArticle };
    
    if (this.cardElement) {
      const newElement = this.render();
      this.cardElement.replaceWith(newElement);
    }
  }

  /**
   * カードを削除
   */
  remove() {
    if (this.cardElement && this.cardElement.parentNode) {
      this.cardElement.parentNode.removeChild(this.cardElement);
    }
  }

  /**
   * カードを非表示
   */
  hide() {
    if (this.cardElement) {
      this.cardElement.style.display = 'none';
    }
  }

  /**
   * カードを表示
   */
  show() {
    if (this.cardElement) {
      this.cardElement.style.display = '';
    }
  }

  /**
   * アニメーション付きで表示
   */
  animateIn(delay = 0) {
    if (!this.cardElement) return;
    
    this.cardElement.style.opacity = '0';
    this.cardElement.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      this.cardElement.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      this.cardElement.style.opacity = '1';
      this.cardElement.style.transform = 'translateY(0)';
    }, delay);
  }

  /**
   * アニメーション付きで非表示
   */
  animateOut(callback) {
    if (!this.cardElement) return;
    
    this.cardElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    this.cardElement.style.opacity = '0';
    this.cardElement.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      this.remove();
      if (callback) callback();
    }, 300);
  }
}

/**
 * NewsCardList Component
 * 複数のニュースカードを管理するコンポーネント
 */
class NewsCardList {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      cardOptions: {},
      animationDelay: 100,
      loadingText: '読み込み中...',
      emptyText: 'ニュースがありません',
      errorText: 'ニュースの読み込みに失敗しました',
      ...options
    };
    
    this.cards = [];
    this.articles = [];
  }

  /**
   * 記事リストを設定
   */
  setArticles(articles) {
    this.articles = articles;
    this.render();
  }

  /**
   * カードリストをレンダリング
   */
  render() {
    if (!this.container) return;
    
    // 既存のカードをクリア
    this.clear();
    
    if (this.articles.length === 0) {
      this.showEmpty();
      return;
    }
    
    // 新しいカードを作成
    this.articles.forEach((article, index) => {
      const card = new NewsCard(article, this.options.cardOptions);
      const cardElement = card.render();
      
      this.container.appendChild(cardElement);
      this.cards.push(card);
      
      // アニメーション
      card.animateIn(index * this.options.animationDelay);
    });
  }

  /**
   * 空の状態を表示
   */
  showEmpty() {
    this.container.innerHTML = `
      <div class="news-empty">
        <p>${this.options.emptyText}</p>
      </div>
    `;
  }

  /**
   * ローディング状態を表示
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="news-loading">
        <div class="loading-spinner"></div>
        <p>${this.options.loadingText}</p>
      </div>
    `;
  }

  /**
   * エラー状態を表示
   */
  showError() {
    this.container.innerHTML = `
      <div class="news-error">
        <p>${this.options.errorText}</p>
      </div>
    `;
  }

  /**
   * カードリストをクリア
   */
  clear() {
    this.cards.forEach(card => card.remove());
    this.cards = [];
    this.container.innerHTML = '';
  }

  /**
   * 記事を追加
   */
  addArticle(article) {
    this.articles.push(article);
    
    const card = new NewsCard(article, this.options.cardOptions);
    const cardElement = card.render();
    
    this.container.appendChild(cardElement);
    this.cards.push(card);
    
    card.animateIn();
  }

  /**
   * 記事を削除
   */
  removeArticle(articleId) {
    const index = this.articles.findIndex(article => article.id === articleId);
    if (index === -1) return;
    
    this.articles.splice(index, 1);
    
    const card = this.cards[index];
    if (card) {
      card.animateOut(() => {
        this.cards.splice(index, 1);
      });
    }
  }

  /**
   * 記事を更新
   */
  updateArticle(articleId, newData) {
    const index = this.articles.findIndex(article => article.id === articleId);
    if (index === -1) return;
    
    this.articles[index] = { ...this.articles[index], ...newData };
    
    const card = this.cards[index];
    if (card) {
      card.update(this.articles[index]);
    }
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NewsCard, NewsCardList };
} else if (typeof window !== 'undefined') {
  window.NewsCard = NewsCard;
  window.NewsCardList = NewsCardList;
} 