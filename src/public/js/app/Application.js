/**
 * RBS陸上教室 メインアプリケーション
 * 新しいアーキテクチャでの統合管理クラス
 * @version 2.2.0 - 統一パス設定対応版
 */

import { actionManager } from './ActionManager.js';
import { initNewsFeature } from '../features/news/index.js';
import { initAuthFeature } from '../features/auth/index.js';
import { getCurrentPageType } from '../shared/utils/urlUtils.js';
import { initializeLayout, LayoutInitializer } from '../shared/components/layout/index.js';
import { EventBus } from '../shared/services/EventBus.js';
import { redirect } from '../shared/constants/paths.js';
import { log } from '../shared/utils/logUtils.js';
import { showInitializationError, reportError } from '../shared/utils/errorUtils.js';

export default class Application {
  constructor() {
    this.initialized = false;
    this.currentPage = null;
    this.services = new Map();
    this.features = new Map();
    
    /** @type {LayoutInitializer} Layout初期化管理 */
    this.layoutInitializer = null;
    
    /** @type {boolean} テンプレート読み込み完了フラグ */
    this.templatesLoaded = false;
    
    /** @type {Object} 初期化エラーのログ */
    this.initializationErrors = {};
  }

  /**
   * アプリケーション初期化
   */
  async init() {
    if (this.initialized) {
      log.warn('Application', '既に初期化済みです');
      return;
    }

    log.info('Application', 'RBS陸上教室 アプリケーション v2.2 初期化開始');

    try {
      // 1. 現在のページタイプを取得
      this.currentPage = getCurrentPageType();
      log.info('Application', `現在のページ: ${this.currentPage}`);

      // 2. テンプレートとレイアウトの初期化（最優先）
      await this.initializeTemplateAndLayout();

      // 3. コアサービスの初期化
      await this.initializeCoreServices();

      // 4. ページ固有の機能初期化
      await this.initializePageFeatures();

      // 5. グローバルイベントハンドラーの設定
      this.setupGlobalEventHandlers();

      this.initialized = true;
      log.info('Application', 'アプリケーション初期化完了');

      // 初期化完了イベントを発火
      this.emit('app:initialized', { 
        page: this.currentPage,
        templatesLoaded: this.templatesLoaded,
        errors: this.initializationErrors
      });

    } catch (error) {
      log.error('Application', 'アプリケーション初期化エラー', error);
      await this.handleInitializationError(error);
    }
  }

  /**
   * テンプレートとレイアウトの初期化
   * @private
   */
  async initializeTemplateAndLayout() {
    log.info('Application', 'テンプレート・レイアウト初期化中...');
    
    try {
      // ページタイプ別の設定
      const layoutOptions = this.getLayoutOptionsForPage(this.currentPage);
      
      // Layout機能の一括初期化
      const layoutResult = await initializeLayout(layoutOptions);
      
      this.layoutInitializer = layoutResult.initializer;
      this.services.set('layout', this.layoutInitializer);
      
      if (layoutResult.result.success) {
        this.templatesLoaded = true;
        log.info('Application', 'テンプレート・レイアウト初期化完了');
        
        // テンプレート読み込み完了イベント
        this.emit('app:templates:loaded', {
          page: this.currentPage,
          templateManager: layoutResult.result.templateManager,
          headerComponent: layoutResult.result.headerComponent,
          footerComponent: layoutResult.result.footerComponent
        });
        
      } else {
        log.warn('Application', 'テンプレート初期化でフォールバック動作', layoutResult.result.error);
        this.templatesLoaded = false;
      }
      
    } catch (error) {
      log.error('Application', 'テンプレート・レイアウト初期化エラー', error);
      
      // フォールバック: 最低限のHTML構造を確保
      await this.ensureMinimalLayout();
    }
  }

