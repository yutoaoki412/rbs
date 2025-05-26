/**
 * RBS陸上教室 管理画面コアシステム
 * モジュラー設計による管理画面の基盤クラス
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { AdminAuth } from './AdminAuth.js';
import { DataManager } from './DataManager.js';
import { UIManager } from './UIManager.js';

export class AdminCore extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('AdminCore');
    this.errorHandler = new ErrorHandler();
    this.isInitialized = false;
    this.modules = new Map();
    
    // コア設定
    this.config = {
      version: '2.0.0',
      environment: 'production',
      debug: false,
      autoSave: true,
      autoSaveInterval: 30000, // 30秒
      maxRetries: 3
    };
  }

  /**
   * 管理画面の初期化
   */
  async init() {
    try {
      this.logger.info('管理画面システムを初期化中...');
      
      // エラーハンドラーの設定
      this.setupErrorHandling();
      
      // コアモジュールの初期化
      await this.initCoreModules();
      
      // 認証チェック
      await this.checkAuthentication();
      
      // UIの初期化
      await this.initUI();
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // 自動保存の設定
      if (this.config.autoSave) {
        this.setupAutoSave();
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      this.logger.info('管理画面システムの初期化が完了しました');
      
    } catch (error) {
      this.logger.error('管理画面システムの初期化に失敗:', error);
      this.errorHandler.handle(error, '管理画面の初期化');
      throw error;
    }
  }

  /**
   * コアモジュールの初期化
   */
  async initCoreModules() {
    try {
      // 認証システム
      this.auth = new AdminAuth();
      await this.auth.init();
      this.modules.set('auth', this.auth);
      
      // データ管理
      this.dataManager = new DataManager();
      await this.dataManager.init();
      this.modules.set('dataManager', this.dataManager);
      
      // UI管理
      this.uiManager = new UIManager();
      this.modules.set('uiManager', this.uiManager);
      
      // モジュール間の連携設定
      this.setupModuleConnections();
      
      this.logger.info('コアモジュールの初期化完了');
    } catch (error) {
      throw new Error(`コアモジュールの初期化に失敗: ${error.message}`);
    }
  }

  /**
   * モジュール間の連携設定
   */
  setupModuleConnections() {
    // データマネージャーにUIマネージャーを設定
    this.dataManager.setUIManager(this.uiManager);
    
    // UIマネージャーにDataManagerのイベントを設定
    this.uiManager.setupDataManagerEvents(this.dataManager);
    
    // 各モジュールにエラーハンドラーを設定
    this.modules.forEach(module => {
      if (module.setErrorHandler) {
        module.setErrorHandler(this.errorHandler);
      }
    });
  }

  /**
   * 認証チェック
   */
  async checkAuthentication() {
    if (!this.auth.isAuthenticated()) {
      this.logger.warn('認証が必要です');
      this.redirectToLogin();
      throw new Error('認証が必要です');
    }
    this.logger.info('認証チェック完了');
  }

  /**
   * UI初期化
   */
  async initUI() {
    await this.uiManager.init();
    
    // UI初期化完了後、ダッシュボードが初期タブの場合は初期化を実行
    if (this.uiManager.currentTab === 'dashboard') {
      this.logger.debug('初期タブがダッシュボードのため、初期化を実行します');
      this.uiManager.initializeDashboard();
    }
    
    this.logger.info('UI初期化完了');
  }

  /**
   * エラーハンドリングの設定
   */
  setupErrorHandling() {
    // グローバルエラーハンドラー
    window.addEventListener('error', (event) => {
      this.errorHandler.handle(event.error, 'グローバルエラー');
    });

    // Promise拒否ハンドラー
    window.addEventListener('unhandledrejection', (event) => {
      this.errorHandler.handle(event.reason, 'Promise拒否');
    });
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // 認証状態の変更
    this.auth.on('authChanged', (isAuthenticated) => {
      if (!isAuthenticated) {
        this.redirectToLogin();
      }
    });

    // データの変更
    this.dataManager.on('dataChanged', (type, data) => {
      this.emit('dataChanged', { type, data });
    });

    // UI状態の変更
    this.uiManager.on('tabChanged', (tabName) => {
      this.emit('tabChanged', tabName);
    });
  }

  /**
   * 自動保存の設定
   */
  setupAutoSave() {
    setInterval(() => {
      if (this.dataManager.hasUnsavedChanges()) {
        this.dataManager.autoSave();
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * モジュール取得
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * ログイン画面にリダイレクト
   */
  redirectToLogin() {
    this.logger.info('ログイン画面にリダイレクト');
    setTimeout(() => {
      window.location.href = 'admin-login.html';
    }, 1000);
  }

  /**
   * ログアウト
   */
  logout() {
    this.auth.logout();
    this.redirectToLogin();
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.modules.forEach(module => {
      if (module.destroy) {
        module.destroy();
      }
    });
    
    this.removeAllListeners();
    this.isInitialized = false;
    this.logger.info('管理画面システムを破棄しました');
  }
} 