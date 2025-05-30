import { BaseService } from '../../base/BaseService.js';
import { HttpService } from '../../services/HttpService.js';

/**
 * 統合テンプレート管理サービス
 * - HTMLテンプレートの読み込み・キャッシュ
 * - ヘッダー・フッターの動的挿入
 * - ページ固有設定の適用
 * - レスポンシブ対応
 */
export class TemplateManager extends BaseService {
    constructor() {
        super('TemplateManager');
        
        /** @type {Map<string, string>} テンプレートキャッシュ */
        this.templateCache = new Map();
        
        /** @type {Map<string, Object>} ページ設定キャッシュ */
        this.pageConfigCache = new Map();
        
        /** @type {HttpService} HTTP通信サービス */
        this.httpService = null;
        
        /** @type {Object} 現在のページ設定 */
        this.currentPageConfig = null;
        
        /** @type {string} テンプレートベースパス */
        this.templateBasePath = '/js/shared/templates/';
        
        /** @type {boolean} 初期化フラグ */
        this.isInitialized = false;
    }

    /**
     * サービス初期化
     * @returns {Promise<void>}
     */
    async init() {
        try {
            this.log('TemplateManager初期化開始');
            
            // HttpServiceのインスタンス取得
            this.httpService = new HttpService();
            await this.httpService.init();
            
            // メタデータテンプレートの事前読み込み
            await this.preloadEssentialTemplates();
            
            this.isInitialized = true;
            this.log('TemplateManager初期化完了');
            
        } catch (error) {
            this.error('TemplateManager初期化エラー:', error);
            throw error;
        }
    }

    /**
     * 必須テンプレートの事前読み込み
     * @returns {Promise<void>}
     */
    async preloadEssentialTemplates() {
        const essentialTemplates = ['header.html', 'footer.html', 'meta-template.html'];
        
        const loadPromises = essentialTemplates.map(async (templateName) => {
            try {
                await this.loadTemplate(templateName);
                this.log(`テンプレート事前読み込み完了: ${templateName}`);
            } catch (error) {
                this.warn(`テンプレート事前読み込み失敗: ${templateName}`, error);
            }
        });
        
        await Promise.allSettled(loadPromises);
    }

    /**
     * テンプレートファイルの読み込み
     * @param {string} templateName - テンプレート名
     * @returns {Promise<string>} テンプレート内容
     */
    async loadTemplate(templateName) {
        // キャッシュ確認
        if (this.templateCache.has(templateName)) {
            this.debug(`テンプレートキャッシュ使用: ${templateName}`);
            return this.templateCache.get(templateName);
        }

        try {
            const templateUrl = `${this.templateBasePath}${templateName}`;
            const templateContent = await this.httpService.get(templateUrl, {
                headers: { 'Content-Type': 'text/html' }
            });
            
            // キャッシュに保存
            this.templateCache.set(templateName, templateContent);
            this.log(`テンプレート読み込み完了: ${templateName}`);
            
            return templateContent;
            
        } catch (error) {
            this.error(`テンプレート読み込みエラー: ${templateName}`, error);
            
            // フォールバック: 空テンプレート
            const fallbackTemplate = this.getFallbackTemplate(templateName);
            this.templateCache.set(templateName, fallbackTemplate);
            
            return fallbackTemplate;
        }
    }

    /**
     * ページタイプ別設定の読み込み
     * @param {string} pageType - ページタイプ ('home', 'news', 'news-detail', 'admin')
     * @returns {Promise<Object>} ページ設定
     */
    async loadPageConfig(pageType) {
        // キャッシュ確認
        if (this.pageConfigCache.has(pageType)) {
            return this.pageConfigCache.get(pageType);
        }

        try {
            // メタテンプレートから設定を抽出
            const metaTemplate = await this.loadTemplate('meta-template.html');
            const config = this.extractPageConfig(metaTemplate, pageType);
            
            // キャッシュに保存
            this.pageConfigCache.set(pageType, config);
            this.log(`ページ設定読み込み完了: ${pageType}`);
            
            return config;
            
        } catch (error) {
            this.error(`ページ設定読み込みエラー: ${pageType}`, error);
            
            // フォールバックデフォルト設定
            const defaultConfig = this.getDefaultPageConfig();
            this.pageConfigCache.set(pageType, defaultConfig);
            
            return defaultConfig;
        }
    }

