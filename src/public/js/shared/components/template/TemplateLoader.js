/**
 * RBS陸上教室 テンプレートローダー
 * ヘッダー・フッターなどの共通テンプレートを動的に読み込む
 * v2.0 - ES6モジュール化、BaseComponent継承
 */

import BaseComponent from '../BaseComponent.js';
import eventBus from '../../services/EventBus.js';
import { createHelpers } from '../../utils/helpers.js';

const { DOM, Utils } = createHelpers();

class TemplateLoader extends BaseComponent {
  constructor(options = {}) {
    super(null, {
      basePath: '../components/templates/',
      cacheEnabled: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    });
    
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * デフォルトオプション
   */
  get defaultOptions() {
    return {
      basePath: '../components/templates/',
      cacheEnabled: true,
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  /**
   * 初期化
   */
  init() {
    this.emit('templateLoader:init');
    this.initialized = true;
  }

  /**
   * テンプレートを読み込む
   * @param {string} templateName - テンプレート名（header, footer等）
   * @returns {Promise<string>} - テンプレートHTML
   */
  async loadTemplate(templateName) {
    // キャッシュから取得
    if (this.options.cacheEnabled && this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    // 既に読み込み中の場合は同じPromiseを返す
    if (this.loadingPromises.has(templateName)) {
      return this.loadingPromises.get(templateName);
    }

    const loadPromise = this._loadTemplateWithRetry(templateName);
    this.loadingPromises.set(templateName, loadPromise);

    try {
      const html = await loadPromise;
      this.loadingPromises.delete(templateName);
      return html;
    } catch (error) {
      this.loadingPromises.delete(templateName);
      throw error;
    }
  }

  /**
   * リトライ機能付きテンプレート読み込み
   * @private
   */
  async _loadTemplateWithRetry(templateName, attempt = 1) {
    try {
      const url = `${this.options.basePath}${templateName}.html`;
      console.log(`🔄 テンプレート読み込み試行 ${attempt}: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`✅ テンプレート読み込み成功: ${templateName} (${html.length}文字)`);
      
      // キャッシュに保存
      if (this.options.cacheEnabled) {
        this.cache.set(templateName, html);
      }
      
      this.emit('templateLoader:loaded', { templateName, size: html.length });
      return html;
      
    } catch (error) {
      if (attempt < this.options.retryAttempts) {
        console.warn(`❌ テンプレート読み込み失敗 (試行 ${attempt}/${this.options.retryAttempts}):`, templateName, error.message);
        await Utils.delay(this.options.retryDelay * attempt);
        return this._loadTemplateWithRetry(templateName, attempt + 1);
      }
      
      console.error(`❌ テンプレート読み込み最終失敗:`, templateName, error);
      this.emit('templateLoader:error', { templateName, error });
      return '';
    }
  }

  /**
   * ヘッダーを読み込んで挿入
   * @param {string} selector - 挿入先のセレクター
   * @param {Object} options - オプション設定
   */
  async loadHeader(selector = 'body', options = {}) {
    try {
      const headerHtml = await this.loadTemplate('header');
      if (!headerHtml) return false;

      const targetElement = DOM.$(selector);
      if (!targetElement) {
        throw new Error(`ヘッダー挿入先が見つかりません: ${selector}`);
      }

      // ヘッダーを先頭に挿入
      targetElement.insertAdjacentHTML('afterbegin', headerHtml);
      
      // ページ固有の設定を適用
      this.configureHeader(options);
      
      this.emit('templateLoader:headerLoaded', options);
      return true;
      
    } catch (error) {
      console.error('ヘッダー読み込みエラー:', error);
      this.emit('templateLoader:headerError', error);
      return false;
    }
  }

  /**
   * フッターを読み込んで挿入
   * @param {string} selector - 挿入先のセレクター
   * @param {Object} options - オプション設定
   */
  async loadFooter(selector = 'body', options = {}) {
    try {
      const footerHtml = await this.loadTemplate('footer');
      if (!footerHtml) return false;

      const targetElement = DOM.$(selector);
      if (!targetElement) {
        throw new Error(`フッター挿入先が見つかりません: ${selector}`);
      }

      // フッターを末尾に挿入
      targetElement.insertAdjacentHTML('beforeend', footerHtml);
      
      // ページ固有の設定を適用
      this.configureFooter(options);
      
      this.emit('templateLoader:footerLoaded', options);
      return true;
      
    } catch (error) {
      console.error('フッター読み込みエラー:', error);
      this.emit('templateLoader:footerError', error);
      return false;
    }
  }

  /**
   * ヘッダーの設定を適用
   * @param {Object} options - 設定オプション
   */
  configureHeader(options = {}) {
    const { currentPage, logoPath, activeSection } = options;

    // ロゴのパスを調整
    if (logoPath) {
      const logoLink = DOM.$('#logo-link');
      if (logoLink) logoLink.href = logoPath;
    }

    // ナビゲーションリンクを調整（indexページ以外の場合）
    if (currentPage !== 'index') {
      this.adjustNavigationLinks();
    }

    // 現在のページに応じてナビゲーションを調整
    if (currentPage) {
      this.updateNavigation(currentPage, activeSection);
    }
  }

  /**
   * ナビゲーションリンクを他ページ用に調整
   */
  adjustNavigationLinks() {
    const navLinks = DOM.$$('.nav-links a[href^="#"]');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('#') && href !== '#hero') {
        link.href = `index.html${href}`;
      }
    });

    // NEWSリンクを適切に設定
    const newsLink = DOM.$('a[href="#news"]');
    if (newsLink) {
      newsLink.href = 'news.html';
      if (window.location.pathname.includes('news')) {
        newsLink.classList.add('active');
      }
    }
  }

  /**
   * フッターの設定を適用
   * @param {Object} options - 設定オプション
   */
  configureFooter(options = {}) {
    const { currentYear, currentPage } = options;

    // 年を更新
    const yearElement = DOM.$('.copyright-year');
    if (yearElement) {
      yearElement.textContent = currentYear || new Date().getFullYear();
    }

    // フッターリンクを調整（indexページ以外の場合）
    if (currentPage !== 'index') {
      this.adjustFooterLinks();
    }
  }

  /**
   * フッターリンクを他ページ用に調整
   */
  adjustFooterLinks() {
    const footerLinks = DOM.$$('footer .footer-links a[href^="#"]');
    footerLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        link.href = `index.html${href}`;
      }
    });
  }

  /**
   * ナビゲーションを更新
   * @param {string} currentPage - 現在のページ
   * @param {string} activeSection - アクティブなセクション
   */
  updateNavigation(currentPage, activeSection) {
    const navLinks = DOM.$$('.nav-link');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      
      // 現在のページまたはセクションをハイライト
      const linkPage = link.getAttribute('data-page');
      const linkSection = link.getAttribute('data-section');
      
      if (linkPage === currentPage || linkSection === activeSection) {
        link.classList.add('active');
      }
    });
  }

  /**
   * ヘッダーとフッターを一括読み込み
   * @param {Object} options - 設定オプション
   */
  async loadAll(options = {}) {
    const { 
      headerSelector = 'body',
      footerSelector = 'body',
      currentPage,
      logoPath = 'index.html',
      activeSection
    } = options;

    try {
      console.log('🔄 TemplateLoader一括読み込み開始', options);
      
      // 管理画面の場合はヘッダーのみ読み込み
      if (currentPage === 'admin' || currentPage === 'admin-login') {
        console.log('📝 管理画面のため、フッダーの読み込みをスキップします');
        const headerResult = await this.loadHeader(headerSelector, { currentPage, logoPath, activeSection });
        
        if (headerResult) {
          console.log('✅ TemplateLoader管理画面ヘッダー読み込み完了');
          return true;
        } else {
          console.warn('⚠️ TemplateLoader管理画面ヘッダー読み込み失敗');
          return false;
        }
      }
      
      // 一般ページの場合はヘッダーとフッター両方を読み込み
      const results = await Promise.allSettled([
        this.loadHeader(headerSelector, { currentPage, logoPath, activeSection }),
        this.loadFooter(footerSelector, { currentPage })
      ]);

      const headerSuccess = results[0].status === 'fulfilled' && results[0].value;
      const footerSuccess = results[1].status === 'fulfilled' && results[1].value;
      
      console.log(`📊 読み込み結果: ヘッダー ${headerSuccess ? '✅' : '❌'}, フッター ${footerSuccess ? '✅' : '❌'}`);

      if (headerSuccess && footerSuccess) {
        // 読み込み完了後の初期化
        await this.initializeComponents();
        this.emit('templateLoader:allLoaded', options);
        console.log('✅ TemplateLoader一括読み込み完了');
        return true;
      } else {
        console.warn('⚠️ TemplateLoader一部失敗');
        this.emit('templateLoader:allPartialError', { headerSuccess, footerSuccess });
        return false;
      }
      
    } catch (error) {
      console.error('❌ TemplateLoader一括読み込みエラー:', error);
      this.emit('templateLoader:allError', error);
      return false;
    }
  }

  /**
   * コンポーネントを初期化
   */
  async initializeComponents() {
    try {
      console.log('🔧 CommonHeader/CommonFooter初期化開始');
      
      // 現在のページを取得（optionsから取得できない場合は推定）
      const currentPage = this.getCurrentPage();
      
      // 動的にCommonHeaderとCommonFooterを読み込み・初期化
      const headerModule = await import('../../../../components/CommonHeader.js');

      if (headerModule.default) {
        const header = new headerModule.default();
        header.init();
        console.log('✅ CommonHeader初期化完了');
      } else {
        console.warn('⚠️ CommonHeader.defaultが見つかりません');
      }

      // 管理画面以外の場合のみCommonFooterを初期化
      if (currentPage !== 'admin' && currentPage !== 'admin-login') {
        const footerModule = await import('../../../../components/CommonFooter.js');
        
        if (footerModule.default) {
          const footer = new footerModule.default();
          footer.init();
          footer.updateCopyright();
          console.log('✅ CommonFooter初期化完了');
        } else {
          console.warn('⚠️ CommonFooter.defaultが見つかりません');
        }
      } else {
        console.log('📝 管理画面のため、CommonFooterの初期化をスキップします');
      }
      
      this.emit('templateLoader:componentsInitialized');
      
    } catch (error) {
      console.error('❌ コンポーネント初期化エラー:', error);
      this.emit('templateLoader:componentError', error);
    }
  }

  /**
   * 現在のページを取得
   * @private
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');
    
    switch (filename) {
      case 'admin':
        return 'admin';
      case 'admin-login':
        return 'admin-login';
      case 'news':
        return 'news';
      case 'news-detail':
        return 'news-detail';
      case 'index':
      case '':
      default:
        return filename.startsWith('admin') ? 'admin' : 'index';
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
    this.emit('templateLoader:cacheCleared');
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      cachedTemplates: Array.from(this.cache.keys()),
      cacheSize: this.cache.size,
      loadingInProgress: Array.from(this.loadingPromises.keys()),
      cacheEnabled: this.options.cacheEnabled
    };
  }

  /**
   * 破棄
   */
  destroy() {
    this.cache.clear();
    this.loadingPromises.clear();
    super.destroy();
  }
}

export default TemplateLoader; 