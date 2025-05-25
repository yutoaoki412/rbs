/**
 * シンプルなMarkdownパーサー
 * 記事のMarkdownファイルをHTMLに変換
 */
class MarkdownParser {
  constructor() {
    this.rules = [
      // ヘッダー
      { pattern: /^### (.*$)/gm, replacement: '<h3>$1</h3>' },
      { pattern: /^## (.*$)/gm, replacement: '<h2>$1</h2>' },
      { pattern: /^# (.*$)/gm, replacement: '<h1>$1</h1>' },
      
      // 太字
      { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
      
      // リスト
      { pattern: /^- (.*$)/gm, replacement: '<li>$1</li>' },
      
      // 引用
      { pattern: /^> (.*$)/gm, replacement: '<blockquote>$1</blockquote>' },
      
      // 水平線
      { pattern: /^---$/gm, replacement: '<hr>' },
      
      // 段落（空行で区切られたテキスト）
      { pattern: /\n\n/g, replacement: '</p><p>' }
    ];
  }

  parse(markdown) {
    let html = markdown;
    
    // 各ルールを適用
    this.rules.forEach(rule => {
      html = html.replace(rule.pattern, rule.replacement);
    });
    
    // リストをul要素で囲む
    html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
      return '<ul>' + match + '</ul>';
    });
    
    // 段落タグで囲む
    html = '<p>' + html + '</p>';
    
    // 不要な空の段落を削除
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    
    return html;
  }
}

/**
 * 記事管理システム
 */
class ArticleManager {
  constructor() {
    this.parser = new MarkdownParser();
    this.articles = [];
    this.currentFilter = '';
    this.adminManager = null;
    this.categories = {
      'all': 'すべて',
      'announcement': 'お知らせ',
      'trial': '体験会',
      'media': 'メディア',
      'important': '重要'
    };
  }

  /**
   * 記事一覧を読み込み
   */
  async loadArticles() {
    try {
      console.log('記事データを読み込み中...');
      
      // 管理画面からのデータがある場合はそれを使用
      if (this.adminManager) {
        await this.adminManager.loadArticles();
        this.articles = this.adminManager.generatePublicData();
        console.log('管理画面から記事データを読み込み:', this.articles.length, '件');
        return this.articles;
      }

      // LocalStorageから管理者データを確認
      const adminData = localStorage.getItem('rbs_articles_data');
      if (adminData) {
        try {
          const allArticles = JSON.parse(adminData);
          this.articles = allArticles.filter(article => article.status === 'published');
          console.log('LocalStorageから記事データを読み込み:', this.articles.length, '件（全', allArticles.length, '件中）');
          
          // データの整合性をチェック
          this.validateArticleData();
          
          return this.articles;
        } catch (parseError) {
          console.error('LocalStorageデータの解析に失敗:', parseError);
          localStorage.removeItem('rbs_articles_data');
        }
      }

      // フォールバック: 元のJSONファイルから読み込み
      try {
        const response = await fetch('articles/articles.json');
        if (response.ok) {
          this.articles = await response.json();
          console.log('articles.jsonから記事データを読み込み:', this.articles.length, '件');
          return this.articles;
        }
      } catch (fetchError) {
        console.warn('articles.jsonの読み込みに失敗:', fetchError);
      }

      // すべて失敗した場合は空配列を返す
      console.warn('記事データが見つかりません');
      this.articles = [];
      return this.articles;
    } catch (error) {
      console.error('記事一覧の読み込みに失敗しました:', error);
      this.articles = [];
      return [];
    }
  }

  /**
   * 特定の記事のMarkdownを読み込み
   */
  async loadArticleContent(filename) {
    try {
      // 管理画面のデータから読み込み
      if (this.adminManager) {
        const content = await this.adminManager.loadArticleContent(filename);
        return this.parser.parse(content);
      }

      // LocalStorageから読み込み
      const contentData = JSON.parse(localStorage.getItem('rbs_articles_content') || '{}');
      const article = this.articles.find(a => a.file === filename);
      
      if (article && contentData[article.id]) {
        return this.parser.parse(contentData[article.id]);
      }

      // フォールバック: 元のファイルから読み込み
      const response = await fetch(`articles/${filename}`);
      const markdown = await response.text();
      return this.parser.parse(markdown);
    } catch (error) {
      console.error('記事の読み込みに失敗しました:', error);
      return '<p>記事の読み込みに失敗しました。</p>';
    }
  }

  /**
   * IDから記事を取得
   */
  getArticleById(id) {
    return this.articles.find(article => article.id === parseInt(id));
  }

  /**
   * カテゴリーでフィルタリング
   */
  filterByCategory(category) {
    if (category === 'all') {
      return this.articles;
    }
    return this.articles.filter(article => article.category === category);
  }

  /**
   * フィルタリングされた記事を取得
   */
  getFilteredArticles() {
    return this.filterByCategory(this.currentFilter || 'all');
  }

  /**
   * 日付をフォーマット
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '.');
  }

  /**
   * カテゴリー名を取得
   */
  getCategoryName(category) {
    return this.categories[category] || category;
  }

  /**
   * カテゴリーの色を取得
   */
  getCategoryColor(category) {
    const colors = {
      'announcement': 'var(--primary-blue)',
      'trial': 'var(--primary-teal)',
      'media': 'var(--primary-purple)',
      'important': 'var(--primary-red)'
    };
    return colors[category] || 'var(--gray-medium)';
  }

  /**
   * 管理者マネージャーを設定
   */
  setAdminManager(adminManager) {
    this.adminManager = adminManager;
  }

  /**
   * 記事データの整合性をチェック
   */
  validateArticleData() {
    if (!Array.isArray(this.articles)) {
      console.error('記事データが配列ではありません');
      this.articles = [];
      return;
    }

    // 重複IDをチェック
    const ids = this.articles.map(article => article.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.warn('重複したIDが見つかりました:', ids.filter((id, index) => ids.indexOf(id) !== index));
    }

    // 必須フィールドをチェック
    this.articles = this.articles.filter(article => {
      const isValid = article.id && article.title && article.date && article.category;
      if (!isValid) {
        console.warn('無効な記事データを除外:', article);
      }
      return isValid;
    });

    console.log('データ検証完了:', this.articles.length, '件の有効な記事');
  }

  /**
   * デバッグ情報を出力
   */
  debugInfo() {
    console.log('=== ArticleManager デバッグ情報 ===');
    console.log('記事数:', this.articles.length);
    console.log('記事一覧:', this.articles);
    console.log('LocalStorage記事データ:', localStorage.getItem('rbs_articles_data'));
    console.log('LocalStorageコンテンツデータ:', localStorage.getItem('rbs_articles_content'));
    console.log('================================');
  }
} 