/**
 * RBS陸上教室 管理画面アクションハンドラー
 * HTMLから呼び出される各種アクションを統一管理
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

export class AdminActionHandler extends EventEmitter {
  constructor(adminCore) {
    super();
    
    this.logger = new Logger('AdminActionHandler');
    this.adminCore = adminCore;
    this.setupGlobalFunctions();
  }

  /**
   * グローバル関数のセットアップ
   */
  setupGlobalFunctions() {
    // 基本操作
    window.switchTab = this.switchTab.bind(this);
    window.logout = this.logout.bind(this);
    window.closeModal = this.closeModal.bind(this);
    window.toggleMobileMenu = this.toggleMobileMenu.bind(this);

    // 記事管理
    window.saveNews = this.saveNews.bind(this);
    window.publishNews = this.publishNews.bind(this);
    window.editNews = this.editNews.bind(this);
    window.deleteNews = this.deleteNews.bind(this);
    window.previewNews = this.previewNews.bind(this);
    window.toggleNewsStatus = this.toggleNewsStatus.bind(this);
    window.clearNewsForm = this.clearNewsForm.bind(this);
    window.clearNewsEditor = this.clearNewsForm.bind(this);
    window.autoSaveNews = this.autoSaveNews.bind(this);

    // フィルタリング
    window.filterNews = this.filterNews.bind(this);
    window.filterNewsList = this.filterNewsList.bind(this);
    window.filterInstagramList = this.filterInstagramList.bind(this);

    // レッスン状況
    window.updateLessonStatus = this.updateLessonStatus.bind(this);
    window.previewLessonStatus = this.previewLessonStatus.bind(this);
    window.loadLessonStatusToForm = this.loadLessonStatusToForm.bind(this);

    // Instagram
    window.addInstagramLink = this.addInstagramLink.bind(this);
    window.clearInstagramForm = this.clearInstagramForm.bind(this);

    // ユーティリティ
    window.insertMarkdown = this.insertMarkdown.bind(this);
    window.exportData = this.exportData.bind(this);
    window.refreshNewsList = this.refreshNewsList.bind(this);

    // デバッグ・管理
    window.showDebugInfo = this.showDebugInfo.bind(this);
    window.testArticleService = this.testArticleService.bind(this);
    window.testSiteConnection = this.testSiteConnection.bind(this);
    window.clearAllData = this.clearAllData.bind(this);
    window.resetLocalStorage = this.resetLocalStorage.bind(this);
  }

  // ===== 基本操作 =====

  switchTab(tabName) {
    if (this.adminCore?.uiManager) {
      this.adminCore.uiManager.switchTab(tabName);
      
      // レッスン状況タブが開かれた時の処理
      if (tabName === 'lesson-status' && typeof LessonStatusManager !== 'undefined') {
        setTimeout(() => {
          this.loadLessonStatusToForm();
          console.log('📋 レッスン状況タブが開かれました - 現在の状況を読み込み中');
        }, 100);
      }
    }
  }

  logout() {
    if (this.adminCore) {
      this.adminCore.logout();
    }
  }

  closeModal() {
    if (this.adminCore?.uiManager) {
      this.adminCore.uiManager.closeModal();
    }
  }

  toggleMobileMenu() {
    document.body.classList.toggle('mobile-menu-open');
  }

  // ===== 記事管理 =====

  async saveNews() {
    try {
      if (!this.adminCore?.newsFormManager) {
        throw new Error('NewsFormManagerが初期化されていません');
      }

      const validation = this.adminCore.newsFormManager.validateForSave();
      if (!validation.isValid) {
        this.adminCore.uiManager.showNotification('error', validation.errors[0]);
        return;
      }

      await this.adminCore.dataManager.saveArticle(validation.data, false);
      this.adminCore.uiManager.showNotification('success', '記事を保存しました');
      
      // フロントエンド側のArticleServiceも更新
      await this.updateFrontendArticleService();
      
      // フォームをクリア
      this.adminCore.newsFormManager.clearForm();
      
    } catch (error) {
      this.logger.error('記事保存エラー:', error);
      this.adminCore.uiManager.showNotification('error', '記事の保存に失敗しました');
    }
  }

  async publishNews() {
    try {
      if (!this.adminCore?.newsFormManager) {
        throw new Error('NewsFormManagerが初期化されていません');
      }

      const validation = this.adminCore.newsFormManager.validateForPublish();
      if (!validation.isValid) {
        this.adminCore.uiManager.showNotification('error', validation.errors[0]);
        return;
      }

      await this.adminCore.dataManager.saveArticle(validation.data, true);
      this.adminCore.uiManager.showNotification('success', '記事を公開しました');
      
      // フロントエンド側のArticleServiceも更新
      await this.updateFrontendArticleService();
      
      // フォームをクリア
      this.adminCore.newsFormManager.clearForm();
      
    } catch (error) {
      this.logger.error('記事公開エラー:', error);
      this.adminCore.uiManager.showNotification('error', '記事の公開に失敗しました');
    }
  }

  editNews(id) {
    try {
      if (!this.adminCore?.dataManager || !this.adminCore?.uiManager) {
        throw new Error('必要なマネージャーが初期化されていません');
      }

      const article = this.adminCore.dataManager.getArticles().find(a => a.id === id);
      if (article) {
        // 記事管理タブに切り替え
        this.adminCore.uiManager.switchTab('news-management');
        
        // 少し遅延してからフォームに入力（タブ切り替えのアニメーションを待つ）
        setTimeout(() => {
          if (this.adminCore.newsFormManager) {
            this.adminCore.newsFormManager.populateForm(article);
          }
          
          // 成功通知を表示
          this.adminCore.uiManager.showNotification('info', `「${article.title}」の編集を開始しました`);
        }, 100);
      } else {
        this.adminCore.uiManager.showNotification('error', '記事が見つかりません');
      }
    } catch (error) {
      this.logger.error('記事編集エラー:', error);
      this.adminCore.uiManager.showNotification('error', '記事の編集に失敗しました');
    }
  }

  async deleteNews(id) {
    try {
      if (!this.adminCore?.dataManager) {
        throw new Error('DataManagerが初期化されていません');
      }

      if (confirm('この記事を削除しますか？')) {
        await this.adminCore.dataManager.deleteArticle(id);
        this.adminCore.uiManager.showNotification('success', '記事を削除しました');
      }
    } catch (error) {
      this.logger.error('記事削除エラー:', error);
      this.adminCore.uiManager.showNotification('error', '削除に失敗しました');
    }
  }

  previewNews() {
    try {
      if (!this.adminCore?.newsFormManager || !this.adminCore?.uiManager) {
        throw new Error('必要なマネージャーが初期化されていません');
      }

      const formData = this.adminCore.newsFormManager.getFormData();
      this.adminCore.uiManager.showNewsPreviewModal(formData);
    } catch (error) {
      this.logger.error('記事プレビューエラー:', error);
      this.adminCore.uiManager.showNotification('error', 'プレビューの表示に失敗しました');
    }
  }

  async toggleNewsStatus(id) {
    try {
      if (!this.adminCore?.dataManager) {
        throw new Error('DataManagerが初期化されていません');
      }

      const article = this.adminCore.dataManager.getArticles().find(a => a.id === id);
      if (article) {
        const newStatus = article.status === 'published' ? 'draft' : 'published';
        article.status = newStatus;
        
        await this.adminCore.dataManager.saveArticle(article, newStatus === 'published');
        
        const statusText = newStatus === 'published' ? '公開' : '下書き';
        this.adminCore.uiManager.showNotification('success', `記事を${statusText}に変更しました`);
      }
    } catch (error) {
      this.logger.error('ステータス変更エラー:', error);
      this.adminCore.uiManager.showNotification('error', 'ステータス変更に失敗しました');
    }
  }

  clearNewsForm() {
    if (this.adminCore?.newsFormManager) {
      this.adminCore.newsFormManager.clearForm();
    }
  }

  autoSaveNews() {
    if (this.adminCore?.newsFormManager) {
      this.adminCore.newsFormManager.autoSave();
    }
  }

  // ===== フィルタリング =====

  filterNews(status) {
    if (this.adminCore?.dataManager && this.adminCore?.uiManager) {
      const articles = this.adminCore.dataManager.getArticles({ 
        status: status === 'all' ? undefined : status 
      });
      this.adminCore.uiManager.displayNewsList(articles);
    }
  }

  filterNewsList() {
    const filterSelect = document.getElementById('news-filter');
    const status = filterSelect ? filterSelect.value : 'all';
    this.filterNews(status);
  }

  filterInstagramList() {
    // Instagram フィルター機能の実装（将来の拡張用）
    this.logger.debug('Instagram フィルター機能は未実装です');
  }

  // ===== レッスン状況 =====

  async updateLessonStatus() {
    try {
      const statusData = this.getLessonStatusFormData();
      
      if (typeof LessonStatusManager !== 'undefined') {
        // LessonStatusManagerを使用してレッスン状況を保存
        const lessonStatusManager = new LessonStatusManager();
        const convertedData = lessonStatusManager.convertFromAdminForm(statusData);
        const result = lessonStatusManager.saveLessonStatus(convertedData, statusData.date);
        
        if (result.success) {
          this.adminCore.uiManager.showNotification('success', 'レッスン状況を更新しました');
          this.logger.info('レッスン状況を更新しました:', result.data);
        } else {
          throw new Error(result.error);
        }
      } else {
        // フォールバック: DataManagerを使用
        if (!this.adminCore?.dataManager) {
          throw new Error('DataManagerが初期化されていません');
        }

        await this.adminCore.dataManager.updateLessonStatus(statusData);
        this.adminCore.uiManager.showNotification('success', 'レッスン状況を更新しました');
      }
    } catch (error) {
      this.logger.error('レッスン状況更新エラー:', error);
      this.adminCore.uiManager.showNotification('error', 'レッスン状況の更新に失敗しました');
    }
  }

  previewLessonStatus() {
    try {
      if (!this.adminCore?.uiManager) {
        throw new Error('UIManagerが初期化されていません');
      }

      const statusData = this.getLessonStatusFormData();
      this.adminCore.uiManager.showLessonStatusPreviewModal(statusData);
    } catch (error) {
      this.logger.error('レッスン状況プレビューエラー:', error);
      this.adminCore.uiManager.showNotification('error', 'プレビューの表示に失敗しました');
    }
  }

  loadLessonStatusToForm() {
    try {
      if (typeof LessonStatusManager !== 'undefined') {
        const lessonStatusManager = new LessonStatusManager();
        const statusData = lessonStatusManager.getLessonStatus();
        
        // フォームに状況を設定
        lessonStatusManager.populateAdminForm(statusData);
        
        this.logger.debug('現在のレッスン状況をフォームに読み込みました:', statusData);
        this.adminCore.uiManager.showNotification('info', '現在の状況を読み込みました');
      } else {
        // フォールバック: DataManagerから読み込み
        if (!this.adminCore?.dataManager) {
          throw new Error('DataManagerが初期化されていません');
        }

        const statusData = this.adminCore.dataManager.getLessonStatus();
        this.logger.debug('現在のレッスン状況:', statusData);
        this.adminCore.uiManager.showNotification('info', '現在の状況を読み込みました');
      }
    } catch (error) {
      this.logger.error('レッスン状況読み込みエラー:', error);
      this.adminCore.uiManager.showNotification('error', 'レッスン状況の読み込みに失敗しました');
    }
  }

  // ===== Instagram =====

  async addInstagramLink() {
    try {
      if (!this.adminCore?.dataManager) {
        throw new Error('DataManagerが初期化されていません');
      }

      const postData = this.getInstagramFormData();
      await this.adminCore.dataManager.saveInstagramPost(postData);
      this.adminCore.uiManager.showNotification('success', 'Instagram投稿を追加しました');
      this.clearInstagramForm();
    } catch (error) {
      this.logger.error('Instagram投稿追加エラー:', error);
      this.adminCore.uiManager.showNotification('error', '追加に失敗しました');
    }
  }

  clearInstagramForm() {
    const elements = {
      url: document.getElementById('instagram-url'),
      category: document.getElementById('instagram-category'),
      description: document.getElementById('instagram-description')
    };

    if (elements.url) elements.url.value = '';
    if (elements.category) elements.category.value = 'other';
    if (elements.description) elements.description.value = '';
  }

  // ===== ユーティリティ =====

  insertMarkdown(before, after = '') {
    if (this.adminCore?.newsFormManager) {
      this.adminCore.newsFormManager.insertMarkdown(before, after);
    }
  }

  exportData() {
    try {
      if (!this.adminCore?.dataManager) {
        throw new Error('DataManagerが初期化されていません');
      }

      const data = this.adminCore.dataManager.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rbs-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.adminCore.uiManager.showNotification('success', 'データをエクスポートしました');
    } catch (error) {
      this.logger.error('データエクスポートエラー:', error);
      this.adminCore.uiManager.showNotification('error', 'データのエクスポートに失敗しました');
    }
  }

  refreshNewsList() {
    try {
      if (!this.adminCore?.dataManager || !this.adminCore?.uiManager) {
        throw new Error('必要なマネージャーが初期化されていません');
      }

      const articles = this.adminCore.dataManager.getArticles();
      this.adminCore.uiManager.displayNewsList(articles);
      this.adminCore.uiManager.showNotification('info', '記事一覧を更新しました');
    } catch (error) {
      this.logger.error('記事一覧更新エラー:', error);
      this.adminCore.uiManager.showNotification('error', '記事一覧の更新に失敗しました');
    }
  }

  // ===== デバッグ・管理 =====

  showDebugInfo() {
    try {
      if (!this.adminCore?.dataManager || !this.adminCore?.uiManager) {
        throw new Error('必要なマネージャーが初期化されていません');
      }

      // デバッグ情報の生成
      const debugInfo = this.generateDebugInfo();
      const debugContent = this.generateDebugContentHTML(debugInfo);
      
      this.adminCore.uiManager.showDebugInfoModal(debugContent);
    } catch (error) {
      this.logger.error('デバッグ情報表示エラー:', error);
      this.adminCore.uiManager.showNotification('error', 'デバッグ情報の表示に失敗しました');
    }
  }

  async testArticleService() {
    try {
      // ArticleServiceが利用可能かテスト
      if (typeof window.articleService === 'undefined') {
        throw new Error('ArticleServiceが見つかりません');
      }
      
      // 管理画面のデータを取得
      const adminArticles = this.adminCore.dataManager.getArticles();
      
      // ArticleServiceを初期化してデータを取得
      await window.articleService.init();
      const serviceArticles = window.articleService.getPublishedArticles();
      
      const testResult = {
        adminArticles: adminArticles.length,
        serviceArticles: serviceArticles.length,
        publishedInAdmin: adminArticles.filter(a => a.status === 'published').length,
        match: adminArticles.filter(a => a.status === 'published').length === serviceArticles.length
      };
      
      this.logger.info('🧪 ArticleService連携テスト結果:', testResult);
      
      const message = testResult.match 
        ? `✅ 連携正常: 管理画面の公開記事${testResult.publishedInAdmin}件がArticleServiceで正しく読み込まれています`
        : `⚠️ 連携に問題: 管理画面公開記事${testResult.publishedInAdmin}件 vs ArticleService${testResult.serviceArticles}件`;
      
      this.adminCore.uiManager.showNotification(testResult.match ? 'success' : 'warning', message);
    } catch (error) {
      this.logger.error('ArticleService連携テストエラー:', error);
      this.adminCore.uiManager.showNotification('error', `連携テスト失敗: ${error.message}`);
    }
  }

  async testSiteConnection() {
    try {
      // 各ページへのアクセステスト
      const testUrls = [
        { name: 'ニュース一覧', url: 'news.html' },
        { name: 'ニュース詳細', url: 'news-detail.html?id=test' },
        { name: 'トップページ', url: 'index.html' }
      ];
      
      let results = [];
      
      for (const test of testUrls) {
        try {
          // 新しいタブで開いてテスト
          const testWindow = window.open(test.url, '_blank');
          if (testWindow) {
            results.push({ name: test.name, status: 'success', message: 'アクセス可能' });
            testWindow.close(); // すぐに閉じる
          } else {
            results.push({ name: test.name, status: 'error', message: 'ポップアップブロック' });
          }
        } catch (error) {
          results.push({ name: test.name, status: 'error', message: `エラー: ${error.message}` });
        }
      }
      
      if (this.adminCore?.uiManager) {
        this.adminCore.uiManager.displaySiteConnectionResults(results);
      }
      
    } catch (error) {
      this.logger.error('サイト連携テストエラー:', error);
      this.adminCore.uiManager.showNotification('error', '連携テストに失敗しました');
    }
  }

  clearAllData() {
    if (confirm('⚠️ 警告: すべての記事データが削除されます。この操作は取り消せません。本当に実行しますか？')) {
      if (confirm('最終確認: 本当にすべてのデータを削除しますか？')) {
        try {
          localStorage.removeItem('rbs_articles_data');
          localStorage.removeItem('rbs_articles_content');
          localStorage.removeItem('rbs_lesson_status');
          
          // 管理画面のデータもクリア
          if (this.adminCore?.dataManager) {
            this.adminCore.dataManager.data.articles = [];
            this.adminCore.dataManager.data.instagram = [];
            this.adminCore.dataManager.data.lessonStatus = {};
          }
          
          this.adminCore.uiManager.showNotification('success', 'すべてのデータを削除しました');
          
          // ページをリロード
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          this.logger.error('データ削除エラー:', error);
          this.adminCore.uiManager.showNotification('error', 'データの削除に失敗しました');
        }
      }
    }
  }

  resetLocalStorage() {
    if (confirm('LocalStorageをリセットしますか？（記事データは保持されます）')) {
      try {
        // 記事データ以外をクリア
        const articlesData = localStorage.getItem('rbs_articles_data');
        const articlesContent = localStorage.getItem('rbs_articles_content');
        
        localStorage.clear();
        
        // 記事データを復元
        if (articlesData) localStorage.setItem('rbs_articles_data', articlesData);
        if (articlesContent) localStorage.setItem('rbs_articles_content', articlesContent);
        
        this.adminCore.uiManager.showNotification('success', 'LocalStorageをリセットしました');
      } catch (error) {
        this.logger.error('LocalStorageリセットエラー:', error);
        this.adminCore.uiManager.showNotification('error', 'リセットに失敗しました');
      }
    }
  }

  // ===== ヘルパーメソッド =====

  async updateFrontendArticleService() {
    if (window.articleService) {
      try {
        await window.articleService.refresh();
        this.logger.debug('✅ フロントエンド側ArticleServiceも更新されました');
      } catch (error) {
        this.logger.warn('⚠️ フロントエンド側ArticleServiceの更新に失敗:', error);
      }
    }
  }

  getLessonStatusFormData() {
    const courses = ['basic', 'advance'];
    const statusData = {};
    
    courses.forEach(course => {
      const statusInput = document.querySelector(`input[name="${course}-lesson"]:checked`);
      const noteTextarea = document.getElementById(`${course}-lesson-note`);
      
      statusData[course] = {
        status: statusInput?.value || '開催',
        note: noteTextarea?.value || ''
      };
    });
    
    // グローバルメッセージも含める
    const globalMessage = document.getElementById('global-message')?.value || '';
    statusData.globalMessage = globalMessage;
    
    // 対象日も含める
    const lessonDate = document.getElementById('lesson-date')?.value || new Date().toISOString().split('T')[0];
    statusData.date = lessonDate;
    
    return statusData;
  }

  getInstagramFormData() {
    return {
      url: document.getElementById('instagram-url')?.value || '',
      category: document.getElementById('instagram-category')?.value || 'other',
      description: document.getElementById('instagram-description')?.value || ''
    };
  }

  generateDebugInfo() {
    // 管理画面のデータを取得
    const adminArticles = this.adminCore.dataManager.getArticles();
    const adminStats = this.adminCore.dataManager.getStats();
    
    // LocalStorageから直接記事データを取得
    const localStorageData = localStorage.getItem('rbs_articles_data');
    let localArticles = [];
    let localPublishedCount = 0;
    
    if (localStorageData) {
      try {
        localArticles = JSON.parse(localStorageData);
        localPublishedCount = localArticles.filter(a => a.status === 'published').length;
      } catch (error) {
        this.logger.error('LocalStorageデータの解析エラー:', error);
      }
    }
    
    return {
      admin: {
        totalArticles: adminArticles.length,
        publishedArticles: adminArticles.filter(a => a.status === 'published').length,
        draftArticles: adminArticles.filter(a => a.status === 'draft').length,
        stats: adminStats
      },
      localStorage: {
        hasData: !!localStorageData,
        totalArticles: localArticles.length,
        publishedArticles: localPublishedCount,
        draftArticles: localArticles.length - localPublishedCount,
        articlesContent: localStorage.getItem('rbs_articles_content') ? 'あり' : 'なし',
        lessonStatus: localStorage.getItem('rbs_lesson_status') ? 'あり' : 'なし'
      },
      articleService: {
        exists: typeof window.articleService !== 'undefined',
        initialized: window.articleService ? window.articleService.isInitialized : false,
        articles: window.articleService ? window.articleService.getPublishedArticles().length : 0
      },
      timestamp: new Date().toISOString(),
      articles: adminArticles
    };
  }

  generateDebugContentHTML(debugInfo) {
    const adminPublished = debugInfo.admin.publishedArticles;
    const localPublished = debugInfo.localStorage.publishedArticles;
    const serviceArticles = debugInfo.articleService.articles;
    
    let dataConsistency = '';
    let statusMessage = '';
    
    if (adminPublished === localPublished) {
      dataConsistency = '✅ 管理画面とLocalStorageのデータは一致しています';
    } else {
      dataConsistency = `⚠️ データ不整合: 管理画面${adminPublished}件 vs LocalStorage${localPublished}件`;
    }
    
    if (!debugInfo.articleService.exists) {
      statusMessage = '⚠️ ArticleServiceが存在しません（フロントエンド側の問題）';
    } else if (!debugInfo.articleService.initialized) {
      statusMessage = '⚠️ ArticleServiceが初期化されていません';
    } else if (localPublished !== serviceArticles) {
      statusMessage = `⚠️ フロントエンド連携問題: LocalStorage${localPublished}件 vs ArticleService${serviceArticles}件`;
    } else {
      statusMessage = '✅ すべてのシステムが正常に動作しています';
    }
    
    return `
      <div class="debug-info">
        <h4>📊 記事データ統計</h4>
        <div class="debug-section">
          <h5>管理画面データ</h5>
          <p>・総記事数: ${debugInfo.admin.totalArticles}件</p>
          <p>・公開済み: ${debugInfo.admin.publishedArticles}件</p>
          <p>・下書き: ${debugInfo.admin.draftArticles}件</p>
        </div>
        
        <div class="debug-section">
          <h5>LocalStorageデータ</h5>
          <p>・総記事数: ${debugInfo.localStorage.totalArticles}件</p>
          <p>・公開済み: ${debugInfo.localStorage.publishedArticles}件</p>
          <p>・下書き: ${debugInfo.localStorage.draftArticles}件</p>
          <p>・記事コンテンツ: ${debugInfo.localStorage.articlesContent}</p>
          <p>・レッスン状況: ${debugInfo.localStorage.lessonStatus}</p>
        </div>
        
        <div class="debug-section">
          <h5>フロントエンド連携</h5>
          <p>・ArticleService存在: ${debugInfo.articleService.exists ? 'はい' : 'いいえ'}</p>
          <p>・ArticleService初期化: ${debugInfo.articleService.initialized ? 'はい' : 'いいえ'}</p>
          <p>・ArticleService記事数: ${debugInfo.articleService.articles}件</p>
        </div>
        
        <div class="debug-section status">
          <h5>📋 システム状況</h5>
          <p><strong>データ整合性:</strong> ${dataConsistency}</p>
          <p><strong>全体状況:</strong> ${statusMessage}</p>
        </div>
        
        <h4>📄 記事一覧</h4>
        <div class="articles-list">
          ${debugInfo.articles.length > 0 ? 
            debugInfo.articles.map(a => `
              <div class="article-item">
                <strong>${a.title}</strong> 
                <span class="status-badge ${a.status}">${a.status}</span>
                <span class="article-date">${a.date}</span>
              </div>
            `).join('') : 
            '<p>記事がありません</p>'
          }
        </div>
        
        <div style="margin-top: 20px;">
          <button onclick="console.log('詳細情報:', ${JSON.stringify(debugInfo).replace(/"/g, '&quot;')})" class="btn btn-outline">
            コンソールに詳細出力
          </button>
          <button onclick="testArticleService()" class="btn btn-primary">
            ArticleService連携テスト
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.removeAllListeners();
    this.logger.info('AdminActionHandlerを破棄しました');
  }
} 