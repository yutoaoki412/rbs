/**
 * Layout コンポーネント統合エクスポート
 * 
 * このファイルはlayout関連の全ての機能を統合してエクスポートします：
 * - TemplateManager: テンプレート管理サービス
 * - HeaderComponent: ヘッダー専用コンポーネント  
 * - FooterComponent: フッター専用コンポーネント
 * 
 * @module LayoutComponents
 */

// コアサービスのインポート
import { default as TemplateManager } from './TemplateManager.js';

// 専用コンポーネントのインポート
import { default as HeaderComponent } from './HeaderComponent.js';
import { default as FooterComponent } from './FooterComponent.js';

// 名前付きエクスポート（後方互換性）
export { TemplateManager };
export { HeaderComponent };
export { FooterComponent };

/**
 * Layout機能の統合初期化ヘルパー
 * @class LayoutInitializer
 */
export class LayoutInitializer {
    constructor() {
        /** @type {TemplateManager} テンプレート管理サービス */
        this.templateManager = null;
        
        /** @type {HeaderComponent} ヘッダーコンポーネント */
        this.headerComponent = null;
        
        /** @type {FooterComponent} フッターコンポーネント */
        this.footerComponent = null;
        
        /** @type {boolean} 初期化済みフラグ */
        this.isInitialized = false;
    }

    /**
     * オプションの検証
     * @param {Object} options - 初期化オプション
     * @returns {Object} 検証済みオプション
     */
    validateOptions(options = {}) {
        const defaultOptions = {
            pageType: 'default',
            headerContainerId: 'header-container',
            footerContainerId: 'footer-container',
            templateOptions: {}
        };

        const validatedOptions = { ...defaultOptions, ...options };

        // 型チェック
        if (typeof validatedOptions.pageType !== 'string') {
            console.warn('[LayoutInitializer] pageTypeは文字列である必要があります。デフォルト値を使用します。');
            validatedOptions.pageType = defaultOptions.pageType;
        }

        if (typeof validatedOptions.headerContainerId !== 'string') {
            console.warn('[LayoutInitializer] headerContainerIdは文字列である必要があります。デフォルト値を使用します。');
            validatedOptions.headerContainerId = defaultOptions.headerContainerId;
        }

        if (typeof validatedOptions.footerContainerId !== 'string') {
            console.warn('[LayoutInitializer] footerContainerIdは文字列である必要があります。デフォルト値を使用します。');
            validatedOptions.footerContainerId = defaultOptions.footerContainerId;
        }

        if (typeof validatedOptions.templateOptions !== 'object' || validatedOptions.templateOptions === null) {
            console.warn('[LayoutInitializer] templateOptionsはオブジェクトである必要があります。デフォルト値を使用します。');
            validatedOptions.templateOptions = defaultOptions.templateOptions;
        }

        return validatedOptions;
    }

    /**
     * Layout機能の初期化
     * @param {Object} options - 初期化オプション
     * @returns {Promise<Object>} 初期化結果
     */
    async initializeLayout(options = {}) {
        try {
            const validatedOptions = this.validateOptions(options);

            console.log(`[LayoutInitializer] Layout初期化開始: ${validatedOptions.pageType}`);

            // 1. TemplateManagerの初期化
            this.templateManager = new TemplateManager();
            await this.templateManager.init();

            // 2. テンプレートの一括挿入
            await this.templateManager.insertAllTemplates(validatedOptions.pageType, validatedOptions.templateOptions);

            // 3. ヘッダーコンポーネントの初期化
            try {
                const headerContainer = document.getElementById(validatedOptions.headerContainerId);
                if (headerContainer) {
                    this.headerComponent = new HeaderComponent(headerContainer);
                    await this.headerComponent.init();
                    console.log('[LayoutInitializer] ヘッダーコンポーネント初期化完了');
                } else {
                    console.warn(`[LayoutInitializer] ヘッダーコンテナが見つかりません: ${validatedOptions.headerContainerId}`);
                }
            } catch (headerError) {
                console.error('[LayoutInitializer] ヘッダーコンポーネント初期化エラー:', headerError);
                this.headerComponent = null;
            }

            // 4. フッターコンポーネントの初期化
            try {
                const footerContainer = document.getElementById(validatedOptions.footerContainerId);
                if (footerContainer) {
                    this.footerComponent = new FooterComponent(footerContainer);
                    await this.footerComponent.init();
                    console.log('[LayoutInitializer] フッターコンポーネント初期化完了');
                } else {
                    console.warn(`[LayoutInitializer] フッターコンテナが見つかりません: ${validatedOptions.footerContainerId}`);
                }
            } catch (footerError) {
                console.error('[LayoutInitializer] フッターコンポーネント初期化エラー:', footerError);
                this.footerComponent = null;
            }

            this.isInitialized = true;
            console.log(`[LayoutInitializer] Layout初期化完了: ${validatedOptions.pageType}`);

            return {
                success: true,
                pageType: validatedOptions.pageType,
                templateManager: this.templateManager,
                headerComponent: this.headerComponent,
                footerComponent: this.footerComponent
            };

        } catch (error) {
            console.error('[LayoutInitializer] Layout初期化エラー:', error);
            
            // フォールバック初期化
            await this.initializeFallback(options);
            
            return {
                success: false,
                error: error.message,
                fallbackInitialized: true
            };
        }
    }

