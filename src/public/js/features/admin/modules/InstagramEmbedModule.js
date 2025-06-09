/**
 * Instagram埋め込み管理モジュール - admin.html内のInstagram関連機能を外部化
 * @version 1.0.0 - リファクタリング版
 */

import { Component } from '../../../lib/base/Component.js';
import { getAdminNotificationService } from '../../../shared/services/AdminNotificationService.js';

export class InstagramEmbedModule extends Component {
  constructor() {
    super({ autoInit: false });
    this.componentName = 'InstagramEmbedModule';
    
    // 設定
    this.config = {
      scriptUrl: '//www.instagram.com/embed.js',
      maxRetryAttempts: 3,
      retryDelay: 2000, // 2秒
      processDelay: 100, // 100ms
      observerConfig: {
        childList: true,
        subtree: true
      }
    };
    
    // 状態管理
    this.state = {
      scriptLoaded: false,
      scriptLoading: false,
      loadAttempts: 0,
      observer: null,
      elements: new Set() // 処理済み要素の追跡
    };
    
    this.notificationService = getAdminNotificationService();
    this.initialized = false;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.log('InstagramEmbedModule初期化開始', 'info');
      
      // Instagram埋め込みスクリプトの読み込み
      await this.loadInstagramScript();
      
      // DOM変更監視の開始
      this.startDOMObserver();
      
      // グローバル関数の公開
      this.setupGlobalHelpers();
      
      // 既存の埋め込み要素を処理
      await this.processExistingEmbeds();
      
      this.initialized = true;
      this.log('InstagramEmbedModule初期化完了', 'info');
      
    } catch (error) {
      this.error('InstagramEmbedModule初期化エラー:', error);
      throw error;
    }
  }

  /**
   * Instagram埋め込みスクリプトの読み込み
   */
  async loadInstagramScript() {
    return new Promise((resolve, reject) => {
      // 既に読み込み済みまたは読み込み中の場合
      if (this.state.scriptLoaded || this.state.scriptLoading) {
        if (this.state.scriptLoaded) {
          resolve();
        } else {
          // 読み込み中の場合は待機
          setTimeout(() => this.loadInstagramScript().then(resolve).catch(reject), 100);
        }
        return;
      }
      
      this.state.scriptLoading = true;
      this.state.loadAttempts++;
      
      this.log(`Instagram埋め込みスクリプト読み込み開始 (試行 ${this.state.loadAttempts}/${this.config.maxRetryAttempts})`, 'debug');
      
      // 既存のスクリプトを削除
      this.removeExistingScript();
      
      // 新しいスクリプトを作成
      const script = document.createElement('script');
      script.async = true;
      script.src = this.config.scriptUrl;
      
      script.onload = () => {
        this.state.scriptLoaded = true;
        this.state.scriptLoading = false;
        this.log('✅ Instagram埋め込みスクリプト読み込み完了', 'info');
        
        // 既存の埋め込みを処理
        setTimeout(() => {
          this.processInstagramEmbeds();
        }, this.config.processDelay);
        
        resolve();
      };
      
      script.onerror = () => {
        this.state.scriptLoading = false;
        this.warn('⚠️ Instagram埋め込みスクリプト読み込み失敗', 'warning');
        
        // リトライ
        if (this.state.loadAttempts < this.config.maxRetryAttempts) {
          setTimeout(() => {
            this.loadInstagramScript().then(resolve).catch(reject);
          }, this.config.retryDelay * this.state.loadAttempts);
        } else {
          const error = new Error('Instagram埋め込みスクリプトの読み込みに失敗しました');
          this.error('Instagram埋め込みスクリプト読み込み最終失敗', error);
          reject(error);
        }
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * 既存のInstagramスクリプトの削除
   */
  removeExistingScript() {
    const existingScript = document.querySelector('script[src*="embed.js"]');
    if (existingScript) {
      existingScript.remove();
      this.log('既存のInstagramスクリプトを削除', 'debug');
    }
  }

  /**
   * DOM変更監視の開始
   */
  startDOMObserver() {
    if (!window.MutationObserver || this.state.observer) return;
    
    this.state.observer = new MutationObserver((mutations) => {
      this.handleDOMChanges(mutations);
    });
    
    this.state.observer.observe(document.body, this.config.observerConfig);
    this.log('DOM変更監視開始', 'debug');
  }

  /**
   * DOM変更の処理
   */
  handleDOMChanges(mutations) {
    let hasInstagramElements = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (this.hasInstagramElements(node)) {
            hasInstagramElements = true;
          }
        }
      });
    });
    
    if (hasInstagramElements) {
      this.log('新しいInstagram要素を検出', 'debug');
      setTimeout(() => {
        this.processInstagramEmbeds();
      }, this.config.processDelay);
    }
  }

  /**
   * Instagram要素の存在チェック
   */
  hasInstagramElements(element) {
    return element.querySelector && (
      element.querySelector('.instagram-media') ||
      element.querySelector('.instagram-embed-wrapper') ||
      element.classList.contains('instagram-media') ||
      element.classList.contains('instagram-embed-wrapper')
    );
  }

  /**
   * 既存の埋め込み要素の処理
   */
  async processExistingEmbeds() {
    const existingEmbeds = document.querySelectorAll('.instagram-media, .instagram-embed-wrapper');
    if (existingEmbeds.length > 0) {
      this.log(`既存のInstagram埋め込み要素を処理: ${existingEmbeds.length}個`, 'debug');
      await this.processInstagramEmbeds();
    }
  }

  /**
   * Instagram埋め込みの処理
   */
  async processInstagramEmbeds() {
    if (!this.state.scriptLoaded || !window.instgrm?.Embeds) {
      this.log('Instagramスクリプトが準備できていません', 'debug');
      return;
    }
    
    try {
      // 新しい埋め込み要素を処理
      const embedElements = document.querySelectorAll('.instagram-media:not([data-processed])');
      
      if (embedElements.length > 0) {
        this.log(`Instagram埋め込み処理開始: ${embedElements.length}個`, 'debug');
        
        // 処理済みマークを付ける
        embedElements.forEach(element => {
          element.setAttribute('data-processed', 'true');
          this.state.elements.add(element);
        });
        
        // Instagram APIで処理
        window.instgrm.Embeds.process();
        
        this.log('✅ Instagram埋め込み処理完了', 'debug');
      }
      
    } catch (error) {
      this.error('Instagram埋め込み処理エラー:', error);
    }
  }

  /**
   * グローバルヘルパー関数の設定
   */
  setupGlobalHelpers() {
    // admin.html内の実装を統合
    window.reloadInstagramScript = () => this.reloadScript();
    window.processInstagramEmbeds = () => this.processInstagramEmbeds();
    
    this.log('グローバルヘルパー関数設定完了', 'debug');
  }

  /**
   * スクリプトの再読み込み
   */
  async reloadScript() {
    this.log('Instagram埋め込みスクリプト再読み込み開始', 'info');
    
    try {
      // 状態をリセット
      this.state.scriptLoaded = false;
      this.state.scriptLoading = false;
      this.state.loadAttempts = 0;
      
      // 処理済み要素のマークをクリア
      this.state.elements.forEach(element => {
        element.removeAttribute('data-processed');
      });
      this.state.elements.clear();
      
      // スクリプトを再読み込み
      await this.loadInstagramScript();
      
      // 既存要素を再処理
      await this.processExistingEmbeds();
      
      this.notificationService.toast('Instagram埋め込みを再読み込みしました', 'success');
      
    } catch (error) {
      this.error('Instagram埋め込みスクリプト再読み込みエラー:', error);
      this.notificationService.toast('Instagram埋め込みの再読み込みに失敗しました', 'error');
    }
  }

  /**
   * 手動での埋め込み処理
   */
  async manualProcess() {
    this.log('手動Instagram埋め込み処理実行', 'info');
    
    try {
      await this.processInstagramEmbeds();
      this.notificationService.toast('Instagram埋め込みを処理しました', 'success');
    } catch (error) {
      this.error('手動Instagram埋め込み処理エラー:', error);
      this.notificationService.toast('Instagram埋め込み処理に失敗しました', 'error');
    }
  }

  /**
   * 統計情報の取得
   */
  getStats() {
    const allEmbeds = document.querySelectorAll('.instagram-media, .instagram-embed-wrapper');
    const processedEmbeds = document.querySelectorAll('.instagram-media[data-processed], .instagram-embed-wrapper[data-processed]');
    
    return {
      totalEmbeds: allEmbeds.length,
      processedEmbeds: processedEmbeds.length,
      unprocessedEmbeds: allEmbeds.length - processedEmbeds.length,
      scriptLoaded: this.state.scriptLoaded,
      loadAttempts: this.state.loadAttempts
    };
  }

  /**
   * メトリクスの取得（リファクタリング効果測定用）
   */
  getMetrics() {
    return {
      ...this.getStats(),
      config: this.config,
      state: {
        scriptLoaded: this.state.scriptLoaded,
        scriptLoading: this.state.scriptLoading,
        loadAttempts: this.state.loadAttempts,
        observerActive: !!this.state.observer,
        trackedElements: this.state.elements.size
      },
      componentStatus: 'active'
    };
  }

  /**
   * デバッグ情報の表示
   */
  showDebugInfo() {
    console.log('=== Instagram Embed Module Debug Info ===');
    console.log('Stats:', this.getStats());
    console.log('Config:', this.config);
    console.log('State:', this.state);
    console.log('Metrics:', this.getMetrics());
    console.log('==========================================');
  }

  /**
   * 設定の更新
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('設定が更新されました', 'info');
  }

  /**
   * DOM監視の停止
   */
  stopDOMObserver() {
    if (this.state.observer) {
      this.state.observer.disconnect();
      this.state.observer = null;
      this.log('DOM変更監視停止', 'debug');
    }
  }

  /**
   * コンポーネントの破棄
   */
  destroy() {
    // DOM監視の停止
    this.stopDOMObserver();
    
    // グローバル関数の削除
    delete window.reloadInstagramScript;
    delete window.processInstagramEmbeds;
    
    // 状態のクリア
    this.state.elements.clear();
    
    this.initialized = false;
    this.log('InstagramEmbedModule destroyed', 'info');
  }
}

// シングルトンインスタンス
let instagramEmbedModuleInstance = null;

/**
 * Instagram埋め込みモジュールのシングルトンインスタンスを取得
 */
export function getInstagramEmbedModule() {
  if (!instagramEmbedModuleInstance) {
    instagramEmbedModuleInstance = new InstagramEmbedModule();
  }
  return instagramEmbedModuleInstance;
}

/**
 * Instagram埋め込みスクリプトの再読み込み
 */
export function reloadInstagramScript() {
  return getInstagramEmbedModule().reloadScript();
}

/**
 * Instagram埋め込みの手動処理
 */
export function processInstagramEmbeds() {
  return getInstagramEmbedModule().manualProcess();
} 