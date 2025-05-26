/**
 * ニュースカードコンポーネント
 * ニュース記事の表示用カード
 */
class NewsCard {
  constructor(article) {
    this.article = article;
    this.element = null;
  }

  /**
   * カード要素を作成
   */
  createElement() {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.setAttribute('data-category', this.article.category);
    
    const categoryColor = this.getCategoryColor(this.article.category);
    
    card.innerHTML = `
      <div class="news-card-header">
        <div class="news-meta">
          <div class="news-date">${this.formatDate(this.article.date)}</div>
          <div class="news-category ${this.article.category}" style="background: ${categoryColor};">
            ${this.article.categoryName}
          </div>
        </div>
        <h2 class="news-title">${this.article.title}</h2>
      </div>
      <div class="news-card-body">
        <p class="news-excerpt">${this.article.excerpt}</p>
        <a href="news-detail.html?id=${this.article.id}" class="news-read-more">続きを読む</a>
      </div>
    `;
    
    this.element = card;
    this.setupEventListeners();
    
    return card;
  }

  /**
   * イベントリスナーをセットアップ
   */
  setupEventListeners() {
    if (!this.element) return;
    
    // カードクリック時の処理
    this.element.addEventListener('click', (e) => {
      // リンク以外の部分をクリックした場合も詳細ページに遷移
      if (e.target.tagName !== 'A') {
        const link = this.element.querySelector('.news-read-more');
        if (link) {
          window.location.href = link.href;
        }
      }
    });

    // ホバー効果
    this.element.addEventListener('mouseenter', () => {
      this.element.style.cursor = 'pointer';
    });
  }

  /**
   * 日付をフォーマット
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}.${month}.${day}`;
  }

  /**
   * カテゴリーの色を取得
   */
  getCategoryColor(category) {
    const colors = {
      'announcement': '#4a90e2',
      'event': '#50c8a3',
      'media': '#9b59b6',
      'important': '#e74c3c'
    };
    
    return colors[category] || '#6c757d';
  }

  /**
   * カードを更新
   */
  update(article) {
    this.article = article;
    if (this.element) {
      const newElement = this.createElement();
      this.element.replaceWith(newElement);
    }
  }

  /**
   * カードを削除
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// グローバルに公開
window.NewsCard = NewsCard; 