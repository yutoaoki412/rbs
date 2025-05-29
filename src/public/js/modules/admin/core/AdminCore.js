/**
 * RBS陸上教室 管理画面システム
 * 認証、データ管理、UI管理を統合した管理画面のコアシステム
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';
import { AdminAuth } from '../../auth/AdminAuth.js';
import { DataManager } from './DataManager.js';
import { UIManager } from './UIManager.js';
import { NewsFormManager } from '../forms/NewsFormManager.js';
import { AdminActionHandler } from '../actions/AdminActionHandler.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class AdminCore extends EventEmitter {
  constructor() {
    super();
    
    this.logger = new Logger('AdminCore');
    
    // システムの状態
    this.isInitialized = false;
    this.isAuthenticated = false;
    
    // モジュールインスタンス
    this.auth = null;
    this.dataManager = null;
    this.uiManager = null;
    this.newsFormManager = null;
    this.actionHandler = null;
    
    // エラーハンドリング
    this.errorHandler = null;
  }

  /**
   * 管理画面システムの初期化
   */
  async init() {
    try {
      this.logger.info('RBS陸上教室 管理画面システム v2.1 を初期化中...');
      
      // 開発環境では認証をスキップ
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.logger.warn('開発環境のため認証をスキップします');
        this.isAuthenticated = true;
      } else {
        // 認証システムの初期化
        await this.initializeAuth();
        
        // 認証チェック
        if (!this.isAuthenticated) {
          this.logger.warn('認証が必要です');
          this.redirectToLogin();
          return;
        }
      }
      
      // データ管理システムの初期化
      await this.initializeDataManager();
      
      // UI管理システムの初期化
      await this.initializeUIManager();
      
      // フォーム管理システムの初期化
      await this.initializeNewsFormManager();
      
      // アクションハンドラーの初期化
      await this.initializeActionHandler();
      
      // システム統合
      this.setupSystemIntegration();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      this.logger.info('管理画面システムの初期化が完了しました');
      
    } catch (error) {
      this.logger.error('管理画面システムの初期化に失敗:', error);
      this.handleCriticalError(error);
      throw error;
    }
  }

  /**
   * 認証システムの初期化
   */
  async initializeAuth() {
    try {
      this.auth = new AdminAuth();
      await this.auth.init();
      
      this.isAuthenticated = this.auth.isAuthenticated();
      
      // 認証状態の変更を監視
      this.auth.on('authStateChanged', (authenticated) => {
        this.isAuthenticated = authenticated;
        if (!authenticated) {
          this.redirectToLogin();
        }
      });
      
      this.logger.debug('認証システムの初期化完了');
    } catch (error) {
      this.logger.error('認証システムの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * データ管理システムの初期化
   */
  async initializeDataManager() {
    try {
      this.dataManager = new DataManager();
      await this.dataManager.init();
      
      this.logger.debug('データ管理システムの初期化完了');
    } catch (error) {
      this.logger.error('データ管理システムの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * UI管理システムの初期化
   */
  async initializeUIManager() {
    try {
      this.uiManager = new UIManager();
      await this.uiManager.init();
      
      // DataManagerとの連携設定
      this.uiManager.setupDataManagerEvents(this.dataManager);
      
      this.logger.debug('UI管理システムの初期化完了');
    } catch (error) {
      this.logger.error('UI管理システムの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * フォーム管理システムの初期化
   */
  async initializeNewsFormManager() {
    try {
      this.newsFormManager = new NewsFormManager();
      
      // フォーム管理イベントの設定
      this.setupNewsFormEvents();
      
      this.logger.debug('フォーム管理システムの初期化完了');
    } catch (error) {
      this.logger.error('フォーム管理システムの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * アクションハンドラーの初期化
   */
  async initializeActionHandler() {
    try {
      this.actionHandler = new AdminActionHandler(this);
      
      this.logger.debug('アクションハンドラーの初期化完了');
    } catch (error) {
      this.logger.error('アクションハンドラーの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * システム統合設定
   */
  setupSystemIntegration() {
    // UIManagerにイベントリスナーを設定
    this.uiManager.on('saveRequested', (type) => {
      if (type === 'news') {
        this.actionHandler.saveNews();
      } else if (type === 'lesson') {
        this.actionHandler.updateLessonStatus();
      }
    });

    // DataManagerにエラーハンドラーを設定
    this.dataManager.setUIManager(this.uiManager);
    
    // データ変更時にUIを更新
    this.dataManager.on('dataChanged', (type, data) => {
      this.emit('dataChanged', type, data);
    });

    // レッスン状況管理のイベントリスナーを設定
    this.setupLessonStatusEvents();

    this.logger.debug('システム統合設定完了');
  }

  /**
   * レッスン状況管理のイベントリスナーを設定
   */
  setupLessonStatusEvents() {
    // EventBusからのイベントを監視
    if (typeof EventBus !== 'undefined') {
      EventBus.on('admin:load-lesson-status', () => {
        this.actionHandler.loadLessonStatusToForm();
      });

      EventBus.on('admin:preview-lesson-status', () => {
        this.actionHandler.previewLessonStatus();
      });

      EventBus.on('admin:update-lesson-status', () => {
        this.actionHandler.updateLessonStatus();
      });
    }
  }

  /**
   * フォーム管理イベントの設定
   */
  setupNewsFormEvents() {
    // フォーム変更時の処理
    this.newsFormManager.on('formChanged', (formData) => {
      // 未保存の変更があることを記録
      this.uiManager.handleFormChange();
    });

    // 自動保存完了時の通知
    this.newsFormManager.on('autoSaved', (formData) => {
      this.uiManager.showNotification('info', '自動保存しました', 2000);
    });

    // 記事読み込み時の処理
    this.newsFormManager.on('articleLoaded', (article) => {
      this.emit('articleLoaded', article);
    });

    // フォームクリア時の処理
    this.newsFormManager.on('formCleared', () => {
      this.uiManager.clearFormChanges('news-form');
    });
  }

  /**
   * ログアウト処理
   */
  async logout() {
    try {
      this.logger.info('ログアウト処理を開始...');
      
      // 未保存の変更があるかチェック
      if (this.uiManager && this.uiManager.hasUnsavedChanges()) {
        if (!confirm('未保存の変更があります。ログアウトしますか？')) {
          return;
        }
      }
      
      // 認証システムからログアウト
      if (this.auth) {
        await this.auth.logout();
      }
      
      // システムをクリーンアップ
      this.destroy();
      
      // ログインページにリダイレクト
      this.redirectToLogin();
      
    } catch (error) {
      this.logger.error('ログアウト処理に失敗:', error);
      this.uiManager?.showNotification('error', 'ログアウトに失敗しました');
    }
  }

  /**
   * ログインページへのリダイレクト
   */
  redirectToLogin() {
    window.location.href = 'admin-login.html';
  }

  /**
   * 重大なエラーの処理
   */
  handleCriticalError(error) {
    this.logger.error('重大なエラーが発生:', error);
    
    // フォールバックエラー表示
    this.showFallbackError(error);
  }

  /**
   * フォールバックエラー表示
   */
  showFallbackError(error) {
    const errorHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        text-align: center;
        z-index: 9999;
        max-width: 400px;
      ">
        <h2 style="color: #e53e3e; margin-bottom: 1rem;">
          システムエラー
        </h2>
        <p style="margin-bottom: 1rem;">
          管理画面の起動に失敗しました。<br>
          ページを再読み込みしてください。
        </p>
        <div style="margin-bottom: 1rem; font-size: 0.8em; color: #666;">
          エラー詳細: ${error.message}
        </div>
        <button onclick="window.location.reload()" style="
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 0.5rem;
        ">
          再読み込み
        </button>
        <button onclick="window.location.href='admin-login.html'" style="
          background: #718096;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        ">
          ログイン画面へ
        </button>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorHTML);
  }

  /**
   * システム状態の取得
   */
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: this.isAuthenticated,
      modules: {
        auth: !!this.auth,
        dataManager: !!this.dataManager,
        uiManager: !!this.uiManager,
        newsFormManager: !!this.newsFormManager,
        actionHandler: !!this.actionHandler
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * パフォーマンス情報の取得
   */
  getPerformanceInfo() {
    const performance = window.performance;
    const navigation = performance.getEntriesByType('navigation')[0];
    
    return {
      pageLoad: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };
  }

  /**
   * システム破棄処理
   */
  destroy() {
    try {
      this.logger.info('管理画面システムを破棄中...');
      
      // 各モジュールの破棄
      if (this.actionHandler) {
        this.actionHandler.destroy();
        this.actionHandler = null;
      }
      
      if (this.newsFormManager) {
        this.newsFormManager.destroy();
        this.newsFormManager = null;
      }
      
      if (this.uiManager) {
        this.uiManager.destroy();
        this.uiManager = null;
      }
      
      if (this.dataManager) {
        this.dataManager.destroy();
        this.dataManager = null;
      }
      
      if (this.auth) {
        this.auth.destroy();
        this.auth = null;
      }
      
      // イベントリスナーをクリア
      this.removeAllListeners();
      
      this.isInitialized = false;
      this.isAuthenticated = false;
      
      this.logger.info('管理画面システムの破棄完了');
      
    } catch (error) {
      this.logger.error('システム破棄中にエラーが発生:', error);
    }
  }
} 