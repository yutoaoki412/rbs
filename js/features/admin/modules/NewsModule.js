/**
 * ニュース管理モジュール - シンプル版
 * @version 1.0.0
 */

import { BaseModule } from './BaseModule.js';

/**
 * ニュース管理モジュール
 */
export class NewsModule extends BaseModule {
  constructor() {
    super('News');
    
    this.config = {
      autoSave: true,
      saveDelay: 2000,
      maxTitleLength: 100,
      maxContentLength: 5000
    };
  }

  /**
   * セットアップ
   */
  async setup() {
    await this._initializeServices();
    this._bindEvents();
    this._setupAutoSave();
  }

  /**
   * サービス初期化
   */
  async _initializeServices() {
    try {
      const { getAdminNewsSupabaseService } = await import('../services/AdminNewsSupabaseService.js');
      const { getDraftSupabaseService } = await import('../../../shared/services/DraftSupabaseService.js');
      
      this.newsService = getAdminNewsSupabaseService();
      this.draftService = getDraftSupabaseService();
      
      await this.newsService.init();
      await this.draftService.init();
      
    } catch (error) {
      this.handleError(error, 'サービス初期化');
    }
  }

  /**
   * イベントバインド
   */
  _bindEvents() {
    const newsSection = document.getElementById('news');
    if (!newsSection) return;

    // フォーム送信
    const form = newsSection.querySelector('#news-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveNews();
      });
    }

    // プレビューボタン
    const previewBtn = newsSection.querySelector('[data-action="preview"]');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewNews());
    }

    // 下書き保存ボタン
    const draftBtn = newsSection.querySelector('[data-action="save-draft"]');
    if (draftBtn) {
      draftBtn.addEventListener('click', () => this.saveDraft());
    }
  }

  /**
   * 自動保存設定
   */
  _setupAutoSave() {
    if (!this.config.autoSave) return;

    const form = document.querySelector('#news-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('input', this._debounce(() => {
        this.saveDraft();
      }, this.config.saveDelay));
    });
  }

  /**
   * ニュース保存
   */
  async saveNews() {
    try {
      const formData = this._getFormData();
      
      if (!this._validateFormData(formData)) {
        return;
      }

      this.setState({ saving: true });
      
      const result = await this.newsService.saveNews(formData);
      
      if (result.success) {
        this.notify('ニュースを保存しました', 'success');
        this.emit('news:saved', { data: formData });
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      this.handleError(error, 'ニュース保存');
      this.notify('保存に失敗しました', 'error');
    } finally {
      this.setState({ saving: false });
    }
  }

  /**
   * 下書き保存
   */
  async saveDraft() {
    try {
      const formData = this._getFormData();
      await this.draftService.saveDraft('news', formData);
      this.notify('下書きを保存しました', 'info');
    } catch (error) {
      this.handleError(error, '下書き保存');
    }
  }

  /**
   * プレビュー表示
   */
  async previewNews() {
    try {
      const formData = this._getFormData();
      const previewHtml = this._generatePreviewHtml(formData);
      this._showPreview(previewHtml);
    } catch (error) {
      this.handleError(error, 'プレビュー生成');
    }
  }

  /**
   * フォームデータ取得
   */
  _getFormData() {
    const form = document.querySelector('#news-form');
    if (!form) throw new Error('ニュースフォームが見つかりません');

    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
  }

  /**
   * バリデーション
   */
  _validateFormData(data) {
    const errors = [];

    if (!data.title?.trim()) {
      errors.push('タイトルは必須です');
    } else if (data.title.length > this.config.maxTitleLength) {
      errors.push(`タイトルは${this.config.maxTitleLength}文字以下で入力してください`);
    }

    if (!data.content?.trim()) {
      errors.push('内容は必須です');
    } else if (data.content.length > this.config.maxContentLength) {
      errors.push(`内容は${this.config.maxContentLength}文字以下で入力してください`);
    }

    if (errors.length > 0) {
      this.notify(errors.join('\n'), 'error');
      return false;
    }

    return true;
  }

  /**
   * プレビューHTML生成
   */
  _generatePreviewHtml(data) {
    return `
      <div class="news-preview">
        <h2>${this._escapeHtml(data.title)}</h2>
        <div class="news-meta">
          <span class="category">${this._escapeHtml(data.category || '一般')}</span>
          <span class="date">${new Date().toLocaleDateString('ja-JP')}</span>
        </div>
        <div class="news-content">
          ${this._escapeHtml(data.content).replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  }

  /**
   * プレビュー表示
   */
  _showPreview(html) {
    const previewContainer = document.querySelector('#news-preview');
    if (previewContainer) {
      previewContainer.innerHTML = html;
      previewContainer.style.display = 'block';
    }
  }

  /**
   * HTMLエスケープ
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * デバウンス関数
   */
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

/**
 * NewsModuleインスタンス取得
 */
export function getNewsModule() {
  return new NewsModule();
} 