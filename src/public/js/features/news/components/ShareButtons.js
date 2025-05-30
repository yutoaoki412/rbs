/**
 * ソーシャルシェアボタンコンポーネント
 * 記事のソーシャルメディア共有機能を提供
 * @version 1.0.0
 */

import { Component } from '../../../shared/base/Component.js';
import { EventBus } from '../../../shared/services/EventBus.js';
import { setVisible, querySelectorAll } from '../../../shared/utils/domUtils.js';
import ShareService from '../services/ShareService.js';

export class ShareButtons extends Component {
  /**
   * @param {Element|string} container - 要素またはセレクタ
   */
  constructor(container) {
    super({ autoInit: false });
    
    this.componentName = 'ShareButtons';
    this.container = container;
    this.element = container;
    this.options = {};
    this.shareService = new ShareService();
  }

  /**
   * デフォルトオプション
   * @returns {Object}
   */
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      article: null,
      autoShow: true
    };
  }

  /**
   * 初期化処理
   */
  afterInit() {
    if (!this.options.article) {
      throw new Error('記事データが指定されていません');
    }

    if (this.options.autoShow) {
      this.show();
    }
  }

  /**
   * イベントバインド
   */
  bindEvents() {
    // シェアボタンのクリックイベント
    const shareButtons = querySelectorAll('[data-action^="share-"], [data-action="copy-url"]', this.element);
    
    shareButtons.forEach(button => {
      this.addEventListener('click', (event) => {
        const action = button.getAttribute('data-action');
        this.handleShareAction(action, event);
      });
    });
  }

  /**
   * シェアアクションを処理
   * @param {string} action - アクション名
   * @param {Event} event - イベントオブジェクト
   */
  async handleShareAction(action, event) {
    event.preventDefault();
    
    if (!this.options.article) {
      console.warn('記事データが設定されていません');
      return;
    }

    try {
      switch (action) {
        case 'share-twitter':
          await this.shareService.shareTwitter(this.options.article);
          break;
        
        case 'share-facebook':
          await this.shareService.shareFacebook(this.options.article);
          break;
        
        case 'share-line':
          await this.shareService.shareLine(this.options.article);
          break;
        
        case 'copy-url':
          await this.shareService.copyUrl();
          break;
        
        default:
          console.warn('未知のシェアアクション:', action);
      }

      // アクションの成功をイベントで通知
      this.emit('shareAction', { action, article: this.options.article });
      
    } catch (error) {
      console.error('シェアアクションエラー:', error);
      this.emit('shareError', { action, error });
    }
  }

  /**
   * 表示
   */
  show() {
    setVisible(this.element, true);
    super.show();
  }

  /**
   * 記事データを更新
   * @param {Object} article - 新しい記事データ
   */
  updateArticle(article) {
    this.options.article = article;
    this.emit('articleUpdated', { article });
  }

  /**
   * 現在の記事を取得
   * @returns {Object|null}
   */
  getCurrentArticle() {
    return this.options.article;
  }

  /**
   * 特定のシェアボタンを有効/無効にする
   * @param {string} platform - プラットフォーム (twitter, facebook, line, copy)
   * @param {boolean} enabled - 有効フラグ
   */
  setButtonEnabled(platform, enabled) {
    const button = this.find(`[data-action="share-${platform}"], [data-action="copy-url"]`);
    if (button) {
      button.disabled = !enabled;
      
      if (enabled) {
        this.removeClass(button, 'disabled');
      } else {
        this.addClass(button, 'disabled');
      }
    }
  }

  /**
   * 全ボタンを有効/無効にする
   * @param {boolean} enabled - 有効フラグ
   */
  setAllButtonsEnabled(enabled) {
    const platforms = ['twitter', 'facebook', 'line', 'copy'];
    platforms.forEach(platform => {
      this.setButtonEnabled(platform, enabled);
    });
  }

  /**
   * ログ出力
   * @param {...any} args - ログ引数
   */
  log(...args) {
    console.log(`[${this.componentName}]`, ...args);
  }
  
  /**
   * エラーログ出力
   * @param {...any} args - エラーログ引数
   */
  error(...args) {
    console.error(`[${this.componentName}]`, ...args);
  }
  
  /**
   * デバッグログ出力
   * @param {...any} args - デバッグログ引数
   */
  debug(...args) {
    console.log(`[${this.componentName}:DEBUG]`, ...args);
  }
  
  /**
   * 警告ログ出力
   * @param {...any} args - 警告ログ引数
   */
  warn(...args) {
    console.warn(`[${this.componentName}]`, ...args);
  }
}

// デフォルトエクスポート
export default ShareButtons; 