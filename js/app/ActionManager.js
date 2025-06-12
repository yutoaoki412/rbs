/**
 * アクション管理サービス
 * data-action属性を使用したイベント処理の中核
 * @version 2.0.0
 */

import { EventBus } from '../shared/services/EventBus.js';

export class ActionManager {
  /**
   * @type {Map<string, Function>}
   */
  #actions;

  /**
   * @type {Array<{type: string, listener: Function}>}
   */
  #listeners;

  /**
   * @type {boolean}
   */
  #initialized;

  constructor() {
    this.#actions = new Map();
    this.#listeners = [];
    this.#initialized = false;
  }

  /**
   * 初期化
   * @returns {void}
   */
  init() {
    if (this.#initialized) {
      console.log('⚠️ ActionManager: 既に初期化済み');
      return;
    }

    console.log('🔧 ActionManager: 初期化開始');
    
    this.#registerEventListeners();
    this.#registerCoreActions();
    
    this.#initialized = true;
    console.log('✅ ActionManager: 初期化完了');
  }

  /**
   * 初期化状態を取得
   * @returns {boolean}
   */
  get initialized() {
    return this.#initialized;
  }

  /**
   * 登録済みアクション一覧を取得（デバッグ用）
   * @returns {Map<string, Function>}
   */
  get _actions() {
    return this.#actions;
  }

  /**
   * 登録済みアクション数を取得
   * @returns {number}
   */
  get actionCount() {
    return this.#actions.size;
  }

  /**
   * 登録済みアクション名一覧を取得
   * @returns {string[]}
   */
  getRegisteredActionNames() {
    return Array.from(this.#actions.keys());
  }

  /**
   * アクションを登録
   * @param {string} actionName - アクション名
   * @param {Function} handler - ハンドラー関数
   */
  register(actionName, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`ActionManager: ハンドラーは関数である必要があります (${actionName})`);
    }
    
