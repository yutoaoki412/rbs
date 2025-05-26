/**
 * Modal Component
 * 汎用的なモーダルダイアログを管理するコンポーネント
 */
class Modal {
  constructor(options = {}) {
    this.options = {
      title: '',
      content: '',
      size: 'medium', // small, medium, large, fullscreen
      closable: true,
      closeOnOverlay: true,
      closeOnEscape: true,
      showCloseButton: true,
      animation: 'fade', // fade, slide, zoom
      backdrop: true,
      autoFocus: true,
      restoreFocus: true,
      className: '',
      ...options
    };
    
    this.isOpen = false;
    this.modalElement = null;
    this.overlayElement = null;
    this.previousActiveElement = null;
    this.focusableElements = [];
    
    this.onOpen = this.options.onOpen || (() => {});
    this.onClose = this.options.onClose || (() => {});
    this.onConfirm = this.options.onConfirm || (() => {});
    this.onCancel = this.options.onCancel || (() => {});
  }

  /**
   * モーダルを作成
   */
  create() {
    if (this.modalElement) return;
    
    // オーバーレイを作成
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = `modal-overlay ${this.options.animation}`;
    if (this.options.backdrop) {
      this.overlayElement.classList.add('with-backdrop');
    }
    
    // モーダル本体を作成
    this.modalElement = document.createElement('div');
    this.modalElement.className = `modal modal-${this.options.size} ${this.options.className}`;
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.setAttribute('aria-modal', 'true');
    
    if (this.options.title) {
      this.modalElement.setAttribute('aria-labelledby', 'modal-title');
    }
    
    // モーダル内容を生成
    this.modalElement.innerHTML = this.generateContent();
    
    // オーバーレイにモーダルを追加
    this.overlayElement.appendChild(this.modalElement);
    
    this.bindEvents();
    this.findFocusableElements();
  }

  /**
   * モーダル内容を生成
   */
  generateContent() {
    return `
      <div class="modal-content">
        ${this.generateHeader()}
        ${this.generateBody()}
        ${this.generateFooter()}
      </div>
    `;
  }

  /**
   * ヘッダーを生成
   */
  generateHeader() {
    if (!this.options.title && !this.options.showCloseButton) return '';
    
    return `
      <div class="modal-header">
        ${this.options.title ? `<h2 id="modal-title" class="modal-title">${this.escapeHtml(this.options.title)}</h2>` : ''}
        ${this.options.showCloseButton ? '<button type="button" class="modal-close" aria-label="閉じる">&times;</button>' : ''}
      </div>
    `;
  }

  /**
   * ボディを生成
   */
  generateBody() {
    return `
      <div class="modal-body">
        ${this.options.content}
      </div>
    `;
  }

  /**
   * フッターを生成
   */
  generateFooter() {
    if (!this.options.buttons || this.options.buttons.length === 0) return '';
    
    const buttonsHtml = this.options.buttons.map(button => {
      const className = `btn ${button.className || 'btn-secondary'}`;
      const attributes = button.attributes || {};
      const attributesStr = Object.entries(attributes)
        .map(([key, value]) => `${key}="${this.escapeHtml(value)}"`)
        .join(' ');
      
      return `<button type="button" class="${className}" data-action="${button.action}" ${attributesStr}>${this.escapeHtml(button.text)}</button>`;
    }).join('');
    
    return `
      <div class="modal-footer">
        ${buttonsHtml}
      </div>
    `;
  }

  /**
   * イベントリスナーを設定
   */
  bindEvents() {
    if (!this.modalElement || !this.overlayElement) return;
    
    // 閉じるボタン
    const closeButton = this.modalElement.querySelector('.modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }
    
    // オーバーレイクリック
    if (this.options.closeOnOverlay) {
      this.overlayElement.addEventListener('click', (event) => {
        if (event.target === this.overlayElement) {
          this.close();
        }
      });
    }
    
    // ESCキー
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this.handleKeydown.bind(this));
    }
    
