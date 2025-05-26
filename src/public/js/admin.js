/**
 * RBS陸上教室 管理画面システム
 * レッスン状況、ニュース、Instagram投稿の管理機能
 */

class AdminManager {
  constructor() {
    this.currentTab = 'lesson-status';
    this.articleManager = new ArticleManager();
    this.articles = [];
    this.instagramPosts = [];
    this.lessonStatus = {};
    this.adminAuth = new AdminAuth(); // 認証システムを初期化
    
    // 管理画面用の設定
    this.config = {
      storageKeys: {
        articles: 'rbs_articles_data',
        articlesContent: 'rbs_articles_content',
        instagram: 'rbs_instagram_posts',
        lessonStatus: 'rbs_lesson_status'
      },
      categories: {
        announcement: 'お知らせ',
        event: '体験会',
        media: 'メディア',
        important: '重要'
      },
      instagramCategories: {
        lesson: 'レッスン風景',
        event: 'イベント',
        achievement: '成果・記録',
        other: 'その他'
      }
    };
  }

  /**
   * 管理画面の初期化
   */
  async init() {
    try {
      console.log('管理画面を初期化中...');
      
      // AdminAuthの初期化確認
      if (!this.adminAuth) {
        console.error('AdminAuthが初期化されていません');
        this.showError('認証システムの初期化に失敗しました');
        return;
      }
      
      // 認証チェック
      console.log('認証状態をチェック中...');
      if (!this.checkAuth()) {
        console.log('認証チェックに失敗 - リダイレクト処理を実行');
        return; // checkAuth内でリダイレクト処理が行われる
      }
      console.log('認証チェック完了');
      
      // データの読み込み
      console.log('データ読み込み開始...');
      await this.loadAllData();
      console.log('データ読み込み完了');
      
      // イベントリスナーの設定
      console.log('イベントリスナー設定開始...');
      this.setupEventListeners();
      console.log('イベントリスナー設定完了');
      
      // 初期表示の設定
      console.log('初期表示設定開始...');
      this.setupInitialDisplay();
      console.log('初期表示設定完了');
      
      console.log('管理画面の初期化が完了しました');
    } catch (error) {
      console.error('管理画面の初期化に失敗:', error);
      console.error('エラースタック:', error.stack);
      this.showError(`管理画面の初期化に失敗しました: ${error.message}`);
    }
  }

  /**
   * 認証チェック
   */
  checkAuth() {
    try {
      console.log('AdminAuth認証状態チェック開始');
      
      if (!this.adminAuth) {
        console.error('AdminAuthインスタンスが存在しません');
        this.redirectToLogin();
        return false;
      }
      
      const isAuth = this.adminAuth.isAuthenticated();
      console.log('認証状態:', isAuth);
      
      if (isAuth) {
        console.log('認証済み - アクセス許可');
        return true;
      }
      
      console.log('未認証 - ログイン画面にリダイレクト');
      // 認証されていない場合はログイン画面にリダイレクト
      this.redirectToLogin();
      return false;
    } catch (error) {
      console.error('認証チェック中にエラー:', error);
      this.redirectToLogin();
      return false;
    }
  }

  /**
   * ログイン画面にリダイレクト
   */
  redirectToLogin() {
    console.log('認証が必要です。ログイン画面に移動します。');
    // 少し遅延を入れてからリダイレクト
    setTimeout(() => {
      window.location.href = 'admin-login.html';
    }, 1000);
  }

  /**
   * ログアウト
   */
  logout() {
    this.adminAuth.logout();
    window.location.href = 'admin-login.html';
  }

  /**
   * 全データの読み込み
   */
  async loadAllData() {
    await Promise.all([
      this.loadArticles(),
      this.loadInstagramPosts(),
      this.loadLessonStatus()
    ]);
  }

  /**
   * 記事データの読み込み
   */
  async loadArticles() {
    try {
      // ArticleManagerに管理画面を設定
      this.articleManager.setAdminManager(this);
      
      // 既存の記事データを読み込み
      await this.articleManager.loadArticles();
      
      // LocalStorageから管理者用データを読み込み
      const adminData = localStorage.getItem(this.config.storageKeys.articles);
      if (adminData) {
        this.articles = JSON.parse(adminData);
      } else {
        // 既存の公開記事から管理者用データを生成
        this.articles = this.articleManager.articles.map(article => ({
          ...article,
          status: 'published',
          content: ''
        }));
        this.saveArticles();
      }
      
      console.log('記事データを読み込み:', this.articles.length, '件');
    } catch (error) {
      console.error('記事データの読み込みに失敗:', error);
      this.articles = [];
    }
  }

