import { BaseComponent } from '../../base/BaseComponent.js';
import { EventBus } from '../../services/EventBus.js';

/**
 * ヘッダー専用コンポーネント
 * - ナビゲーション管理
 * - スクロール時の動作制御
 * - モバイルメニュー制御
 * - アクティブセクション管理
 */
export class HeaderComponent extends BaseComponent {
    constructor(container) {
        super('HeaderComponent', container);
        
        /** @type {HTMLElement} ナビゲーション要素 */
        this.nav = null;
        
        /** @type {HTMLElement} モバイルメニュートグル */
        this.mobileToggle = null;
        
        /** @type {NodeList} ナビゲーションリンク */
        this.navLinks = null;
        
        /** @type {number} スクロール閾値 */
        this.scrollThreshold = 100;
        
        /** @type {boolean} モバイルメニュー状態 */
        this.isMobileMenuOpen = false;
        
        /** @type {boolean} スクロール監視フラグ */
        this.isScrollWatching = false;
        
        /** @type {string} 現在のアクティブセクション */
        this.currentActiveSection = '';
        
        /** @type {IntersectionObserver} セクション監視オブザーバー */
        this.sectionObserver = null;
    }

    /**
     * コンポーネント初期化
     * @returns {Promise<void>}
     */
    async init() {
        try {
            await super.init();
            
            this.log('HeaderComponent初期化開始');
            
            // DOM要素の取得
            this.findElements();
            
            // イベントリスナーの設定
            this.setupEventListeners();
            
            // スクロール監視の開始
            this.startScrollWatching();
            
            // セクション監視の開始
            this.startSectionWatching();
            
            this.log('HeaderComponent初期化完了');
            
        } catch (error) {
            this.error('HeaderComponent初期化エラー:', error);
            throw error;
        }
    }

    /**
     * DOM要素の検索
     */
    findElements() {
        if (!this.container) return;
        
        this.nav = this.container.querySelector('.header-nav');
        this.mobileToggle = this.container.querySelector('.mobile-menu-toggle');
        this.navLinks = this.container.querySelectorAll('.nav-link');
        
        this.debug(`DOM要素検索完了 - nav: ${!!this.nav}, toggle: ${!!this.mobileToggle}, links: ${this.navLinks.length}`);
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // モバイルメニュートグル
        if (this.mobileToggle) {
            this.addEventListenerToChild(this.mobileToggle, 'click', this.handleMobileToggle.bind(this));
        }
        
        // ナビゲーションリンク
        this.navLinks.forEach(link => {
            this.addEventListenerToChild(link, 'click', this.handleNavLinkClick.bind(this));
        });
        
        // ウィンドウリサイズ
        this.addEventListener(window, 'resize', this.handleWindowResize.bind(this));
        
        // キーボードイベント（ESCでモバイルメニュー閉じる）
        this.addEventListener(document, 'keydown', this.handleKeydown.bind(this));
        
        // 外部クリックでモバイルメニュー閉じる
        this.addEventListener(document, 'click', this.handleDocumentClick.bind(this));
        
        this.log('イベントリスナー設定完了');
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
     * セクション監視の開始
     */
    startSectionWatching() {
        // 監視対象のセクションを取得
        const sections = document.querySelectorAll('section[id], main[id], .section[id]');
        
        if (sections.length === 0) {
            this.debug('監視対象セクションなし');
            return;
        }
        
        // IntersectionObserver設定
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -60% 0px',
            threshold: 0.1
        };
        
        this.sectionObserver = new IntersectionObserver(
            this.handleSectionIntersection.bind(this),
            observerOptions
        );
        
        // セクションの監視開始
        sections.forEach(section => {
            this.sectionObserver.observe(section);
        });
        
        this.log(`セクション監視開始: ${sections.length}個のセクション`);
    }

    /**
     * モバイルメニュートグル処理
     * @param {Event} event - クリックイベント
     */
    handleMobileToggle(event) {
        event.preventDefault();
        event.stopPropagation();
        
        this.toggleMobileMenu();
    }

    /**
     * ナビゲーションリンククリック処理
     * @param {Event} event - クリックイベント
     */
    handleNavLinkClick(event) {
        const link = event.currentTarget;
        const href = link.getAttribute('href');
        
        // 内部リンクの場合のスムーススクロール
        if (href && href.startsWith('#')) {
            event.preventDefault();
            this.smoothScrollToSection(href);
            
            // モバイルメニューを閉じる
            if (this.isMobileMenuOpen) {
                this.toggleMobileMenu();
            }
        }
        
        // アクティブリンクの更新
        this.updateActiveLink(link);
        
        // イベント発火
        EventBus.emit('header:nav:click', {
            href: href,
            text: link.textContent.trim()
        });
    }

    /**
     * ウィンドウリサイズ処理
     */
    handleWindowResize() {
        // 大きな画面でモバイルメニューが開いている場合は閉じる
        if (this.isMobileMenuOpen && window.innerWidth > 768) {
            this.toggleMobileMenu();
        }
    }

    /**
     * キーダウン処理
     * @param {KeyboardEvent} event - キーボードイベント
     */
    handleKeydown(event) {
        if (event.key === 'Escape' && this.isMobileMenuOpen) {
            this.toggleMobileMenu();
        }
    }

