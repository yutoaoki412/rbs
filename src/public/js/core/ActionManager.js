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
  get isInitialized() {
    return this.#initialized;
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
    console.log(`📝 ActionManager: アクション登録完了 "${actionName}"`);
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

    console.log(`🔧 アクション処理開始: "${actionName}"`);
    
    const params = this.#extractParams(element);
    
    try {
      if (this.#actions.has(actionName)) {
        const handler = this.#actions.get(actionName);
        await handler(element, params, event);
        console.log(`✅ アクション処理完了: "${actionName}"`);
      } else {
        console.log(`📢 未登録アクションをEventBusに配信: "${actionName}"`);
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
            
            // nextTickでDOM更新を待つ
            requestAnimationFrame(() => {
              const scrollHeight = faqAnswer.scrollHeight;
              console.log(`📏 測定されたscrollHeight: ${scrollHeight}px`);
              
              // CSSから初期状態に戻してからアニメーション開始
              faqAnswer.style.maxHeight = '0';
              faqAnswer.style.opacity = '0';
              
              // 次のフレームでアニメーション開始
              requestAnimationFrame(() => {
                faqAnswer.style.maxHeight = `${scrollHeight + 20}px`;
                faqAnswer.style.opacity = '1';
              });
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

      // ステータスバナー トグル
      'toggle-status': (element) => {
        const isExpanded = element.getAttribute('aria-expanded') === 'true';
        const statusContent = element.parentElement?.querySelector('.status-content');
        const toggleIcon = element.querySelector('.toggle-icon');
        
        if (statusContent) {
          // トグル状態を切り替え
          element.setAttribute('aria-expanded', (!isExpanded).toString());
          
          // アイコンを更新
          if (toggleIcon) {
            toggleIcon.textContent = isExpanded ? '▼' : '▲';
          }
          
          // アニメーション付きで表示/非表示
          if (isExpanded) {
            statusContent.style.maxHeight = '0';
            statusContent.style.opacity = '0';
            setTimeout(() => {
              statusContent.style.display = 'none';
            }, 300);
          } else {
            statusContent.style.display = 'block';
            statusContent.style.maxHeight = statusContent.scrollHeight + 'px';
            statusContent.style.opacity = '1';
          }
        }
      },

      // モーダル・UI
      'close-modal': () => this.#closeModal(),

      // デバッグ情報表示
      'show-debug-info': () => {
        console.log('📊 ActionManager Debug Info:', {
          initialized: this.#initialized,
          actionsCount: this.#actions.size,
          registeredActions: Array.from(this.#actions.keys())
        });
      },

      // ニュースデバッグ表示（開発用）
      'show-news-debug': () => {
        console.log('📰 ニュース機能デバッグ情報');
        EventBus.emit('news:debug');
      },

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
}

// シングルトンインスタンス
export const actionManager = new ActionManager(); 