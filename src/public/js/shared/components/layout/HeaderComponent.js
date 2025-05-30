import { BaseComponent } from '../BaseComponent.js';
import { EventBus } from '../../services/EventBus.js';

/**
 * ヘッダー専用コンポーネント
 * - ナビゲーション管理
 * - スクロール時の動作制御
 * - モバイルメニュー制御
 * - アクティブセクション管理
 */
class HeaderComponent extends BaseComponent {
    constructor(container) {
        super(container, 'HeaderComponent');
        
        // BaseComponentのelementをcontainerとしても参照できるよう設定
        this.container = this.element;
        
        // デバッグモードを有効にする（開発環境）
        this.debugMode = window.location.hostname === 'localhost' || window.DEBUG;
        
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
            
            // DOM要素の取得（リトライ機能付き）
            await this.findElementsWithRetry();
            
            // イベントリスナーの設定
            this.setupEventListeners();
            
            // スクロール監視の開始
            this.startScrollWatching();
            
            // セクション監視の開始
            this.startSectionWatching();
            
            this.log('HeaderComponent初期化完了');
            
        } catch (error) {
            this.error('HeaderComponent初期化エラー:', error);
            
            // フォールバック処理
            this.setupFallbackMode();
            throw error;
        }
    }

    /**
     * リトライ機能付きDOM要素検索
     * @returns {Promise<void>}
     */
    async findElementsWithRetry() {
        const maxRetries = 5;
        const retryDelay = 100; // 100ms
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            this.findElements();
            
            // 最低限必要な要素があるかチェック
            if (this.hasMinimalElements()) {
                this.log(`DOM要素検索成功 (試行: ${attempt}/${maxRetries})`);
                return;
            }
            
            if (attempt < maxRetries) {
                this.debug(`DOM要素が見つかりません。${retryDelay}ms後に再試行... (${attempt}/${maxRetries})`);
                await this.sleep(retryDelay);
            }
        }
        
        this.warn(`最大試行回数(${maxRetries})を超えました。フォールバックモードで動作します。`);
    }

    /**
     * 最低限必要な要素があるかチェック
     * @returns {boolean}
     */
    hasMinimalElements() {
        // ナビゲーションリンクが最低1つあれば動作可能とする
        return this.navLinks && this.navLinks.length > 0;
    }

    /**
     * フォールバックモード設定
     */
    setupFallbackMode() {
        this.log('フォールバックモードを設定');
        
        // 基本的なイベントリスナーのみ設定
        try {
            // ウィンドウリサイズ
            this.addEventListener(window, 'resize', this.handleWindowResize.bind(this));
            
            // キーボードイベント
            this.addEventListener(document, 'keydown', this.handleKeyDown.bind(this));
            
            this.log('フォールバックモード設定完了');
        } catch (error) {
            this.error('フォールバックモード設定エラー:', error);
        }
    }

    /**
     * 指定時間待機
     * @param {number} ms - 待機時間（ミリ秒）
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        this.nav = this.safeQuerySelector('.nav, .header-nav');
        this.mobileToggle = this.safeQuerySelector('.mobile-menu-btn, .mobile-menu-toggle');
        this.navLinks = this.safeQuerySelectorAll('.nav-links a, .nav-link');
        
        // 必須要素の確認
        if (!this.nav) {
            this.warn('ナビゲーション要素が見つかりません');
        }
        
        if (!this.mobileToggle) {
            this.warn('モバイルメニューボタンが見つかりません');
        }
        
        if (!this.navLinks || this.navLinks.length === 0) {
            this.warn('ナビゲーションリンクが見つかりません');
        }
        
        this.debug(`DOM要素検索完了 - nav: ${!!this.nav}, toggle: ${!!this.mobileToggle}, links: ${this.navLinks ? this.navLinks.length : 0}`);
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        try {
            // モバイルメニュートグル
            if (this.mobileToggle) {
                this.addEventListenerToChild(this.mobileToggle, 'click', this.handleMobileToggle.bind(this));
            }
            
            // ナビゲーションリンク（存在チェック付き安全なforEach使用）
            if (this.navLinks && this.navLinks.length > 0) {
                this.safeForEach(this.navLinks, (link) => {
                    this.addEventListenerToChild(link, 'click', this.handleNavLinkClick.bind(this));
                }, '(ナビゲーションリンク)');
            } else {
                this.debug('ナビゲーションリンクが見つからないため、イベントリスナーをスキップします');
            }
            
            // ページナビゲーションリンク
            const pageNavLinks = this.safeQuerySelectorAll('[data-navigate]');
            if (pageNavLinks && pageNavLinks.length > 0) {
                this.safeForEach(pageNavLinks, (link) => {
                    this.addEventListenerToChild(link, 'click', this.handlePageNavigation.bind(this));
                }, '(ページナビゲーションリンク)');
            }
            
            // ホームページナビゲーション
            const homeNavLinks = this.safeQuerySelectorAll('[data-action="navigate-home"]');
            if (homeNavLinks && homeNavLinks.length > 0) {
                this.safeForEach(homeNavLinks, (link) => {
                    this.addEventListenerToChild(link, 'click', this.handleHomeNavigation.bind(this));
                }, '(ホームナビゲーションリンク)');
            }
            
            // ウィンドウリサイズ
            this.addEventListener(window, 'resize', this.handleWindowResize.bind(this));
            
            // キーボードイベント（ESCでモバイルメニュー閉じる）
            this.addEventListener(document, 'keydown', this.handleKeyDown.bind(this));
            
            // EventBusイベント
            EventBus.on('navigation:section-change', this.handleSectionChange.bind(this));
            
            this.debug('イベントリスナー設定完了');
            
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
     * セクション変更イベント処理
     * @param {Object} event - セクション変更イベント
     */
    handleSectionChange(event) {
        try {
            const { sectionId, sectionElement } = event.detail || event;
            
            if (sectionId && sectionId !== this.currentActiveSection) {
                this.updateActiveSectionLink(sectionId);
                this.currentActiveSection = sectionId;
                
                this.debug(`セクション変更: ${sectionId}`);
            }
        } catch (error) {
            this.error('セクション変更処理エラー:', error);
        }
    }

    /**
     * ウィンドウリサイズ処理
     */
    handleWindowResize() {
        try {
            // 大きな画面でモバイルメニューが開いている場合は閉じる
            if (this.isMobileMenuOpen && window.innerWidth > 768) {
                this.closeMobileMenu();
            }
            
            this.debug(`ウィンドウリサイズ: ${window.innerWidth}x${window.innerHeight}`);
        } catch (error) {
            this.error('ウィンドウリサイズ処理エラー:', error);
        }
    }

    /**
     * キーボードイベント処理
     * @param {KeyboardEvent} event - キーボードイベント
     */
    handleKeyDown(event) {
        try {
            if (event.key === 'Escape' && this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
        } catch (error) {
            this.error('キーボードイベント処理エラー:', error);
        }
    }

    /**
     * スクロール処理
     */
    handleScroll() {
        try {
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
        } catch (error) {
            this.error('スクロール処理エラー:', error);
        }
    }

    /**
     * セクション交差監視処理
     * @param {IntersectionObserverEntry[]} entries - 交差エントリー
     */
    handleSectionIntersection(entries) {
        try {
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
        } catch (error) {
            this.error('セクション交差監視処理エラー:', error);
        }
    }

    /**
     * モバイルメニュートグル処理
     * @param {Event} event - クリックイベント
     */
    handleMobileToggle(event) {
        try {
            event.preventDefault();
            event.stopPropagation();
            
            this.toggleMobileMenu();
        } catch (error) {
            this.error('モバイルメニュートグル処理エラー:', error);
        }
    }

    /**
     * ナビゲーションリンククリック処理
     * @param {Event} event - クリックイベント
     */
    handleNavLinkClick(event) {
        try {
            const link = event.currentTarget;
            const href = link.getAttribute('href');
            
            // 内部リンクの場合のスムーススクロール
            if (href && href.startsWith('#')) {
                event.preventDefault();
                this.smoothScrollToSection(href);
                
                // モバイルメニューを閉じる
                if (this.isMobileMenuOpen) {
                    this.closeMobileMenu();
                }
            }
            
            // アクティブリンクの更新
            this.updateActiveLink(link);
            
            // イベント発火
            EventBus.emit('header:nav:click', {
                href: href,
                text: link.textContent.trim()
            });
        } catch (error) {
            this.error('ナビゲーションリンククリック処理エラー:', error);
        }
    }

    /**
     * ページナビゲーション処理
     * @param {Event} event - クリックイベント
     */
    handlePageNavigation(event) {
        try {
            const navigateType = event.currentTarget.dataset.navigate;
            const section = event.currentTarget.dataset.section;
            
            this.debug(`ページナビゲーション: ${navigateType}, セクション: ${section}`);
            
            if (navigateType === 'home') {
                event.preventDefault();
                this.navigateToHome(section);
            }
        } catch (error) {
            this.error('ページナビゲーション処理エラー:', error);
        }
    }

    /**
     * ホームページナビゲーション処理
     * @param {Event} event - クリックイベント
     */
    handleHomeNavigation(event) {
        try {
            const currentPath = window.location.pathname;
            
            // 既にホームページにいる場合は通常のアンカー動作
            if (currentPath.includes('index.html') || currentPath === '/') {
                return; // デフォルトの動作を続行
            }
            
            // 他のページからホームページへの遷移
            event.preventDefault();
            this.navigateToHome();
        } catch (error) {
            this.error('ホームページナビゲーション処理エラー:', error);
        }
    }

    /**
     * ホームページへの遷移
     * @param {string} section - 遷移先セクション
     */
    navigateToHome(section = null) {
        try {
            const homeUrl = this.getHomeUrl();
            const fullUrl = section ? `${homeUrl}#${section}` : homeUrl;
            
            this.log(`ホームページに遷移: ${fullUrl}`);
            
            // セッションストレージに遷移先セクションを保存
            if (section) {
                sessionStorage.setItem('rbs_target_section', section);
            }
            
            window.location.href = fullUrl;
        } catch (error) {
            this.error('ホームページ遷移エラー:', error);
        }
    }

    /**
     * ホームページのURLを取得
     * @returns {string} ホームページURL
     */
    getHomeUrl() {
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/pages/')) {
            return '../pages/index.html';
        }
        
        return 'index.html';
    }

    /**
     * モバイルメニューの開閉
     */
    toggleMobileMenu() {
        try {
            this.isMobileMenuOpen = !this.isMobileMenuOpen;
            this.updateMobileMenuState();
        } catch (error) {
            this.error('モバイルメニュートグルエラー:', error);
        }
    }

    /**
     * モバイルメニューを閉じる
     */
    closeMobileMenu() {
        try {
            if (this.isMobileMenuOpen) {
                this.isMobileMenuOpen = false;
                this.updateMobileMenuState();
            }
        } catch (error) {
            this.error('モバイルメニュークローズエラー:', error);
        }
    }

    /**
     * モバイルメニューを開く
     */
    openMobileMenu() {
        try {
            if (!this.isMobileMenuOpen) {
                this.isMobileMenuOpen = true;
                this.updateMobileMenuState();
            }
        } catch (error) {
            this.error('モバイルメニューオープンエラー:', error);
        }
    }

    /**
     * モバイルメニューの状態を更新
     * @private
     */
    updateMobileMenuState() {
        try {
            // ナビゲーションの表示/非表示
            if (this.nav) {
                this.nav.classList.toggle('mobile-open', this.isMobileMenuOpen);
            }
            
            // トグルボタンの状態更新
            if (this.mobileToggle) {
                this.mobileToggle.classList.toggle('active', this.isMobileMenuOpen);
                this.mobileToggle.setAttribute('aria-expanded', this.isMobileMenuOpen.toString());
                this.mobileToggle.setAttribute('aria-label', this.isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く');
            }
            
            // body のスクロール制御（メニューオープン時は無効化）
            document.body.classList.toggle('mobile-menu-open', this.isMobileMenuOpen);
            
            // ドキュメントクリックイベントの管理
            if (this.isMobileMenuOpen) {
                this.setupDocumentClickHandler();
            } else {
                this.removeDocumentClickHandler();
            }
            
            this.log(`モバイルメニュー${this.isMobileMenuOpen ? '開く' : '閉じる'}`);
            
            // イベント発火
            EventBus.emit('header:mobile:toggle', {
                isOpen: this.isMobileMenuOpen
            });
        } catch (error) {
            this.error('モバイルメニュー状態更新エラー:', error);
        }
    }

    /**
     * ドキュメントクリックハンドラーの設定
     * @private
     */
    setupDocumentClickHandler() {
        try {
            if (!this.documentClickHandler) {
                this.documentClickHandler = this.handleDocumentClick.bind(this);
            }
            document.addEventListener('click', this.documentClickHandler);
        } catch (error) {
            this.error('ドキュメントクリックハンドラー設定エラー:', error);
        }
    }

    /**
     * ドキュメントクリックハンドラーの削除
     * @private
     */
    removeDocumentClickHandler() {
        try {
            if (this.documentClickHandler) {
                document.removeEventListener('click', this.documentClickHandler);
            }
        } catch (error) {
            this.error('ドキュメントクリックハンドラー削除エラー:', error);
        }
    }

    /**
     * ドキュメントクリック処理（外部クリック）
     * @param {Event} event - クリックイベント
     * @private
     */
    handleDocumentClick(event) {
        try {
            // ヘッダー内部のクリックでない場合はメニューを閉じる
            if (!this.container.contains(event.target)) {
                this.closeMobileMenu();
            }
        } catch (error) {
            this.error('ドキュメントクリック処理エラー:', error);
        }
    }

    /**
     * セクションへのスムーススクロール
     * @param {string} href - ターゲットセクションのハッシュ
     */
    smoothScrollToSection(href) {
        try {
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
        } catch (error) {
            this.error('スムーススクロールエラー:', error);
        }
    }

    /**
     * アクティブリンクの更新
     * @param {HTMLElement} activeLink - アクティブにするリンク
     */
    updateActiveLink(activeLink) {
        // 全てのナビリンクからactiveクラスを除去（存在チェック付き安全なforEach使用）
        if (this.navLinks && this.navLinks.length > 0) {
            this.safeForEach(this.navLinks, (link) => {
                link.classList.remove('active');
            }, '(アクティブリンク除去)');
        }
        
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
        try {
            const targetLink = this.container.querySelector(`a[href="#${sectionId}"]`);
            
            if (targetLink) {
                this.updateActiveLink(targetLink);
            }
        } catch (error) {
            this.error('アクティブセクションリンク更新エラー:', error);
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
            this.closeMobileMenu();
        }
        
        // アクティブリンクをクリア（存在チェック付き安全なforEach使用）
        if (this.navLinks && this.navLinks.length > 0) {
            this.safeForEach(this.navLinks, (link) => {
                link.classList.remove('active');
            }, '(リセット時アクティブリンククリア)');
        }
        
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

// デフォルトエクスポートのみ追加（export classは既に存在するため）
export default HeaderComponent; 