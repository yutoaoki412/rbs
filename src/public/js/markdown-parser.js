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
      'event': '体験会',
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

      // LocalStorageから管理者データを確認（管理画面で作成されたデータのみ使用）
      const adminData = localStorage.getItem('rbs_articles_data');
      if (adminData) {
        try {
          const allArticles = JSON.parse(adminData);
          // 公開済みの記事のみをフィルタリング
          this.articles = allArticles.filter(article => article.status === 'published');
          
          // 記事データを正規化（表示用フィールドの追加）
          this.articles = this.articles.map(article => ({
            ...article,
            categoryName: this.getCategoryName(article.category),
            excerpt: article.summary || article.content?.substring(0, 150) + '...' || ''
          }));
          
          console.log('LocalStorageから記事データを読み込み:', this.articles.length, '件（全', allArticles.length, '件中）');
          
          // データの整合性をチェック
          this.validateArticleData();
          
          return this.articles;
        } catch (parseError) {
          console.error('LocalStorageデータの解析に失敗:', parseError);
          localStorage.removeItem('rbs_articles_data');
        }
      }

      // 管理画面で作成された記事がない場合は空配列を返す
      console.log('管理画面で作成された記事がありません。新しい記事を作成してください。');
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
  async loadArticleContent(articleIdOrFilename) {
    try {
      // 管理画面のデータから読み込み
      if (this.adminManager) {
        const content = await this.adminManager.loadArticleContent(articleIdOrFilename);
        return this.parser.parse(content);
      }

      // LocalStorageから記事のコンテンツを読み込み（管理画面で作成されたもの）
      let article = null;
      let articleId = null;
      
      // articleIdOrFilenameが数値または数値文字列の場合はIDとして処理
      if (!isNaN(articleIdOrFilename)) {
        articleId = parseInt(articleIdOrFilename);
        article = this.articles.find(a => a.id === articleId);
      } else {
        // 文字列の場合はファイル名として処理（下位互換性のため）
        article = this.articles.find(a => a.file === articleIdOrFilename);
        if (article) {
          articleId = article.id;
        }
      }

      if (!article) {
        console.warn('記事が見つかりません:', articleIdOrFilename);
        return '<p>記事が見つかりませんでした。</p>';
      }

      // まず記事データのcontentフィールドをチェック（管理画面で作成された記事）
      if (article.content) {
        return this.parser.parse(article.content);
      }

      // 下位互換性のため、別途保存されたコンテンツデータもチェック
      const contentData = JSON.parse(localStorage.getItem('rbs_articles_content') || '{}');
      if (contentData[articleId]) {
        return this.parser.parse(contentData[articleId]);
      }

      // コンテンツが見つからない場合
      console.warn('記事のコンテンツが見つかりません:', articleIdOrFilename);
      return '<div class="empty-content"><h3>記事内容がありません</h3><p>この記事のコンテンツが正しく保存されていません。管理画面から記事を編集してください。</p></div>';
    } catch (error) {
      console.error('記事の読み込みに失敗しました:', error);
      return '<div class="error-content"><h3>記事の読み込みに失敗しました</h3><p>しばらく時間をおいてから再度お試しください。</p></div>';
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
      'event': 'var(--primary-teal)',
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
    
    // 各記事の詳細情報
    this.articles.forEach((article, index) => {
      console.log(`記事${index + 1}:`, {
        id: article.id,
        title: article.title,
        category: article.category,
        status: article.status,
        hasContent: !!article.content,
        contentLength: article.content ? article.content.length : 0,
        excerpt: article.excerpt || 'なし',
        date: article.date
      });
    });
    
    // 公開済み記事のカウント
    const publishedCount = this.articles.filter(a => a.status === 'published').length;
    const draftCount = this.articles.filter(a => a.status === 'draft').length;
    console.log('公開済み記事:', publishedCount, '件');
    console.log('下書き記事:', draftCount, '件');
    
    console.log('================================');
  }

  /**
   * 管理画面データとの同期状況をチェック
   */
  checkDataSync() {
    try {
      const adminData = localStorage.getItem('rbs_articles_data');
      const contentData = localStorage.getItem('rbs_articles_content');
      
      console.log('=== データ同期チェック ===');
      
      if (!adminData) {
        console.warn('管理画面データが見つかりません。管理画面から記事を作成してください。');
        return false;
      }
      
      const articles = JSON.parse(adminData);
      const publishedArticles = articles.filter(a => a.status === 'published');
      
      console.log('管理画面総記事数:', articles.length);
      console.log('公開済み記事数:', publishedArticles.length);
      console.log('下書き記事数:', articles.filter(a => a.status === 'draft').length);
      
      // コンテンツの整合性チェック
      if (contentData) {
        const content = JSON.parse(contentData);
        const contentIds = Object.keys(content);
        console.log('コンテンツデータ:', contentIds.length, '件');
        
        // 記事データとコンテンツデータの整合性
        publishedArticles.forEach(article => {
          const hasContent = article.content || content[article.id];
          if (!hasContent) {
            console.warn('コンテンツが見つからない記事:', article.title, '(ID:', article.id, ')');
          }
        });
      }
      
      console.log('=======================');
      return true;
    } catch (error) {
      console.error('データ同期チェックでエラー:', error);
      return false;
    }
  }
} 