    /**
     * フォールバック初期化
     * @param {Object} options - 初期化オプション
     */
    async initializeFallback(options = {}) {
        try {
            console.log('[LayoutInitializer] フォールバック初期化開始');
            
            // 最低限のテンプレート挿入
            if (this.templateManager) {
                await this.templateManager.insertFallbackTemplates();
            }
            
            console.log('[LayoutInitializer] フォールバック初期化完了');
            
        } catch (error) {
            console.error('[LayoutInitializer] フォールバック初期化エラー:', error);
        }
    }

    /**
     * ページタイプの自動検出
     * @returns {string} 検出されたページタイプ
     */
    detectPageType() {
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        
        // URLパスベースの判定
        if (path.includes('/admin')) {
            return 'admin';
        }
        
        if (path.includes('/news-detail') || path.includes('/news/detail')) {
            return 'news-detail';
        }
        
        if (path.includes('/news')) {
            return 'news';
        }
        
        if (path === '/' || path.includes('/index')) {
            return 'home';
        }
        
        // クエリパラメータベースの判定
        if (searchParams.has('page')) {
            const page = searchParams.get('page');
            if (['news', 'admin', 'news-detail'].includes(page)) {
                return page;
            }
        }
        
        // HTMLファイル名ベースの判定
        const fileName = path.split('/').pop();
        if (fileName) {
            if (fileName.startsWith('news-detail')) return 'news-detail';
            if (fileName.startsWith('news')) return 'news';
            if (fileName.startsWith('admin')) return 'admin';
            if (fileName.startsWith('index')) return 'home';
        }
        
        return 'default';
    }

    /**
     * レスポンシブ対応の確認・設定
     */
    setupResponsive() {
        // ビューポートメタタグの確認
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0';
            document.head.appendChild(meta);
            console.log('[LayoutInitializer] ビューポートメタタグを追加');
        }
        
        // レスポンシブクラスの追加
        document.documentElement.classList.add('responsive-layout');
    }

    /**
     * アクセシビリティ対応の設定
     */
    setupAccessibility() {
        // フォーカス管理の改善
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
        
        // スキップリンクの設定
        const skipLink = document.querySelector('.skip-link, .skip-to-main');
        if (!skipLink) {
            const skip = document.createElement('a');
            skip.href = '#main-content';
            skip.className = 'skip-link';
            skip.textContent = 'メインコンテンツにスキップ';
            skip.style.cssText = `
                position: absolute;
                top: -40px;
                left: 6px;
                background: #000;
                color: #fff;
                padding: 8px;
                text-decoration: none;
                z-index: 10000;
                transition: top 0.3s;
            `;
            skip.addEventListener('focus', () => {
                skip.style.top = '6px';
            });
            skip.addEventListener('blur', () => {
                skip.style.top = '-40px';
            });
            
            document.body.insertBefore(skip, document.body.firstChild);
            console.log('[LayoutInitializer] スキップリンクを追加');
        }
    }

    /**
     * パフォーマンス情報の取得
     * @returns {Object} パフォーマンス情報
     */
    getPerformanceInfo() {
        const info = {
            isInitialized: this.isInitialized,
            templateManager: this.templateManager?.getPerformanceInfo() || null,
            headerComponent: this.headerComponent?.getPerformanceInfo() || null,
            footerComponent: this.footerComponent?.getPerformanceInfo() || null,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : null
        };
        
        return info;
    }

    /**
     * Layout機能のリセット
     */
    reset() {
        if (this.headerComponent) {
            this.headerComponent.reset();
        }
        
        if (this.footerComponent) {
            this.footerComponent.reset();
        }
        
        if (this.templateManager) {
            this.templateManager.clearCache();
        }
        
        console.log('[LayoutInitializer] Layout状態リセット完了');
    }

    /**
     * Layout機能の破棄
     */
    destroy() {
        if (this.headerComponent) {
            this.headerComponent.destroy();
            this.headerComponent = null;
        }
        
        if (this.footerComponent) {
            this.footerComponent.destroy();
            this.footerComponent = null;
        }
        
        if (this.templateManager) {
            this.templateManager.destroy();
            this.templateManager = null;
        }
        
        this.isInitialized = false;
        
        console.log('[LayoutInitializer] Layout機能破棄完了');
    }

    /**
     * Layout機能の一括初期化（メインメソッド）
     * @param {Object} options - 初期化オプション
     * @returns {Promise<Object>} 初期化結果
     */
    async initialize(options = {}) {
        return await this.initializeLayout(options);
    }
}

/**
 * 簡単初期化用のヘルパー関数
 * @param {Object} options - 初期化オプション
 * @returns {Promise<LayoutInitializer>} 初期化されたLayoutInitializer
 */
export async function initializeLayout(options = {}) {
    const initializer = new LayoutInitializer();
    
    // ページタイプの自動検出
    if (!options.pageType) {
        options.pageType = initializer.detectPageType();
    }
    
    // レスポンシブ・アクセシビリティ対応
    initializer.setupResponsive();
    initializer.setupAccessibility();
    
    // Layout初期化
    const result = await initializer.initializeLayout(options);
    
    return {
        initializer,
        result
    };
}

/**
 * デフォルトエクスポート（後方互換性）
 */
export default {
    TemplateManager,
    HeaderComponent,
    FooterComponent,
    LayoutInitializer,
    initializeLayout
}; 