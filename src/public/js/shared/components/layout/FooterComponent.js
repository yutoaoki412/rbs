import { BaseComponent } from '../../base/BaseComponent.js';
import { EventBus } from '../../services/EventBus.js';

/**
 * フッター専用コンポーネント
 * - 著作権年自動更新
 * - ページトップへのスクロール
 * - リンク動的調整
 * - フッター固有機能
 */
class FooterComponent extends BaseComponent {
    constructor(container) {
        super(container, 'FooterComponent');
        
        // BaseComponentのelementをcontainerとしても参照できるよう設定
        this.container = this.element;
        
        // デバッグモードを有効にする（開発環境）
        this.debugMode = window.location.hostname === 'localhost' || window.DEBUG;
        
        /** @type {HTMLElement} ページトップボタン */
        this.pageTopBtn = null;
        
        /** @type {HTMLElement} 著作権表示要素 */
        this.copyrightElement = null;
        
        /** @type {NodeList} フッターリンク */
        this.footerLinks = null;
        
        /** @type {HTMLElement} SNSリンクコンテナ */
        this.snsContainer = null;
        
        /** @type {boolean} ページトップボタン表示状態 */
        this.isPageTopVisible = false;
        
        /** @type {number} ページトップボタン表示スクロール位置 */
        this.pageTopThreshold = 300;
        
        /** @type {boolean} スクロール監視フラグ */
        this.isScrollWatching = false;
    }

    /**
     * コンポーネント初期化
     * @returns {Promise<void>}
     */
    async init() {
        try {
            await super.init();
            
            this.log('FooterComponent初期化開始');
            
            // DOM要素の取得
            this.findElements();
            
            // 初期設定
            this.setupInitialState();
            
            // イベントリスナーの設定
            this.setupEventListeners();
            
            // スクロール監視の開始
            this.startScrollWatching();
            
            this.log('FooterComponent初期化完了');
            
        } catch (error) {
            this.error('FooterComponent初期化エラー:', error);
            throw error;
        }
    }

    /**
     * DOM要素の検索
     */
    findElements() {
        if (!this.container) {
            this.warn('コンテナが存在しません');
            return;
        }
        
        // 安全な要素検索
        this.pageTopBtn = this.safeQuerySelector('.page-top-btn, .back-to-top');
        this.copyrightElement = this.safeQuerySelector('.copyright, .copyright-text');
        this.footerLinks = this.safeQuerySelectorAll('.footer-nav a, .footer-link');
        this.snsContainer = this.safeQuerySelector('.sns-links, .social-links');
        
        // 要素存在の確認ログ
        this.debug(`DOM要素検索完了 - pageTop: ${!!this.pageTopBtn}, copyright: ${!!this.copyrightElement}, links: ${this.footerLinks ? this.footerLinks.length : 0}, sns: ${!!this.snsContainer}`);
    }

    /**
     * 初期状態の設定
     */
    setupInitialState() {
        // 著作権年の自動更新
        this.updateCopyrightYear();
        
        // ページトップボタンの初期状態
        if (this.pageTopBtn) {
            this.pageTopBtn.style.opacity = '0';
            this.pageTopBtn.style.visibility = 'hidden';
            this.pageTopBtn.style.transform = 'translateY(20px)';
        }
        
        // リンクの動的調整
        this.adjustFooterLinks();
        
        this.log('初期状態設定完了');
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        try {
            // ページトップボタン
            if (this.pageTopBtn) {
                this.addEventListenerToChild(this.pageTopBtn, 'click', this.handlePageTopClick.bind(this));
            }
            
            // フッターリンク（存在チェック付き安全なforEach使用）
            if (this.footerLinks && this.footerLinks.length > 0) {
                this.safeForEach(this.footerLinks, (link) => {
                    this.addEventListenerToChild(link, 'click', this.handleFooterLinkClick.bind(this));
                }, '(フッターリンク)');
            } else {
                this.debug('フッターリンクが見つからないため、イベントリスナーをスキップします');
            }
            
            // SNSリンク
            if (this.snsContainer) {
                const snsLinks = this.safeQuerySelectorAll('a', this.snsContainer);
                if (snsLinks && snsLinks.length > 0) {
                    this.safeForEach(snsLinks, (link) => {
                        this.addEventListenerToChild(link, 'click', this.handleSnsLinkClick.bind(this));
                    }, '(SNSリンク)');
                }
            }
            
            // ウィンドウリサイズ
            this.addEventListener(window, 'resize', this.handleWindowResize.bind(this));
            
            this.log('イベントリスナー設定完了');
            
        } catch (error) {
            this.error('イベントリスナー設定エラー:', error);
        }
    }

