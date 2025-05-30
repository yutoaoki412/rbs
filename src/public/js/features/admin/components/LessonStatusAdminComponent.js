/**
 * レッスン状況管理コンポーネント（管理画面）
 * 管理画面でレッスン開催状況を設定・管理
 * @version 1.1.0 - 新アーキテクチャ対応
 */

import { BaseComponent } from '../../../shared/base/BaseComponent.js';
import { getLessonStatusStorageService } from '../../../shared/services/LessonStatusStorageService.js';
import { EventBus } from '../../../shared/services/EventBus.js';

export class LessonStatusAdminComponent extends BaseComponent {
  constructor(element = '#lesson-status-form, .lesson-status-admin, .admin-lesson-status') {
    super(element, 'LessonStatusAdminComponent');
    
    // サービス参照
    this.lessonStatusService = null;
    
    // DOM要素
    this.formContainer = null;
    this.dateInput = null;
    this.globalStatusInputs = null;
    this.globalMessageInput = null;
    this.courseInputs = {};
    this.actionButtons = {};
    this.previewContainer = null;
    
    // 状態管理
    this.currentFormData = null;
    this.hasUnsavedChanges = false;
    this.isLoading = false;
    
    // コース設定
    this.courses = ['basic', 'advance'];
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async doInit() {
    try {
      this.log('レッスン状況管理コンポーネント初期化開始');
      
      // サービス取得・初期化
      this.lessonStatusService = getLessonStatusStorageService();
      if (!this.lessonStatusService.initialized) {
        await this.lessonStatusService.init();
      }
      
      // DOM要素の設定
      this.findDOMElements();
      
      // フォーム初期化
      this.initializeForm();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // 今日のデータを読み込み
      await this.loadTodayData();
      
      this.log('レッスン状況管理コンポーネント初期化完了');
      
    } catch (error) {
      this.error('初期化エラー:', error);
      this.showErrorMessage('初期化に失敗しました: ' + error.message);
    }
  }

  /**
   * DOM要素を取得
   * @private
   */
  findDOMElements() {
    // フォームコンテナ
    this.formContainer = document.querySelector('#lesson-status .lesson-form, .lesson-status-form');
    
    if (!this.formContainer) {
      this.warn('レッスン状況フォームが見つかりません');
      return;
    }
    
    // 日付入力
    this.dateInput = this.formContainer.querySelector('#lesson-date, input[name="lesson-date"]');
    
    // グローバルステータス
    this.globalStatusInputs = this.formContainer.querySelectorAll('input[name="global-status"]');
    
    // グローバルメッセージ
    this.globalMessageInput = this.formContainer.querySelector('#global-message, textarea[name="global-message"]');
    
    // コース別入力
    this.courses.forEach(course => {
      this.courseInputs[course] = {
        status: this.formContainer.querySelectorAll(`input[name="${course}-lesson"]`),
        message: this.formContainer.querySelector(`#${course}-lesson-note, textarea[name="${course}-note"]`)
      };
    });
    
    // アクションボタン
    this.actionButtons = {
      load: this.formContainer.querySelector('button[data-action="load-lesson-status"]'),
      preview: this.formContainer.querySelector('button[data-action="preview-lesson-status"]'),
      save: this.formContainer.querySelector('button[data-action="update-lesson-status"]')
    };
    
    // プレビューコンテナ
    this.previewContainer = document.querySelector('.lesson-status-preview, #lesson-status-preview');
    
    this.debug('DOM要素取得完了', {
      formContainer: !!this.formContainer,
      dateInput: !!this.dateInput,
      globalStatusInputs: this.globalStatusInputs?.length || 0,
      globalMessageInput: !!this.globalMessageInput,
      actionButtons: Object.keys(this.actionButtons).filter(key => this.actionButtons[key]).length
    });
  }

  /**
   * イベントリスナー設定
   * @private
   */
  setupEventListeners() {
    if (!this.formContainer) return;
    
    // フォーム変更監視
    this.formContainer.addEventListener('change', (event) => {
      this.handleFormChange(event);
    });
    
    this.formContainer.addEventListener('input', (event) => {
      this.handleFormInput(event);
    });
    
    // アクションボタン
    Object.entries(this.actionButtons).forEach(([action, button]) => {
      if (button) {
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          await this.handleAction(action);
        });
      }
    });
    
