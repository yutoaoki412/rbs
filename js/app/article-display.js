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
 * Article Manager
 * Fetches and prepares articles for public display.
 */
class ArticleManager {
  constructor() {
    this.articles = []; // Stores metadata for published articles
    this.parser = new MarkdownParser();
  }

  /**
   * Loads all published article metadata from the API.
   * @returns {Promise<Array>} A promise that resolves to an array of published articles metadata.
   */
  async loadArticles() {
    console.log("ArticleManager: Fetching articles metadata from /api/articles");
    try {
      const response = await fetch('/api/articles');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch articles list', details: response.statusText }));
        console.error('ArticleManager: Failed to fetch articles list', response.status, errorData);
        throw new Error(`Failed to fetch articles: ${response.status} ${errorData.error || errorData.details || ''}`);
      }
      const allArticles = await response.json();
      
      // Filter for published articles and store their metadata
      this.articles = allArticles.filter(article => article.status === 'published');
      
      console.log(`ArticleManager: Loaded ${this.articles.length} published articles metadata.`);
      return this.articles; 
    } catch (error) {
      console.error('ArticleManager: Error loading articles metadata:', error);
      this.articles = []; 
      throw error; 
    }
  }

  /**
   * Fetches a single published article by its ID, including its content, and parses the content to HTML.
   * @param {string} id The ID of the article to fetch.
   * @returns {Promise<Object|null>} A promise that resolves to the article object with an added `htmlContent` property, or null if not found/error or not published.
   */
  async getArticleWithContentById(id) {
    console.log(`ArticleManager: Fetching article with content for ID: ${id} from /api/articles/${id}`);
    if (!id) {
      console.error("ArticleManager: ID is required to fetch an article.");
      return null;
    }
    try {
      const response = await fetch(`/api/articles/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`ArticleManager: Article with ID ${id} not found.`);
          return null;
        }
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch article content', details: response.statusText }));
        console.error(`ArticleManager: Failed to fetch article ${id}`, response.status, errorData);
        throw new Error(`Failed to fetch article ${id}: ${response.status} ${errorData.error || errorData.details || ''}`);
      }
      
      const article = await response.json();

      // Ensure the article is published before returning
      if (!article || article.status !== 'published') {
        console.warn(`ArticleManager: Article with ID ${id} is not published or does not exist. Status: ${article?.status}`);
        return null; 
      }
      
      let htmlContent = '';
      if (article.content) {
        htmlContent = this.parser.parse(article.content);
      } else {
        console.warn(`ArticleManager: Article with ID ${id} found but has no content.`);
      }
      return { ...article, htmlContent };

    } catch (error) {
      console.error(`ArticleManager: Error fetching article ${id}:`, error);
      return null; 
    }
  }

   /**
   * Gets a specific article's metadata from the loaded list of published articles.
   * Call loadArticles() first.
   * @param {string} id The ID of the article.
   * @returns {Object|undefined} The article metadata if found, otherwise undefined.
   */
  getArticleMetadataById(id) {
    if (this.articles.length === 0) {
        // This can be a common case if getArticleMetadataById is called before loadArticles completes.
        console.warn("ArticleManager: getArticleMetadataById called when articles list is empty. Ensure loadArticles() has been called and completed.");
    }
    const articleIdStr = String(id); // Ensure comparison with string IDs if API returns numbers for ID
    return this.articles.find(article => String(article.id) === articleIdStr);
  }

  /**
   * Formats a date string.
   * @param {string} dateString The date string to format.
   * @returns {string} Formatted date string or 'Invalid Date'.
   */
  formatDate(dateString) {
    if (!dateString) return '日付なし';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '無効な日付';
      }
      // Consistent with formatting in admin manager (if desired) or choose a public format
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'  
      });
    } catch (e) {
      console.warn("Date formatting error for:", dateString, e);
      return '日付エラー';
    }
  }

  /**
   * Gets the category name for a given category slug.
   * @param {string} categorySlug The category slug.
   * @returns {string} The category name or the slug itself if not found.
   */
  getCategoryName(categorySlug) {
    // This map should ideally be shared or fetched if dynamic, or kept consistent with admin side.
    const categoryMap = {
      'announcement': 'お知らせ',
      'trial': '体験会',
      'media': 'メディア',
      'important': '重要',
    };
    return categoryMap[categorySlug] || categorySlug || 'カテゴリなし';
  }

  /**
   * Gets the category color (example, if needed for public site styling).
   * @param {string} categorySlug The category slug.
   * @returns {string} A CSS color string or a default.
   */
  getCategoryColor(categorySlug) {
    const colorMap = {
      'announcement': '#4a90e2', // var(--primary-blue)
      'trial': '#50c8a3',      // var(--primary-teal)
      'media': '#9b59b6',
      'important': '#e74c3c'   // var(--primary-red)
    };
    return colorMap[categorySlug] || '#6c757d'; // var(--gray-medium)
  }
}