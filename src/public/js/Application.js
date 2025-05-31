/**
 * アプリケーションメインクラス
 * 全体的な初期化とコンポーネント管理を担当
 * @version 3.0.0 - 統合記事管理システム対応
 */

import { EventBus } from './shared/services/EventBus.js';
import { CONFIG } from './shared/constants/config.js';
import { actionManager } from './core/ActionManager.js';

export class Application {
  constructor() {
    this.initialized = false;
    this.componentName = 'Application';
    
    // サービス
    this.articleStorageService = null;
    this.layoutInitializer = null;
    this.actionManager = null;
    
    // コンポーネント
    this.newsDisplayComponent = null;
    
    // 状態管理
    this.currentPageType = null;
    this.appConfig = {};
    
    // 初期化開始時刻
    this.initStartTime = performance.now();
  }

  /**
   * アプリケーション初期化
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      this.log('既に初期化済みです');
      return;
    }

    try {
      console.log('🚀 アプリケーション初期化開始');
      
      // ページタイプの検出
      this.detectPageType();
      
      // コアサービスの初期化（ActionManager含む）
      await this.initializeCoreServices();
      
      // レイアウト機能の初期化
      await this.initializeLayout();
      
      // ニュース機能の初期化
      await this.initializeNewsFeatures();
      
      // レッスン状況機能の初期化
      await this.initializeLessonStatusFeatures();
      
      // ページ固有機能の初期化
      await this.initializePageSpecificFeatures();
      
      // 初期化完了
      this.initialized = true;
      const initTime = Math.round(performance.now() - this.initStartTime);
      
      console.log(`✅ アプリケーション初期化完了 (${initTime}ms) - ページ: ${this.pageType}`);
      
      // 初期化完了イベント
      EventBus.emit('application:initialized', {
        pageType: this.pageType,
        initTime,
        services: {
          actionManager: !!this.actionManager,
          lessonStatusService: !!(window.lessonStatusAdmin || window.lessonStatusDisplay),
          articleService: !!window.articleDataService,
          layout: this.layoutInitialized
        }
      });
      
    } catch (error) {
      this.error('アプリケーション初期化エラー:', error);
      throw error;
    }
  }

  /**
   * コアサービスの初期化
   * @private
   */
  async initializeCoreServices() {
    try {
      // デバッグログを最小限に
      if (CONFIG.debug.enabled) {
        this.log('コアサービス初期化開始');
      }
      
      // ActionManager の初期化
      console.log('🔧 ActionManager初期化開始...');
      actionManager.init();
      this.actionManager = actionManager;
      console.log('✅ ActionManager初期化完了');
      
      // UI相互作用管理システムの初期化
      await this.initializeUIInteractionManager();
      
      if (CONFIG.debug.enabled) {
        this.debug('ActionManager初期化完了');
      }
      
    } catch (error) {
      this.error('コアサービス初期化エラー:', error);
      // フォールバック: 最低限のActionManager初期化
      try {
        actionManager.init();
        this.actionManager = actionManager;
        this.warn('フォールバックモードでActionManager初期化');
      } catch (fallbackError) {
        this.error('ActionManagerフォールバック初期化も失敗:', fallbackError);
      }
    }
  }

  /**
   * UI相互作用管理システムの初期化
   * @private
   */
  async initializeUIInteractionManager() {
    try {
      console.log('🎨 UI相互作用管理システム初期化開始...');
      
      // RBSHelpersのフォールバック実装を設定
      this.setupRBSHelpersFallback();
      
      // UIInteractionManagerの動的インポートと初期化
      try {
        const { default: UIInteractionManager } = await import('./shared/components/ui/UIInteractionManager.js');
        
        // UIInteractionManagerが既にグローバルに初期化されているかチェック
        if (!window.uiManager) {
          // UIInteractionManagerのインスタンスを作成・初期化
          console.log('🔨 UIInteractionManagerインスタンス作成中...');
          window.uiManager = new UIInteractionManager();
          console.log('🚀 UIInteractionManager初期化実行中...');
          await window.uiManager.init();
          console.log('✅ UIInteractionManager初期化完了');
        } else {
          this.debug('UIInteractionManager既に初期化済み');
        }
      } catch (uiError) {
        console.warn('⚠️ UIInteractionManager初期化失敗:', uiError);
        console.error('詳細エラー:', uiError.stack);
        // UIInteractionManagerが失敗してもActionManagerで十分機能する
        this.debug('ActionManagerのみで動作を継続');
      }
      
    } catch (error) {
      console.warn('⚠️ UI相互作用管理システム初期化エラー:', error);
      console.error('詳細エラー:', error.stack);
    }
  }