    // 日付変更時の自動読み込み
    if (this.dateInput) {
      this.dateInput.addEventListener('change', async () => {
        if (this.dateInput.value) {
          await this.loadStatusByDate(this.dateInput.value);
        }
      });
    }
    
    // レッスン状況更新イベント
    EventBus.on('lessonStatus:updated', (data) => {
      this.handleStatusUpdateEvent(data);
    });
    
    // ページ離脱時の確認
    window.addEventListener('beforeunload', (event) => {
      if (this.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '未保存の変更があります。ページを離れますか？';
        return event.returnValue;
      }
    });
    
    this.debug('イベントリスナー設定完了');
  }

  /**
   * フォーム初期化
   * @private
   */
  async initializeForm() {
    try {
      // 今日の日付を設定
      if (this.dateInput && !this.dateInput.value) {
        this.dateInput.value = this.getTodayDate();
      }
      
      // 今日のレッスン状況を読み込み
      await this.loadTodayStatus();
      
    } catch (error) {
      this.error('フォーム初期化エラー:', error);
    }
  }

  /**
   * 今日のレッスン状況を読み込み
   * @returns {Promise<void>}
   */
  async loadTodayStatus() {
    try {
      const today = this.getTodayDate();
      await this.loadStatusByDate(today);
      
    } catch (error) {
      this.error('今日のレッスン状況読み込みエラー:', error);
    }
  }

  /**
   * 指定日のレッスン状況を読み込み
   * @param {string} date - 日付 (YYYY-MM-DD)
   * @returns {Promise<void>}
   */
  async loadStatusByDate(date) {
    try {
      this.setLoading(true);
      
      this.debug(`レッスン状況読み込み: ${date}`);
      
      // データ取得
      const statusData = this.lessonStatusService.getStatusByDate(date);
      
      if (statusData) {
        // フォームにデータを設定
        await this.populateForm(statusData);
        this.currentFormData = statusData;
        this.hasUnsavedChanges = false;
        
        this.log(`レッスン状況読み込み完了: ${date}`);
        this.showNotification('success', 'レッスン状況を読み込みました');
      } else {
        // デフォルト状況を設定
        await this.setDefaultForm(date);
        this.showNotification('info', '新しいレッスン状況を作成中です');
      }
      
    } catch (error) {
      this.error('レッスン状況読み込みエラー:', error);
      this.showNotification('error', 'レッスン状況の読み込みに失敗しました');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * フォームにデータを設定
   * @private
   * @param {Object} statusData - レッスン状況データ
   */
  async populateForm(statusData) {
    try {
      // 日付設定
      if (this.dateInput) {
        this.dateInput.value = statusData.date || this.getTodayDate();
      }
      
      // グローバルステータス設定
      this.setGlobalStatus(statusData.globalStatus);
      
      // グローバルメッセージ設定
      if (this.globalMessageInput) {
        this.globalMessageInput.value = statusData.globalMessage || '';
      }
      
      // コース別設定
      this.courses.forEach(course => {
        const courseData = statusData.courses?.[course];
        if (courseData) {
          this.setCourseStatus(course, courseData.status);
          this.setCourseMessage(course, courseData.message);
        }
      });
      
      this.debug('フォームデータ設定完了');
      
    } catch (error) {
      this.error('フォームデータ設定エラー:', error);
    }
  }

  /**
   * デフォルトフォーム設定
   * @private
   * @param {string} date - 日付
   */
  async setDefaultForm(date) {
    try {
      // 日付設定
      if (this.dateInput) {
        this.dateInput.value = date;
      }
      
      // デフォルトステータス（通常開催）
      this.setGlobalStatus('scheduled');
      
      // メッセージクリア
      if (this.globalMessageInput) {
        this.globalMessageInput.value = '';
      }
      
      // コースをデフォルトに設定
      this.courses.forEach(course => {
        this.setCourseStatus(course, 'scheduled');
        this.setCourseMessage(course, '');
      });
      
      this.currentFormData = null;
      this.hasUnsavedChanges = false;
      
      this.debug('デフォルトフォーム設定完了');
      
    } catch (error) {
      this.error('デフォルトフォーム設定エラー:', error);
    }
  }

  /**
   * グローバルステータスを設定
   * @private
   * @param {string} status - ステータス
   */
  setGlobalStatus(status) {
    if (this.globalStatusInputs) {
      this.globalStatusInputs.forEach(input => {
        input.checked = input.value === status;
      });
    }
  }

  /**
   * コースステータスを設定
   * @private
   * @param {string} course - コース名
   * @param {string} status - ステータス
   */
  setCourseStatus(course, status) {
    const courseInputs = this.courseInputs[course]?.status;
    if (courseInputs) {
      // 管理画面のステータス値をマップ
      const adminStatus = this.mapStatusToAdmin(status);
      courseInputs.forEach(input => {
        input.checked = input.value === adminStatus;
      });
    }
  }

  /**
   * コースメッセージを設定
   * @private
   * @param {string} course - コース名
   * @param {string} message - メッセージ
   */
  setCourseMessage(course, message) {
    const messageInput = this.courseInputs[course]?.message;
    if (messageInput) {
      messageInput.value = message || '';
    }
  }

  /**
   * フォーム変更ハンドラ
   * @private
   * @param {Event} event - 変更イベント
   */
  handleFormChange(event) {
    this.hasUnsavedChanges = true;
    this.updateFormValidation();
    this.debug('フォーム変更検出:', event.target.name);
  }

  /**
   * フォーム入力ハンドラ
   * @private
   * @param {Event} event - 入力イベント
   */
  handleFormInput(event) {
    this.hasUnsavedChanges = true;
    
    // リアルタイムバリデーション
    if (event.target.type === 'textarea') {
      this.validateTextLength(event.target);
    }
  }

  /**
   * アクションハンドラ
   * @private
   * @param {string} action - アクション名
   */
  async handleAction(action) {
    try {
      this.setLoading(true);
      
      switch (action) {
        case 'load':
          await this.handleLoadAction();
          break;
        case 'preview':
          await this.handlePreviewAction();
          break;
        case 'save':
          await this.handleSaveAction();
          break;
        default:
          this.warn('未知のアクション:', action);
      }
      
    } catch (error) {
      this.error(`アクション実行エラー (${action}):`, error);
      this.showNotification('error', `${action}の実行に失敗しました: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 読み込みアクション
   * @private
   */
  async handleLoadAction() {
    const date = this.dateInput?.value || this.getTodayDate();
    await this.loadStatusByDate(date);
  }

  /**
   * プレビューアクション
   * @private
   */
  async handlePreviewAction() {
    const formData = this.collectFormData();
    await this.showPreview(formData);
  }

  /**
   * 保存アクション
   * @private
   */
  async handleSaveAction() {
    const formData = this.collectFormData();
    
    // バリデーション
    const validation = this.validateFormData(formData);
    if (!validation.isValid) {
      this.showNotification('error', `入力エラー: ${validation.errors.join(', ')}`);
      return;
    }
    
    // 保存実行
    const result = await this.lessonStatusService.saveStatus(formData, formData.date);
    
    if (result.success) {
      this.currentFormData = result.data;
      this.hasUnsavedChanges = false;
      this.showNotification('success', 'レッスン状況を保存しました');
      this.log('レッスン状況保存完了:', formData.date);
    } else {
      throw new Error(result.error);
    }
  }

  /**
   * フォームデータを収集
   * @private
   * @returns {Object} フォームデータ
   */
  collectFormData() {
    const formData = {
      date: this.dateInput?.value || this.getTodayDate(),
      globalStatus: this.getSelectedGlobalStatus(),
      globalMessage: this.globalMessageInput?.value || '',
      courses: {}
    };
    
    // コース別データ収集
    this.courses.forEach(course => {
      const status = this.getSelectedCourseStatus(course);
      const message = this.getCourseMessage(course);
      
      formData.courses[course] = {
        status: this.mapAdminToStatus(status),
        message: message || ''
      };
    });
    
    return formData;
  }

  /**
   * 選択されたグローバルステータスを取得
   * @private
   * @returns {string} ステータス
   */
  getSelectedGlobalStatus() {
    if (this.globalStatusInputs) {
      const checked = Array.from(this.globalStatusInputs).find(input => input.checked);
      return checked?.value || 'scheduled';
    }
    return 'scheduled';
  }

  /**
   * 選択されたコースステータスを取得
   * @private
   * @param {string} course - コース名
   * @returns {string} ステータス
   */
  getSelectedCourseStatus(course) {
    const courseInputs = this.courseInputs[course]?.status;
    if (courseInputs) {
      const checked = Array.from(courseInputs).find(input => input.checked);
      return checked?.value || '開催';
    }
    return '開催';
  }

  /**
   * コースメッセージを取得
   * @private
   * @param {string} course - コース名
   * @returns {string} メッセージ
   */
  getCourseMessage(course) {
    const messageInput = this.courseInputs[course]?.message;
    return messageInput?.value || '';
  }

  /**
   * フォームデータバリデーション
   * @private
   * @param {Object} formData - フォームデータ
   * @returns {{isValid: boolean, errors: Array}}
   */
  validateFormData(formData) {
    const errors = [];
    
    if (!formData.date) {
      errors.push('日付は必須です');
    }
    
    if (!formData.globalStatus) {
      errors.push('グローバルステータスは必須です');
    }
    
    if (formData.globalMessage && formData.globalMessage.length > 500) {
      errors.push('グローバルメッセージは500文字以内で入力してください');
    }
    
    // コースメッセージの検証
    this.courses.forEach(course => {
      const courseData = formData.courses[course];
      if (courseData?.message && courseData.message.length > 200) {
        errors.push(`${course}コースのメッセージは200文字以内で入力してください`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * プレビュー表示
   * @private
   * @param {Object} formData - フォームデータ
   */
  async showPreview(formData) {
    if (!this.previewContainer) {
      // プレビューコンテナを動的作成
      this.createPreviewContainer();
    }
    
    if (this.previewContainer) {
      const previewHTML = this.generatePreviewHTML(formData);
      this.previewContainer.innerHTML = previewHTML;
      this.previewContainer.style.display = 'block';
      
      // スクロールしてプレビューを表示
      this.previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      this.debug('プレビュー表示完了');
    }
  }

  /**
   * プレビューHTMLを生成
   * @private
   * @param {Object} formData - フォームデータ
   * @returns {string} プレビューHTML
   */
  generatePreviewHTML(formData) {
    const statusDef = this.lessonStatusService.getStatusDefinition(formData.globalStatus);
    
    // メインステータス
    const mainStatusHTML = `
      <div class="preview-header">
        <h3>${formData.date} のレッスン状況プレビュー</h3>
      </div>
      <div class="global-status-indicator ${statusDef.cssClass}">
        ${statusDef.icon} ${statusDef.displayText}
      </div>
      ${formData.globalMessage ? `
        <div class="preview-global-message">
          <div class="message-content">
            <i class="fas fa-info-circle"></i>
            <span>${this.escapeHtml(formData.globalMessage)}</span>
          </div>
        </div>
      ` : ''}
    `;
    
    // コース別プレビュー
    const coursesHTML = this.courses.map(course => {
      const courseData = formData.courses[course];
      const courseDef = this.lessonStatusService.getStatusDefinition(courseData.status);
      const defaultCourse = this.lessonStatusService.defaultCourses[course];
      
      return `
        <div class="preview-course-item">
          <div class="course-header">
            <h5>${defaultCourse.name}</h5>
            <p>${defaultCourse.time}</p>
          </div>
          <div class="course-status ${courseDef.cssClass}">
            ${courseDef.icon} ${courseDef.displayText}
          </div>
          ${courseData.message ? `
            <p class="course-message">${this.escapeHtml(courseData.message)}</p>
          ` : ''}
        </div>
      `;
    }).join('');
    
    return `
      <div class="lesson-status-preview">
        ${mainStatusHTML}
        <div class="courses-grid">
          ${coursesHTML}
        </div>
        <div class="preview-footer">
          <p class="note">※ 保存後にLP側で表示されるプレビューです</p>
        </div>
      </div>
    `;
  }

  /**
   * プレビューコンテナを作成
   * @private
   */
  createPreviewContainer() {
    const previewHTML = `
      <div class="lesson-status-preview" id="lesson-status-preview" style="display: none;">
        <!-- プレビュー内容がここに表示されます -->
      </div>
    `;
    
    if (this.formContainer) {
      this.formContainer.insertAdjacentHTML('afterend', previewHTML);
      this.previewContainer = document.getElementById('lesson-status-preview');
    }
  }

  /**
   * ステータス更新イベントハンドラ
   * @private
   * @param {Object} data - 更新データ
   */
  handleStatusUpdateEvent(data) {
    const currentDate = this.dateInput?.value || this.getTodayDate();
    
    if (data.date === currentDate && data.source !== 'local') {
      this.debug('他のタブからレッスン状況が更新されました');
      this.showNotification('info', '他のタブからレッスン状況が更新されました');
      
      // 確認してリロード
      if (confirm('他のタブでレッスン状況が更新されました。最新の内容を読み込みますか？')) {
        this.loadStatusByDate(currentDate);
      }
    }
  }

  /**
   * ステータスマッピング（標準→管理画面）
   * @private
   * @param {string} status - 標準ステータス
   * @returns {string} 管理画面ステータス
   */
  mapStatusToAdmin(status) {
    const mapping = {
      'scheduled': '開催',
      'cancelled': '中止',
      'indoor': '室内開催',
      'postponed': '延期'
    };
    return mapping[status] || '開催';
  }

  /**
   * ステータスマッピング（管理画面→標準）
   * @private
   * @param {string} adminStatus - 管理画面ステータス
   * @returns {string} 標準ステータス
   */
  mapAdminToStatus(adminStatus) {
    const mapping = {
      '開催': 'scheduled',
      '中止': 'cancelled',
      '室内開催': 'indoor',
      '延期': 'postponed'
    };
    return mapping[adminStatus] || 'scheduled';
  }

  /**
   * フォームバリデーション更新
   * @private
   */
  updateFormValidation() {
    // リアルタイムバリデーション表示
    // 現在は基本的なチェックのみ
  }

  /**
   * テキスト長バリデーション
   * @private
   * @param {HTMLElement} textElement - テキスト要素
   */
  validateTextLength(textElement) {
    const maxLength = textElement.name?.includes('global') ? 500 : 200;
    const currentLength = textElement.value.length;
    
    // 長さ表示
    let lengthIndicator = textElement.parentElement.querySelector('.length-indicator');
    if (!lengthIndicator) {
      lengthIndicator = document.createElement('small');
      lengthIndicator.className = 'length-indicator';
      textElement.parentElement.appendChild(lengthIndicator);
    }
    
    lengthIndicator.textContent = `${currentLength}/${maxLength}文字`;
    lengthIndicator.style.color = currentLength > maxLength ? '#e74c3c' : '#666';
  }

  /**
   * ローディング状態設定
   * @private
   * @param {boolean} loading - ローディング中の場合true
   */
  setLoading(loading) {
    this.isLoading = loading;
    
    // ボタンの無効化/有効化
    Object.values(this.actionButtons).forEach(button => {
      if (button) {
        button.disabled = loading;
        
        // スピナー表示
        const spinner = button.querySelector('.fa-spinner');
        if (loading && !spinner) {
          const icon = button.querySelector('i');
          if (icon) {
            icon.className = 'fas fa-spinner fa-spin';
          }
        } else if (!loading && spinner) {
          // 元のアイコンに戻す
          spinner.className = this.getOriginalIconClass(button);
        }
      }
    });
  }

  /**
   * 元のアイコンクラスを取得
   * @private
   * @param {HTMLElement} button - ボタン要素
   * @returns {string} アイコンクラス
   */
  getOriginalIconClass(button) {
    const action = button.getAttribute('data-action');
    const iconMap = {
      'load-lesson-status': 'fas fa-download',
      'preview-lesson-status': 'fas fa-eye',
      'update-lesson-status': 'fas fa-save'
    };
    return iconMap[action] || 'fas fa-cog';
  }

  /**
   * 通知表示
   * @private
   * @param {string} type - 通知タイプ (success, error, info, warning)
   * @param {string} message - メッセージ
   */
  showNotification(type, message) {
    // EventBusで通知イベントを発行
    EventBus.emit('notification:show', {
      type,
      message,
      duration: type === 'error' ? 5000 : 3000
    });
  }

  /**
   * 今日の日付を取得
   * @private
   * @returns {string} YYYY-MM-DD形式の日付
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * HTMLエスケープ
   * @private
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 未保存変更の確認
   * @returns {boolean} 保存が必要な場合true
   */
  hasUnsavedData() {
    return this.hasUnsavedChanges;
  }

  /**
   * フォームリセット
   * @returns {Promise<void>}
   */
  async resetForm() {
    if (this.hasUnsavedChanges) {
      if (!confirm('未保存の変更があります。リセットしますか？')) {
        return;
      }
    }
    
    await this.setDefaultForm(this.getTodayDate());
    this.showNotification('info', 'フォームをリセットしました');
  }

  /**
   * コンポーネント破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      // イベントリスナー削除
      EventBus.off('lessonStatus:updated');
      
      // 親クラスの破棄
      await super.destroy();
      
      this.log('コンポーネント破棄完了');
      
    } catch (error) {
      this.error('コンポーネント破棄エラー:', error);
    }
  }
}

export default LessonStatusAdminComponent; 