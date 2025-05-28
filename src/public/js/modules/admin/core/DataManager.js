/**
 * RBS陸上教室 管理画面データ管理システム
 * 記事、Instagram投稿、レッスン状況などのデータを統合管理
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

export class DataManager extends EventEmitter {
  constructor() {
    super();
    
    this.logger = new Logger('DataManager');
    this.uiManager = null;
    this.errorHandler = null;
    
    // データ保存キー
    this.storageKeys = {
      articles: 'rbs_articles_data',
      articlesContent: 'rbs_articles_content',
      instagram: 'rbs_instagram_posts',
      lessonStatus: 'rbs_lesson_status'
    };

    // データ格納
    this.data = {
      articles: [],
      instagram: [],
      lessonStatus: {}
    };

    // 未保存の変更を追跡
    this.unsavedChanges = new Set();
    this.lastSaved = null;
    
    // バリデーションルール
    this.validationRules = this.setupValidationRules();
    
    this.init();
  }

  /**
   * データマネージャーの初期化
   */
  async init() {
    try {
      this.logger.info('データマネージャーを初期化中...');
      
      // 古いハードコーディングされたデータをクリア
      await this.cleanupLegacyData();
      
      await this.loadAllData();
      this.setupAutoSave();
      
      this.logger.info('データマネージャーの初期化完了');
    } catch (error) {
      this.logger.error('データマネージャーの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * UIマネージャーを設定
   */
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  /**
   * エラーハンドラーを設定
   */
  setErrorHandler(errorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * 古いハードコーディングされたデータのクリーンアップ
   */
  async cleanupLegacyData() {
    try {
      // 既存の記事データをチェック
      const existingData = localStorage.getItem(this.storageKeys.articles);
      if (existingData) {
        const articles = JSON.parse(existingData);
        
        // 管理画面で作成された記事のみをフィルタリング
        // createdAt フィールドがある記事のみを残す（管理画面で作成された記事には必ずこのフィールドがある）
        const validArticles = articles.filter(article => 
          article && 
          typeof article === 'object' && 
          article.id && 
          article.createdAt && 
          article.status
        );
        
        if (validArticles.length !== articles.length) {
          this.logger.info(`古いサンプルデータを削除: ${articles.length - validArticles.length}件`);
          localStorage.setItem(this.storageKeys.articles, JSON.stringify(validArticles));
        }
      }
      
      // 古いコンテンツデータも同様にクリーンアップ
      const existingContent = localStorage.getItem(this.storageKeys.content);
      if (existingContent) {
        try {
          const contentData = JSON.parse(existingContent);
          const validContent = {};
          
          // 有効な記事のコンテンツのみを保持
          const articlesData = localStorage.getItem(this.storageKeys.articles);
          if (articlesData) {
            const articles = JSON.parse(articlesData);
            articles.forEach(article => {
              if (contentData[article.id]) {
                validContent[article.id] = contentData[article.id];
              }
            });
          }
          
          localStorage.setItem(this.storageKeys.content, JSON.stringify(validContent));
        } catch (error) {
          this.logger.warn('コンテンツデータのクリーンアップに失敗:', error);
        }
      }
      
      this.logger.info('レガシーデータのクリーンアップ完了');
    } catch (error) {
      this.logger.error('レガシーデータのクリーンアップに失敗:', error);
    }
  }

  /**
   * 全データの読み込み
   */
  async loadAllData() {
    try {
      await Promise.all([
        this.loadArticles(),
        this.loadInstagramPosts(),
        this.loadLessonStatus()
      ]);
      
      this.emit('allDataLoaded');
      this.logger.info('全データの読み込み完了');
    } catch (error) {
      this.logger.error('データ読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * 記事データの読み込み
   */
  async loadArticles() {
    try {
      const data = localStorage.getItem(this.storageKeys.articles);
      this.data.articles = data ? JSON.parse(data) : [];
      
      // データの整合性チェック
      this.data.articles = this.data.articles.filter(article => 
        article && typeof article === 'object' && article.id
      );
      
      this.emit('dataLoaded', 'articles', this.data.articles);
      this.logger.info(`記事データを読み込み: ${this.data.articles.length}件`);
    } catch (error) {
      this.logger.error('記事データの読み込みに失敗:', error);
      this.data.articles = [];
    }
  }

  /**
   * Instagram投稿データの読み込み
   */
  async loadInstagramPosts() {
    try {
      const data = localStorage.getItem(this.storageKeys.instagram);
      this.data.instagram = data ? JSON.parse(data) : [];
      
      // データの整合性チェック
      this.data.instagram = this.data.instagram.filter(post => 
        post && typeof post === 'object' && post.id
      );
      
      this.emit('dataLoaded', 'instagram', this.data.instagram);
      this.logger.info(`Instagram投稿データを読み込み: ${this.data.instagram.length}件`);
    } catch (error) {
      this.logger.error('Instagram投稿データの読み込みに失敗:', error);
      this.data.instagram = [];
    }
  }

  /**
   * レッスン状況データの読み込み
   */
  async loadLessonStatus() {
    try {
      const data = localStorage.getItem(this.storageKeys.lessonStatus);
      this.data.lessonStatus = data ? JSON.parse(data) : {};
      
      this.emit('dataLoaded', 'lessonStatus', this.data.lessonStatus);
      this.logger.info('レッスン状況データを読み込み');
    } catch (error) {
      this.logger.error('レッスン状況データの読み込みに失敗:', error);
      this.data.lessonStatus = {};
    }
  }

  /**
   * 記事の保存
   */
  async saveArticle(articleData, publish = false) {
    try {
      const validation = this.validateArticle(articleData);
      if (!validation.isValid) {
        throw new Error(`記事データが無効です: ${validation.errors.join(', ')}`);
      }

      const now = new Date().toISOString();
      const isNew = !articleData.id;
      
      if (isNew) {
        articleData.id = this.generateId();
        articleData.createdAt = now;
      }
      
      articleData.updatedAt = now;
      articleData.status = publish ? 'published' : (articleData.status || 'draft');

      // 既存記事の更新または新規追加
      const index = this.data.articles.findIndex(a => a.id === articleData.id);
      if (index >= 0) {
        this.data.articles[index] = articleData;
      } else {
        this.data.articles.unshift(articleData);
      }

      // 記事データを保存
      await this.saveData('articles');
      
      // 記事コンテンツを別途保存（下位互換性のため）
      if (articleData.content) {
        const contentData = JSON.parse(localStorage.getItem(this.storageKeys.articlesContent) || '{}');
        contentData[articleData.id] = articleData.content;
        localStorage.setItem(this.storageKeys.articlesContent, JSON.stringify(contentData));
      }
      
      this.emit('dataChanged', 'articles', this.data.articles);
      this.emit('articleSaved', articleData);
      
      this.logger.info(`記事を${isNew ? '作成' : '更新'}しました: ${articleData.title}`);
      
      return { success: true, data: articleData };
    } catch (error) {
      this.logger.error('記事保存エラー:', error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, '記事の保存');
      }
      throw error;
    }
  }

  /**
   * 記事の削除
   */
  async deleteArticle(id) {
    try {
      const index = this.data.articles.findIndex(a => a.id === id);
      if (index === -1) {
        throw new Error('記事が見つかりません');
      }

      const article = this.data.articles[index];
      this.data.articles.splice(index, 1);
      
      // 記事データを保存
      await this.saveData('articles');
      
      // 記事コンテンツも削除（下位互換性のため）
      const contentData = JSON.parse(localStorage.getItem(this.storageKeys.articlesContent) || '{}');
      if (contentData[id]) {
        delete contentData[id];
        localStorage.setItem(this.storageKeys.articlesContent, JSON.stringify(contentData));
      }
      
      this.emit('dataChanged', 'articles', this.data.articles);
      this.emit('articleDeleted', article);
      
      this.logger.info(`記事を削除しました: ${article.title}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error('記事削除エラー:', error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, '記事の削除');
      }
      throw error;
    }
  }

  /**
   * Instagram投稿の保存
   */
  async saveInstagramPost(postData) {
    try {
      const validation = this.validateInstagramPost(postData);
      if (!validation.isValid) {
        throw new Error(`Instagram投稿データが無効です: ${validation.errors.join(', ')}`);
      }

      const now = new Date().toISOString();
      const isNew = !postData.id;
      
      if (isNew) {
        postData.id = this.generateId();
        postData.createdAt = now;
      }
      
      postData.updatedAt = now;

      // 既存投稿の更新または新規追加
      const index = this.data.instagram.findIndex(p => p.id === postData.id);
      if (index >= 0) {
        this.data.instagram[index] = postData;
      } else {
        this.data.instagram.unshift(postData);
      }

      await this.saveData('instagram');
      
      this.emit('dataChanged', 'instagram', this.data.instagram);
      this.emit('instagramPostSaved', postData);
      
      this.logger.info(`Instagram投稿を${isNew ? '作成' : '更新'}しました`);
      
      return { success: true, data: postData };
    } catch (error) {
      this.logger.error('Instagram投稿保存エラー:', error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'Instagram投稿の保存');
      }
      throw error;
    }
  }

  /**
   * レッスン状況の更新
   */
  async updateLessonStatus(statusData) {
    try {
      const validation = this.validateLessonStatus(statusData);
      if (!validation.isValid) {
        throw new Error(`レッスン状況データが無効です: ${validation.errors.join(', ')}`);
      }

      this.data.lessonStatus = {
        ...this.data.lessonStatus,
        ...statusData,
        updatedAt: new Date().toISOString()
      };

      await this.saveData('lessonStatus');
      
      this.emit('dataChanged', 'lessonStatus', this.data.lessonStatus);
      this.emit('lessonStatusUpdated', this.data.lessonStatus);
      
      this.logger.info('レッスン状況を更新しました');
      
      return { success: true, data: this.data.lessonStatus };
    } catch (error) {
      this.logger.error('レッスン状況更新エラー:', error);
      if (this.errorHandler) {
        this.errorHandler.handle(error, 'レッスン状況の更新');
      }
      throw error;
    }
  }

  /**
   * データの保存
   */
  async saveData(type) {
    try {
      const key = this.storageKeys[type];
      const data = this.data[type];
      
      localStorage.setItem(key, JSON.stringify(data));
      this.unsavedChanges.delete(type);
      this.lastSaved = Date.now();
      
      this.emit('dataSaved', type, data);
    } catch (error) {
      this.logger.error(`${type}データの保存に失敗:`, error);
      throw error;
    }
  }

  /**
   * 自動保存の設定
   */
  setupAutoSave() {
    // 30秒ごとに自動保存
    setInterval(() => {
      this.autoSave();
    }, 30000);
  }

  /**
   * 自動保存の実行
   */
  async autoSave() {
    if (this.unsavedChanges.size === 0) return;

    try {
      for (const type of this.unsavedChanges) {
        await this.saveData(type);
      }
      this.logger.debug('自動保存完了');
    } catch (error) {
      this.logger.error('自動保存エラー:', error);
    }
  }

  /**
   * 未保存の変更があるかチェック
   */
  hasUnsavedChanges() {
    return this.unsavedChanges.size > 0;
  }

  /**
   * バリデーションルールの設定
   */
  setupValidationRules() {
    return {
      article: {
        required: ['title', 'category'],
        titleMaxLength: 100,
        summaryMaxLength: 200,
        categories: ['announcement', 'event', 'media', 'important']
      },
      instagram: {
        required: ['url', 'category'],
        categories: ['lesson', 'event', 'achievement', 'other']
      },
      lessonStatus: {
        courses: ['キッズ', 'ジュニア']
      }
    };
  }

  /**
   * 記事データのバリデーション
   */
  validateArticle(data) {
    const errors = [];
    const rules = this.validationRules.article;

    // 必須項目チェック
    rules.required.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field}は必須です`);
      }
    });

    // タイトルの長さチェック
    if (data.title && data.title.length > rules.titleMaxLength) {
      errors.push(`タイトルは${rules.titleMaxLength}文字以内で入力してください`);
    }

    // サマリーの長さチェック
    if (data.summary && data.summary.length > rules.summaryMaxLength) {
      errors.push(`サマリーは${rules.summaryMaxLength}文字以内で入力してください`);
    }

    // カテゴリーチェック
    if (data.category && !rules.categories.includes(data.category)) {
      errors.push('有効なカテゴリーを選択してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Instagram投稿データのバリデーション
   */
  validateInstagramPost(data) {
    const errors = [];
    const rules = this.validationRules.instagram;

    // 必須項目チェック
    rules.required.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field}は必須です`);
      }
    });

    // URLの形式チェック
    if (data.url && !this.isValidInstagramUrl(data.url)) {
      errors.push('有効なInstagram URLを入力してください');
    }

    // カテゴリーチェック
    if (data.category && !rules.categories.includes(data.category)) {
      errors.push('有効なカテゴリーを選択してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * レッスン状況データのバリデーション
   */
  validateLessonStatus(data) {
    const errors = [];
    const rules = this.validationRules.lessonStatus;

    // コース別状況の確認
    rules.courses.forEach(course => {
      const courseData = data[course];
      if (courseData) {
        ['体験会', '通常レッスン'].forEach(lessonType => {
          const lessonData = courseData[lessonType];
          if (lessonData && !['実施', '中止', 'TBD'].includes(lessonData.status)) {
            errors.push(`${course}の${lessonType}のステータスが無効です`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Instagram URLの形式チェック
   */
  isValidInstagramUrl(url) {
    const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?/;
    return instagramRegex.test(url);
  }

  /**
   * ID生成
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * データ取得メソッド
   */
  getArticles(filter = {}) {
    let articles = [...this.data.articles];

    if (filter.status) {
      articles = articles.filter(a => a.status === filter.status);
    }

    if (filter.category) {
      articles = articles.filter(a => a.category === filter.category);
    }

    if (filter.limit) {
      articles = articles.slice(0, filter.limit);
    }

    return articles;
  }

  getInstagramPosts(filter = {}) {
    let posts = [...this.data.instagram];

    if (filter.category) {
      posts = posts.filter(p => p.category === filter.category);
    }

    if (filter.limit) {
      posts = posts.slice(0, filter.limit);
    }

    return posts;
  }

  getLessonStatus() {
    return { ...this.data.lessonStatus };
  }

  /**
   * 統計情報取得
   */
  getStats() {
    const articles = this.data.articles;
    const currentMonth = new Date().getMonth();
    
    return {
      totalArticles: articles.length,
      publishedArticles: articles.filter(a => a.status === 'published').length,
      draftArticles: articles.filter(a => a.status === 'draft').length,
      currentMonthArticles: articles.filter(a => {
        const articleMonth = new Date(a.createdAt).getMonth();
        return articleMonth === currentMonth;
      }).length,
      totalInstagramPosts: this.data.instagram.length,
      lastUpdated: this.lastSaved ? new Date(this.lastSaved) : null
    };
  }

  /**
   * データエクスポート
   */
  exportData() {
    const exportData = {
      articles: this.data.articles,
      instagram: this.data.instagram,
      lessonStatus: this.data.lessonStatus,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `rbs-admin-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.logger.info('データをエクスポートしました');
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.removeAllListeners();
    this.logger.info('データマネージャーを破棄しました');
  }
} 