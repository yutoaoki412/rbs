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
        this.templateBasePath = '../js/shared/templates/';
        
        /** @type {boolean} 初期化フラグ */
        this.isInitialized = false;
    }

    /**
     * サービス初期化
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // 初期化開始ログは必要最小限に
            this.debug('TemplateManager初期化開始');
            
            // HttpServiceのインスタンス取得
            this.httpService = new HttpService();
            await this.httpService.init();
            
            // メタデータテンプレートの事前読み込み
            await this.preloadEssentialTemplates();
            
            this.isInitialized = true;
            this.debug('TemplateManager初期化完了');
            
        } catch (error) {
            this.error('TemplateManager初期化エラー:', error);
            throw error;
        }
    }

    /**
     * 重要テンプレートの事前読み込み
     * @returns {Promise<void>}
     */
    async preloadEssentialTemplates() {
        const essentialTemplates = ['header.html', 'footer.html', 'meta-template.html'];
        
        const loadPromises = essentialTemplates.map(async (templateName) => {
            try {
                await this.loadTemplate(templateName);
                // 事前読み込み成功のログは省略（冗長なため）
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
            // キャッシュ使用のログは省略（冗長なため）
            return this.templateCache.get(templateName);
        }

        try {
            const templateUrl = `${this.templateBasePath}${templateName}`;
            const templateContent = await this.httpService.get(templateUrl, {
                headers: { 'Content-Type': 'text/html' }
            });
            
            // キャッシュに保存
            this.templateCache.set(templateName, templateContent);
            // 最初の読み込み成功ログのみ表示
            if (!this.templateCache.has(`${templateName}_logged`)) {
                this.debug(`テンプレート読み込み: ${templateName}`);
                this.templateCache.set(`${templateName}_logged`, true);
            }
            
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
            this.debug(`ページ設定読み込み: ${pageType}`);
            
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
     * ヘッダーテンプレートの挿入
     * @param {string} containerId - ヘッダーコンテナID
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
            // 成功ログは省略（冗長なため）
            
            // ヘッダー固有の機能初期化
            this.initializeHeaderFeatures(container);
            
        } catch (error) {
            this.error('ヘッダー挿入エラー:', error);
            this.insertFallbackHeader(containerId);
        }
    }

    /**
     * フッターテンプレートの挿入
     * @param {string} containerId - フッターコンテナID
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
            // 成功ログは省略（冗長なため）
            
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
        const finalConfig = { 
            ...this.getDefaultTemplateVariables(),
            ...this.currentPageConfig, 
            ...config 
        };
        
        // ページタイプ別の動的変数を追加
        const pageType = finalConfig.pageType || this.getPageTypeFromUrl();
        const dynamicVars = this.getDynamicVariables(pageType);
        Object.assign(finalConfig, dynamicVars);
        
        // 条件分岐の処理（Handlebars風）
        processedTemplate = this.processConditionals(processedTemplate, finalConfig);
        
        // 通常の変数置換
        processedTemplate = this.replaceVariables(processedTemplate, finalConfig);
        
        // 動的な年や日付の設定
        processedTemplate = this.replaceDateVariables(processedTemplate);
        
        this.debug('テンプレート変数適用完了', { pageType, variableCount: Object.keys(finalConfig).length });
        
        return processedTemplate;
    }

    /**
     * デフォルトテンプレート変数の取得
     * @returns {Object} デフォルト変数
     */
    getDefaultTemplateVariables() {
        return {
            logoLink: '../pages/index.html',
            newsLink: 'news.html',
            currentYear: new Date().getFullYear(),
            siteName: 'RBS陸上教室',
            companyName: '合同会社VITA'
        };
    }

    /**
     * ページタイプ別の動的変数を取得
     * @param {string} pageType - ページタイプ
     * @returns {Object} 動的変数
     */
    getDynamicVariables(pageType) {
        const isHomePage = pageType === 'home' || pageType === 'index';
        const currentPath = window.location.pathname;
        
        return {
            pageType: pageType,
            isHomePage: isHomePage,
            isNotHomePage: !isHomePage,
            isNewsPage: pageType.includes('news'),
            isAdminPage: pageType === 'admin',
            currentPath: currentPath,
            logoLink: isHomePage ? '#hero' : '../pages/index.html',
            newsLink: isHomePage ? 'news.html' : 'news.html'
        };
    }

    /**
     * 条件分岐の処理
     * @param {string} template - テンプレート
     * @param {Object} variables - 変数
     * @returns {string} 処理済みテンプレート
     */
    processConditionals(template, variables) {
        let processed = template;
        
        // {{#condition}} ... {{/condition}} の処理
        const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
        
        processed = processed.replace(conditionalRegex, (match, condition, content) => {
            const conditionValue = variables[condition];
            
            // 条件が真の場合のみ内容を表示
            if (conditionValue) {
                return content;
            }
            return '';
        });
        
        return processed;
    }

    /**
     * 変数の置換
     * @param {string} template - テンプレート
     * @param {Object} variables - 変数
     * @returns {string} 処理済みテンプレート
     */
    replaceVariables(template, variables) {
        let processed = template;
        
        // {{variable}} の形式で変数を置換
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processed = processed.replace(regex, String(value || ''));
        });
        
        return processed;
    }

    /**
     * 日付変数の置換
     * @param {string} template - テンプレート
     * @returns {string} 処理済みテンプレート
     */
    replaceDateVariables(template) {
        const now = new Date();
        const dateVariables = {
            currentYear: now.getFullYear(),
            currentMonth: now.getMonth() + 1,
            currentDate: now.getDate(),
            currentDateTime: now.toISOString()
        };
        
        return this.replaceVariables(template, dateVariables);
    }

    /**
     * URLからページタイプを取得
     * @returns {string} ページタイプ
     */
    getPageTypeFromUrl() {
        const path = window.location.pathname;
        
        if (path.includes('test-layout')) return 'test';
        if (path.includes('news-detail')) return 'news-detail';
        if (path.includes('news')) return 'news';
        if (path.includes('admin')) return 'admin';
        if (path.includes('index') || path === '/') return 'home';
        
        return 'default';
    }

    /**
     * 全テンプレートの一括挿入
     * @param {string} pageType - ページタイプ
     * @param {Object} options - オプション設定
     * @returns {Promise<void>}
     */
    async insertAllTemplates(pageType = 'default', options = {}) {
        try {
            this.debug(`全テンプレート挿入: ${pageType}`);
            
            // ページ設定の読み込み
            this.currentPageConfig = await this.loadPageConfig(pageType);
            
            // 並列でヘッダー・フッターを挿入
            await Promise.all([
                this.insertHeader('header-container', options),
                this.insertFooter('footer-container', options)
            ]);
            
            // ページクラスの適用
            this.applyPageClasses();
            
            this.debug(`テンプレート挿入完了: ${pageType}`);
            
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

// デフォルトエクスポートのみ追加（export classは既に存在するため）
export default TemplateManager; 