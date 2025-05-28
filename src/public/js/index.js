/**
 * RBS アプリケーション メインエントリーポイント
 * 
 * 新しいフォルダ構成:
 * js/
 * ├── core/                    # コアシステム
 * │   ├── base/               # 基底クラス・抽象クラス
 * │   │   └── Component.js    # コンポーネント基底クラス
 * │   ├── events/             # イベント管理システム
 * │   │   └── EventBus.js     # イベントバス
 * │   ├── utils/              # 汎用ユーティリティ
 * │   │   └── helpers.js      # ヘルパー関数
 * │   ├── config/             # 設定管理
 * │   │   └── config.js       # アプリケーション設定
 * │   ├── Application.js      # アプリケーションメインクラス
 * │   └── ModuleLoader.js     # モジュールローダー
 * ├── components/             # UIコンポーネント
 * │   ├── ui/                 # 基本UIコンポーネント
 * │   │   ├── NewsCard.js     # ニュースカード
 * │   │   └── UIInteractionManager.js # UI相互作用管理
 * │   ├── layout/             # レイアウトコンポーネント
 * │   └── business/           # ビジネスロジックコンポーネント
 * │       └── StatusBanner.js # ステータスバナー
 * ├── services/               # ビジネスロジック・データ管理
 * │   ├── data/               # データ管理
 * │   ├── api/                # API関連
 * │   └── business/           # ビジネスロジック
 * │       └── lesson-status-manager.js # レッスンステータス管理
 * ├── pages/                  # ページ固有のロジック
 * │   ├── index/              # トップページ
 * │   │   └── main.js         # インデックスページロジック
 * │   ├── news/               # ニュースページ
 * │   └── admin/              # 管理画面
 * ├── shared/                 # 共有リソース
 * │   ├── constants/          # 定数
 * │   ├── types/              # 型定義（JSDoc用）
 * │   └── mixins/             # ミックスイン
 * └── index.js                # メインエントリーポイント（このファイル）
 */

(function() {
  'use strict';

  // 読み込み順序を定義
  const LOAD_ORDER = {
    // Phase 1: コアシステム
    core: [
      'core/utils/helpers.js',
      'core/events/EventBus.js',
      'core/base/Component.js',
      'core/ModuleLoader.js'
    ],
    
    // Phase 2: UIコンポーネント
    ui: [
      'components/ui/UIInteractionManager.js'
    ],
    
    // Phase 3: ビジネスサービス
    services: [
      'services/business/lesson-status-manager.js'
    ],
    
    // Phase 4: ビジネスコンポーネント
    business: [
      'components/business/StatusBanner.js',
      'components/ui/NewsCard.js'
    ],
    
    // Phase 5: アプリケーション
    app: [
      'core/Application.js'
    ]
  };

  /**
   * スクリプトを動的に読み込み
   * @param {string} src - スクリプトのパス
   * @returns {Promise} 読み込み完了のPromise
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // 既に読み込み済みかチェック
      const existingScript = document.querySelector(`script[src*="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `/src/public/js/${src}`;
      script.async = false; // 順序を保証
      
      script.onload = () => {
        console.log(`[RBS] 読み込み完了: ${src}`);
        resolve();
      };
      
      script.onerror = () => {
        const error = new Error(`スクリプトの読み込みに失敗: ${src}`);
        console.error('[RBS] 読み込みエラー:', error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * フェーズごとにスクリプトを読み込み
   * @param {string[]} scripts - スクリプトパス配列
   * @returns {Promise} 全読み込み完了のPromise
   */
  async function loadPhase(scripts) {
    const promises = scripts.map(script => loadScript(script));
    await Promise.all(promises);
  }

  /**
   * アプリケーションを初期化
   */
  async function initializeApplication() {
    const startTime = Date.now();
    
    try {
      console.log('[RBS] アプリケーション初期化開始...');
      
      // Phase 1: コアシステム
      console.log('[RBS] Phase 1: コアシステム読み込み中...');
      await loadPhase(LOAD_ORDER.core);
      
      // Phase 2: UIコンポーネント
      console.log('[RBS] Phase 2: UIコンポーネント読み込み中...');
      await loadPhase(LOAD_ORDER.ui);
      
      // Phase 3: ビジネスサービス
      console.log('[RBS] Phase 3: ビジネスサービス読み込み中...');
      await loadPhase(LOAD_ORDER.services);
      
      // Phase 4: ビジネスコンポーネント
      console.log('[RBS] Phase 4: ビジネスコンポーネント読み込み中...');
      await loadPhase(LOAD_ORDER.business);
      
      // Phase 5: アプリケーション
      console.log('[RBS] Phase 5: アプリケーション読み込み中...');
      await loadPhase(LOAD_ORDER.app);
      
      const loadTime = Date.now() - startTime;
      console.log(`[RBS] 全モジュール読み込み完了 (${loadTime}ms)`);
      
      // アプリケーション初期化完了イベントを発火
      document.dispatchEvent(new CustomEvent('rbs:ready', {
        detail: { loadTime }
      }));
      
    } catch (error) {
      console.error('[RBS] 初期化エラー:', error);
      
      // エラーイベントを発火
      document.dispatchEvent(new CustomEvent('rbs:error', {
        detail: { error }
      }));
    }
  }

  /**
   * DOM準備完了を待機
   */
  function waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * メイン実行関数
   */
  async function main() {
    try {
      // DOM準備完了を待機
      await waitForDOM();
      
      // アプリケーションを初期化
      await initializeApplication();
      
    } catch (error) {
      console.error('[RBS] メイン実行エラー:', error);
    }
  }

  // 実行
  main();

  // デバッグ用のグローバル関数を公開
  window.RBS = {
    version: '2.0.0',
    loadOrder: LOAD_ORDER,
    
    // デバッグ情報を表示
    debug() {
      console.group('[RBS] デバッグ情報');
      console.log('バージョン:', this.version);
      console.log('読み込み順序:', this.loadOrder);
      
      if (window.app) {
        console.log('アプリケーション情報:', window.app.getInfo());
      }
      
      if (window.eventBus) {
        console.log('イベントバス:', {
          eventNames: window.eventBus.getEventNames(),
          listenerCount: window.eventBus.getListenerCount()
        });
      }
      
      if (window.moduleLoader) {
        window.moduleLoader.debug();
      }
      
      console.groupEnd();
    },
    
    // 再初期化（開発用）
    async reinit() {
      console.log('[RBS] 再初期化中...');
      
      if (window.app) {
        window.app.destroy();
      }
      
      await initializeApplication();
    }
  };

})(); 