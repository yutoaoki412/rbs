/**
 * 管理者機能を統括するクラス
 * 記事の作成、編集、削除、ステータス管理を行う
 */
class AdminManager {
  constructor() {
    this.articles = [];
    this.currentFilter = '';
    this.searchQuery = '';
    this.nextId = 1;
    this.storageKey = 'rbs_articles_data';
    this.contentStorageKey = 'rbs_articles_content';
    this.nextIdStorageKey = 'rbs_next_id';
  }

  /**
   * 記事データを読み込み
   */
  async loadArticles() {
    try {
      console.log('AdminManager: 記事データを読み込み中...');
      
      // LocalStorageから記事データを読み込み
      const storedData = localStorage.getItem(this.storageKey);
      
      if (storedData) {
        this.articles = JSON.parse(storedData);
        console.log('AdminManager: LocalStorageから記事データを読み込み:', this.articles.length, '件');
        
        // nextIdをLocalStorageから読み込み
        this.loadNextId();
        
        // データの整合性をチェック
        this.validateAndFixData();
      } else {
        console.log('AdminManager: LocalStorageにデータがありません。移行を試行します。');
        
        // 初回読み込み時は既存のarticles.jsonから移行
        await this.migrateFromJson();
        
        // データがない場合はサンプル記事を作成
        if (this.articles.length === 0) {
          console.log('AdminManager: サンプル記事を作成します。');
          this.createSampleArticles();
        }
      }
      
      console.log('AdminManager: 最終的な記事数:', this.articles.length);
      return this.articles;
    } catch (error) {
      console.error('記事データの読み込みに失敗:', error);
      throw error;
    }
  }

  /**
   * 既存のarticles.jsonからLocalStorageに移行
   */
  async migrateFromJson() {
    try {
      const response = await fetch('../articles/articles.json');
      if (response.ok) {
        const jsonData = await response.json();
        
        // 各記事のコンテンツも読み込み
        for (const article of jsonData) {
          try {
            const contentResponse = await fetch(`../articles/${article.file}`);
            if (contentResponse.ok) {
              const content = await contentResponse.text();
              this.saveArticleContent(article.id, content);
            }
          } catch (error) {
            console.warn(`記事 ${article.id} のコンテンツ読み込みに失敗:`, error);
          }
        }
        
        this.articles = jsonData.map(article => ({
          ...article,
          status: article.status || 'published'
        }));
        
        this.nextId = Math.max(...this.articles.map(a => a.id), 0) + 1;
        this.saveNextId();
        this.saveArticles();
        
        console.log('記事データをLocalStorageに移行しました');
      }
    } catch (error) {
      console.warn('articles.jsonからの移行に失敗:', error);
      this.articles = [];
    }
  }