    /**
     * ドキュメントクリック処理（外部クリック）
     * @param {Event} event - クリックイベント
     */
    handleDocumentClick(event) {
        if (!this.isMobileMenuOpen) return;
        
        // ヘッダー内部のクリックでない場合はメニューを閉じる
        if (!this.container.contains(event.target)) {
            this.toggleMobileMenu();
        }
    }

    /**
     * スクロール処理
     */
    handleScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // ヘッダーの固定/非固定状態の切り替え
        if (scrollY > this.scrollThreshold) {
            this.container.classList.add('header-fixed');
            this.container.classList.add('header-scrolled');
        } else {
            this.container.classList.remove('header-fixed');
            this.container.classList.remove('header-scrolled');
        }
        
        // イベント発火
        EventBus.emit('header:scroll', {
            scrollY: scrollY,
            isFixed: scrollY > this.scrollThreshold
        });
    }

    /**
     * セクション交差監視処理
     * @param {IntersectionObserverEntry[]} entries - 交差エントリー
     */
    handleSectionIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                if (sectionId && sectionId !== this.currentActiveSection) {
                    this.updateActiveSectionLink(sectionId);
                    this.currentActiveSection = sectionId;
                    
                    // イベント発火
                    EventBus.emit('header:section:active', {
                        sectionId: sectionId,
                        sectionElement: entry.target
                    });
                }
            }
        });
    }

    /**
     * モバイルメニューの開閉
     */
    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
        
        if (this.nav) {
            this.nav.classList.toggle('mobile-open', this.isMobileMenuOpen);
        }
        
        if (this.mobileToggle) {
            this.mobileToggle.classList.toggle('active', this.isMobileMenuOpen);
            
            // アクセシビリティ属性の更新
            this.mobileToggle.setAttribute('aria-expanded', this.isMobileMenuOpen.toString());
        }
        
        // body のスクロール制御（メニューオープン時は無効化）
        document.body.classList.toggle('mobile-menu-open', this.isMobileMenuOpen);
        
        this.log(`モバイルメニュー${this.isMobileMenuOpen ? '開く' : '閉じる'}`);
        
        // イベント発火
        EventBus.emit('header:mobile:toggle', {
            isOpen: this.isMobileMenuOpen
        });
    }

    /**
     * セクションへのスムーススクロール
     * @param {string} href - ターゲットセクションのハッシュ
     */
    smoothScrollToSection(href) {
        const targetElement = document.querySelector(href);
        
        if (!targetElement) {
            this.warn(`ターゲットセクションが見つかりません: ${href}`);
            return;
        }
        
        // ヘッダーの高さを考慮したオフセット
        const headerHeight = this.container.offsetHeight;
        const targetPosition = targetElement.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        
        this.log(`スムーススクロール実行: ${href}`);
        
        // イベント発火
        EventBus.emit('header:scroll:smooth', {
            targetId: href,
            targetElement: targetElement
        });
    }

    /**
     * アクティブリンクの更新
     * @param {HTMLElement} activeLink - アクティブにするリンク
     */
    updateActiveLink(activeLink) {
        // 全てのナビリンクからactiveクラスを除去
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // アクティブリンクにクラス追加
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * アクティブセクションリンクの更新
     * @param {string} sectionId - アクティブセクションのID
     */
    updateActiveSectionLink(sectionId) {
        const targetLink = this.container.querySelector(`a[href="#${sectionId}"]`);
        
        if (targetLink) {
            this.updateActiveLink(targetLink);
        }
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
     * ヘッダーの状態リセット
     */
    reset() {
        // モバイルメニューを閉じる
        if (this.isMobileMenuOpen) {
            this.toggleMobileMenu();
        }
        
        // アクティブリンクをクリア
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // スクロール状態をクリア
        this.container.classList.remove('header-fixed', 'header-scrolled');
        
        this.currentActiveSection = '';
        
        this.log('ヘッダー状態リセット完了');
    }

    /**
     * パフォーマンス情報の取得
     * @returns {Object} パフォーマンス情報
     */
    getPerformanceInfo() {
        return {
            ...super.getPerformanceInfo(),
            navLinksCount: this.navLinks ? this.navLinks.length : 0,
            isMobileMenuOpen: this.isMobileMenuOpen,
            currentActiveSection: this.currentActiveSection,
            isScrollWatching: this.isScrollWatching,
            hasSectionObserver: !!this.sectionObserver
        };
    }

    /**
     * コンポーネント破棄
     */
    destroy() {
        // セクション監視オブザーバーの停止
        if (this.sectionObserver) {
            this.sectionObserver.disconnect();
            this.sectionObserver = null;
        }
        
        // モバイルメニューを閉じる
        if (this.isMobileMenuOpen) {
            this.toggleMobileMenu();
        }
        
        // bodyクラスのクリーンアップ
        document.body.classList.remove('mobile-menu-open');
        
        // プロパティのクリア
        this.nav = null;
        this.mobileToggle = null;
        this.navLinks = null;
        this.isScrollWatching = false;
        this.currentActiveSection = '';
        
        super.destroy();
    }
} 