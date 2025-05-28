/**
 * RBS陸上教室 アクションハンドラーサービス
 * data-action属性を使用したイベント処理を統一管理
 */

import { EventBus } from './EventBus.js';

export class ActionHandler {
  constructor() {
    this.actions = new Map();
    this.listeners = [];
    this.initialized = false;
  }

  /**
   * アクションハンドラーを初期化
   */
  init() {
    if (this.initialized) return;
    
    this.setupEventListeners();
    this.registerDefaultActions();
    this.initialized = true;
    
    console.log('✅ ActionHandler initialized');
  }

  /**
   * グローバルイベントリスナーを設定
   */
  setupEventListeners() {
    // ドキュメント全体でクリックイベントをキャッチ
    const clickListener = (event) => {
      const element = event.target.closest('[data-action]');
      if (element) {
        event.preventDefault();
        this.handleAction(element, event);
      }
    };

    // changeイベントも処理（select要素など）
    const changeListener = (event) => {
      const element = event.target;
      if (element.hasAttribute('data-action')) {
        this.handleAction(element, event);
      }
    };

    document.addEventListener('click', clickListener);
    document.addEventListener('change', changeListener);
    
    this.listeners.push(
      { type: 'click', listener: clickListener },
      { type: 'change', listener: changeListener }
    );
  }

  /**
   * アクションを処理
   */
  async handleAction(element, event) {
    const actionName = element.getAttribute('data-action');
    
    if (!actionName) return;

    // アクションパラメータを取得
    const params = this.extractParams(element);
    
    try {
      // 登録されたアクションハンドラーを実行
      if (this.actions.has(actionName)) {
        const handler = this.actions.get(actionName);
        await handler(element, params, event);
      } else {
        // 未登録のアクションはEventBusで配信
        EventBus.emit(`action:${actionName}`, {
          element,
          params,
          event
        });
      }
    } catch (error) {
      console.error(`Action handler error for "${actionName}":`, error);
    }
  }

  /**
   * 要素からパラメータを抽出
   */
  extractParams(element) {
    const params = {};
    
    // data-*属性からパラメータを抽出
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
        const key = attr.name.substring(5); // 'data-'を除去
        params[key] = attr.value;
      }
    });

    return params;
  }

  /**
   * アクションハンドラーを登録
   */
  register(actionName, handler) {
    this.actions.set(actionName, handler);
  }

  /**
   * 複数のアクションハンドラーを一括登録
   */
  registerMultiple(handlers) {
    Object.entries(handlers).forEach(([actionName, handler]) => {
      this.register(actionName, handler);
    });
  }

  /**
   * デフォルトアクションを登録
   */
  registerDefaultActions() {
    this.registerMultiple({
      // 外部リンクを開く
      'open-external': (element, params) => {
        const url = params.url || element.href;
        if (url) {
          window.open(url, '_blank');
        }
      },

      // ページ内スクロール
      'scroll-to': (element, params) => {
        const target = params.target || element.getAttribute('href')?.substring(1);
        if (target) {
          const targetElement = document.getElementById(target);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      },

      // モバイルメニュー切り替え
      'toggle-mobile-menu': (element) => {
        const nav = document.querySelector('.nav-links');
        const isExpanded = element.getAttribute('aria-expanded') === 'true';
        
        element.setAttribute('aria-expanded', !isExpanded);
        
        if (nav) {
          nav.classList.toggle('mobile-open');
        }
      },

      // URL をコピー
      'copy-url': async (element, params) => {
        const url = params.url || window.location.href;
        
        try {
          await navigator.clipboard.writeText(url);
          this.showFeedback('URLをコピーしました');
        } catch (error) {
          console.error('URLコピーに失敗:', error);
          this.showFeedback('URLコピーに失敗しました', 'error');
        }
      },

      // ソーシャルシェア
      'share-twitter': (element, params) => {
        const text = params.text || document.title;
        const url = params.url || window.location.href;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
      },

      'share-facebook': (element, params) => {
        const url = params.url || window.location.href;
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
      },

      'share-line': (element, params) => {
        const text = params.text || document.title;
        const url = params.url || window.location.href;
        const shareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text + ' ' + url)}`;
        window.open(shareUrl, '_blank');
      },

      // デバッグ情報表示
      'show-debug-info': () => {
        EventBus.emit('debug:show-info');
      }
    });
  }

  /**
   * フィードバックメッセージを表示
   */
  showFeedback(message, type = 'success') {
    // 簡易的な通知表示
    const notification = document.createElement('div');
    notification.className = `action-feedback ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : '#10b981'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.listeners.forEach(({ type, listener }) => {
      document.removeEventListener(type, listener);
    });
    
    this.listeners = [];
    this.actions.clear();
    this.initialized = false;
  }
}

// アニメーション用CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// シングルトンインスタンスを作成
export const actionHandler = new ActionHandler(); 