    this.#actions.set(actionName, handler);
    // 登録ログは開発時のみ表示
    if (window.location.hostname === 'localhost') {
      console.log(`📝 ActionManager: アクション登録完了 "${actionName}"`);
    }
  }

  /**
   * 複数のアクションを一括登録
   * @param {Record<string, Function>} handlers - アクションハンドラーのオブジェクト
   */
  registerMultiple(handlers) {
    Object.entries(handlers).forEach(([actionName, handler]) => {
      this.register(actionName, handler);
    });
  }

  /**
   * アクションを実行
   * @param {HTMLElement} element - アクション要素
   * @param {Event} event - イベント
   * @returns {Promise<void>}
   */
  async handleAction(element, event) {
    const actionName = element.getAttribute('data-action');
    
    if (!actionName) {
      console.warn('⚠️ data-actionが指定されていません:', element);
      return;
    }

    // デバッグログは重要なアクションのみ
    if (this.#isDebugMode() && ['toggle-faq', 'toggle-status', 'switch-tab', 'switch-admin-tab'].includes(actionName)) {
      console.log(`🔧 アクション処理開始: "${actionName}"`);
    }
    
    const params = this.#extractParams(element);
    
    try {
      if (this.#actions.has(actionName)) {
        const handler = this.#actions.get(actionName);
        await handler(element, params, event);
        
        // 成功ログは重要なアクションのみ
        if (this.#isDebugMode() && ['toggle-faq', 'toggle-status', 'switch-tab', 'switch-admin-tab'].includes(actionName)) {
          console.log(`✅ アクション処理完了: "${actionName}"`);
        }
      } else {
        // 未登録アクションは管理画面でのみ通知システムで警告表示
        if (this.#isDebugMode()) {
          console.log(`📢 未登録アクション: "${actionName}"`);
        }
        
        // 管理画面の場合は通知で表示
        if (window.location.pathname.includes('admin') && window.showWarning) {
          window.showWarning(`未登録のアクション: ${actionName}`, 3000);
        }
        
        // EventBusに配信
        EventBus.emit(`action:${actionName}`, {
          element,
          params,
          event
        });
      }
    } catch (error) {
      console.error(`❌ Action handler error for "${actionName}":`, error);
      this.#showError(`アクション "${actionName}" でエラーが発生しました: ${error.message}`);
    }
  }

  /**
   * グローバルイベントリスナーを設定
   * @private
   */
  #registerEventListeners() {
    const clickListener = (event) => {
      const element = event.target?.closest('[data-action]');
      if (element instanceof HTMLElement) {
        event.preventDefault();
        this.handleAction(element, event);
      }
    };

    const changeListener = (event) => {
      const element = event.target;
      if (element instanceof HTMLElement && element.hasAttribute('data-action')) {
        this.handleAction(element, event);
      }
    };

    document.addEventListener('click', clickListener);
    document.addEventListener('change', changeListener);
    
    this.#listeners.push(
      { type: 'click', listener: clickListener },
      { type: 'change', listener: changeListener }
    );
  }

  /**
   * コアアクションを登録
   * @private
   */
  #registerCoreActions() {
    const coreActions = {
      // 外部リンクを開く
      'open-external': (element, params) => {
        const url = params.url || (element instanceof HTMLAnchorElement ? element.href : '');
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      },

      // ページ内スクロール
      'scroll-to': (element, params) => {
        const target = params.target || 
          (element instanceof HTMLAnchorElement ? element.getAttribute('href')?.substring(1) : '');
        
        if (target) {
          const targetElement = document.getElementById(target);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      },

      // FAQ トグル
      'toggle-faq': (element, params) => {
        const targetId = params.target;
        if (!targetId) {
          console.warn('⚠️ FAQ トグル: ターゲットIDが指定されていません');
          return;
        }
        
        const faqAnswer = document.getElementById(targetId);
        const faqItem = element.closest('.faq-item');
        const isExpanded = element.getAttribute('aria-expanded') === 'true';
        
        console.log(`🔄 FAQ トグル処理: ${targetId}, 現在の状態: ${isExpanded ? '展開' : '折りたたみ'}`);
        
        if (faqAnswer && faqItem) {
          // aria-expanded 属性を更新
          element.setAttribute('aria-expanded', (!isExpanded).toString());
          faqAnswer.setAttribute('aria-hidden', isExpanded.toString());
          
          if (isExpanded) {
            // 折りたたむ場合
            faqItem.classList.remove('active');
            faqAnswer.style.maxHeight = '0';
            faqAnswer.style.opacity = '0';
                    } else {
            // 展開する場合 - 正確な高さを計算
            // 一時的にactiveクラスを追加して高さを測定
            faqItem.classList.add('active');
            
            // 高さを測定するために一時的に自動高さに設定して可視化
            faqAnswer.style.maxHeight = 'none';
            faqAnswer.style.opacity = '1';
            faqAnswer.style.position = 'absolute';
            faqAnswer.style.visibility = 'hidden';
            
            // 正確な高さを測定
            const scrollHeight = faqAnswer.scrollHeight;
            console.log(`📏 測定されたscrollHeight: ${scrollHeight}px`);
            
            // 測定後に初期状態に戻す
            faqAnswer.style.position = '';
            faqAnswer.style.visibility = '';
            faqAnswer.style.maxHeight = '0';
            faqAnswer.style.opacity = '0';
            
            // 次のフレームでアニメーション開始（適切なマージンを追加）
             requestAnimationFrame(() => {
               faqAnswer.style.maxHeight = `${scrollHeight + 60}px`;
               faqAnswer.style.opacity = '1';
             });
          }
          
          console.log(`🎨 activeクラス切り替え: ${faqItem.classList.contains('active') ? '追加' : '削除'}`);
          
          // アイコンを更新
          const icon = element.querySelector('.faq-icon');
          if (icon) {
            icon.textContent = isExpanded ? '+' : '−';
            console.log(`🎯 アイコン更新: ${icon.textContent}`);
          }
          
          // FAQ開閉のイベントを発行
          EventBus.emit('faq:toggled', {
            targetId,
            isExpanded: !isExpanded,
            element: faqItem
          });
          
          console.log(`✅ FAQ トグル完了: ${targetId} は ${!isExpanded ? '展開' : '折りたたみ'} 状態`);
        } else {
          console.error(`❌ FAQ要素が見つかりません: answer=${!!faqAnswer}, item=${!!faqItem}`);
        }
      },

      // ステータス トグル
      'toggle-status': (element, params) => {
        const statusHeader = element.closest('.status-header') || element;
        const statusContent = statusHeader?.nextElementSibling;
        const isExpanded = element.getAttribute('aria-expanded') === 'true';
        
        console.log(`🏃 ステータストグル処理: 現在の状態: ${isExpanded ? '展開' : '折りたたみ'}`);
        
        if (statusContent) {
          // aria-expanded 属性を更新
          element.setAttribute('aria-expanded', (!isExpanded).toString());
          statusContent.setAttribute('aria-hidden', isExpanded.toString());
          
          // active クラスを切り替え
          const statusContainer = statusHeader.closest('.status-container, .lesson-status');
          if (statusContainer) {
            statusContainer.classList.toggle('active');
          }
          
          // アニメーション処理
          if (isExpanded) {
            // 折りたたむ場合
            statusContent.style.maxHeight = '0';
            statusContent.style.opacity = '0';
            statusContent.style.padding = '0';
          } else {
            // 展開する場合
            statusContent.style.display = 'block';
            const scrollHeight = statusContent.scrollHeight;
            statusContent.style.maxHeight = scrollHeight + 'px';
            statusContent.style.opacity = '1';
            statusContent.style.padding = '1rem';
            
            // レッスン状況データの更新確認
            this.checkLessonStatusUpdate();
          }
          
          // アイコン更新
          const icon = element.querySelector('.status-icon, .toggle-icon');
          if (icon) {
            if (isExpanded) {
              icon.textContent = '▼';
              icon.style.transform = 'rotate(0deg)';
            } else {
              icon.textContent = '▲';
              icon.style.transform = 'rotate(180deg)';
            }
          }
          
          console.log(`✅ ステータストグル完了: ${!isExpanded ? '展開' : '折りたたみ'}`);
        } else {
          console.warn('⚠️ ステータスコンテンツが見つかりません');
        }
      },

      // モーダル・UI
      'close-modal': () => this.#closeModal(),

      // モバイルメニュー トグル
      'toggle-mobile-menu': (element) => {
        const isExpanded = element.getAttribute('aria-expanded') === 'true';
        const navLinks = document.querySelector('.nav-links');
        
        if (navLinks) {
          // トグル状態を切り替え
          element.setAttribute('aria-expanded', (!isExpanded).toString());
          
          // メニューボタンのアイコンを更新
          element.textContent = isExpanded ? '☰' : '✕';
          
          // ナビゲーションメニューの表示/非表示
          if (isExpanded) {
            navLinks.classList.remove('active');
            document.body.classList.remove('menu-open');
          } else {
            navLinks.classList.add('active');
            document.body.classList.add('menu-open');
          }
        }
      }
    };

    this.registerMultiple(coreActions);
  }

  /**
   * 要素からパラメータを抽出
   * @private
   * @param {HTMLElement} element - 要素
   * @returns {Record<string, string>}
   */
  #extractParams(element) {
    const params = {};
    
    // data-* 属性からパラメータを抽出
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
        const key = attr.name.substring(5); // 'data-' を除去
        params[key] = attr.value;
      }
    });
    
    return params;
  }

  /**
   * モーダルを閉じる
   * @private
   */
  #closeModal() {
    const modal = document.querySelector('.modal.show, .modal.active');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show', 'active');
    }
  }

  /**
   * エラーメッセージを表示
   * @private
   * @param {string} message - エラーメッセージ
   */
  #showError(message) {
    // 簡単なエラー表示（後で NotificationService に置き換え）
    console.error(message);
    if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, 'error');
    }
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#listeners.forEach(({ type, listener }) => {
      document.removeEventListener(type, listener);
    });
    
    this.#listeners.length = 0;
    this.#actions.clear();
    this.#initialized = false;
    
    console.log('🗑️ ActionManager: 破棄完了');
  }

  /**
   * レッスン状況の更新確認
   * @private
   */
  checkLessonStatusUpdate() {
    try {
      // レッスン状況表示コンポーネントがある場合は更新
      if (window.lessonStatusDisplay && typeof window.lessonStatusDisplay.refreshStatus === 'function') {
        window.lessonStatusDisplay.refreshStatus();
        console.log('🔄 レッスン状況表示を更新しました');
      }
    } catch (error) {
      console.warn('⚠️ レッスン状況更新確認エラー:', error);
    }
  }

  /**
   * カスタムアクションを登録
   * @param {string} actionName - アクション名
   * @param {Function} handler - ハンドラー関数
   */
  registerAction(actionName, handler) {
    if (typeof actionName !== 'string' || !actionName.trim()) {
      console.warn('⚠️ ActionManager: 無効なアクション名です');
      return;
    }
    
    if (typeof handler !== 'function') {
      console.warn('⚠️ ActionManager: ハンドラーは関数である必要があります');
      return;
    }
    
    this.#actions.set(actionName, handler);
    console.log(`🔧 ActionManager: カスタムアクション登録 - ${actionName}`);
  }

  /**
   * アクションの登録解除
   * @param {string} actionName - アクション名
   */
  unregisterAction(actionName) {
    if (this.#actions.has(actionName)) {
      this.#actions.delete(actionName);
      console.log(`🗑️ ActionManager: アクション登録解除 - ${actionName}`);
    }
  }

  /**
   * デバッグモードかどうかを判定
   * @private
   * @returns {boolean}
   */
  #isDebugMode() {
    return window.DEBUG || 
           window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=true');
  }

  /**
   * サービス状態の取得
   * @returns {Object} 状態情報
   */
}

// シングルトンインスタンス
export const actionManager = new ActionManager(); 