/**
 * シンプル高速テンプレートマネージャー
 * GitHub Pages / Cloudflare最適化版
 * @version 3.0.0
 */

import { BaseService } from '../../../lib/base/BaseService.js';
import { TEMPLATES, PAGE_CONFIGS, renderTemplate, detectPageType } from './templates.js';

export class TemplateManager extends BaseService {
    constructor() {
        super('TemplateManager');
        
        /** @type {boolean} 初期化フラグ */
        this.isInitialized = false;
        
        /** @type {string} 現在のページタイプ */
        this.currentPageType = detectPageType();
    }

    /**
     * サービス初期化
     * @returns {Promise<void>}
     */
    async doInit() {
        this.log('TemplateManager初期化完了');
    }

    /**
     * ヘッダー挿入
     * @param {string} containerId - コンテナID
     * @param {Object} options - オプション
     */
    insertHeader(containerId = 'header-container', options = {}) {
            const container = document.getElementById(containerId);
        if (!container) return;

        const config = this.getPageConfig(options);
        const headerHtml = renderTemplate(TEMPLATES.header, config);
            
        container.innerHTML = headerHtml;
            this.initializeHeaderFeatures(container);
    }

    /**
     * フッター挿入
     * @param {string} containerId - コンテナID
     * @param {Object} options - オプション
     */
    insertFooter(containerId = 'footer-container', options = {}) {
            const container = document.getElementById(containerId);
        if (!container) return;

        const config = this.getPageConfig(options);
        const footerHtml = renderTemplate(TEMPLATES.footer, config);
        
        container.innerHTML = footerHtml;
        this.initializeFooterFeatures(container);
    }

    /**
     * 全テンプレート一括挿入
     * @param {string} pageType - ページタイプ
     * @param {Object} options - オプション
     */
    insertAllTemplates(pageType = null, options = {}) {
        const actualPageType = pageType || this.currentPageType;
        const config = { ...PAGE_CONFIGS[actualPageType], ...options };
        
        // ヘッダー・フッター挿入
        this.insertHeader('header-container', config);
        this.insertFooter('footer-container', config);
            
        // ページクラス適用
        this.applyPageClasses(config);
        
        this.log(`テンプレート挿入完了: ${actualPageType}`);
    }

    /**
     * ページ設定取得
     * @param {Object} options - 追加オプション
     * @returns {Object} ページ設定
     */
    getPageConfig(options = {}) {
        const baseConfig = PAGE_CONFIGS[this.currentPageType] || PAGE_CONFIGS.home;
        return { ...baseConfig, ...options };
    }

    /**
     * ページクラス適用
     * @param {Object} config - ページ設定
     */
    applyPageClasses(config) {
        if (config.bodyClass) {
            document.body.className = config.bodyClass;
        }
        
        const mainElement = document.getElementById('main-content');
        if (mainElement && config.mainClass) {
            mainElement.className = config.mainClass;
        }
    }

    /**
     * ヘッダー機能初期化
     * @param {HTMLElement} container - ヘッダーコンテナ
     */
    initializeHeaderFeatures(container) {
        // モバイルメニュートグル
        const mobileMenuBtn = container.querySelector('.mobile-menu-btn');
        const navLinks = container.querySelector('.nav-links');
        
        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
                navLinks.classList.toggle('active');
            });
        }
        
        // スムーススクロール（ホームページのみ）
        if (this.currentPageType === 'home') {
            const sectionLinks = container.querySelectorAll('a[data-section]');
            sectionLinks.forEach(link => {
                link.addEventListener('click', this.handleSmoothScroll.bind(this));
            });
        }
    }

    /**
     * フッター機能初期化
     * @param {HTMLElement} container - フッターコンテナ
     */
    initializeFooterFeatures(container) {
        // スムーススクロール（ホームページのみ）
        if (this.currentPageType === 'home') {
            const sectionLinks = container.querySelectorAll('a[data-section]');
            sectionLinks.forEach(link => {
                link.addEventListener('click', this.handleSmoothScroll.bind(this));
            });
        }
    }

    /**
     * スムーススクロール処理
     * @param {Event} event - クリックイベント
     */
    handleSmoothScroll(event) {
        const href = event.target.getAttribute('href');
        if (href && href.startsWith('#')) {
        event.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    /**
     * ページタイプ設定
     * @param {string} pageType - ページタイプ
     */
    setPageType(pageType) {
        this.currentPageType = pageType;
    }

    /**
     * サービス破棄
     * @returns {Promise<void>}
     */
    async doDestroy() {
        this.isInitialized = false;
        this.log('TemplateManager破棄完了');
    }
        }
        
// シングルトンインスタンス
let templateManagerInstance = null;

    /**
 * TemplateManagerインスタンス取得
 * @returns {TemplateManager}
     */
export function getTemplateManager() {
    if (!templateManagerInstance) {
        templateManagerInstance = new TemplateManager();
    }
    return templateManagerInstance;
    }

    /**
 * レイアウト初期化
 * @param {string} pageType - ページタイプ
 * @param {Object} options - オプション
 * @returns {Promise<TemplateManager>}
 */
export async function initializeLayout(pageType = null, options = {}) {
    const manager = getTemplateManager();
    
    if (!manager.isInitialized) {
        await manager.init();
        }
    
    manager.insertAllTemplates(pageType, options);
    return manager;
    }

    /**
 * レイアウト初期化クラス（後方互換性）
 */
export class LayoutInitializer {
    static async initialize(pageType = null, options = {}) {
        return initializeLayout(pageType, options);
    }
}

// デフォルトエクスポート
export default TemplateManager; 