  /**
   * Instagram投稿データの読み込み
   */
  loadInstagramPosts() {
    try {
      const data = localStorage.getItem(this.config.storageKeys.instagram);
      this.instagramPosts = data ? JSON.parse(data) : [];
      console.log('Instagram投稿データを読み込み:', this.instagramPosts.length, '件');
    } catch (error) {
      console.error('Instagram投稿データの読み込みに失敗:', error);
      this.instagramPosts = [];
    }
  }

  /**
   * レッスン状況データの読み込み
   */
  loadLessonStatus() {
    try {
      const data = localStorage.getItem(this.config.storageKeys.lessonStatus);
      this.lessonStatus = data ? JSON.parse(data) : {};
      console.log('レッスン状況データを読み込み');
    } catch (error) {
      console.error('レッスン状況データの読み込みに失敗:', error);
      this.lessonStatus = {};
    }
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ナビゲーション切り替え
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });

    // モーダルクローズ
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal();
      }
    });

    // 今日の日付を設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('lesson-date').value = today;
    document.getElementById('news-date').value = today;
    document.getElementById('instagram-date').value = today;
    
    // 日付変更時のイベントリスナー
    document.getElementById('lesson-date').addEventListener('change', () => {
      this.loadCurrentLessonStatus();
    });
  }

  /**
   * 初期表示の設定
   */
  setupInitialDisplay() {
    this.switchTab('dashboard');
    this.renderNewsList();
    this.renderInstagramList();
    this.loadCurrentLessonStatus();
    this.updateDashboardStats();
  }

  /**
   * タブ切り替え
   */
  switchTab(tabName) {
    // ナビゲーションアイテムの状態更新
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetNav) {
      targetNav.classList.add('active');
    }

    // セクションの表示切り替え
    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.remove('active');
    });
    const targetSection = document.getElementById(tabName);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    this.currentTab = tabName;
    
    // タブ固有の初期化
    if (tabName === 'dashboard') {
      this.updateDashboardStats();
    }
  }

  /**
   * レッスン状況の更新
   */
  updateLessonStatus() {
    try {
      const date = document.getElementById('lesson-date').value;
      const basicStatus = document.getElementById('basic-status').value;
      const basicMessage = document.getElementById('basic-message').value;
      const advanceStatus = document.getElementById('advance-status').value;
      const advanceMessage = document.getElementById('advance-message').value;

      if (!date) {
        this.showError('日付を選択してください');
        return;
      }

      const statusData = {
        date: date,
        basic: {
          status: basicStatus,
          message: basicMessage
        },
        advance: {
          status: advanceStatus,
          message: advanceMessage
        },
        updatedAt: new Date().toISOString()
      };

      this.lessonStatus[date] = statusData;
      localStorage.setItem(this.config.storageKeys.lessonStatus, JSON.stringify(this.lessonStatus));

      this.showSuccess('レッスン状況を更新しました');
      console.log('レッスン状況を更新:', statusData);
    } catch (error) {
      console.error('レッスン状況の更新に失敗:', error);
      this.showError('レッスン状況の更新に失敗しました');
    }
  }

  /**
   * レッスン状況のプレビュー
   */
  previewLessonStatus() {
    const date = document.getElementById('lesson-date').value;
    const basicStatus = document.getElementById('basic-status').value;
    const basicMessage = document.getElementById('basic-message').value;
    const advanceStatus = document.getElementById('advance-status').value;
    const advanceMessage = document.getElementById('advance-message').value;

    const statusTexts = {
      normal: '通常開催',
      cancelled: '中止',
      indoor: '室内開催',
      postponed: '延期'
    };

    const previewHtml = `
      <div class="lesson-status-preview">
        <h3>${date} のレッスン状況</h3>
        <div class="course-preview">
          <h4>ベーシックコース（年長〜小3）</h4>
          <p><strong>状況:</strong> ${statusTexts[basicStatus]}</p>
          ${basicMessage ? `<p><strong>メッセージ:</strong> ${basicMessage}</p>` : ''}
        </div>
        <div class="course-preview">
          <h4>アドバンスコース（小4〜小6）</h4>
          <p><strong>状況:</strong> ${statusTexts[advanceStatus]}</p>
          ${advanceMessage ? `<p><strong>メッセージ:</strong> ${advanceMessage}</p>` : ''}
        </div>
      </div>
    `;

    this.showModal('レッスン状況プレビュー', previewHtml);
  }

  /**
   * 現在のレッスン状況を読み込み
   */
  loadCurrentLessonStatus() {
    const date = document.getElementById('lesson-date').value;
    const status = this.lessonStatus[date];

    if (status) {
      document.getElementById('basic-status').value = status.basic.status;
      document.getElementById('basic-message').value = status.basic.message;
      document.getElementById('advance-status').value = status.advance.status;
      document.getElementById('advance-message').value = status.advance.message;
    } else {
      // デフォルト値にリセット
      document.getElementById('basic-status').value = 'normal';
      document.getElementById('basic-message').value = '';
      document.getElementById('advance-status').value = 'normal';
      document.getElementById('advance-message').value = '';
    }
  }

  /**
   * ダッシュボード統計の更新
   */
  updateDashboardStats() {
    try {
      const totalArticles = this.articles.length;
      const publishedArticles = this.articles.filter(article => article.status === 'published').length;
      const draftArticles = this.articles.filter(article => article.status === 'draft').length;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthArticles = this.articles.filter(article => {
        const articleDate = new Date(article.date);
        return articleDate.getMonth() === currentMonth && articleDate.getFullYear() === currentYear;
      }).length;

      // 統計カードの更新
      const totalElement = document.getElementById('total-articles');
      const publishedElement = document.getElementById('published-articles');
      const draftElement = document.getElementById('draft-articles');
      const currentMonthElement = document.getElementById('current-month-articles');

      if (totalElement) totalElement.textContent = totalArticles;
      if (publishedElement) publishedElement.textContent = publishedArticles;
      if (draftElement) draftElement.textContent = draftArticles;
      if (currentMonthElement) currentMonthElement.textContent = currentMonthArticles;

      // 最近の記事を表示
      this.updateRecentArticles();

    } catch (error) {
      console.error('ダッシュボード統計の更新に失敗:', error);
    }
  }

  /**
   * 最近の記事の更新
   */
  updateRecentArticles() {
    try {
      const recentArticlesContainer = document.getElementById('recent-articles');
      if (!recentArticlesContainer) return;

      const recentArticles = this.articles
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 5);

      if (recentArticles.length === 0) {
        recentArticlesContainer.innerHTML = '<div class="empty-state">記事がありません</div>';
        return;
      }

      const articlesHtml = recentArticles.map(article => `
        <div class="list-item">
          <div class="list-item-header">
            <h4 class="list-item-title">${article.title}</h4>
            <span class="status-badge ${article.status === 'published' ? 'status-published' : 'status-draft'}">
              ${article.status === 'published' ? '公開中' : '下書き'}
            </span>
          </div>
          <div class="list-item-meta">
            <span>${this.formatDate(article.date)}</span>
            <span class="category-badge">${this.getCategoryLabel(article.category)}</span>
          </div>
          ${article.summary ? `<div class="list-item-summary">${article.summary}</div>` : ''}
        </div>
      `).join('');

      recentArticlesContainer.innerHTML = articlesHtml;

    } catch (error) {
      console.error('最近の記事の更新に失敗:', error);
    }
  }

  /**
   * カテゴリーラベルの取得
   */
  getCategoryLabel(category) {
    const labels = {
      'announcement': 'お知らせ',
      'event': '体験会',
      'media': 'メディア',
      'important': '重要'
    };
    return labels[category] || category;
  }

  /**
   * ニュース記事の保存
   */
  saveNews() {
    try {
      const newsData = this.getNewsFormData();
      
      if (!this.validateNewsData(newsData)) {
        return;
      }

      if (newsData.id) {
        // 既存記事の更新
        const index = this.articles.findIndex(article => article.id === newsData.id);
        if (index !== -1) {
          this.articles[index] = { ...this.articles[index], ...newsData };
        }
      } else {
        // 新規記事の追加
        newsData.id = Date.now();
        newsData.createdAt = new Date().toISOString();
        this.articles.unshift(newsData);
      }

      newsData.updatedAt = new Date().toISOString();

      this.saveArticles();
      this.saveArticleContent(newsData.id, newsData.content);
      this.renderNewsList();
      this.clearNewsEditor();
      this.updateDashboardStats();

      this.showSuccess('記事を保存しました');
    } catch (error) {
      console.error('記事の保存に失敗:', error);
      this.showError('記事の保存に失敗しました');
    }
  }

  /**
   * ニュース記事の公開
   */
  publishNews() {
    try {
      const newsData = this.getNewsFormData();
      
      if (!this.validateNewsData(newsData)) {
        return;
      }

      newsData.status = 'published';
      this.saveNews();
      
      this.showSuccess('記事を公開しました');
    } catch (error) {
      console.error('記事の公開に失敗:', error);
      this.showError('記事の公開に失敗しました');
    }
  }

  /**
   * フォームからニュースデータを取得
   */
  getNewsFormData() {
    return {
      id: parseInt(document.getElementById('news-id').value) || null,
      title: document.getElementById('news-title').value.trim(),
      category: document.getElementById('news-category').value,
      date: document.getElementById('news-date').value,
      status: document.getElementById('news-status').value,
      summary: document.getElementById('news-summary').value.trim(),
      content: document.getElementById('news-content').value.trim()
    };
  }

  /**
   * ニュースデータの検証
   */
  validateNewsData(data) {
    if (!data.title) {
      this.showError('タイトルを入力してください');
      return false;
    }
    if (!data.date) {
      this.showError('公開日を選択してください');
      return false;
    }
    if (!data.summary) {
      this.showError('概要を入力してください');
      return false;
    }
    if (!data.content) {
      this.showError('本文を入力してください');
      return false;
    }
    return true;
  }

  /**
   * 記事データの保存
   */
  saveArticles() {
    localStorage.setItem(this.config.storageKeys.articles, JSON.stringify(this.articles));
  }

  /**
   * 記事コンテンツの保存
   */
  saveArticleContent(id, content) {
    const contentData = JSON.parse(localStorage.getItem(this.config.storageKeys.articlesContent) || '{}');
    contentData[id] = content;
    localStorage.setItem(this.config.storageKeys.articlesContent, JSON.stringify(contentData));
  }

  /**
   * ニュースエディターのクリア
   */
  clearNewsEditor() {
    document.getElementById('news-id').value = '';
    document.getElementById('news-title').value = '';
    document.getElementById('news-category').value = 'announcement';
    document.getElementById('news-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('news-status').value = 'draft';
    document.getElementById('news-summary').value = '';
    document.getElementById('news-content').value = '';
    document.getElementById('editor-title').textContent = '新規記事作成';
  }

  /**
   * ニュース一覧の表示
   */
  renderNewsList() {
    const container = document.getElementById('news-list-container');
    const filter = document.getElementById('news-filter').value;
    
    let filteredArticles = this.articles;
    if (filter !== 'all') {
      filteredArticles = this.articles.filter(article => article.status === filter);
    }

    if (filteredArticles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-text">記事がありません</div>
          <div class="empty-state-subtext">新しい記事を作成してください</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredArticles.map(article => `
      <div class="list-item">
        <div class="list-item-header">
          <h4 class="list-item-title">${article.title}</h4>
          <div class="list-item-actions">
            <button class="btn btn-secondary" onclick="adminManager.editNews(${article.id})">編集</button>
            <button class="btn btn-danger" onclick="adminManager.deleteNews(${article.id})">削除</button>
          </div>
        </div>
        <div class="list-item-meta">
          <span class="status-badge status-${article.status}">${article.status === 'published' ? '公開' : '下書き'}</span>
          <span class="category-badge">${this.config.categories[article.category]}</span>
          <span>${this.formatDate(article.date)}</span>
        </div>
        <div class="list-item-summary">${article.summary}</div>
      </div>
    `).join('');
  }

  /**
   * ニュース記事の編集
   */
  editNews(id) {
    const article = this.articles.find(a => a.id === id);
    if (!article) return;

    // フォームに記事データを設定
    document.getElementById('news-id').value = article.id;
    document.getElementById('news-title').value = article.title;
    document.getElementById('news-category').value = article.category;
    document.getElementById('news-date').value = article.date;
    document.getElementById('news-status').value = article.status;
    document.getElementById('news-summary').value = article.summary;
    
    // コンテンツを読み込み
    const contentData = JSON.parse(localStorage.getItem(this.config.storageKeys.articlesContent) || '{}');
    document.getElementById('news-content').value = contentData[article.id] || article.content || '';
    
    document.getElementById('editor-title').textContent = '記事編集';
  }

  /**
   * ニュース記事の削除
   */
  deleteNews(id) {
    if (!confirm('この記事を削除しますか？')) return;

    try {
      this.articles = this.articles.filter(article => article.id !== id);
      
      // コンテンツも削除
      const contentData = JSON.parse(localStorage.getItem(this.config.storageKeys.articlesContent) || '{}');
      delete contentData[id];
      localStorage.setItem(this.config.storageKeys.articlesContent, JSON.stringify(contentData));
      
      this.saveArticles();
      this.renderNewsList();
      
      this.showSuccess('記事を削除しました');
    } catch (error) {
      console.error('記事の削除に失敗:', error);
      this.showError('記事の削除に失敗しました');
    }
  }

  /**
   * ニュースのプレビュー
   */
  previewNews() {
    const content = document.getElementById('news-content').value;
    const title = document.getElementById('news-title').value || 'プレビュー';
    
    if (!content) {
      this.showError('プレビューする内容がありません');
      return;
    }

    const parser = new MarkdownParser();
    const htmlContent = parser.parse(content);
    
    this.showModal(title, htmlContent);
  }

  /**
   * Markdownの挿入
   */
  insertMarkdown(before, after) {
    const textarea = document.getElementById('news-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    const newText = before + selectedText + after;
    textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    
    // カーソル位置を調整
    const newCursorPos = start + before.length + selectedText.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
  }

  /**
   * Instagram投稿の追加
   */
  addInstagramLink() {
    try {
      const postData = {
        id: Date.now(),
        url: document.getElementById('instagram-url').value.trim(),
        title: document.getElementById('instagram-title').value.trim(),
        date: document.getElementById('instagram-date').value,
        category: document.getElementById('instagram-category').value,
        description: document.getElementById('instagram-description').value.trim(),
        createdAt: new Date().toISOString()
      };

      if (!this.validateInstagramData(postData)) {
        return;
      }

      this.instagramPosts.unshift(postData);
      this.saveInstagramPosts();
      this.renderInstagramList();
      this.clearInstagramForm();

      this.showSuccess('Instagram投稿を追加しました');
    } catch (error) {
      console.error('Instagram投稿の追加に失敗:', error);
      this.showError('Instagram投稿の追加に失敗しました');
    }
  }

  /**
   * Instagram投稿データの検証
   */
  validateInstagramData(data) {
    if (!data.url) {
      this.showError('Instagram URLを入力してください');
      return false;
    }
    if (!data.url.includes('instagram.com')) {
      this.showError('有効なInstagram URLを入力してください');
      return false;
    }
    if (!data.title) {
      this.showError('タイトルを入力してください');
      return false;
    }
    if (!data.date) {
      this.showError('投稿日を選択してください');
      return false;
    }
    return true;
  }

  /**
   * Instagram投稿データの保存
   */
  saveInstagramPosts() {
    localStorage.setItem(this.config.storageKeys.instagram, JSON.stringify(this.instagramPosts));
  }

  /**
   * Instagramフォームのクリア
   */
  clearInstagramForm() {
    document.getElementById('instagram-url').value = '';
    document.getElementById('instagram-title').value = '';
    document.getElementById('instagram-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('instagram-category').value = 'lesson';
    document.getElementById('instagram-description').value = '';
  }

  /**
   * Instagram投稿一覧の表示
   */
  renderInstagramList() {
    const container = document.getElementById('instagram-list-container');
    const filter = document.getElementById('instagram-filter').value;
    
    let filteredPosts = this.instagramPosts;
    if (filter !== 'all') {
      filteredPosts = this.instagramPosts.filter(post => post.category === filter);
    }

    if (filteredPosts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📸</div>
          <div class="empty-state-text">投稿がありません</div>
          <div class="empty-state-subtext">新しい投稿を追加してください</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredPosts.map(post => `
      <div class="instagram-item">
        <div class="instagram-thumbnail">📸</div>
        <div class="instagram-content">
          <div class="instagram-title">${post.title}</div>
          <div class="instagram-meta">
            <span class="category-badge">${this.config.instagramCategories[post.category]}</span>
            <span>${this.formatDate(post.date)}</span>
          </div>
          <div class="instagram-description">${post.description}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-secondary" onclick="window.open('${post.url}', '_blank')">表示</button>
          <button class="btn btn-danger" onclick="adminManager.deleteInstagramPost(${post.id})">削除</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Instagram投稿の削除
   */
  deleteInstagramPost(id) {
    if (!confirm('この投稿を削除しますか？')) return;

    try {
      this.instagramPosts = this.instagramPosts.filter(post => post.id !== id);
      this.saveInstagramPosts();
      this.renderInstagramList();
      
      this.showSuccess('投稿を削除しました');
    } catch (error) {
      console.error('投稿の削除に失敗:', error);
      this.showError('投稿の削除に失敗しました');
    }
  }

  /**
   * 日付のフォーマット
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
   * モーダルの表示
   */
  showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('preview-modal').classList.add('active');
  }

  /**
   * モーダルを閉じる
   */
  closeModal() {
    document.getElementById('preview-modal').classList.remove('active');
  }

  /**
   * 成功メッセージの表示
   */
  showSuccess(message) {
    // モダンな通知システムを使用
    this.showNotification('success', message);
  }

  /**
   * エラーメッセージの表示
   */
  showError(message) {
    // モダンな通知システムを使用
    this.showNotification('error', message);
    
    // デバッグ情報もコンソールに出力
    console.error('管理画面エラー:', message);
    
    // デバッグ関数があれば実行
    if (typeof window.debugAdmin === 'function') {
      console.log('デバッグ情報を出力します:');
      window.debugAdmin();
    }
  }

  /**
   * 通知の表示（統一された通知システム）
   */
  showNotification(type, message) {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 通知要素を作成
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    // ページに追加
    document.body.appendChild(notification);

    // 3秒後に自動削除
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }

  /**
   * 公開用データの生成（ArticleManager用）
   */
  generatePublicData() {
    return this.articles.filter(article => article.status === 'published');
  }

  /**
   * 記事コンテンツの読み込み（ArticleManager用）
   */
  async loadArticleContent(filename) {
    const contentData = JSON.parse(localStorage.getItem(this.config.storageKeys.articlesContent) || '{}');
    const article = this.articles.find(a => a.file === filename);
    
    if (article && contentData[article.id]) {
      return contentData[article.id];
    }
    
    throw new Error('記事が見つかりません');
  }
}

// グローバル関数（HTMLから呼び出されるため）
let adminManager;

function updateLessonStatus() {
  adminManager.updateLessonStatus();
}

function previewLessonStatus() {
  adminManager.previewLessonStatus();
}

function clearNewsEditor() {
  adminManager.clearNewsEditor();
}

function saveNews() {
  adminManager.saveNews();
}

function publishNews() {
  adminManager.publishNews();
}

function previewNews() {
  adminManager.previewNews();
}

function insertMarkdown(before, after) {
  adminManager.insertMarkdown(before, after);
}

function filterNewsList() {
  adminManager.renderNewsList();
}

function addInstagramLink() {
  adminManager.addInstagramLink();
}

function clearInstagramForm() {
  adminManager.clearInstagramForm();
}

function filterInstagramList() {
  adminManager.renderInstagramList();
}

function closeModal() {
  adminManager.closeModal();
}

function switchToTab(tabName) {
  adminManager.switchTab(tabName);
}

function logout() {
  adminManager.logout();
}

function toggleMobileMenu() {
  // PageManagerの関数を使用
  if (window.toggleMobileMenu) {
    window.toggleMobileMenu();
  }
}

// 管理画面の初期化
document.addEventListener('DOMContentLoaded', function() {
  adminManager = new AdminManager();
  adminManager.init();
});

// グローバルに公開
window.AdminManager = AdminManager; 