    /**
     * ヘッダーの動的挿入
     * @param {string} containerId - コンテナ要素のID
     * @param {Object} options - オプション設定
     * @returns {Promise<void>}
     */
    async insertHeader(containerId = 'header-container', options = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`ヘッダーコンテナが見つかりません: ${containerId}`);
            }

            const headerTemplate = await this.loadTemplate('header.html');
            
            // ページ固有設定の適用
            const processedHeader = this.applyPageConfig(headerTemplate, options);
            
            container.innerHTML = processedHeader;
            this.log(`ヘッダー挿入完了: ${containerId}`);
            
            // ヘッダー固有の機能初期化
            this.initializeHeaderFeatures(container);
            
        } catch (error) {
            this.error('ヘッダー挿入エラー:', error);
            this.insertFallbackHeader(containerId);
        }
    }

    /**
     * フッターの動的挿入
     * @param {string} containerId - コンテナ要素のID
     * @param {Object} options - オプション設定
     * @returns {Promise<void>}
     */
    async insertFooter(containerId = 'footer-container', options = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`フッターコンテナが見つかりません: ${containerId}`);
            }

            const footerTemplate = await this.loadTemplate('footer.html');
            
            // ページ固有設定の適用
            const processedFooter = this.applyPageConfig(footerTemplate, options);
            
            container.innerHTML = processedFooter;
            this.log(`フッター挿入完了: ${containerId}`);
            
            // フッター固有の機能初期化
            this.initializeFooterFeatures(container);
            
        } catch (error) {
            this.error('フッター挿入エラー:', error);
            this.insertFallbackFooter(containerId);
        }
    }

    /**
     * ページ設定をテンプレートに適用
     * @param {string} template - テンプレート内容
     * @param {Object} config - ページ設定
     * @returns {string} 処理済みテンプレート
     */
    applyPageConfig(template, config = {}) {
        let processedTemplate = template;
        
        // 現在のページ設定とマージ
        const finalConfig = { ...this.currentPageConfig, ...config };
        
        // テンプレート変数の置換
        Object.entries(finalConfig).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processedTemplate = processedTemplate.replace(regex, value || '');
        });
        
        // 動的な年の設定
        processedTemplate = processedTemplate.replace(/{{current_year}}/g, new Date().getFullYear());
        
        return processedTemplate;
    }

    /**
     * 全テンプレートの一括挿入
     * @param {string} pageType - ページタイプ
     * @param {Object} options - オプション設定
     * @returns {Promise<void>}
     */
    async insertAllTemplates(pageType = 'default', options = {}) {
        try {
            this.log(`全テンプレート挿入開始: ${pageType}`);
            
            // ページ設定の読み込み
            this.currentPageConfig = await this.loadPageConfig(pageType);
            
            // 並列でヘッダー・フッターを挿入
            await Promise.all([
                this.insertHeader('header-container', options),
                this.insertFooter('footer-container', options)
            ]);
            
            // ページクラスの適用
            this.applyPageClasses();
            
            this.log(`全テンプレート挿入完了: ${pageType}`);
            
        } catch (error) {
            this.error('全テンプレート挿入エラー:', error);
            // フォールバック処理
            this.insertFallbackTemplates();
        }
    }

    /**
     * メタテンプレートからページ設定を抽出
     * @param {string} metaTemplate - メタテンプレート内容
     * @param {string} pageType - ページタイプ
     * @returns {Object} ページ設定
     */
    extractPageConfig(metaTemplate, pageType) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(metaTemplate, 'text/html');
        
        const templateElement = doc.getElementById(`meta-${pageType}`) || doc.getElementById('meta-default');
        
        if (!templateElement) {
            return this.getDefaultPageConfig();
        }
        
        const config = {};
        const metaTags = templateElement.querySelectorAll('meta');
        
        metaTags.forEach(meta => {
            if (meta.name) {
                config[meta.name.replace('-', '_')] = meta.content;
            } else if (meta.hasAttribute('property')) {
                const property = meta.getAttribute('property');
                if (property.startsWith('og:')) {
                    config[property.replace('og:', 'og_')] = meta.content;
                }
            }
        });
        
        return config;
    }

    /**
     * ヘッダー固有機能の初期化
     * @param {HTMLElement} container - ヘッダーコンテナ
     */
    initializeHeaderFeatures(container) {
        // スムーススクロール
        const navLinks = container.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', this.handleSmoothScroll.bind(this));
        });
        
        // モバイルメニュートグル
        const mobileToggle = container.querySelector('.mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }
    }

    /**
     * フッター固有機能の初期化
     * @param {HTMLElement} container - フッターコンテナ
     */
    initializeFooterFeatures(container) {
        // ページトップボタン
        const pageTopBtn = container.querySelector('.page-top-btn');
        if (pageTopBtn) {
            pageTopBtn.addEventListener('click', this.scrollToTop.bind(this));
        }
    }

    /**
     * ページクラスの適用
     */
    applyPageClasses() {
        if (this.currentPageConfig?.body_class) {
            document.body.className = this.currentPageConfig.body_class;
        }
        
        const mainContent = document.getElementById('main-content');
        if (mainContent && this.currentPageConfig?.main_class) {
            mainContent.className = this.currentPageConfig.main_class;
        }
    }

    /**
     * スムーススクロール処理
     * @param {Event} event - クリックイベント
     */
    handleSmoothScroll(event) {
        event.preventDefault();
        const href = event.currentTarget.getAttribute('href');
        const targetElement = document.querySelector(href);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * モバイルメニュートグル
     */
    toggleMobileMenu() {
        const nav = document.querySelector('.header-nav');
        if (nav) {
            nav.classList.toggle('mobile-open');
        }
    }

    /**
     * ページトップへのスクロール
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * デフォルトページ設定の取得
     * @returns {Object} デフォルト設定
     */
    getDefaultPageConfig() {
        return {
            page_title: 'RBS陸上教室',
            page_description: 'RBS陸上教室 - すべての走ることを愛する子どもたちのための陸上教室',
            page_keywords: '陸上,教室,RBS,スポーツ,子ども,ランニング',
            page_url: '/',
            body_class: 'page-default',
            main_class: 'default-content',
            og_image: '/images/rbs-default-og.jpg'
        };
    }

    /**
     * フォールバックテンプレートの取得
     * @param {string} templateName - テンプレート名
     * @returns {string} フォールバックテンプレート
     */
    getFallbackTemplate(templateName) {
        if (templateName === 'header.html') {
            return `<header class="site-header fallback">
                <div class="container">
                    <h1><a href="/">RBS陸上教室</a></h1>
                    <nav><a href="#main">メインコンテンツ</a></nav>
                </div>
            </header>`;
        }
        
        if (templateName === 'footer.html') {
            return `<footer class="site-footer fallback">
                <div class="container">
                    <p>&copy; ${new Date().getFullYear()} RBS陸上教室</p>
                </div>
            </footer>`;
        }
        
        return '<!-- テンプレート読み込みエラー -->';
    }

    /**
     * フォールバックヘッダーの挿入
     * @param {string} containerId - コンテナID
     */
    insertFallbackHeader(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = this.getFallbackTemplate('header.html');
            this.warn(`フォールバックヘッダーを挿入: ${containerId}`);
        }
    }

    /**
     * フォールバックフッターの挿入
     * @param {string} containerId - コンテナID
     */
    insertFallbackFooter(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = this.getFallbackTemplate('footer.html');
            this.warn(`フォールバックフッターを挿入: ${containerId}`);
        }
    }

    /**
     * フォールバックテンプレートの一括挿入
     */
    insertFallbackTemplates() {
        this.insertFallbackHeader('header-container');
        this.insertFallbackFooter('footer-container');
        this.warn('フォールバックテンプレートを適用');
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.templateCache.clear();
        this.pageConfigCache.clear();
        this.currentPageConfig = null;
        this.log('テンプレートキャッシュをクリア');
    }

    /**
     * サービス破棄
     */
    destroy() {
        this.clearCache();
        
        if (this.httpService) {
            this.httpService.destroy();
            this.httpService = null;
        }
        
        this.isInitialized = false;
        
        super.destroy();
    }
} 