    // ボタンクリック
    const buttons = this.modalElement.querySelectorAll('[data-action]');
    buttons.forEach(button => {
      button.addEventListener('click', (event) => {
        const action = event.target.getAttribute('data-action');
        this.handleButtonClick(action, event);
      });
    });
  }

  /**
   * キーボードイベントを処理
   */
  handleKeydown(event) {
    if (!this.isOpen) return;
    
    switch (event.key) {
      case 'Escape':
        if (this.options.closeOnEscape && this.options.closable) {
          event.preventDefault();
          this.close();
        }
        break;
      case 'Tab':
        this.handleTabKey(event);
        break;
    }
  }

  /**
   * Tabキーによるフォーカス管理
   */
  handleTabKey(event) {
    if (this.focusableElements.length === 0) return;
    
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * ボタンクリックを処理
   */
  handleButtonClick(action, event) {
    switch (action) {
      case 'close':
      case 'cancel':
        this.close();
        this.onCancel(event);
        break;
      case 'confirm':
      case 'ok':
        this.onConfirm(event);
        if (!event.defaultPrevented) {
          this.close();
        }
        break;
      default:
        // カスタムアクション
        if (this.options.onButtonClick) {
          this.options.onButtonClick(action, event);
        }
        break;
    }
  }

  /**
   * フォーカス可能な要素を検索
   */
  findFocusableElements() {
    if (!this.modalElement) return;
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    this.focusableElements = Array.from(
      this.modalElement.querySelectorAll(focusableSelectors.join(', '))
    );
  }

  /**
   * モーダルを開く
   */
  open() {
    if (this.isOpen) return;
    
    // 現在のフォーカス要素を記憶
    if (this.options.restoreFocus) {
      this.previousActiveElement = document.activeElement;
    }
    
    // モーダルを作成（まだ作成されていない場合）
    this.create();
    
    // ボディにモーダルを追加
    document.body.appendChild(this.overlayElement);
    document.body.classList.add('modal-open');
    
    // アニメーション開始
    requestAnimationFrame(() => {
      this.overlayElement.classList.add('active');
      this.modalElement.classList.add('active');
    });
    
    // フォーカス管理
    if (this.options.autoFocus && this.focusableElements.length > 0) {
      setTimeout(() => {
        this.focusableElements[0].focus();
      }, 100);
    }
    
    this.isOpen = true;
    this.onOpen();
  }

  /**
   * モーダルを閉じる
   */
  close() {
    if (!this.isOpen || !this.options.closable) return;
    
    // アニメーション開始
    this.overlayElement.classList.remove('active');
    this.modalElement.classList.remove('active');
    
    // アニメーション完了後に要素を削除
    setTimeout(() => {
      if (this.overlayElement && this.overlayElement.parentNode) {
        this.overlayElement.parentNode.removeChild(this.overlayElement);
      }
      document.body.classList.remove('modal-open');
      
      // フォーカスを復元
      if (this.options.restoreFocus && this.previousActiveElement) {
        this.previousActiveElement.focus();
      }
    }, 300);
    
    this.isOpen = false;
    this.onClose();
  }

  /**
   * モーダル内容を更新
   */
  updateContent(content) {
    if (!this.modalElement) return;
    
    const bodyElement = this.modalElement.querySelector('.modal-body');
    if (bodyElement) {
      bodyElement.innerHTML = content;
      this.findFocusableElements();
    }
  }

  /**
   * モーダルタイトルを更新
   */
  updateTitle(title) {
    if (!this.modalElement) return;
    
    const titleElement = this.modalElement.querySelector('.modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * ローディング状態を表示
   */
  showLoading(message = '読み込み中...') {
    this.updateContent(`
      <div class="modal-loading">
        <div class="loading-spinner"></div>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `);
  }

  /**
   * エラー状態を表示
   */
  showError(message = 'エラーが発生しました') {
    this.updateContent(`
      <div class="modal-error">
        <div class="error-icon">⚠️</div>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `);
  }

  /**
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * モーダルを破棄
   */
  destroy() {
    this.close();
    
    // イベントリスナーを削除
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
    
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
    
    this.modalElement = null;
    this.overlayElement = null;
    this.focusableElements = [];
  }
}

/**
 * 確認ダイアログ用のモーダル
 */
class ConfirmModal extends Modal {
  constructor(message, options = {}) {
    const defaultOptions = {
      title: '確認',
      content: `<p>${message}</p>`,
      size: 'small',
      buttons: [
        { text: 'キャンセル', action: 'cancel', className: 'btn-secondary' },
        { text: 'OK', action: 'confirm', className: 'btn-primary' }
      ],
      ...options
    };
    
    super(defaultOptions);
  }

  /**
   * 確認ダイアログを表示してPromiseを返す
   */
  confirm() {
    return new Promise((resolve) => {
      this.onConfirm = () => resolve(true);
      this.onCancel = () => resolve(false);
      this.onClose = () => resolve(false);
      this.open();
    });
  }
}

/**
 * アラートダイアログ用のモーダル
 */
class AlertModal extends Modal {
  constructor(message, options = {}) {
    const defaultOptions = {
      title: 'お知らせ',
      content: `<p>${message}</p>`,
      size: 'small',
      buttons: [
        { text: 'OK', action: 'confirm', className: 'btn-primary' }
      ],
      ...options
    };
    
    super(defaultOptions);
  }

  /**
   * アラートダイアログを表示してPromiseを返す
   */
  alert() {
    return new Promise((resolve) => {
      this.onConfirm = () => resolve();
      this.onClose = () => resolve();
      this.open();
    });
  }
}

/**
 * プロンプトダイアログ用のモーダル
 */
class PromptModal extends Modal {
  constructor(message, defaultValue = '', options = {}) {
    const inputId = 'prompt-input-' + Date.now();
    const defaultOptions = {
      title: '入力',
      content: `
        <p>${message}</p>
        <div class="form-group">
          <input type="text" id="${inputId}" class="form-control" value="${defaultValue}" placeholder="入力してください">
        </div>
      `,
      size: 'small',
      buttons: [
        { text: 'キャンセル', action: 'cancel', className: 'btn-secondary' },
        { text: 'OK', action: 'confirm', className: 'btn-primary' }
      ],
      ...options
    };
    
    super(defaultOptions);
    this.inputId = inputId;
  }

  /**
   * プロンプトダイアログを表示してPromiseを返す
   */
  prompt() {
    return new Promise((resolve) => {
      this.onConfirm = () => {
        const input = document.getElementById(this.inputId);
        resolve(input ? input.value : null);
      };
      this.onCancel = () => resolve(null);
      this.onClose = () => resolve(null);
      this.open();
      
      // 入力フィールドにフォーカス
      setTimeout(() => {
        const input = document.getElementById(this.inputId);
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    });
  }
}

// 便利な静的メソッド
Modal.confirm = (message, options) => {
  const modal = new ConfirmModal(message, options);
  return modal.confirm();
};

Modal.alert = (message, options) => {
  const modal = new AlertModal(message, options);
  return modal.alert();
};

Modal.prompt = (message, defaultValue, options) => {
  const modal = new PromptModal(message, defaultValue, options);
  return modal.prompt();
};

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Modal, ConfirmModal, AlertModal, PromptModal };
} else if (typeof window !== 'undefined') {
  window.Modal = Modal;
  window.ConfirmModal = ConfirmModal;
  window.AlertModal = AlertModal;
  window.PromptModal = PromptModal;
} 