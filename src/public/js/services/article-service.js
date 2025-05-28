/**
 * 記事サービス v2.0 - 管理画面とLP間の記事データ連携を統一管理
 * LocalStorageから直接記事データを読み込み、確実に表示する
 */
class ArticleService {
  constructor() {
    this.articles = [];
    this.isInitialized = false;
    this.storageKeys = {
      articles: 'rbs_articles_data',
      content: 'rbs_articles_content'
    };
    this.categories = {
      'announcement': 'お知らせ',
      'event': '体験会',
      'media': 'メディア',
      'important': '重要'
    };
    this.categoryColors = {
      'announcement': '#4299e1',
      'event': '#38b2ac',
      'media': '#805ad5',
      'important': '#e53e3e'
    };
  }

  /**
   * サービスを初期化
   */
  async init() {
    if (this.isInitialized) {
      return this;
    }

    try {
      console.log('🔄 ArticleService v2.0 初期化開始');
      
      // LocalStorageから記事データを直接読み込み
      await this.loadArticlesFromStorage();
      
      this.isInitialized = true;
      console.log('✅ ArticleService初期化完了:', this.articles.length, '件の公開記事');
      
      return this;
    } catch (error) {
      console.error('❌ ArticleService初期化失敗:', error);
      this.articles = [];
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * LocalStorageから記事データを読み込み
   */
  async loadArticlesFromStorage() {
    try {
      const rawData = localStorage.getItem(this.storageKeys.articles);
      
      if (!rawData) {
        console.log('📝 LocalStorageに記事データがありません');
        this.articles = [];
        return;
      }

      const allArticles = JSON.parse(rawData);
      
      if (!Array.isArray(allArticles)) {
        console.warn('⚠️ 記事データが配列ではありません');
        this.articles = [];
        return;
      }

      // 公開済みの記事のみをフィルタリング
      this.articles = allArticles
        .filter(article => {
          // 基本的なデータ検証
          if (!article || typeof article !== 'object') return false;
          if (!article.id || !article.title || !article.status) return false;
          
          // 公開済みの記事のみ
          return article.status === 'published';
        })
        .map(article => this.normalizeArticle(article))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // 日付順でソート

      console.log(`📰 記事データ読み込み完了: ${this.articles.length}件の公開記事（全${allArticles.length}件中）`);
      
      // デバッグ情報
      if (this.articles.length > 0) {
        console.log('📋 読み込まれた記事:', this.articles.map(a => ({
          id: a.id,
          title: a.title,
          category: a.category,
          date: a.date
        })));
      }

    } catch (error) {
      console.error('❌ 記事データの読み込みに失敗:', error);
      this.articles = [];
      throw new Error(`記事データの読み込みに失敗しました: ${error.message}`);
    }
  }

  /**
   * 記事データを正規化
   */
  normalizeArticle(article) {
    return {
      id: parseInt(article.id),
      title: article.title || '',
      category: article.category || 'announcement',
      date: article.date || article.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      summary: article.summary || '',
      content: article.content || '',
      featured: article.featured || false,
      status: article.status,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      // 表示用の追加フィールド
      categoryName: this.getCategoryName(article.category || 'announcement'),
      categoryColor: this.getCategoryColor(article.category || 'announcement'),
      formattedDate: this.formatDate(article.date || article.createdAt),
      excerpt: this.generateExcerpt(article.summary, article.content)
    };
  }

  /**
   * 記事の要約を生成
   */
  generateExcerpt(summary, content) {
    if (summary && summary.trim()) {
      return summary.trim();
    }
    
    if (content && content.trim()) {
      // Markdownの記号を除去して要約を作成
      const plainText = content
        .replace(/[#*_`\[\]()]/g, '') // Markdown記号を除去
        .replace(/\n+/g, ' ') // 改行をスペースに変換
        .trim();
      
      return plainText.length > 150 
        ? plainText.substring(0, 150) + '...'
        : plainText;
    }
    
    return '';
  }

  /**
   * 公開済み記事を取得
   */
  getPublishedArticles() {
    if (!this.isInitialized) {
      console.warn('⚠️ ArticleServiceが初期化されていません');
      return [];
    }
    return [...this.articles];
  }

  /**
   * IDで記事を取得
   */
  getArticleById(id) {
    if (!this.isInitialized) {
      console.warn('⚠️ ArticleServiceが初期化されていません');
      return null;
    }
    
    const articleId = parseInt(id);
    return this.articles.find(article => article.id === articleId) || null;
  }

  /**
   * カテゴリーで記事をフィルタリング
   */
  getArticlesByCategory(category) {
    if (!this.isInitialized) {
      console.warn('⚠️ ArticleServiceが初期化されていません');
      return [];
    }
    
    if (category === 'all') {
      return this.getPublishedArticles();
    }
    
    return this.articles.filter(article => article.category === category);
  }

  /**
   * 最新記事を取得
   */
  getLatestArticles(limit = 3) {
    const articles = this.getPublishedArticles();
    return articles.slice(0, limit);
  }

  /**
   * 記事のコンテンツを取得（HTML変換済み）
   */
  async getArticleContent(articleId) {
    try {
      const article = this.getArticleById(articleId);
      
      if (!article) {
        throw new Error('記事が見つかりません');
      }

      let content = article.content;

      // コンテンツが空の場合は別途保存されたコンテンツを確認
      if (!content || content.trim() === '') {
        const contentData = JSON.parse(localStorage.getItem(this.storageKeys.content) || '{}');
        content = contentData[articleId] || '';
      }

      if (!content || content.trim() === '') {
        return '<div class="empty-content"><p>記事の内容がありません。</p></div>';
      }

      // 簡易Markdown変換
      return this.convertMarkdownToHtml(content);
      
    } catch (error) {
      console.error('記事コンテンツの取得に失敗:', error);
      return '<div class="error-content"><p>記事の読み込みに失敗しました。</p></div>';
    }
  }

  /**
   * 簡易Markdown変換
   */
  convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    return markdown
      // 見出し
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 太字・斜体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // リンク
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // 改行
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // 段落で囲む
      .replace(/^(.+)$/gm, '<p>$1</p>')
      // 空の段落を除去
      .replace(/<p><\/p>/g, '');
  }

  /**
   * 日付をフォーマット
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '.');
    } catch (error) {
      console.warn('日付のフォーマットに失敗:', dateString);
      return dateString;
    }
  }

  /**
   * カテゴリー名を取得
   */
  getCategoryName(category) {
    return this.categories[category] || category;
  }

  /**
   * カテゴリー色を取得
   */
  getCategoryColor(category) {
    return this.categoryColors[category] || '#6b7280';
  }

  /**
   * データを強制的に再読み込み
   */
  async refresh() {
    console.log('🔄 ArticleServiceデータを再読み込み中...');
    this.isInitialized = false;
    this.articles = [];
    return await this.init();
  }

  /**
   * LocalStorageの状態を確認
   */
  checkStorageStatus() {
    const rawData = localStorage.getItem(this.storageKeys.articles);
    const contentData = localStorage.getItem(this.storageKeys.content);
    
    if (!rawData) {
      return {
        hasData: false,
        totalArticles: 0,
        publishedArticles: 0,
        hasContent: !!contentData
      };
    }

    try {
      const allArticles = JSON.parse(rawData);
      const publishedCount = allArticles.filter(a => a.status === 'published').length;
      
      return {
        hasData: true,
        totalArticles: allArticles.length,
        publishedArticles: publishedCount,
        draftArticles: allArticles.length - publishedCount,
        hasContent: !!contentData,
        articles: allArticles.map(a => ({
          id: a.id,
          title: a.title,
          status: a.status,
          category: a.category,
          date: a.date
        }))
      };
    } catch (error) {
      return {
        hasData: true,
        error: error.message,
        totalArticles: 0,
        publishedArticles: 0,
        hasContent: !!contentData
      };
    }
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    const storageStatus = this.checkStorageStatus();
    
    return {
      isInitialized: this.isInitialized,
      articlesCount: this.articles.length,
      storageStatus,
      articles: this.articles.map(a => ({
        id: a.id,
        title: a.title,
        category: a.category,
        date: a.date,
        hasContent: !!(a.content && a.content.trim())
      }))
    };
  }

  /**
   * 記事データが存在するかチェック
   */
  hasArticles() {
    return this.isInitialized && this.articles.length > 0;
  }

  /**
   * 記事検索
   */
  searchArticles(query) {
    if (!this.isInitialized || !query) {
      return [];
    }
    
    const searchTerm = query.toLowerCase();
    return this.articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm) ||
      article.summary.toLowerCase().includes(searchTerm) ||
      article.content.toLowerCase().includes(searchTerm)
    );
  }
}

// シングルトンインスタンスを作成
const articleService = new ArticleService();

// グローバルに公開
window.ArticleService = ArticleService;
window.articleService = articleService;

// 自動初期化（DOMContentLoaded後）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded - ArticleServiceの自動初期化を開始');
    articleService.init().catch(error => {
      console.error('ArticleServiceの自動初期化に失敗:', error);
    });
  });
} else {
  // すでにDOMが読み込まれている場合は即座に初期化
  console.log('📄 DOM既読み込み - ArticleServiceの自動初期化を開始');
  articleService.init().catch(error => {
    console.error('ArticleServiceの自動初期化に失敗:', error);
  });
}

console.log('📦 ArticleService v2.0 モジュール読み込み完了'); 