  /**
   * ページタイプ別のレイアウトオプション取得
   * @private
   * @param {string} pageType - ページタイプ
   * @returns {Object} レイアウトオプション
   */
  getLayoutOptionsForPage(pageType) {
    const baseOptions = {
      pageType: pageType,
      headerContainerId: 'header-container',
      footerContainerId: 'footer-container'
    };

    // ページ固有のオプション設定
    switch (pageType) {
      case 'home':
        return {
          ...baseOptions,
          templateOptions: {
            showLessonStatus: true,
            enableSmoothScroll: true
          }
        };
        
      case 'news-detail':
        return {
          ...baseOptions,
          templateOptions: {
            showBreadcrumb: true,
            enableSocialShare: true,
            articleId: this.getArticleIdFromUrl()
          }
        };
        
      case 'news-list':
        return {
          ...baseOptions,
          templateOptions: {
            showSearchForm: true,
            enableInfiniteScroll: true
          }
        };
        
      case 'admin':
        return {
          ...baseOptions,
          templateOptions: {
            requireAuth: true,
            showAdminNav: true,
            enableAutoSave: true
          }
        };
        
      case 'admin-login':
        return {
          ...baseOptions,
          pageType: 'admin', // 管理者ページテンプレートを使用
          templateOptions: {
            loginMode: true,
            hideNavigation: true
          }
        };
        
      default:
        return baseOptions;
    }
  }