    /**
     * スクロール監視の開始
     */
    startScrollWatching() {
        if (this.isScrollWatching) return;
        
        this.addEventListener(window, 'scroll', this.throttle(this.handleScroll.bind(this), 16));
        this.isScrollWatching = true;
        
        // 初期状態を設定
        this.handleScroll();
        
        this.log('スクロール監視開始');
    }

    /**
     * 著作権年の自動更新
     */
    updateCopyrightYear() {
        if (!this.copyrightElement) return;
        
        const currentYear = new Date().getFullYear();
        const copyrightText = this.copyrightElement.textContent || this.copyrightElement.innerText;
        
        // 年の部分を現在の年に更新
        const updatedText = copyrightText.replace(/\d{4}/, currentYear.toString());
        
        this.copyrightElement.textContent = updatedText;
        
        this.debug(`著作権年更新: ${currentYear}`);
    }

    /**
     * フッターリンクの動的調整
     */
    adjustFooterLinks() {
        try {
            if (!this.footerLinks || this.footerLinks.length === 0) {
                this.debug('フッターリンクが存在しません');
                return;
            }
            
            this.footerLinks.forEach(link => {
                const href = link.getAttribute('href');
                
                // 外部リンクに target="_blank" を追加
                if (href && (href.startsWith('http') || href.startsWith('//'))) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                    
                    // 外部リンクアイコンの追加
                    if (!link.querySelector('.external-icon')) {
                        const icon = document.createElement('span');
                        icon.className = 'external-icon';
                        icon.setAttribute('aria-hidden', 'true');
                        icon.textContent = '↗';
                        link.appendChild(icon);
                    }
                }
                
                // 電話番号リンクの処理
                if (href && href.startsWith('tel:')) {
                    link.setAttribute('aria-label', `電話をかける: ${href.replace('tel:', '')}`);
                }
                
                // メールリンクの処理
                if (href && href.startsWith('mailto:')) {
                    link.setAttribute('aria-label', `メールを送る: ${href.replace('mailto:', '')}`);
                }
            });
            
            this.debug('フッターリンク調整完了');
        } catch (error) {
            this.error('フッターリンク調整エラー:', error);
        }
    }

    /**
     * ページトップボタンクリック処理
     * @param {Event} event - クリックイベント
     */
    handlePageTopClick(event) {
        event.preventDefault();
        
        this.scrollToTop();
        
        // イベント発火
        EventBus.emit('footer:page-top:click', {
            scrollY: window.pageYOffset || document.documentElement.scrollTop
        });
    }

    /**
     * フッターリンククリック処理
     * @param {Event} event - クリックイベント
     */
    handleFooterLinkClick(event) {
        const link = event.currentTarget;
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        
        // イベント発火
        EventBus.emit('footer:link:click', {
            href: href,
            text: text,
            isExternal: href && (href.startsWith('http') || href.startsWith('//'))
        });
        
        this.log(`フッターリンククリック: ${text} (${href})`);
    }

    /**
     * SNSリンククリック処理
     * @param {Event} event - クリックイベント
     */
    handleSnsLinkClick(event) {
        const link = event.currentTarget;
        const href = link.getAttribute('href');
        const platform = this.detectSnsPlatform(href);
        
        // イベント発火
        EventBus.emit('footer:sns:click', {
            platform: platform,
            href: href
        });
        
        this.log(`SNSリンククリック: ${platform} (${href})`);
    }

    /**
     * ウィンドウリサイズ処理
     */
    handleWindowResize() {
        // レスポンシブ対応でフッターレイアウトを調整
        this.adjustResponsiveLayout();
    }

    /**
     * スクロール処理
     */
    handleScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // ページトップボタンの表示/非表示制御
        this.updatePageTopButtonVisibility(scrollY);
        
        // イベント発火
        EventBus.emit('footer:scroll', {
            scrollY: scrollY,
            isPageTopVisible: this.isPageTopVisible
        });
    }

    /**
     * ページトップボタンの表示制御
     * @param {number} scrollY - スクロール位置
     */
    updatePageTopButtonVisibility(scrollY) {
        if (!this.pageTopBtn) return;
        
        const shouldShow = scrollY > this.pageTopThreshold;
        
        if (shouldShow !== this.isPageTopVisible) {
            this.isPageTopVisible = shouldShow;
            
            if (shouldShow) {
                this.showPageTopButton();
            } else {
                this.hidePageTopButton();
            }
        }
    }

    /**
     * ページトップボタンの表示
     */
    showPageTopButton() {
        if (!this.pageTopBtn) return;
        
        this.pageTopBtn.style.opacity = '1';
        this.pageTopBtn.style.visibility = 'visible';
        this.pageTopBtn.style.transform = 'translateY(0)';
        
        this.debug('ページトップボタン表示');
    }

    /**
     * ページトップボタンの非表示
     */
    hidePageTopButton() {
        if (!this.pageTopBtn) return;
        
        this.pageTopBtn.style.opacity = '0';
        this.pageTopBtn.style.visibility = 'hidden';
        this.pageTopBtn.style.transform = 'translateY(20px)';
        
        this.debug('ページトップボタン非表示');
    }

    /**
     * ページトップへのスムーススクロール
     */
    scrollToTop() {
        const startPosition = window.pageYOffset || document.documentElement.scrollTop;
        const startTime = performance.now();
        const duration = 800; // スクロール時間（ミリ秒）
        
        const easeInOutQuad = (t) => {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        };
        
        const animateScroll = (currentTime) => {
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const easedProgress = easeInOutQuad(progress);
            
            const currentPosition = startPosition * (1 - easedProgress);
            window.scrollTo(0, currentPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                // スクロール完了時の処理
                EventBus.emit('footer:scroll-to-top:complete');
                this.log('ページトップスクロール完了');
            }
        };
        
        requestAnimationFrame(animateScroll);
        
        this.log('ページトップスクロール開始');
    }

    /**
     * SNSプラットフォームの検出
     * @param {string} href - リンクURL
     * @returns {string} プラットフォーム名
     */
    detectSnsPlatform(href) {
        if (!href) return 'unknown';
        
        const platforms = {
            'twitter.com': 'twitter',
            'x.com': 'twitter',
            'facebook.com': 'facebook',
            'instagram.com': 'instagram',
            'youtube.com': 'youtube',
            'youtu.be': 'youtube',
            'linkedin.com': 'linkedin',
            'tiktok.com': 'tiktok',
            'line.me': 'line'
        };
        
        for (const [domain, platform] of Object.entries(platforms)) {
            if (href.includes(domain)) {
                return platform;
            }
        }
        
        return 'other';
    }

    /**
     * レスポンシブレイアウトの調整
     */
    adjustResponsiveLayout() {
        const windowWidth = window.innerWidth;
        
        // モバイル表示の調整
        if (windowWidth < 768) {
            this.container.classList.add('footer-mobile');
            this.container.classList.remove('footer-desktop');
        } else {
            this.container.classList.add('footer-desktop');
            this.container.classList.remove('footer-mobile');
        }
        
        this.debug(`レスポンシブレイアウト調整: ${windowWidth}px`);
    }

    /**
     * スロットリング関数
     * @param {Function} func - 実行する関数
     * @param {number} limit - 実行間隔（ミリ秒）
     * @returns {Function} スロットリングされた関数
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * フッターの状態リセット
     */
    reset() {
        // ページトップボタンを非表示
        if (this.pageTopBtn) {
            this.hidePageTopButton();
        }
        
        // 著作権年を再更新
        this.updateCopyrightYear();
        
        this.log('フッター状態リセット完了');
    }

    /**
     * パフォーマンス情報の取得
     * @returns {Object} パフォーマンス情報
     */
    getPerformanceInfo() {
        return {
            ...super.getPerformanceInfo(),
            footerLinksCount: this.footerLinks ? this.footerLinks.length : 0,
            isPageTopVisible: this.isPageTopVisible,
            isScrollWatching: this.isScrollWatching,
            hasCopyrightElement: !!this.copyrightElement,
            hasSnsContainer: !!this.snsContainer
        };
    }

    /**
     * コンポーネント破棄
     */
    destroy() {
        // ページトップボタンを非表示
        if (this.pageTopBtn) {
            this.hidePageTopButton();
        }
        
        // プロパティのクリア
        this.pageTopBtn = null;
        this.copyrightElement = null;
        this.footerLinks = null;
        this.snsContainer = null;
        this.isScrollWatching = false;
        this.isPageTopVisible = false;
        
        super.destroy();
    }
}

// デフォルトエクスポートのみ追加（export classは既に存在するため）
export default FooterComponent; 