  /**
   * RBSHelpersのフォールバック実装
   * @private
   */
  setupRBSHelpersFallback() {
    if (!window.RBSHelpers) {
      window.RBSHelpers = {
        getElement: (selector) => document.querySelector(selector),
        getElements: (selector) => document.querySelectorAll(selector),
        debounce: (func, delay) => {
          let timeoutId;
          return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
          };
        },
        throttle: (func, delay) => {
          let lastCall = 0;
          return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
              lastCall = now;
              return func.apply(this, args);
            }
          };
        },
        smoothScrollTo: (element, offset = 0) => {
          const targetPosition = element.offsetTop - offset;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        },
        isElementInViewport: (element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
        },
        sanitizeString: (str) => {
          const div = document.createElement('div');
          div.textContent = str;
          return div.innerHTML;
        },
        formatDate: (dateString, format = 'YYYY年MM月DD日') => {
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
        }
      };
      
      this.debug('RBSHelpersフォールバック実装設定完了');
    }
    
    // eventBusをグローバルに設定（UIInteractionManagerが必要とする）
    if (!window.eventBus) {
      window.eventBus = EventBus;
      this.debug('EventBusをグローバルに設定完了');
    }
  }

  /**
   * ページタイプの検出
   * @private
   */
  detectPageType() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    
    // URLパスベースの判定
    if (path.includes('/admin') || fileName.includes('admin')) {
      this.pageType = 'admin';
    } else if (path.includes('/news-detail') || fileName.includes('news-detail')) {
      this.pageType = 'news-detail';
    } else if (path.includes('/news') || fileName.includes('news')) {
      this.pageType = 'news';
    } else if (fileName === 'index.html' || fileName === '' || path === '/') {
      this.pageType = 'home';
    } else {
      this.pageType = 'other';
    }
    
    // 後方互換性
    this.currentPageType = this.pageType;
    
    this.debug(`ページタイプ検出: ${this.pageType} (${fileName})`);
  }

  /**
   * レイアウト機能の初期化
   * @private
   */
  async initializeLayout() {
    try {
      // 管理画面では独自のレイアウトを使用するため、レイアウト初期化をスキップ
      if (this.pageType === 'admin') {
        this.debug('管理画面のため、レイアウト初期化をスキップします');
        return;
      }
      
      this.log('レイアウト機能初期化開始');
      
      const { initializeLayout } = await import('./shared/components/layout/index.js');
      
      const layoutOptions = {
        pageType: this.currentPageType,
        headerContainerId: 'header-container',
        footerContainerId: 'footer-container',
        templateOptions: {}
      };
      
      const { initializer, result } = await initializeLayout(layoutOptions);
      
      this.layoutInitializer = initializer;
      
      if (result.success) {
        this.log('レイアウト機能初期化完了');
      } else {
        this.warn('レイアウト機能初期化で問題が発生:', result.error);
      }
      
    } catch (error) {
      this.error('レイアウト機能初期化エラー:', error);
    }
  }

  /**
   * ニュース機能の初期化
   * @private
   */
  async initializeNewsFeatures() {
    try {
      this.debug('ニュース機能初期化開始');
      
      // 統合記事ストレージサービス初期化
      const { getArticleStorageService } = await import('./shared/services/ArticleStorageService.js');
      const articleStorageService = getArticleStorageService();
      await articleStorageService.init();
      
      // ページタイプに応じた初期化
      if (this.pageType === 'admin') {
        // 管理画面: 記事管理コンポーネント
        const { default: ArticleDataService } = await import('./features/admin/services/ArticleDataService.js');
        window.articleDataService = new ArticleDataService();
        await window.articleDataService.init();
      } else if (this.pageType === 'home') {
        // ホームページでニュースセクションが必要な場合のみ初期化
        if (this.hasNewsSection()) {
          this.debug('ニュースセクションが検出されました。NewsDisplayComponentを初期化します。');
          await this.initializeNewsDisplayComponent();
        } else {
          this.debug('ニュースセクションが見つかりません。NewsDisplayComponentの初期化をスキップします。');
        }
      }
      
      this.debug('ニュース機能初期化完了');
      
    } catch (error) {
      this.error('ニュース機能初期化エラー:', error);
    }
  }

  /**
   * NewsDisplayComponentの初期化
   * @private
   */
  async initializeNewsDisplayComponent() {
    try {
      const { default: NewsDisplayComponent } = await import('./shared/components/news/NewsDisplayComponent.js');
      
      // 動的ニュース表示用のコンテナを検索
      let newsContainer = document.querySelector('[data-news-dynamic="true"]') ||
                         document.querySelector('#news') ||
                         document.querySelector('#news-section, .news-section, .news-container');
      
      if (!newsContainer) {
        // コンテナが見つからない場合は、main要素内に作成
        const mainElement = document.querySelector('main, #main-content, body');
        if (mainElement) {
          newsContainer = document.createElement('section');
          newsContainer.id = 'news-section';
          newsContainer.className = 'news-section';
          newsContainer.setAttribute('data-news-dynamic', 'true');
          newsContainer.style.display = 'none'; // 必要時に表示
          mainElement.appendChild(newsContainer);
          this.debug('動的ニュースコンテナを新規作成しました');
        } else {
          // 最終フォールバック: body要素を使用
          newsContainer = document.body;
        }
      } else {
        this.debug('既存の動的ニュースコンテナを使用:', newsContainer.id || newsContainer.className);
      }
      
      const newsDisplay = new NewsDisplayComponent(newsContainer);
      await newsDisplay.init();
      this.newsDisplayComponent = newsDisplay;
      
      // グローバルアクセス用
      window.newsDisplayComponent = newsDisplay;
      
      this.debug('NewsDisplayComponent初期化完了');
      
    } catch (error) {
      this.error('NewsDisplayComponent初期化エラー:', error);
    }
  }

  /**
   * ニュースセクションの存在確認
   * 動的ニュースセクション（data-news-dynamic="true"）を検出して統合記事システムを有効化
   * @returns {boolean}
   */
  hasNewsSection() {
    // 動的ニュースセクションを優先的に検出
    const dynamicNewsSection = document.querySelector('[data-news-dynamic="true"]');
    if (dynamicNewsSection) {
      this.debug('動的ニュースセクションが検出されました。統合記事システムを初期化します。');
      return true;
    }
    
    // 静的ニュースセクションは除外
    const staticNewsSection = document.querySelector('.news-section-static');
    if (staticNewsSection) {
      this.debug('静的ニュースセクションが検出されました。動的処理をスキップします。');
      return false;
    }
    
    // 他の動的ニュースセクションパターンも検出
    const hasNewsElements = !!(
      document.querySelector('#news-section, .news-section, .news-container') ||
      document.querySelector('[data-component="news"], [data-role="news"]') ||
      document.querySelector('#news.news-dynamic, .news-dynamic')
    );
    
    this.debug(`動的ニュースセクション存在確認: ${hasNewsElements}`);
    return hasNewsElements;
  }

  /**
   * レッスン状況機能の初期化
   * @private
   */
  async initializeLessonStatusFeatures() {
    try {
      this.debug('レッスン状況機能初期化開始');
      
      // 統合レッスン状況ストレージサービス初期化
      const { getLessonStatusStorageService } = await import('./shared/services/LessonStatusStorageService.js');
      const lessonStatusService = getLessonStatusStorageService();
      
      // サービス初期化
      if (!lessonStatusService.initialized) {
        await lessonStatusService.init();
        this.debug('レッスンステータスストレージサービス初期化完了');
      }
      
      // ページタイプに応じた初期化
      if (this.pageType === 'admin') {
        await this.initializeAdminLessonStatus();
      } else {
        await this.initializeLPLessonStatus();
      }
      
      this.debug('レッスン状況機能初期化完了');
      
    } catch (error) {
      this.error('レッスン状況機能初期化エラー:', error);
      // エラー時もフォールバック処理を行う
      this.showInitializationWarning('レッスン状況機能の初期化に失敗しました');
    }
  }

  /**
   * 管理画面のレッスンステータス初期化
   * @private
   */
  async initializeAdminLessonStatus() {
    try {
      const { default: LessonStatusAdminComponent } = await import('./features/admin/components/LessonStatusAdminComponent.js');
      
      // 管理画面用のコンテナを探すか、作成
      let adminContainer = document.querySelector('#lesson-status-form, .lesson-status-admin, .admin-lesson-status, #lesson-status');
      
      if (!adminContainer) {
        this.debug('管理画面レッスンステータスコンテナが見つからないため、作成をスキップします');
        return;
      }
      
      const lessonStatusAdmin = new LessonStatusAdminComponent(adminContainer);
      await lessonStatusAdmin.init();
      
      // グローバル参照設定
      window.lessonStatusAdmin = lessonStatusAdmin;
      this.debug('管理画面レッスンステータス初期化完了');
      
    } catch (error) {
      this.error('管理画面レッスンステータス初期化エラー:', error);
    }
  }

  /**
   * LP側のレッスンステータス初期化
   * @private
   */
  async initializeLPLessonStatus() {
    try {
      // ホームページまたはレッスン状況セクションがある場合は初期化を実行
      if (this.pageType === 'home' || this.hasLessonStatusSection()) {
        this.debug('レッスン状況セクションを検出、初期化を実行します');
        await this.initializeLessonStatusDisplayComponent();
      } else {
        // セクションが見つからない場合でも、ホームページなら強制的に初期化
        if (this.pageType === 'home') {
          this.debug('ホームページのため、レッスン状況セクションを作成して初期化します');
          await this.initializeLessonStatusDisplayComponent();
        } else {
          this.debug('レッスン状況セクションが見つかりません、初期化をスキップします');
        }
      }
      
    } catch (error) {
      this.error('LP側レッスンステータス初期化エラー:', error);
    }
  }

  /**
   * LessonStatusDisplayComponentの初期化
   * @private
   */
  async initializeLessonStatusDisplayComponent() {
    try {
      const { default: LessonStatusDisplayComponent } = await import('./features/lesson/components/LessonStatusDisplayComponent.js');
      
      // レッスン状況表示用のコンテナを探す
      let statusContainer = document.querySelector('#today-status, .status-banner, .lesson-status');
      
      if (!statusContainer) {
        this.debug('既存のステータスコンテナが見つからないため、新規作成します');
        statusContainer = this.createStatusContainer();
      } else {
        this.debug('既存のステータスコンテナを使用:', statusContainer.id || statusContainer.className);
      }
      
      if (statusContainer) {
        // 非表示クラスがあれば除去
        statusContainer.classList.remove('status-banner-hidden');
        statusContainer.classList.add('status-banner-visible');
        
        const lessonStatusDisplay = new LessonStatusDisplayComponent(statusContainer);
        await lessonStatusDisplay.init();
        
        // グローバル参照設定
        window.lessonStatusDisplay = lessonStatusDisplay;
        
        this.debug('LessonStatusDisplayComponent初期化完了');
      } else {
        this.warn('ステータスコンテナの作成に失敗しました');
      }
      
    } catch (error) {
      this.error('LessonStatusDisplayComponent初期化エラー:', error);
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
            <div class="status-header" data-action="toggle-status" style="cursor: pointer;" aria-expanded="false">
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
              <div class="status-message" id="global-status-message" style="display: none;">
                <div class="message-content">
                  <i class="fas fa-info-circle"></i>
                  <span id="global-message-text"></span>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // ヒーローセクションの直後に挿入（推奨位置）
        if (heroSection && heroSection.nextSibling) {
          targetParent.insertBefore(statusContainer, heroSection.nextSibling);
          this.debug('ステータスコンテナをヒーローセクション直後に動的作成しました');
        } else if (heroSection) {
          // ヒーローセクションの後に挿入
          heroSection.insertAdjacentElement('afterend', statusContainer);
          this.debug('ステータスコンテナをヒーローセクション直後に動的作成しました（afterend）');
        } else {
          // フォールバック: ヘッダーコンテナの後、またはbodyの先頭
          const headerContainer = document.querySelector('#header-container');
          if (headerContainer) {
            headerContainer.insertAdjacentElement('afterend', statusContainer);
            this.debug('ステータスコンテナをヘッダーコンテナ後に動的作成しました（フォールバック）');
          } else {
            targetParent.insertBefore(statusContainer, targetParent.firstChild);
            this.debug('ステータスコンテナをページ先頭に動的作成しました（最終フォールバック）');
          }
        }
        
        return statusContainer;
      }
      
      return null;
      
    } catch (error) {
      this.error('ステータスコンテナ作成エラー:', error);
      return null;
    }
  }

  /**
   * レッスン状況セクションの存在確認
   * @returns {boolean}
   */
  hasLessonStatusSection() {
    const hasStatusElements = !!(
      document.querySelector('#today-status, .status-banner, .lesson-status') ||
      document.querySelector('[data-component="lesson-status"], [data-role="lesson-status"]') ||
      document.querySelector('[data-action="toggle-status"]') ||
      document.querySelector('.status-header, .lesson-info') ||
      // HTMLに既存のレッスン状況要素があるかチェック
      document.querySelector('.status-content, .status-details') ||
      // より一般的なレッスン関連要素
      document.querySelector('[id*="status"], [class*="status"]')
    );
    
    this.debug(`レッスン状況セクション存在確認: ${hasStatusElements}`);
    return hasStatusElements;
  }

  /**
   * ページ固有機能の初期化
   * @private
   */
  async initializePageSpecificFeatures() {
    try {
      this.debug(`ページ別機能初期化開始: ${this.pageType}`);
      
      switch (this.pageType) {
        case 'admin':
          await this.initializeAdminFeatures();
          break;
        case 'home':
          await this.initializeHomePageFeatures();
          break;
        case 'news':
          await this.initializeNewsPageFeatures();
          break;
        case 'news-detail':
          await this.initializeNewsDetailFeatures();
          break;
        default:
          this.debug('特別な初期化が不要なページタイプです');
      }
      
      this.debug('ページ別機能初期化完了');
      
    } catch (error) {
      this.error('ページ別機能初期化エラー:', error);
    }
  }

  /**
   * 管理画面機能の初期化
   * @private
   */
  async initializeAdminFeatures() {
    try {
      this.debug('管理画面機能初期化開始');

      // 管理画面機能の初期化
      const { initializeAdminFeatures } = await import('./features/admin/index.js');
      const adminComponents = await initializeAdminFeatures();
      
      // アプリケーションにサービスを追加
      this.adminActionService = adminComponents.adminActionService;
      this.uiManagerService = adminComponents.uiManagerService;
      this.articleDataService = adminComponents.articleDataService;
      
      // グローバルアクセス用（HTML内のdata-actionから使用）
      window.adminActionService = this.adminActionService;
      
      this.debug('管理画面機能初期化完了');
      
    } catch (error) {
      this.error('管理画面機能初期化エラー:', error);
      // フォールバック処理
      this.showInitializationWarning('管理画面機能の初期化に失敗しました');
    }
  }

  /**
   * ホームページ機能の初期化
   * @private
   */
  async initializeHomePageFeatures() {
    try {
      this.debug('ホームページ機能初期化開始');
      
      // FAQ機能の初期化
      this.initializeFAQs();
      
      // ステータスバナー機能の初期化
      this.initializeStatusBanner();
      
      // その他のホームページ固有機能
      // （必要に応じて追加）
      
      this.debug('ホームページ機能初期化完了');
      
    } catch (error) {
      this.error('ホームページ機能初期化エラー:', error);
    }
  }

  /**
   * FAQ機能の初期化
   * @private
   */
  initializeFAQs() {
    try {
      this.debug('FAQ機能初期化開始');
      
      // FAQ要素の検索
      const faqItems = document.querySelectorAll('.faq-item');
      const faqQuestions = document.querySelectorAll('.faq-question[data-action="toggle-faq"]');
      
      this.debug(`FAQ要素を検出: ${faqItems.length}個, 質問: ${faqQuestions.length}個`);
      
      if (faqItems.length === 0) {
        this.debug('FAQ要素が見つかりません');
        return;
      }
      
      // 各FAQ要素の初期状態を設定
      faqItems.forEach((faqItem, index) => {
        const faqAnswer = faqItem.querySelector('.faq-answer');
        if (faqAnswer) {
          // 初期状態で非表示に設定（CSSアニメーション準備）
          faqAnswer.style.maxHeight = '0';
          faqAnswer.style.opacity = '0';
          faqAnswer.style.overflow = 'hidden';
          faqAnswer.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
          
          // aria-hidden属性を設定
          faqAnswer.setAttribute('aria-hidden', 'true');
          
          this.debug(`FAQ ${index + 1} 初期化完了`);
        }
      });
      
      // FAQ質問要素の初期化
      faqQuestions.forEach((question, index) => {
        // aria-expanded属性を初期化
        question.setAttribute('aria-expanded', 'false');
        
        // tabindex属性を確保
        if (!question.hasAttribute('tabindex')) {
          question.setAttribute('tabindex', '0');
        }
        
        // キーボードアクセシビリティ対応
        question.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.actionManager.handleAction(question, event);
          }
        });
        
        this.debug(`FAQ質問 ${index + 1} 初期化完了`);
      });
      
      this.debug('FAQ機能初期化完了');
      
    } catch (error) {
      this.error('FAQ機能初期化エラー:', error);
    }
  }

  /**
   * ステータスバナー機能の初期化
   * @private
   */
  initializeStatusBanner() {
    try {
      this.debug('ステータスバナー機能初期化開始');
      
      // ステータスバナー要素の検索
      const statusBanner = document.querySelector('#today-status');
      const statusHeader = document.querySelector('.status-header[data-action="toggle-status"]');
      const statusContent = document.querySelector('#today-status .status-content');
      
      this.debug(`ステータスバナー要素: banner=${!!statusBanner}, header=${!!statusHeader}, content=${!!statusContent}`);
      
      if (!statusBanner || !statusHeader || !statusContent) {
        this.debug('ステータスバナー要素が見つかりません');
        return;
      }
      
      // 初期状態を設定（折りたたみ状態）
      statusContent.style.maxHeight = '0';
      statusContent.style.overflow = 'hidden';
      statusContent.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      statusHeader.setAttribute('aria-expanded', 'false');
      statusBanner.classList.remove('expanded');
      
      // ActionManagerにtoggle-statusアクションを強化登録
      if (this.actionManager) {
        this.actionManager.registerAction('toggle-status', (element, params) => {
          const isExpanded = element.getAttribute('aria-expanded') === 'true';
          const statusContent = document.querySelector('#today-status .status-content');
          const statusBanner = document.querySelector('#today-status');
          const toggleIcon = element.querySelector('.toggle-icon');
          
          this.debug(`ステータスバナートグル: ${isExpanded ? '折りたたみ' : '展開'}`);
          
          if (statusContent && statusBanner) {
            element.setAttribute('aria-expanded', (!isExpanded).toString());
            
            // expandedクラスを切り替え
            statusBanner.classList.toggle('expanded', !isExpanded);
            
            if (isExpanded) {
              // 折りたたむ
              statusContent.style.maxHeight = '0';
              if (toggleIcon) toggleIcon.textContent = '▼';
            } else {
              // 展開
              statusContent.style.maxHeight = 'none';
              const fullHeight = statusContent.scrollHeight;
              statusContent.style.maxHeight = '0';
              
              requestAnimationFrame(() => {
                statusContent.style.maxHeight = `${fullHeight + 20}px`;
              });
              
              if (toggleIcon) toggleIcon.textContent = '▲';
            }
          }
        });
      }
      
      // キーボードアクセシビリティ対応
      statusHeader.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.actionManager.handleAction(statusHeader, event);
        }
      });
      
      this.debug('ステータスバナー機能初期化完了');
      
    } catch (error) {
      this.error('ステータスバナー機能初期化エラー:', error);
    }
  }

  /**
   * ニュースページ機能の初期化
   * @private
   */
  async initializeNewsPageFeatures() {
    try {
      this.debug('ニュースページ機能初期化開始');
      
      // ニュースページ用の追加機能
      // （必要に応じて実装）
      
      this.debug('ニュースページ機能初期化完了');
      
    } catch (error) {
      this.error('ニュースページ機能初期化エラー:', error);
    }
  }

  /**
   * ニュース詳細ページ機能の初期化
   * @private
   */
  async initializeNewsDetailFeatures() {
    try {
      this.debug('ニュース詳細ページ機能初期化開始');
      
      // ニュース詳細ページ用の追加機能
      // （必要に応じて実装）
      
      this.debug('ニュース詳細ページ機能初期化完了');
      
    } catch (error) {
      this.error('ニュース詳細ページ機能初期化エラー:', error);
    }
  }

  /**
   * アプリケーション状態の取得
   * @returns {Object} 状態情報
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      pageType: this.currentPageType,
      services: {
        actionManager: !!this.actionManager,
        articleStorage: this.articleStorageService?.getStatus() || null,
        layout: this.layoutInitializer?.getPerformanceInfo() || null
      },
      components: {
        newsDisplay: this.newsDisplayComponent?.getStatus() || null
      },
      performance: {
        initTime: this.initialized ? Math.round(performance.now() - this.initStartTime) : null
      }
    };
    
    return status;
  }

  /**
   * デバッグ情報の表示
   */
  showDebugInfo() {
    const status = this.getStatus();
    
    console.group('🚀 Application Debug Info');
    console.log('Application Status:', status);
    console.log('EventBus Status:', EventBus.getStatus?.() || 'No status method');
    console.groupEnd();
    
    return status;
  }

  /**
   * アプリケーション破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.log('アプリケーション破棄開始');
      
      // コンポーネントの破棄
      if (this.newsDisplayComponent) {
        await this.newsDisplayComponent.destroy();
        this.newsDisplayComponent = null;
      }
      
      if (this.layoutInitializer) {
        this.layoutInitializer.destroy();
        this.layoutInitializer = null;
      }
      
      // サービスの破棄
      if (this.articleStorageService) {
        await this.articleStorageService.destroy();
        this.articleStorageService = null;
      }
      
      this.initialized = false;
      
      this.log('アプリケーション破棄完了');
      
      // 破棄完了イベント
      EventBus.emit('application:destroyed');
      
    } catch (error) {
      this.error('アプリケーション破棄エラー:', error);
    }
  }

  /**
   * ログ出力
   * @private
   */
  log(...args) {
    console.log(`🚀 ${this.componentName}:`, ...args);
  }

  /**
   * デバッグログ出力
   * @private
   */
  debug(...args) {
    if (CONFIG.debug.enabled) {
      console.debug(`🔍 ${this.componentName}:`, ...args);
    }
  }

  /**
   * 警告ログ出力
   * @private
   */
  warn(...args) {
    console.warn(`⚠️ ${this.componentName}:`, ...args);
  }

  /**
   * エラーログ出力
   * @private
   */
  error(...args) {
    console.error(`❌ ${this.componentName}:`, ...args);
  }

  /**
   * 初期化警告を表示
   * @private
   * @param {string} message - 警告メッセージ
   */
  showInitializationWarning(message) {
    try {
      console.warn(`⚠️ ${message}`);
      
      // 開発環境では画面上にも表示
      if (CONFIG.debug.enabled) {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: #f39c12;
          color: white;
          padding: 10px;
          border-radius: 4px;
          z-index: 9999;
          font-size: 14px;
          max-width: 300px;
        `;
        warningDiv.textContent = message;
        document.body.appendChild(warningDiv);
        
        // 5秒後に自動削除
        setTimeout(() => {
          if (warningDiv.parentNode) {
            warningDiv.parentNode.removeChild(warningDiv);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('警告表示エラー:', error);
    }
  }
}

// シングルトンインスタンス
let applicationInstance = null;

/**
 * Applicationのシングルトンインスタンスを取得
 * @returns {Application}
 */
export function getApplication() {
  if (!applicationInstance) {
    applicationInstance = new Application();
  }
  return applicationInstance;
}

/**
 * アプリケーション初期化関数
 * @returns {Promise<Application>}
 */
export async function initializeApplication() {
  const app = getApplication();
  await app.init();
  return app;
}

// グローバルアクセス用
window.getApplication = getApplication;
window.initializeApplication = initializeApplication;

// デフォルトエクスポート
export default Application;