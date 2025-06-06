/**
 * ニュースアクションサービス
 * ニュース関連のアクションを管理
 * @version 2.0.0
 */

import { actionManager } from '../../../app/ActionManager.js';
import ShareService from './ShareService.js';

export class NewsActionService {
  constructor() {
    this.initialized = false;
    this.shareService = null;
  }

  /**
   * 初期化
   */
  init() {
    if (this.initialized) {
      console.log('⚠️ NewsActionService: 既に初期化済み');
      return;
    }

    console.log('🔧 NewsActionService: 初期化開始');
    this.#initializeServices();
    this.#registerNewsActions();
    this.initialized = true;
    console.log('✅ NewsActionService: 初期化完了');
  }

  /**
   * サービスの初期化
   * @private
   */
  #initializeServices() {
    this.shareService = new ShareService();
  }

  /**
   * ニュース関連アクションを登録
   * @private
   */
  #registerNewsActions() {
    const newsActions = {
      // ソーシャルシェア
      'share-twitter': (element, params) => {
        this.#handleSocialShare('twitter', element, params);
      },

      'share-facebook': (element, params) => {
        this.#handleSocialShare('facebook', element, params);
      },

      'share-line': (element, params) => {
        this.#handleSocialShare('line', element, params);
      },

      // URL コピー
      'copy-url': async (element, params) => {
        await this.#handleUrlCopy(element, params);
      },

      // モバイルメニュー切り替え
      'toggle-mobile-menu': (element) => {
        this.#handleMobileMenuToggle(element);
      }
    };

    actionManager.registerMultiple(newsActions);
  }

  /**
   * ソーシャルシェア処理
   * @private
   * @param {string} platform - プラットフォーム名
   * @param {HTMLElement} element - 要素
   * @param {Record<string, string>} params - パラメータ
   */
  #handleSocialShare(platform, element, params) {
    try {
      const url = params.url || window.location.href;
      const text = params.text || document.title;
      
      this.shareService.share(platform, { url, text });
      
      console.log(`📤 ${platform} シェア実行:`, { url, text });
      
    } catch (error) {
      console.error(`❌ ${platform} シェアエラー:`, error);
      this.#showError(`${platform} でのシェアに失敗しました`);
    }
  }

  /**
   * URL コピー処理
   * @private
   * @param {HTMLElement} element - 要素
   * @param {Record<string, string>} params - パラメータ
   */
  async #handleUrlCopy(element, params) {
    try {
      const url = params.url || window.location.href;
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        console.log('📋 URL クリップボードにコピー完了:', url);
        this.#showSuccess('URLをクリップボードにコピーしました');
      } else {
        // フォールバック: テキストエリアを使用
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (success) {
          console.log('📋 URL クリップボードにコピー完了（フォールバック）:', url);
          this.#showSuccess('URLをクリップボードにコピーしました');
        } else {
          throw new Error('コピーに失敗しました');
        }
      }
      
    } catch (error) {
      console.error('❌ URL コピーエラー:', error);
      this.#showError('URLのコピーに失敗しました');
    }
  }

  /**
   * モバイルメニュー切り替え処理
   * @private
   * @param {HTMLElement} element - 要素
   */
  #handleMobileMenuToggle(element) {
    const mobileMenu = document.querySelector('.mobile-menu, .nav-mobile');
    
    if (!mobileMenu) {
      console.warn('⚠️ モバイルメニューが見つかりません');
      return;
    }
    
    const isActive = mobileMenu.classList.contains('active');
    
    if (isActive) {
      mobileMenu.classList.remove('active');
      element.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    } else {
      mobileMenu.classList.add('active');
      element.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
    }
    
    console.log(`📱 モバイルメニュー: ${isActive ? '非表示' : '表示'}`);
  }

  /**
   * 成功メッセージを表示
   * @private
   * @param {string} message - メッセージ
   */
  #showSuccess(message) {
    console.log(`✅ ${message}`);
    if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, 'success');
    } else {
      // フォールバック: 簡単な通知
      this.#showSimpleNotification(message, 'success');
    }
  }

  /**
   * エラーメッセージを表示
   * @private
   * @param {string} message - メッセージ
   */
  #showError(message) {
    console.error(`❌ ${message}`);
    if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, 'error');
    } else {
      // フォールバック: 簡単な通知
      this.#showSimpleNotification(message, 'error');
    }
  }

  /**
   * 簡単な通知を表示（フォールバック）
   * @private
   * @param {string} message - メッセージ
   * @param {string} type - タイプ
   */
  #showSimpleNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      background-color: ${type === 'error' ? '#e53e3e' : '#38a169'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// シングルトンインスタンス
export const newsActionService = new NewsActionService();

// デフォルトエクスポート（他のサービスとの一貫性のため）
export default NewsActionService; 