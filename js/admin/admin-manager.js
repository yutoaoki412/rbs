/**
 * 管理者機能を統括するクラス
 * 記事の作成、編集、削除、ステータス管理を行う
 */
class AdminManager {
  constructor() {
    this.articles = [];
    this.currentFilter = '';
    this.searchQuery = '';
    // nextId is now managed by the backend.
    // storageKey, contentStorageKey, nextIdStorageKey are removed as localStorage is no longer used for articles.
  }

  /**
   * 記事データをAPIから読み込み
   */
  async loadArticles() {
    try {
      console.log('AdminManager: 記事データをAPIから読み込み中...');
      const response = await fetch('/api/articles');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load articles', details: response.statusText }));
        throw new Error(`記事データの読み込みに失敗: ${response.status} ${errorData.error} ${errorData.details || ''}`);
      }
      this.articles = await response.json();
      console.log('AdminManager: APIから記事データを読み込み:', this.articles.length, '件');
      return this.articles;
    } catch (error) {
      console.error('記事データの読み込みに失敗:', error);
      alert(`記事データの読み込みに失敗しました: ${error.message}`);
      this.articles = []; // エラー時は空にする
      throw error;
    }
  }

  // migrateFromJson and createSampleArticles are removed as data is now managed via API.
  // saveArticles, saveNextId, loadNextId are removed.

  // saveArticleContent is removed. Content is handled by the API.

  /**
   * 記事コンテンツをAPIから読み込み (IDで指定)
   */
  async loadArticleWithContent(id) {
    try {
      console.log(`AdminManager: 記事(ID: ${id})のコンテンツをAPIから読み込み中...`);
      const response = await fetch(`/api/articles/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`記事(ID: ${id})が見つかりません。`);
        }
        const errorData = await response.json().catch(() => ({ error: 'Failed to load article content', details: response.statusText }));
        throw new Error(`記事コンテンツの読み込みに失敗: ${response.status} ${errorData.error} ${errorData.details || ''}`);
      }
      const articleWithContent = await response.json();
      console.log(`AdminManager: 記事(ID: ${id})のコンテンツを読み込みました。`);
      return articleWithContent;
    } catch (error) {
      console.error(`記事(ID: ${id})コンテンツの読み込みに失敗:`, error);
      alert(`記事コンテンツの読み込みに失敗しました: ${error.message}`);
      throw error;
    }
  }

  /**
   * IDで記事を取得 (ローカルのthis.articlesから)
   * 注意: このメソッドはコンテンツを含まない場合があります。
   *       コンテンツが必要な場合は loadArticleWithContent(id) を使用してください。
   */
  getArticleById(id) {
    const articleId = typeof id === 'string' ? id : id.toString();
    return this.articles.find(article => article.id === articleId);
  }


  /**
   * 新しい記事を作成 (API経由)
   */
  async createArticle(articleData) {
    try {
      console.log('AdminManager: 新しい記事を作成中...', articleData);
      // Generate filename client-side for now, though API might override or also generate
      const requestBody = {
        ...articleData,
        file: this.generateFilename(articleData.date, articleData.title), 
      };

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create article', details: response.statusText }));
        throw new Error(`記事の作成に失敗: ${response.status} ${errorData.error} ${errorData.details || ''}`);
      }

      const newArticle = await response.json();
      this.articles.push(newArticle); // Add to local cache
      console.log('AdminManager: 記事を作成しました:', newArticle);
      return newArticle;
    } catch (error) {
      console.error('記事の作成に失敗:', error);
      alert(`記事の作成に失敗しました: ${error.message}`);
      throw error;
    }
  }

  /**
   * 記事を更新 (API経由)
   */
  async updateArticle(id, articleData) {
    try {
      const articleId = typeof id === 'string' ? id : id.toString();
      console.log(`AdminManager: 記事(ID: ${articleId})を更新中...`, articleData);
      
      // Ensure 'file' is part of articleData if it's meant to be updated based on title/date changes
      // The API currently generates/updates 'file' based on title/date.
      // We can send it, or let the API handle it. For now, let's assume API handles it.
      const requestBody = { ...articleData };
      // if (articleData.title || articleData.date) {
      //   requestBody.file = this.generateFilename(articleData.date, articleData.title);
      // }


      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update article', details: response.statusText }));
        throw new Error(`記事の更新に失敗: ${response.status} ${errorData.error} ${errorData.details || ''}`);
      }

      const updatedArticle = await response.json();
      const index = this.articles.findIndex(article => article.id === articleId);
      if (index !== -1) {
        this.articles[index] = updatedArticle;
      } else {
        this.articles.push(updatedArticle); // Should not happen if ID exists
      }
      console.log(`AdminManager: 記事(ID: ${articleId})を更新しました:`, updatedArticle);
      return updatedArticle;
    } catch (error) {
      console.error(`記事(ID: ${id})の更新に失敗:`, error);
      alert(`記事の更新に失敗しました: ${error.message}`);
      throw error;
    }
  }

  /**
   * 記事を削除 (API経由)
   */
  async deleteArticle(id) {
    try {
      const articleId = typeof id === 'string' ? id : id.toString();
      console.log(`AdminManager: 記事(ID: ${articleId})を削除中...`);
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
         if (response.status === 404) {
            console.warn(`AdminManager: 削除しようとした記事(ID: ${articleId})が見つかりませんでした。ローカルからは削除します。`);
         } else {
            const errorData = await response.json().catch(() => ({ error: 'Failed to delete article', details: response.statusText }));
            throw new Error(`記事の削除に失敗: ${response.status} ${errorData.error} ${errorData.details || ''}`);
         }
      }
      
      // Remove from local cache even if 404 on server (means it was already gone)
      const index = this.articles.findIndex(article => article.id === articleId);
      if (index !== -1) {
        this.articles.splice(index, 1);
      }
      console.log(`AdminManager: 記事(ID: ${articleId})を削除しました。`);
      return true;
    } catch (error) {
      console.error(`記事(ID: ${id})の削除に失敗:`, error);
      alert(`記事の削除に失敗しました: ${error.message}`);
      throw error;
    }
  }

  /**
   * 記事のステータスを切り替え (API経由)
   */
  async toggleArticleStatus(id) {
    try {
      const articleId = typeof id === 'string' ? id : id.toString();
      console.log(`AdminManager: 記事(ID: ${articleId})のステータスを切り替え中...`);
      
      // Fetch the full article first (including content, as API expects full object for PUT)
      const articleToUpdate = await this.loadArticleWithContent(articleId);
      if (!articleToUpdate) {
        throw new Error(`記事(ID: ${articleId})が見つかりません。`);
      }

      const newStatus = articleToUpdate.status === 'draft' ? 'published' : 'draft';
      
      // Prepare the complete article data for PUT request
      const updatedArticleData = {
        ...articleToUpdate, // This includes title, date, category, categoryName, excerpt, file, featured, content
        status: newStatus,
      };
      
      // Call updateArticle which handles the PUT request
      const updatedArticle = await this.updateArticle(articleId, updatedArticleData);
      console.log(`AdminManager: 記事(ID: ${articleId})のステータスを ${newStatus} に切り替えました。`);
      return updatedArticle;
    } catch (error) {
      console.error(`記事(ID: ${id})のステータス切り替えに失敗:`, error);
      alert(`記事のステータス切り替えに失敗しました: ${error.message}`);
      throw error;
    }
  }

  /**
   * すべての下書きを公開 (API経由)
   * NOTE: This will be slow if there are many drafts, as it updates them one by one.
   * A batch API endpoint would be better for this.
   */
  async publishAllDrafts() {
    try {
      console.log('AdminManager: すべての下書きを公開中...');
      const drafts = this.articles.filter(article => article.status === 'draft');
      let publishedCount = 0;

      for (const draft of drafts) {
        try {
          // We need the full article content to update
          const fullDraft = await this.loadArticleWithContent(draft.id);
          const updatedArticleData = { ...fullDraft, status: 'published' };
          await this.updateArticle(draft.id, updatedArticleData);
          publishedCount++;
        } catch (error) {
          console.error(`下書き記事(ID: ${draft.id})の公開に失敗:`, error);
          // Optionally, notify user about specific failures
        }
      }
      
      console.log(`AdminManager: ${publishedCount}件の下書きを公開しました。`);
      // Optionally, reload all articles to refresh local cache comprehensively
      // await this.loadArticles(); 
      return publishedCount;
    } catch (error) {
      console.error('一括公開処理中にエラーが発生:', error);
      alert(`一括公開処理中にエラーが発生しました: ${error.message}`);
      throw error;
    }
  }

  /**
   * ファイル名を生成 (slugify)
   * This remains client-side for now, API might also do this.
   */
  generateFilename(date, title) {
    if (!date || !title) return ''; // Handle cases where date or title might be undefined
    const dateStr = date.substring(0, 10).replace(/-/g, '-'); // Ensure date is YYYY-MM-DD
    const titleSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
      .replace(/\s+/g, '-')    // Replace spaces with hyphens
      .replace(/-+/g, '-')     // Replace multiple hyphens with a single hyphen
      .substring(0, 50);
    
    return `${dateStr}-${titleSlug}.md`;
  }

  /**
   * 日付をフォーマット
   */
  formatDate(dateString) {
    if (!dateString) return '日付なし';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '無効な日付';
      }
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      console.warn("Date formatting error for:", dateString, e);
      return '日付エラー';
    }
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
      // Add other categories as needed
    };
    return categoryMap[category] || category || 'カテゴリなし'; // Return category itself if not in map
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
    return colorMap[category] || '#7f8c8d'; // Default color
  }

  /**
   * 公開用のJSONデータを生成（フロントエンド用）
   * This method might be less relevant if the main website fetches directly from an API.
   * For now, it works on the locally cached (metadata-only) articles.
   */
  generatePublicData() {
    return this.articles
      .filter(article => article.status === 'published')
      .map(article => ({
        id: article.id,
        title: article.title,
        date: article.date,
        category: article.category,
        categoryName: this.getCategoryName(article.category), // Ensure categoryName is consistent
        excerpt: article.excerpt,
        file: article.file,
        featured: article.featured
      }));
  }

  /**
   * データをエクスポート（バックアップ用）
   * This is now more complex as it needs to fetch all articles with content.
   * For simplicity, this is commented out. Users should rely on KV store backups or API capabilities.
   */
  exportData() {
    console.warn("exportData: This function is currently disabled. Data is managed server-side.");
    alert("データのエクスポート機能は現在無効です。データはサーバー側で管理されています。");
    /*
    // To implement this properly, you'd need to:
    // 1. Fetch all articles (metadata)
    // 2. For each article, fetch its content using GET /api/articles/:id
    // 3. Combine them into the desired export format.
    // This can be slow and resource-intensive.
    
    const articlesWithContent = []; // This would need to be populated asynchronously
    
    const data = {
      articles: articlesWithContent, // This should be articles with their content
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
    */
  }

  /**
   * データをインポート（復元用）
   * This is now more complex as it needs to POST/PUT each article to the API.
   * For simplicity, this is commented out.
   */
  async importData(file) {
    console.warn("importData: This function is currently disabled. Data is managed server-side.");
    alert("データのインポート機能は現在無効です。データはサーバー側で管理されています。");
    /*
    // To implement this properly, you'd need to:
    // 1. Read and parse the file.
    // 2. For each article in the file:
    //    a. Check if an article with that ID or title/date already exists (GET /api/articles/:id or GET /api/articles?title=...)
    //    b. If exists, decide whether to skip or update (PUT /api/articles/:id).
    //    c. If not exists, create (POST /api/articles).
    // This is complex and error-prone.
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.articles && Array.isArray(data.articles)) {
        // This would require iterating and calling createArticle or updateArticle
        // for each item, which are async and need to be handled.
        console.log("Importing articles is a complex operation and needs careful implementation with API calls.");
        // this.articles = data.articles; // Not directly like this anymore
        // this.saveArticles(); // Removed
        // this.saveNextId(); // Removed
        
        // if (data.content) { // Content is part of articles now
        //   localStorage.setItem(this.contentStorageKey, JSON.stringify(data.content));
        // }
        
        return true;
      } else {
        throw new Error('無効なデータ形式です');
      }
    } catch (error) {
      console.error('データのインポートに失敗:', error);
      throw error;
    }
    */
  }

  /**
   * 統計情報を取得 (uses local cache)
   */
  getStats() {
    console.log('統計情報を計算中...', this.articles);
    if (!this.articles || this.articles.length === 0) {
        return { total: 0, published: 0, draft: 0, thisMonth: 0, categories: {} };
    }
    
    const now = new Date();
    const thisMonthArticles = this.articles.filter(article => {
      if (!article.date) return false;
      try {
        const articleDate = new Date(article.date);
        return articleDate.getMonth() === now.getMonth() && 
               articleDate.getFullYear() === now.getFullYear();
      } catch (e) { return false; }
    });

    const stats = {
      total: this.articles.length,
      published: this.articles.filter(a => a.status === 'published').length,
      draft: this.articles.filter(a => a.status === 'draft').length,
      thisMonth: thisMonthArticles.length,
      categories: this.articles.reduce((acc, article) => {
        if (article.category) {
          acc[article.category] = (acc[article.category] || 0) + 1;
        }
        return acc;
      }, {})
    };

    console.log('統計情報:', stats);
    return stats;
  }

  /**
   * 検索機能 (uses local cache)
   */
  searchArticles(query) {
    if (!query.trim()) {
      return this.getFilteredArticles(); // Returns based on current filter and full list
    }

    const searchTerm = query.toLowerCase();
    // Uses the currently loaded articles (metadata only) for searching
    return this.articles.filter(article => 
      (article.title && article.title.toLowerCase().includes(searchTerm)) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm)) ||
      (article.categoryName && article.categoryName.toLowerCase().includes(searchTerm)) || // categoryName might not exist if not set
      (article.category && this.getCategoryName(article.category).toLowerCase().includes(searchTerm))
    );
  }

  /**
   * フィルタリングされた記事を取得（検索対応版, uses local cache）
   */
  getFilteredArticles() {
    let filtered = [...this.articles]; // operates on local cache
    
    // 検索クエリでフィルタリング
    if (this.searchQuery && this.searchQuery.trim()) {
      const searchTerm = this.searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        (article.title && article.title.toLowerCase().includes(searchTerm)) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm)) ||
        (article.categoryName && article.categoryName.toLowerCase().includes(searchTerm)) ||
        (article.category && this.getCategoryName(article.category).toLowerCase().includes(searchTerm))
      );
    }
    
    // カテゴリーでフィルタリング
    if (this.currentFilter) {
      filtered = filtered.filter(article => article.category === this.currentFilter);
    }
    
    // 日付順でソート（新しい順）
    filtered.sort((a, b) => {
        try {
            return new Date(b.date) - new Date(a.date);
        } catch (e) { return 0; }
    });
    
    return filtered;
  }

  /**
   * 記事の複製 (API経由)
   */
  async duplicateArticle(id) {
    try {
      const articleId = typeof id === 'string' ? id : id.toString();
      console.log(`AdminManager: 記事(ID: ${articleId})を複製中...`);

      // 1. 元の記事のコンテンツを含む全データを取得
      const originalArticleWithContent = await this.loadArticleWithContent(articleId);
      if (!originalArticleWithContent) {
        throw new Error(`記事(ID: ${articleId})が見つかりません。`);
      }
      
      // 2. 複製データを作成 (新しい日付、コピータイトル、下書きステータス)
      const duplicateData = {
        title: `${originalArticleWithContent.title} (コピー)`,
        date: new Date().toISOString().split('T')[0], // Today's date
        category: originalArticleWithContent.category,
        categoryName: originalArticleWithContent.categoryName, // ensure this is part of original or fetched
        excerpt: originalArticleWithContent.excerpt,
        content: originalArticleWithContent.content, // Crucially, include content
        featured: false, // Typically, copies are not featured by default
        status: 'draft'  // Copies should start as drafts
      };

      // 3. 新しい記事として作成 (createArticle handles POST to API)
      const newArticle = await this.createArticle(duplicateData);
      console.log(`AdminManager: 記事(ID: ${articleId})を複製し、新しい記事(ID: ${newArticle.id})を作成しました。`);
      return newArticle;
    } catch (error) {
      console.error(`記事(ID: ${id})の複製に失敗:`, error);
      alert(`記事の複製に失敗しました: ${error.message}`);
      throw error;
    }
  }

  /**
   * データの整合性をチェックして修正
   * This is largely removed as data integrity is primarily a backend concern now.
   * Basic client-side checks could remain if needed, but complex validation is out.
   */
  validateAndFixData() {
    console.log('AdminManager: validateAndFixData is largely a backend concern now. Skipping complex client-side validation.');
    if (!Array.isArray(this.articles)) {
      console.error('記事データが配列ではありません。APIからの読み込みに問題がある可能性があります。');
      this.articles = [];
    }
    // Simple check for IDs, though API should guarantee uniqueness.
    const ids = this.articles.map(article => article.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.warn('AdminManager: ローカルキャッシュに重複したIDが見つかりました。APIからのデータを確認してください。');
    }
  }

  /**
   * デバッグ情報を出力
   * Adjusted to reflect new data sources.
   */
  debugInfo() {
    console.log('=== AdminManager デバッグ情報 ===');
    console.log('記事数 (ローカルキャッシュ):', this.articles.length);
    console.log('記事一覧 (ローカルキャッシュ):', this.articles);
    // LocalStorage items are no longer relevant for article data.
    console.log('================================');
  }

  // createSampleArticles is removed. Sample data should be managed via API or direct KV manipulation.
}