  /**
   * URLから記事IDを取得
   * @private
   * @returns {string|null} 記事ID
   */
  getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || urlParams.get('article_id') || null;
  }

  /**
   * 最低限のレイアウト構造確保（フォールバック）
   * @private
   */
  async ensureMinimalLayout() {
    console.log('🔧 最低限のレイアウト構造を確保中...');
    
    // ヘッダーコンテナの確保
    let headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
      headerContainer = document.createElement('div');
      headerContainer.id = 'header-container';
      headerContainer.innerHTML = '<header><h1>RBS陸上教室</h1></header>';
      document.body.insertBefore(headerContainer, document.body.firstChild);
    }
    
    // フッターコンテナの確保
    let footerContainer = document.getElementById('footer-container');
    if (!footerContainer) {
      footerContainer = document.createElement('div');
      footerContainer.id = 'footer-container';
      footerContainer.innerHTML = '<footer><p>&copy; 2024 RBS陸上教室</p></footer>';
      document.body.appendChild(footerContainer);
    }
    
    console.log('✅ 最低限のレイアウト構造を確保完了');
  }

  /**
   * コアサービスの初期化
   * @private
   */
  async initializeCoreServices() {
    console.log('🔧 コアサービス初期化中...');

    try {
      // ActionManager の初期化
      actionManager.init();
      this.services.set('actionManager', actionManager);
      console.log('✅ ActionManager初期化完了');
    } catch (error) {
      console.error('❌ ActionManager初期化エラー:', error);
      this.initializationErrors.actionManager = error;
    }

    // ページ固有のアクションサービス初期化（安全な動的インポート）
    try {
      switch (this.currentPage) {
        case 'admin':
          await this.initializeAdminActionService();
          break;
        
        case 'news-detail':
        case 'news-list':
          await this.initializeNewsActionService();
          break;
          
        case 'admin-login':
          // 認証アクションサービスはinitAuthFeatureで初期化される
          console.log('🔐 認証ページ: サービス初期化をinitAuthFeatureに委譲');
          break;
          
        default:
          console.log('📝 汎用ページ: 特別なアクションサービスは不要');
          break;
      }
    } catch (error) {
      console.error('❌ ページ固有サービス初期化エラー:', error);
      this.initializationErrors.pageServices = error;
    }

    console.log('✅ コアサービス初期化完了');
  }

  /**
   * AdminActionServiceの安全な初期化
   * @private
   */
  async initializeAdminActionService() {
    try {
      const { AdminActionService } = await import('../features/admin/services/AdminActionService.js');
      const adminActionService = new AdminActionService();
      
      await adminActionService.init();
      this.services.set('adminActions', adminActionService);
      
      console.log('✅ AdminActionService初期化完了');
      return adminActionService;
      
    } catch (error) {
      console.error('❌ AdminActionService初期化エラー:', error);
      this.initializationErrors.adminActionService = error;
      
      // 管理画面でエラーが発生した場合は、ログインページにリダイレクト
      if (this.currentPage === 'admin') {
        console.log('🔄 管理画面初期化失敗: ログインページにリダイレクト');
        redirect.toAdminLogin();
      }
      return null;
    }
  }

  /**
   * NewsActionServiceの安全な初期化
   * @private
   */
  async initializeNewsActionService() {
    try {
      const { newsActionService } = await import('../features/news/services/NewsActionService.js');
      
      if (newsActionService && typeof newsActionService.init === 'function') {
        await newsActionService.init();
        this.services.set('newsActions', newsActionService);
        console.log('✅ NewsActionService初期化完了');
        return newsActionService;
      } else {
        console.warn('⚠️ NewsActionService: initメソッドが見つかりません');
        return null;
      }
      
    } catch (error) {
      console.error('❌ NewsActionService初期化エラー:', error);
      this.initializationErrors.newsActionService = error;
      return null;
    }
  }

  /**
   * ページ固有の機能初期化
   * @private
   */
  async initializePageFeatures() {
    console.log(`🎯 ${this.currentPage} ページの機能初期化中...`);

    try {
      switch (this.currentPage) {
        case 'home':
          await this.initializeHomeFeatures();
          break;
        
        case 'news-detail':
        case 'news-list':
          await this.initializeNewsFeatures();
          break;
        
        case 'admin':
          await this.initializeAdminFeatures();
          break;
        
        case 'admin-login':
          await this.initializeAuthFeatures();
          break;
        
        default:
          console.log('📝 汎用ページとして初期化');
          await this.initializeCommonFeatures();
          break;
      }

      console.log(`✅ ${this.currentPage} ページの機能初期化完了`);
      
    } catch (error) {
      console.error(`❌ ${this.currentPage} ページの機能初期化エラー:`, error);
      
      // ページタイプに応じた適切なエラーハンドリング
      if (this.currentPage === 'home' && error.message?.includes('news')) {
        // ホームページでニュース機能のエラーの場合は、他の機能は継続
        console.warn('⚠️ ホームページ: ニュース機能のエラーを無視して他の機能を継続');
        await this.initializeHomeFeaturesWithoutNews();
      } else if (this.currentPage.includes('news')) {
        // ニュース関連ページではエラー表示
        this.showPageInitializationError(`${this.currentPage}ページの初期化に失敗しました。`);
      } else {
        // その他のページは通常のエラーハンドリング
        this.showPageInitializationError(`ページの初期化中にエラーが発生しました。`);
      }
      
      // 初期化エラーを記録
      this.initializationErrors[`${this.currentPage}Features`] = error;
    }
  }
  
  /**
   * ニュース機能なしでホームページ機能を初期化
   * @private
   */
  async initializeHomeFeaturesWithoutNews() {
    try {
      console.log('🏠 ホームページ機能初期化（ニュース機能除く）');
      
      // ニュース以外の機能のみ初期化
      await this.initializeLessonStatusFeatures();
      
      // FAQ機能の初期化
      this.initializeFAQs();
      
      // ステータスバナー機能の初期化
      this.initializeStatusBanner();
      
      console.log('✅ ホームページ機能初期化完了（ニュース機能除く）');
      
    } catch (error) {
      console.error('❌ ホームページ機能初期化エラー（ニュース機能除く）:', error);
    }
  }

  /**
   * レッスン状況機能の初期化
   * @private
   */
  async initializeLessonStatusFeatures() {
    try {
      console.log('🏃‍♂️ レッスン状況機能初期化開始');
      
      // 統合レッスン状況ストレージサービス初期化
      const { getLessonStatusStorageService } = await import('../shared/services/LessonStatusStorageService.js');
      const lessonStatusService = getLessonStatusStorageService();
      
      // サービス初期化
      if (!lessonStatusService.initialized) {
        await lessonStatusService.init();
        console.log('🏃‍♂️ レッスンステータスストレージサービス初期化完了');
      }
      
      // ページタイプに応じた初期化
      if (this.currentPage === 'admin') {
        await this.initializeAdminLessonStatus();
      } else {
        await this.initializeLPLessonStatus();
      }
      
      console.log('✅ レッスン状況機能初期化完了');
      
    } catch (error) {
      console.warn('⚠️ レッスン状況機能初期化エラー:', error);
      // エラー時もアプリケーションは継続
    }
  }

  /**
   * 管理画面のレッスンステータス初期化
   * @private
   */
  async initializeAdminLessonStatus() {
    try {
      const { default: LessonStatusAdminComponent } = await import('../features/admin/components/LessonStatusAdminComponent.js');
      
      // 管理画面用のコンテナを探す
      let adminContainer = document.querySelector('#lesson-status-form, .lesson-status-admin, .admin-lesson-status, #lesson-status');
      
      if (!adminContainer) {
        console.log('管理画面レッスンステータスコンテナが見つからないため、作成をスキップします');
        return;
      }
      
      const lessonStatusAdmin = new LessonStatusAdminComponent(adminContainer);
      await lessonStatusAdmin.init();
      
      // グローバル参照設定
      window.lessonStatusAdmin = lessonStatusAdmin;
      console.log('✅ 管理画面レッスンステータス初期化完了');
      
    } catch (error) {
      console.warn('⚠️ 管理画面レッスンステータス初期化エラー:', error);
    }
  }

  /**
   * LP側のレッスンステータス初期化
   * @private
   */
  async initializeLPLessonStatus() {
    try {
      // ホームページまたはレッスン状況セクションがある場合は初期化を実行
      if (this.currentPage === 'home' || this.hasLessonStatusSection()) {
        console.log('レッスン状況セクションを検出、初期化を実行します');
        await this.initializeLessonStatusDisplayComponent();
      } else {
        console.log('レッスン状況セクションが見つかりません、初期化をスキップします');
      }
      
    } catch (error) {
      console.warn('⚠️ LP側レッスンステータス初期化エラー:', error);
    }
  }

  /**
   * LessonStatusDisplayComponentの初期化
   * @private
   */
  async initializeLessonStatusDisplayComponent() {
    try {
      const { default: LessonStatusDisplayComponent } = await import('../features/lesson/components/LessonStatusDisplayComponent.js');
      
      // レッスン状況表示用のコンテナを探す
      let statusContainer = document.querySelector('#today-status, .status-banner, .lesson-status');
      
      if (!statusContainer) {
        console.log('既存のステータスコンテナが見つからないため、新規作成します');
        statusContainer = this.createStatusContainer();
      } else {
        console.log('既存のステータスコンテナを使用:', statusContainer.id || statusContainer.className);
      }
      
      if (statusContainer) {
        // 非表示クラスがあれば除去
        statusContainer.classList.remove('status-banner-hidden');
        statusContainer.classList.add('status-banner-visible');
        
        const lessonStatusDisplay = new LessonStatusDisplayComponent(statusContainer);
        await lessonStatusDisplay.init();
        
        // グローバル参照設定
        window.lessonStatusDisplay = lessonStatusDisplay;
        
        console.log('✅ LessonStatusDisplayComponent初期化完了');
      } else {
        console.warn('⚠️ ステータスコンテナの作成に失敗しました');
      }
      
    } catch (error) {
      console.warn('⚠️ LessonStatusDisplayComponent初期化エラー:', error);
    }
  }

  /**
   * ステータスコンテナを新規作成
   * @private
   * @returns {HTMLElement|null}
   */
  createStatusContainer() {
    try {
      // 適切な挿入位置を探す - ヒーローセクション直後を優先
      const heroSection = document.querySelector('#hero');
      const targetParent = heroSection?.parentNode || document.querySelector('main, #main-content, body');
      
      if (targetParent) {
        const statusContainer = document.createElement('section');
        statusContainer.id = 'today-status';
        statusContainer.className = 'status-banner lesson-status';
        statusContainer.innerHTML = `
          <div class="container">
            <div class="status-header status-header-clickable" data-action="toggle-status" aria-expanded="false">
              <div class="status-info">
                <span class="status-dot"></span>
                <span class="status-text">本日のレッスン開催状況</span>
                <span class="status-indicator" id="global-status-indicator">読み込み中...</span>
              </div>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="status-content">
              <div class="status-details" id="status-details">
                <div class="loading-status">
                  <p>レッスン状況を読み込み中...</p>
                </div>
              </div>
              <div class="status-message status-message-hidden" id="global-status-message">
                <div class="message-content">
                  <i class="fas fa-info-circle"></i>
                  <span id="global-message-text"></span>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // ヒーローセクションの直後に挿入
        if (heroSection && heroSection.nextSibling) {
          targetParent.insertBefore(statusContainer, heroSection.nextSibling);
          console.log('ステータスコンテナをヒーローセクション直後に動的作成しました');
        } else if (heroSection) {
          heroSection.insertAdjacentElement('afterend', statusContainer);
          console.log('ステータスコンテナをヒーローセクション直後に動的作成しました（afterend）');
        } else {
          const headerContainer = document.querySelector('#header-container');
          if (headerContainer) {
            headerContainer.insertAdjacentElement('afterend', statusContainer);
            console.log('ステータスコンテナをヘッダーコンテナ後に動的作成しました（フォールバック）');
          } else {
            targetParent.insertBefore(statusContainer, targetParent.firstChild);
            console.log('ステータスコンテナをページ先頭に動的作成しました（最終フォールバック）');
          }
        }
        
        return statusContainer;
      }
      
      return null;
      
    } catch (error) {
      console.error('ステータスコンテナ作成エラー:', error);
      return null;
    }
  }

  /**
   * レッスン状況セクションの存在確認
   * @returns {boolean}
   */
  hasLessonStatusSection() {
    return !!(
      document.querySelector('#today-status, .status-banner, .lesson-status') ||
      document.querySelector('[data-component="lesson-status"]')
    );
  }

  /**
   * FAQ機能の初期化
   * @private
   */
  initializeFAQs() {
    try {
      console.log('❓ FAQ機能初期化開始');
      
      const faqItems = document.querySelectorAll('.faq-item');
      
      if (faqItems.length === 0) {
        console.log('FAQセクションが見つかりません、初期化をスキップします');
        return;
      }
      
      faqItems.forEach((item, index) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');
        
        if (question && answer) {
          // アクセシビリティ属性を設定
          question.setAttribute('id', `faq-question-${index + 1}`);
          question.setAttribute('aria-controls', `faq-${index + 1}`);
          question.setAttribute('role', 'button');
          question.setAttribute('tabindex', '0');
          
          answer.setAttribute('id', `faq-${index + 1}`);
          answer.setAttribute('aria-labelledby', `faq-question-${index + 1}`);
          answer.setAttribute('role', 'region');
          answer.setAttribute('aria-hidden', 'true');
          
          // 初期状態は閉じる（CSSアニメーションに対応）
          answer.style.maxHeight = '0';
          answer.style.opacity = '0';
          if (icon) icon.textContent = '+';
          
          // ActionManagerへの登録は既に行われているので、ここでは何もしない
        }
      });
      
      console.log(`✅ FAQ機能初期化完了 (${faqItems.length}件)`);
      
    } catch (error) {
      console.warn('⚠️ FAQ機能初期化エラー:', error);
    }
  }

  /**
   * ステータスバナー機能の初期化
   * @private
   */
  initializeStatusBanner() {
    try {
      console.log('📢 ステータスバナー機能初期化開始');
      
      const statusSection = document.querySelector('#today-status, .status-banner');
      
      if (!statusSection) {
        console.log('ステータスバナーセクションが見つかりません、初期化をスキップします');
        return;
      }
      
      // ActionManagerに既に登録されているので、追加の設定は不要
      console.log('✅ ステータスバナー機能初期化完了');
      
    } catch (error) {
      console.warn('⚠️ ステータスバナー機能初期化エラー:', error);
    }
  }
  
  /**
   * ページ初期化エラー表示
   * @private
   */
  showPageInitializationError(message) {
    console.error('🚨 ページ初期化エラー:', message);
    
    // 必要に応じてユーザーにエラーメッセージを表示
    // （現在はコンソールログのみ）
  }

  /**
   * ホームページ機能の初期化
   * @private
   */
  async initializeHomeFeatures() {
    console.log('🏠 ホームページ機能を初期化中...');
    
    try {
      // ニュース機能の初期化（ホームページ用）
      try {
        await this.initializeNewsFeatures();
        console.log('✅ ホームページ：ニュース機能初期化完了');
      } catch (newsError) {
        console.warn('⚠️ ホームページ：ニュース機能初期化エラー、他の機能は継続します:', newsError.message);
        // ニュース機能のエラーがあっても、他の機能は継続
      }
      
      // レッスン状況機能の初期化
      await this.initializeLessonStatusFeatures();
      
      // FAQ機能の初期化
      this.initializeFAQs();
      
      // ステータスバナー機能の初期化
      this.initializeStatusBanner();
      
      console.log('✅ ホームページ機能初期化完了');
      
    } catch (error) {
      console.warn('⚠️ ホームページ機能の初期化エラー:', error.message);
    }
  }

  /**
   * ニュース機能の初期化
   * @private
   */
  async initializeNewsFeatures() {
    try {
      console.log('🚀 ニュース機能初期化開始 (core/Application)');
      
      await initNewsFeature();
      this.features.set('news', true);
      
      console.log('✅ ニュース機能初期化完了 (core/Application)');
      
    } catch (error) {
      console.error('❌ ニュース機能初期化エラー (core/Application):', error);
      console.error('📋 エラー詳細:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // エラーレポートに記録
      window.lastNewsInitError = {
        error,
        timestamp: new Date().toISOString(),
        location: 'core/Application.initializeNewsFeatures'
      };
      
      // 基本的なエラー表示
      this.showNewsInitializationError(error);
      
      // ホームページでは例外をスローせず、ニュース専用ページでのみスロー
      if (this.currentPage === 'news-detail' || this.currentPage === 'news-list') {
        throw error; // ニュース専用ページでは致命的エラーとして扱う
      } else {
        console.warn('⚠️ ホームページでのニュース機能エラーは非致命的として処理');
      }
    }
  }
  
  /**
   * ニュース初期化エラー表示
   * @private
   */
  showNewsInitializationError(error) {
    const newsContainer = document.getElementById('news-list');
    const loadingStatus = document.getElementById('news-loading-status');
    
    if (loadingStatus) {
      loadingStatus.style.display = 'none';
    }
    
    if (newsContainer) {
      newsContainer.innerHTML = `
        <div class="news-init-error">
          <h3>⚠️ ニュース機能の初期化に失敗しました</h3>
          <p>エラー: ${error.message}</p>
          <div class="error-actions">
            <button onclick="location.reload()" class="btn btn-primary">ページを再読み込み</button>
            <button onclick="window.debugNewsSystem && window.debugNewsSystem()" class="btn btn-outline">デバッグ情報表示</button>
          </div>
        </div>
      `;
    }
  }

  /**
   * 管理画面機能の初期化
   * @private
   */
  async initializeAdminFeatures() {
    console.log('👨‍💼 管理画面機能を初期化中...');
    
    try {
      // 開発環境チェック
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        console.log('🚧 開発環境のため、認証チェックをスキップして管理画面を初期化');
      }
      
      // admin/index.jsのinitAdminFeature()を使用
      // 認証チェック、ログアウトハンドラー設定、全サービス初期化が含まれる
      const { initAdminFeature } = await import('../features/admin/index.js');
      await initAdminFeature();
      
      this.features.set('admin', true);
      console.log('✅ 管理画面機能の初期化完了');
      
    } catch (error) {
      console.error('❌ 管理画面機能初期化エラー:', error);
      this.initializationErrors.adminFeature = error;
      
      // 開発環境では詳細エラーを表示
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        console.error('🚧 開発環境: 管理画面初期化エラーの詳細:', {
          error: error,
          stack: error.stack,
          message: error.message
        });
        
        // 開発環境では警告のみ表示してリダイレクトしない
        this.showDevelopmentWarning(error);
      } else {
        // 本番環境のみリダイレクト処理
        if (error.message?.includes('認証') || error.message?.includes('auth')) {
          console.log('🔄 認証エラー: ログインページにリダイレクト');
          
          // 少し待機してからリダイレクト
          setTimeout(() => {
            redirect.toAdminLogin();
          }, 1000);
        } else {
          // その他のエラーはコンソールにログ出力のみ
          showInitializationError('管理画面の初期化に失敗しました。ページを再読み込みしてください。');
        }
      }
    }
  }

  /**
   * 開発環境警告を表示
   * @private
   */
  showDevelopmentWarning(error) {
    const warningHtml = `
      <div id="dev-warning" class="dev-warning">
        <h4 class="dev-warning-title">
          ⚠️ 開発環境エラー通知
        </h4>
        <p class="dev-warning-text">
          開発環境でエラーが発生しました。本番環境では表示されません。
        </p>
        <details class="dev-warning-details">
          <summary class="dev-warning-summary">エラー詳細</summary>
          <pre class="dev-warning-code">${error.message}</pre>
        </details>
        <button onclick="document.getElementById('dev-warning').remove()" class="dev-warning-close">
          閉じる
        </button>
      </div>
    `;
    
    if (!document.getElementById('dev-warning')) {
      document.body.insertAdjacentHTML('beforeend', warningHtml);
    }
  }

  /**
   * 認証機能の初期化
   * @private
   */
  async initializeAuthFeatures() {
    try {
      await initAuthFeature();
      
      // AuthActionServiceが初期化された場合はサービスに登録
      try {
        const { authActionService } = await import('../features/auth/services/AuthActionService.js');
        if (authActionService && authActionService.initialized) {
          this.services.set('authActions', authActionService);
          console.log('✅ AuthActionService登録完了');
        }
      } catch (authActionServiceError) {
        console.warn('⚠️ AuthActionService のインポートに失敗しましたが、続行します:', authActionServiceError.message);
        this.initializationErrors.authActionService = authActionServiceError;
      }
      
      this.features.set('auth', true);
      console.log('✅ 認証機能初期化完了');
      
    } catch (error) {
      console.error('❌ 認証機能初期化エラー:', error);
      this.initializationErrors.authFeature = error;
    }
  }

  /**
   * 共通機能の初期化
   * @private
   */
  async initializeCommonFeatures() {
    // 全ページ共通の機能のみ初期化
    console.log('🔧 共通機能を初期化中...');
  }

  /**
   * グローバルイベントハンドラーの設定
   * @private
   */
  setupGlobalEventHandlers() {
    // エラーハンドリング
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    // ページ離脱前の処理
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    console.log('📡 グローバルイベントハンドラーを設定');
  }

  /**
   * グローバルエラーハンドリング
   * @private
   * @param {ErrorEvent} event - エラーイベント
   */
  handleGlobalError(event) {
    console.error('🚨 グローバルエラー:', event.error);
    
    // エラー報告などの処理
    reportError(event.error, 'global');
  }

  /**
   * 未処理のPromise拒否ハンドリング
   * @private
   * @param {PromiseRejectionEvent} event - Promise拒否イベント
   */
  handleUnhandledRejection(event) {
    console.error('🚨 未処理のPromise拒否:', event.reason);
    
    // エラー報告などの処理
    reportError(event.reason, 'promise');
  }

  /**
   * ページ離脱前の処理
   * @private
   * @param {BeforeUnloadEvent} event - 離脱前イベント
   */
  handleBeforeUnload(event) {
    // 必要に応じて保存処理などを実行
    console.log('👋 ページを離脱中...');
  }

  /**
   * 初期化エラーの処理
   * @private
   * @param {Error} error - エラー
   */
  async handleInitializationError(error) {
    console.error('🚨 アプリケーション初期化で重大なエラーが発生しました:', error);
    
    // 最低限のDOM構造を確保
    this.ensureBasicDomStructure();
    
    // エラー情報をユーザーに表示
          showInitializationError(error.message);
    
    // エラー報告
          reportError(error, 'initialization');
    
    // EventBusでエラーイベントを発火
    try {
      EventBus.emit('app:initialization:error', {
        error: error,
        page: this.currentPage,
        timestamp: new Date().toISOString()
      });
    } catch (eventBusError) {
      console.error('❌ EventBusでのエラー通知に失敗:', eventBusError);
    }
  }

  // showInitializationErrorは shared/utils/errorUtils.js に統合されました

  /**
   * 基本的なDOM構造を確保
   * @private
   */
  ensureBasicDomStructure() {
    // body要素が存在しない場合は作成
    if (!document.body) {
      document.documentElement.appendChild(document.createElement('body'));
    }
    
    // 基本的なメタ要素を確保
    if (!document.querySelector('meta[charset]')) {
      const charset = document.createElement('meta');
      charset.setAttribute('charset', 'UTF-8');
      document.head.appendChild(charset);
    }
    
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      document.head.appendChild(viewport);
    }
  }

  // reportErrorは shared/utils/errorUtils.js に統合されました

  /**
   * サービス取得
   * @param {string} name - サービス名
   * @returns {*} サービスインスタンス
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * 機能の有無確認
   * @param {string} name - 機能名
   * @returns {boolean} 機能が有効かどうか
   */
  hasFeature(name) {
    return this.features.has(name);
  }

  /**
   * レイアウト機能の有無確認
   * @returns {boolean} レイアウト機能が有効かどうか
   */
  hasLayoutFeature() {
    return this.services.has('layout') && this.templatesLoaded;
  }

  /**
   * テンプレートの再読み込み
   * @param {string|null} pageType - ページタイプ（nullの場合は現在のページ）
   */
  async reloadTemplates(pageType = null) {
    const targetPageType = pageType || this.currentPage;
    console.log(`🔄 テンプレート再読み込み: ${targetPageType}`);
    
    try {
      // レイアウト初期化を再実行
      const layoutOptions = this.getLayoutOptionsForPage(targetPageType);
      const layoutResult = await initializeLayout(layoutOptions);
      
      if (layoutResult.result.success) {
        this.templatesLoaded = true;
        console.log('✅ テンプレート再読み込み完了');
        return true;
      } else {
        console.warn('⚠️ テンプレート再読み込み失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ テンプレート再読み込みエラー:', error);
      return false;
    }
  }

  /**
   * レイアウトパフォーマンス情報取得
   * @returns {Object} パフォーマンス情報
   */
  getLayoutPerformanceInfo() {
    return {
      templatesLoaded: this.templatesLoaded,
      hasLayoutService: this.services.has('layout'),
      layoutInitializer: this.layoutInitializer ? 'loaded' : 'not_loaded',
      currentPage: this.currentPage
    };
  }

  /**
   * EventBusを通じたイベント発火
   * @param {string} eventName - イベント名
   * @param {any} data - イベントデータ
   */
  emit(eventName, data) {
    try {
      EventBus.emit(eventName, data);
    } catch (error) {
      console.warn('⚠️ EventBusでのイベント発火に失敗:', eventName, error);
    }
  }

  /**
   * EventBusを通じたイベントリスニング
   * @param {string} eventName - イベント名
   * @param {Function} listener - リスナー関数
   */
  on(eventName, listener) {
    try {
      EventBus.on(eventName, listener);
    } catch (error) {
      console.warn('⚠️ EventBusでのイベント登録に失敗:', eventName, error);
    }
  }

  /**
   * アプリケーションの現在状態を取得
   * @returns {Object} 状態情報
   */
  getStatus() {
    return {
      initialized: this.initialized,
      currentPage: this.currentPage,
      templatesLoaded: this.templatesLoaded,
      servicesCount: this.services.size,
      featuresCount: this.features.size,
      errors: this.initializationErrors,
      services: Array.from(this.services.keys()),
      features: Array.from(this.features.keys())
    };
  }

  /**
   * 認証サービス取得（非同期）
   * @returns {Promise<*>} 認証サービス
   * @deprecated AuthManagerを直接使用してください
   */
  async getAuthService() {
    // 後方互換性のため残しているが、AuthManagerの使用を推奨
    console.warn('getAuthService()は非推奨です。AuthManagerを直接使用してください。');
    
    let authService = this.services.get('authActions');
    
    if (!authService) {
      // 動的に読み込み
      try {
        const { authActionService } = await import('../features/auth/services/AuthActionService.js');
        authService = authActionService;
      } catch (error) {
        console.warn('認証サービスの動的読み込みに失敗:', error);
      }
    }
    
    return authService;
  }

  /**
   * デバッグ情報の表示
   */
  debug() {
    console.group('🔍 Application Debug Info');
    console.table(this.getStatus());
    console.log('Services:', this.services);
    console.log('Features:', this.features);
    console.log('Initialization Errors:', this.initializationErrors);
    console.groupEnd();
  }

  /**
   * アプリケーションの破棄
   */
  destroy() {
    console.log('🗑️ Application: 破棄開始');
    
    this.services.clear();
    this.features.clear();
    this.layoutInitializer = null;
    this.initialized = false;
    
    console.log('✅ Application: 破棄完了');
  }
}

// シングルトンインスタンス
export const app = new Application();

// グローバルアクセス（後方互換性）
window.RBSApp = app; 