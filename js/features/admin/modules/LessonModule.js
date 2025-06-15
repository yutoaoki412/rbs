/**
 * レッスン管理モジュール - シンプル版
 * @version 1.0.0
 */

import { BaseModule } from './BaseModule.js';

/**
 * レッスン管理モジュール
 */
export class LessonModule extends BaseModule {
  constructor() {
    super('Lesson');
    
    this.config = {
      autoSave: true,
      saveDelay: 3000,
      courses: ['elementary', 'intermediate', 'advanced', 'practice']
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
      const { getLessonStatusSupabaseService } = await import('../../../shared/services/LessonStatusSupabaseService.js');
      const { getDraftSupabaseService } = await import('../../../shared/services/DraftSupabaseService.js');
      
      this.lessonService = getLessonStatusSupabaseService();
      this.draftService = getDraftSupabaseService();
      
      await this.lessonService.init();
      await this.draftService.init();
      
    } catch (error) {
      this.handleError(error, 'サービス初期化');
    }
  }

  /**
   * イベントバインド
   */
  _bindEvents() {
    const lessonSection = document.getElementById('lesson-status');
    if (!lessonSection) return;

    // 日付変更
    const dateInput = lessonSection.querySelector('#lesson-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => this.loadLessonStatus());
    }

    // ステータス更新
    const statusInputs = lessonSection.querySelectorAll('input[type="radio"]');
    statusInputs.forEach(input => {
      input.addEventListener('change', () => this.updateStatus());
    });

    // 保存ボタン
    const saveBtn = lessonSection.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveLessonStatus());
    }

    // プレビューボタン
    const previewBtn = lessonSection.querySelector('[data-action="preview"]');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewLessonStatus());
    }
  }

  /**
   * 自動保存設定
   */
  _setupAutoSave() {
    if (!this.config.autoSave) return;

    const form = document.querySelector('#lesson-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', this._debounce(() => {
        this.saveDraft();
      }, this.config.saveDelay));
    });
  }

  /**
   * レッスン状況読み込み
   */
  async loadLessonStatus() {
    try {
      const date = this._getSelectedDate();
      if (!date) return;

      this.setState({ loading: true });
      
      const data = await this.lessonService.getLessonStatus(date);
      this._populateForm(data);
      
      this.notify('レッスン状況を読み込みました', 'info');
      
    } catch (error) {
      this.handleError(error, 'レッスン状況読み込み');
    } finally {
      this.setState({ loading: false });
    }
  }

  /**
   * レッスン状況保存
   */
  async saveLessonStatus() {
    try {
      const formData = this._getFormData();
      
      if (!this._validateFormData(formData)) {
        return;
      }

      this.setState({ saving: true });
      
      const result = await this.lessonService.saveLessonStatus(formData);
      
      if (result.success) {
        this.notify('レッスン状況を保存しました', 'success');
        this.emit('lesson:saved', { data: formData });
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      this.handleError(error, 'レッスン状況保存');
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
      await this.draftService.saveDraft('lesson', formData);
    } catch (error) {
      this.handleError(error, '下書き保存');
    }
  }

  /**
   * プレビュー表示
   */
  async previewLessonStatus() {
    try {
      const formData = this._getFormData();
      const previewHtml = this._generatePreviewHtml(formData);
      this._showPreview(previewHtml);
    } catch (error) {
      this.handleError(error, 'プレビュー生成');
    }
  }

  /**
   * ステータス更新
   */
  updateStatus() {
    const formData = this._getFormData();
    this.setState({ currentStatus: formData });
    this.emit('lesson:status-changed', { status: formData });
  }

  /**
   * フォームデータ取得
   */
  _getFormData() {
    const form = document.querySelector('#lesson-form');
    if (!form) throw new Error('レッスンフォームが見つかりません');

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 日付の設定
    data.date = this._getSelectedDate();
    
    return data;
  }

  /**
   * 選択された日付取得
   */
  _getSelectedDate() {
    const dateInput = document.querySelector('#lesson-date');
    return dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  }

  /**
   * フォームにデータを設定
   */
  _populateForm(data) {
    const form = document.querySelector('#lesson-form');
    if (!form || !data) return;

    // 日付設定
    const dateInput = form.querySelector('#lesson-date');
    if (dateInput && data.date) {
      dateInput.value = data.date;
    }

    // グローバルメッセージ
    const globalMessage = form.querySelector('#global-message');
    if (globalMessage && data.globalMessage) {
      globalMessage.value = data.globalMessage;
    }

    // コース別設定
    this.config.courses.forEach(course => {
      if (data[course]) {
        const statusInput = form.querySelector(`input[name="${course}-status"][value="${data[course].status}"]`);
        if (statusInput) statusInput.checked = true;

        const messageInput = form.querySelector(`#${course}-message`);
        if (messageInput && data[course].message) {
          messageInput.value = data[course].message;
        }
      }
    });
  }

  /**
   * バリデーション
   */
  _validateFormData(data) {
    const errors = [];

    if (!data.date) {
      errors.push('日付は必須です');
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
    let html = `
      <div class="lesson-preview">
        <h2>レッスン状況 - ${data.date}</h2>
    `;

    if (data.globalMessage) {
      html += `
        <div class="global-message">
          <h3>全体のお知らせ</h3>
          <p>${this._escapeHtml(data.globalMessage)}</p>
        </div>
      `;
    }

    html += '<div class="courses">';
    
    this.config.courses.forEach(course => {
      const courseData = data[course];
      if (courseData) {
        html += `
          <div class="course-status">
            <h4>${this._getCourseName(course)}</h4>
            <div class="status ${courseData.status}">${this._getStatusLabel(courseData.status)}</div>
            ${courseData.message ? `<p>${this._escapeHtml(courseData.message)}</p>` : ''}
          </div>
        `;
      }
    });

    html += '</div></div>';
    return html;
  }

  /**
   * プレビュー表示
   */
  _showPreview(html) {
    const previewContainer = document.querySelector('#lesson-preview');
    if (previewContainer) {
      previewContainer.innerHTML = html;
      previewContainer.style.display = 'block';
    }
  }

  /**
   * コース名取得
   */
  _getCourseName(course) {
    const names = {
      elementary: '初級',
      intermediate: '中級',
      advanced: '上級',
      practice: '実践'
    };
    return names[course] || course;
  }

  /**
   * ステータスラベル取得
   */
  _getStatusLabel(status) {
    const labels = {
      normal: '通常開催',
      cancelled: '休講',
      changed: '変更あり'
    };
    return labels[status] || status;
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
 * LessonModuleインスタンス取得
 */
export function getLessonModule() {
  return new LessonModule();
} 