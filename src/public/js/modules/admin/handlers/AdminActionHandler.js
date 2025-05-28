/**
 * RBS陸上教室 管理画面アクションハンドラー
 * 管理画面固有のdata-actionを処理
 */

import { actionHandler } from '../../../shared/services/ActionHandler.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class AdminActionHandler {
  constructor() {
    this.initialized = false;
  }

  /**
   * 管理画面アクションハンドラーを初期化
   */
  init() {
    if (this.initialized) return;
    
    this.registerAdminActions();
    this.setupEventListeners();
    this.initialized = true;
    
    console.log('✅ AdminActionHandler initialized');
  }

  /**
   * 管理画面固有のアクションを登録
   */
  registerAdminActions() {
    actionHandler.registerMultiple({
      // 認証関連
      'logout': () => {
        if (confirm('ログアウトしますか？')) {
          EventBus.emit('admin:logout');
        }
      },

      // タブ切り替え
      'switch-tab': (element, params) => {
        const tabName = params.tab;
        if (tabName) {
          EventBus.emit('admin:switch-tab', { tab: tabName });
        }
      },

      // 記事管理
      'clear-news-editor': () => {
        if (confirm('記事エディターの内容をクリアしますか？')) {
          EventBus.emit('admin:clear-editor');
        }
      },

      'preview-news': () => {
        EventBus.emit('admin:preview-news');
      },

      'save-news': () => {
        EventBus.emit('admin:save-news');
      },

      'publish-news': () => {
        EventBus.emit('admin:publish-news');
      },

      'test-article-service': () => {
        EventBus.emit('admin:test-article-service');
      },

      // Markdown編集
      'insert-markdown': (element, params) => {
        const start = params.start || '';
        const end = params.end || '';
        this.insertMarkdown(start, end);
      },

      // 記事リスト管理
      'filter-news-list': (element, params) => {
        const filterValue = element.value;
        EventBus.emit('admin:filter-news', { filter: filterValue });
      },

      'refresh-news-list': () => {
        EventBus.emit('admin:refresh-news-list');
      },

      // レッスン状況管理
      'load-lesson-status': () => {
        EventBus.emit('admin:load-lesson-status');
      },

      'preview-lesson-status': () => {
        EventBus.emit('admin:preview-lesson-status');
      },

      'update-lesson-status': () => {
        EventBus.emit('admin:update-lesson-status');
      },

      // データ管理
      'export-data': () => {
        if (confirm('データをエクスポートしますか？')) {
          EventBus.emit('admin:export-data');
        }
      },

      'clear-all-data': () => {
        if (confirm('本当にすべてのデータを削除しますか？この操作は取り消せません。')) {
          EventBus.emit('admin:clear-all-data');
        }
      },

      // サイト連携
      'test-site-connection': () => {
        EventBus.emit('admin:test-site-connection');
      },

      // デバッグ
      'reset-local-storage': () => {
        if (confirm('LocalStorageをリセットしますか？')) {
          EventBus.emit('admin:reset-storage');
        }
      },

      // モーダル
      'close-modal': () => {
        EventBus.emit('admin:close-modal');
      }
    });
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // 記事リストのアイテムクリック
    document.addEventListener('click', (event) => {
      const articleItem = event.target.closest('.article-item');
      if (articleItem && articleItem.dataset.articleId) {
        event.preventDefault();
        EventBus.emit('admin:edit-article', { 
          id: articleItem.dataset.articleId 
        });
      }
    });

    // サイドバーナビゲーション
    document.addEventListener('click', (event) => {
      const navItem = event.target.closest('.nav-item');
      if (navItem && navItem.dataset.tab) {
        // 既存のdata-actionハンドラーが処理するので、重複処理を避ける
        // ここでは特別な処理が必要な場合のみ
      }
    });
  }

  /**
   * Markdownを挿入
   */
  insertMarkdown(startText, endText) {
    const editor = document.getElementById('news-content');
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    const before = editor.value.substring(0, start);
    const after = editor.value.substring(end);
    
    const newText = startText + selectedText + endText;
    editor.value = before + newText + after;
    
    // カーソル位置を調整
    const newCursorPos = start + startText.length + selectedText.length;
    editor.setSelectionRange(newCursorPos, newCursorPos);
    editor.focus();

    // 変更イベントを発火
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.initialized = false;
  }
}

export const adminActionHandler = new AdminActionHandler(); 