  /**
   * 記事データをLocalStorageに保存
   */
  saveArticles() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.articles));
    } catch (error) {
      console.error('記事データの保存に失敗:', error);
      throw error;
    }
  }

  /**
   * nextIdをLocalStorageに保存
   */
  saveNextId() {
    try {
      localStorage.setItem(this.nextIdStorageKey, this.nextId.toString());
    } catch (error) {
      console.error('nextIdの保存に失敗:', error);
      throw error;
    }
  }

  /**
   * nextIdをLocalStorageから読み込み
   */
  loadNextId() {
    try {
      const storedNextId = localStorage.getItem(this.nextIdStorageKey);
      if (storedNextId) {
        this.nextId = parseInt(storedNextId, 10);
      } else {
        // LocalStorageにnextIdがない場合は記事から計算
        this.nextId = this.articles.length > 0 ? Math.max(...this.articles.map(a => a.id), 0) + 1 : 1;
        this.saveNextId();
      }
    } catch (error) {
      console.error('nextIdの読み込みに失敗:', error);
      // エラーの場合は記事から計算
      this.nextId = this.articles.length > 0 ? Math.max(...this.articles.map(a => a.id), 0) + 1 : 1;
      this.saveNextId();
    }
  }

  /**
   * 記事コンテンツを保存
   */
  saveArticleContent(id, content) {
    try {
      const contentData = JSON.parse(localStorage.getItem(this.contentStorageKey) || '{}');
      contentData[id] = content;
      localStorage.setItem(this.contentStorageKey, JSON.stringify(contentData));
    } catch (error) {
      console.error('記事コンテンツの保存に失敗:', error);
      throw error;
    }
  }

  /**
   * 記事コンテンツを読み込み
   */
  async loadArticleContent(filename) {
    try {
      // まずLocalStorageから探す
      const contentData = JSON.parse(localStorage.getItem(this.contentStorageKey) || '{}');
      const article = this.articles.find(a => a.file === filename);
      
      if (article && contentData[article.id]) {
        return contentData[article.id];
      }
      
      // LocalStorageにない場合は元のファイルから読み込み
      const response = await fetch(`../articles/${filename}`);
      if (!response.ok) {
        throw new Error(`記事ファイルが見つかりません: ${filename}`);
      }
      
      const content = await response.text();
      
      // LocalStorageに保存
      if (article) {
        this.saveArticleContent(article.id, content);
      }
      
      return content;
    } catch (error) {
      console.error('記事コンテンツの読み込みに失敗:', error);
      throw error;
    }
  }

  /**
   * IDで記事を取得
   */
  getArticleById(id) {
    return this.articles.find(article => article.id === parseInt(id));
  }



  /**
   * 新しい記事を作成
   */
  async createArticle(articleData) {
    try {
      const newArticle = {
        id: this.nextId++,
        title: articleData.title,
        date: articleData.date,
        category: articleData.category,
        categoryName: articleData.categoryName,
        excerpt: articleData.excerpt,
        file: this.generateFilename(articleData.date, articleData.title),
        featured: articleData.featured || false,
        status: articleData.status || 'draft'
      };

      this.articles.push(newArticle);
      this.saveArticles();
      this.saveNextId(); // nextIdを保存
      
      // コンテンツを保存
      this.saveArticleContent(newArticle.id, articleData.content);
      
      return newArticle;
    } catch (error) {
      console.error('記事の作成に失敗:', error);
      throw error;
    }
  }

  /**
   * 記事を更新
   */
  async updateArticle(id, articleData) {
    try {
      const index = this.articles.findIndex(article => article.id === parseInt(id));
      if (index === -1) {
        throw new Error('記事が見つかりません');
      }

      const updatedArticle = {
        ...this.articles[index],
        title: articleData.title,
        date: articleData.date,
        category: articleData.category,
        categoryName: articleData.categoryName,
        excerpt: articleData.excerpt,
        featured: articleData.featured || false,
        status: articleData.status || 'draft'
      };

      this.articles[index] = updatedArticle;
      this.saveArticles();
      
      // コンテンツを保存
      this.saveArticleContent(parseInt(id), articleData.content);
      
      return updatedArticle;
    } catch (error) {
      console.error('記事の更新に失敗:', error);
      throw error;
    }
  }

  /**
   * 記事を削除
   */
  async deleteArticle(id) {
    try {
      const index = this.articles.findIndex(article => article.id === parseInt(id));
      if (index === -1) {
        throw new Error('記事が見つかりません');
      }

      this.articles.splice(index, 1);
      this.saveArticles();
      
      // nextIdは削除しても変更しない（IDの重複を防ぐため）
      // this.nextId = this.articles.length > 0 ? Math.max(...this.articles.map(a => a.id), 0) + 1 : 1;
      // this.saveNextId();
      
      // コンテンツも削除
      const contentData = JSON.parse(localStorage.getItem(this.contentStorageKey) || '{}');
      delete contentData[id];
      localStorage.setItem(this.contentStorageKey, JSON.stringify(contentData));
      
      return true;
    } catch (error) {
      console.error('記事の削除に失敗:', error);
      throw error;
    }
  }

  /**
   * 記事のステータスを切り替え
   */
  async toggleArticleStatus(id) {
    try {
      const article = this.getArticleById(parseInt(id));
      if (!article) {
        throw new Error('記事が見つかりません');
      }

      article.status = article.status === 'draft' ? 'published' : 'draft';
      this.saveArticles();
      
      return article;
    } catch (error) {
      console.error('ステータスの切り替えに失敗:', error);
      throw error;
    }
  }

  /**
   * すべての下書きを公開
   */
  async publishAllDrafts() {
    try {
      const drafts = this.articles.filter(article => article.status === 'draft');
      
      drafts.forEach(article => {
        article.status = 'published';
      });
      
      this.saveArticles();
      
      return drafts.length;
    } catch (error) {
      console.error('一括公開に失敗:', error);
      throw error;
    }
  }

  /**
   * ファイル名を生成
   */
  generateFilename(date, title) {
    const dateStr = date.replace(/-/g, '-');
    const titleSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return `${dateStr}-${titleSlug}.md`;
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
    });
  }

  /**
   * カテゴリー名を取得
   */
  getCategoryName(category) {
    const categoryMap = {
      'announcement': 'お知らせ',
      'trial': '体験会',
      'media': 'メディア',
      'important': '重要'
    };
    return categoryMap[category] || 'お知らせ';
  }

  /**
   * カテゴリー色を取得
   */
  getCategoryColor(category) {
    const colorMap = {
      'announcement': '#4a90e2',
      'trial': '#50c8a3',
      'media': '#9b59b6',
      'important': '#e74c3c'
    };
    return colorMap[category] || '#4a90e2';
  }

  /**
   * 公開用のJSONデータを生成（フロントエンド用）
   */
  generatePublicData() {
    return this.articles
      .filter(article => article.status === 'published')
      .map(article => ({
        id: article.id,
        title: article.title,
        date: article.date,
        category: article.category,
        categoryName: article.categoryName,
        excerpt: article.excerpt,
        file: article.file,
        featured: article.featured
      }));
  }

  /**
   * データをエクスポート（バックアップ用）
   */
  exportData() {
    const data = {
      articles: this.articles,
      content: JSON.parse(localStorage.getItem(this.contentStorageKey) || '{}'),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `rbs-articles-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * データをインポート（復元用）
   */
  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.articles && Array.isArray(data.articles)) {
        this.articles = data.articles;
        this.nextId = Math.max(...this.articles.map(a => a.id), 0) + 1;
        this.saveArticles();
        this.saveNextId(); // nextIdを保存
        
        if (data.content) {
          localStorage.setItem(this.contentStorageKey, JSON.stringify(data.content));
        }
        
        return true;
      } else {
        throw new Error('無効なデータ形式です');
      }
    } catch (error) {
      console.error('データのインポートに失敗:', error);
      throw error;
    }
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    console.log('統計情報を計算中...', this.articles);
    
    const now = new Date();
    const thisMonth = this.articles.filter(article => {
      const articleDate = new Date(article.date);
      return articleDate.getMonth() === now.getMonth() && 
             articleDate.getFullYear() === now.getFullYear();
    });

    const stats = {
      total: this.articles.length,
      published: this.articles.filter(a => a.status === 'published').length,
      draft: this.articles.filter(a => a.status === 'draft').length,
      thisMonth: thisMonth.length,
      categories: {
        announcement: this.articles.filter(a => a.category === 'announcement').length,
        trial: this.articles.filter(a => a.category === 'trial').length,
        media: this.articles.filter(a => a.category === 'media').length,
        important: this.articles.filter(a => a.category === 'important').length
      }
    };

    console.log('統計情報:', stats);
    return stats;
  }

  /**
   * 検索機能
   */
  searchArticles(query) {
    if (!query.trim()) {
      return this.getFilteredArticles();
    }

    const searchTerm = query.toLowerCase();
    return this.articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm) ||
      article.excerpt.toLowerCase().includes(searchTerm) ||
      article.categoryName.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * フィルタリングされた記事を取得（検索対応版）
   */
  getFilteredArticles() {
    let filtered = [...this.articles];
    
    // 検索クエリでフィルタリング
    if (this.searchQuery && this.searchQuery.trim()) {
      const searchTerm = this.searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.excerpt.toLowerCase().includes(searchTerm) ||
        article.categoryName.toLowerCase().includes(searchTerm)
      );
    }
    
    // カテゴリーでフィルタリング
    if (this.currentFilter) {
      filtered = filtered.filter(article => article.category === this.currentFilter);
    }
    
    // 日付順でソート（新しい順）
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return filtered;
  }

  /**
   * 記事の複製
   */
  async duplicateArticle(id) {
    try {
      const originalArticle = this.getArticleById(parseInt(id));
      if (!originalArticle) {
        throw new Error('記事が見つかりません');
      }

      // コンテンツを読み込み
      const content = await this.loadArticleContent(originalArticle.file);
      
      // 複製データを作成
      const duplicateData = {
        title: `${originalArticle.title} (コピー)`,
        date: new Date().toISOString().split('T')[0],
        category: originalArticle.category,
        categoryName: originalArticle.categoryName,
        excerpt: originalArticle.excerpt,
        content: content,
        featured: false,
        status: 'draft'
      };

      return await this.createArticle(duplicateData);
    } catch (error) {
      console.error('記事の複製に失敗:', error);
      throw error;
    }
  }

  /**
   * データの整合性をチェックして修正
   */
  validateAndFixData() {
    console.log('AdminManager: データ整合性チェック開始');
    
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
      
      // 重複を除去（最初に見つかったものを残す）
      const seenIds = new Set();
      this.articles = this.articles.filter(article => {
        if (seenIds.has(article.id)) {
          console.warn('重複記事を除去:', article.title);
          return false;
        }
        seenIds.add(article.id);
        return true;
      });
    }

    // 必須フィールドをチェック
    const validArticles = this.articles.filter(article => {
      const isValid = article.id && article.title && article.date && article.category;
      if (!isValid) {
        console.warn('無効な記事データを除外:', article);
      }
      return isValid;
    });

    if (validArticles.length !== this.articles.length) {
      this.articles = validArticles;
      this.saveArticles();
    }

    // nextIdの整合性をチェック
    if (this.articles.length > 0) {
      const maxId = Math.max(...this.articles.map(a => a.id));
      if (this.nextId <= maxId) {
        console.warn('nextIdが不正です。修正します:', this.nextId, '->', maxId + 1);
        this.nextId = maxId + 1;
        this.saveNextId();
      }
    }

    console.log('AdminManager: データ整合性チェック完了:', this.articles.length, '件の有効な記事');
  }

  /**
   * デバッグ情報を出力
   */
  debugInfo() {
    console.log('=== AdminManager デバッグ情報 ===');
    console.log('記事数:', this.articles.length);
    console.log('nextId:', this.nextId);
    console.log('記事一覧:', this.articles);
    console.log('LocalStorage記事データ:', localStorage.getItem(this.storageKey));
    console.log('LocalStorageコンテンツデータ:', localStorage.getItem(this.contentStorageKey));
    console.log('LocalStorage nextId:', localStorage.getItem(this.nextIdStorageKey));
    console.log('================================');
  }

  /**
   * サンプル記事を作成
   */
  createSampleArticles() {
    const sampleArticles = [
      {
        id: 1,
        title: 'RBS陸上教室 大泉学園校 開校準備中',
        date: '2025-01-15',
        category: 'announcement',
        categoryName: 'お知らせ',
        excerpt: '2025年春、大泉学園校の開校に向けて準備を進めています。',
        file: '2025-01-15-opening-preparation.md',
        featured: true,
        status: 'published'
      },
      {
        id: 2,
        title: '無料体験会のお知らせ',
        date: '2025-01-10',
        category: 'trial',
        categoryName: '体験会',
        excerpt: '年長〜小6を対象とした無料体験会を開催します。',
        file: '2025-01-10-trial-schedule.md',
        featured: false,
        status: 'published'
      },
      {
        id: 3,
        title: 'メディア掲載情報',
        date: '2025-01-05',
        category: 'media',
        categoryName: 'メディア',
        excerpt: '地域情報誌にRBS陸上教室が掲載されました。',
        file: '2025-01-05-media-coverage.md',
        featured: false,
        status: 'draft'
      }
    ];

    this.articles = sampleArticles;
    this.nextId = 4;
    this.saveArticles();
    this.saveNextId(); // nextIdを保存

    // サンプルコンテンツも保存
    const sampleContents = {
      1: '# RBS陸上教室 大泉学園校 開校準備中\n\n2025年春の開校に向けて、着々と準備を進めています。\n\n## 開校予定\n- 時期：2025年4月\n- 場所：大泉学園駅周辺\n- 対象：年長〜小学6年生\n\n詳細は決まり次第お知らせいたします。',
      2: '# 無料体験会のお知らせ\n\n年長〜小6を対象とした無料体験会を開催します。\n\n## 開催日程\n- 日時：毎週土曜日 17:00-18:00\n- 場所：大泉学園体育館\n- 持ち物：運動できる服装、水筒\n\nお気軽にご参加ください！',
      3: '# メディア掲載情報\n\n地域情報誌「大泉学園タイムズ」にRBS陸上教室が掲載されました。\n\n## 掲載内容\n- 教室の特徴\n- 指導方針\n- 体験会情報\n\nぜひご覧ください。'
    };

    localStorage.setItem(this.contentStorageKey, JSON.stringify(sampleContents));
    
    console.log('サンプル記事を作成しました');
  }
} 