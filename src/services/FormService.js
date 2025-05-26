/**
 * FormService
 * フォームの管理、バリデーション、送信を行うサービスクラス
 * 統一されたクラス設計とエラーハンドリングを実装
 */
class FormService {
  constructor(options = {}) {
    this.options = {
      autoSave: options.autoSave || true,
      autoSaveInterval: options.autoSaveInterval || 30000, // 30秒
      storageKey: options.storageKey || 'form_data',
      validateOnInput: options.validateOnInput || true,
      validateOnBlur: options.validateOnBlur || true,
      showErrorsInline: options.showErrorsInline || true,
      submitEndpoint: options.submitEndpoint || null,
      ...options
    };

    // 状態管理
    this.state = {
      isInitialized: false,
      forms: new Map(),
      validationRules: new Map(),
      errors: new Map(),
      isSubmitting: false
    };

    // タイマー管理
    this.timers = {
      autoSave: null
    };

    // ストレージマネージャー
    this.storageManager = options.storageManager || window.storageManager;
    this.apiClient = options.apiClient || window.apiClient;

    // バリデーションルール
    this.defaultValidationRules = {
      required: (value) => {
        return value !== null && value !== undefined && value.toString().trim() !== '';
      },
      email: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !value || emailRegex.test(value);
      },
      phone: (value) => {
        const phoneRegex = /^[\d\-\(\)\+\s]+$/;
        return !value || phoneRegex.test(value);
      },
      minLength: (value, min) => {
        return !value || value.toString().length >= min;
      },
      maxLength: (value, max) => {
        return !value || value.toString().length <= max;
      },
      pattern: (value, pattern) => {
        const regex = new RegExp(pattern);
        return !value || regex.test(value);
      },
      number: (value) => {
        return !value || !isNaN(Number(value));
      },
      url: (value) => {
        try {
          return !value || Boolean(new URL(value));
        } catch {
          return false;
        }
      }
    };

    // エラーメッセージ
    this.errorMessages = {
      required: 'この項目は必須です',
      email: '有効なメールアドレスを入力してください',
      phone: '有効な電話番号を入力してください',
      minLength: '最低{min}文字以上入力してください',
      maxLength: '{max}文字以内で入力してください',
      pattern: '入力形式が正しくありません',
      number: '数値を入力してください',
      url: '有効なURLを入力してください'
    };

    // イベントハンドラーのバインド
    this.boundHandlers = {
      handleInput: this.handleInput.bind(this),
      handleBlur: this.handleBlur.bind(this),
      handleSubmit: this.handleSubmit.bind(this),
      handleBeforeUnload: this.handleBeforeUnload.bind(this)
    };

    this.init();
  }

  /**
   * サービスを初期化
   */
  async init() {
    try {
      this.bindGlobalEvents();
      this.discoverForms();
      this.loadSavedData();
      this.startAutoSave();
      this.state.isInitialized = true;
      
      this.dispatchEvent('form-service:initialized', { service: this });
      
    } catch (error) {
      this.handleError('フォームサービスの初期化に失敗', error);
    }
  }

  /**
   * グローバルイベントを設定
   */
  bindGlobalEvents() {
    window.addEventListener('beforeunload', this.boundHandlers.handleBeforeUnload);
  }

  /**
   * ページ内のフォームを自動発見
   */
  discoverForms() {
    const forms = document.querySelectorAll('form[data-form-service]');
    
    forms.forEach(form => {
      this.registerForm(form);
    });
  }

  /**
   * フォームを登録
   */
  registerForm(formElement, options = {}) {
    try {
      const formId = formElement.id || `form_${Date.now()}`;
      if (!formElement.id) {
        formElement.id = formId;
      }

      const formConfig = {
        element: formElement,
        fields: new Map(),
        options: {
          validateOnSubmit: true,
          preventDefaultSubmit: true,
          autoSave: this.options.autoSave,
          ...options
        }
      };

      // フォームフィールドを登録
      this.registerFormFields(formElement, formConfig);

      // イベントリスナーを設定
      this.bindFormEvents(formElement, formConfig);

      // フォームを保存
      this.state.forms.set(formId, formConfig);

      this.dispatchEvent('form-service:form-registered', { formId, form: formConfig });
      
      return formId;
    } catch (error) {
      this.handleError('フォーム登録に失敗', error);
      return null;
    }
  }

  /**
   * フォームフィールドを登録
   */
  registerFormFields(formElement, formConfig) {
    const fields = formElement.querySelectorAll('input, textarea, select');
    
    fields.forEach(field => {
      const fieldName = field.name || field.id;
      if (!fieldName) return;

      const fieldConfig = {
        element: field,
        name: fieldName,
        type: field.type || 'text',
        required: field.hasAttribute('required'),
        validationRules: this.parseValidationRules(field),
        errorElement: null
      };

      // エラー表示要素を作成
      if (this.options.showErrorsInline) {
        fieldConfig.errorElement = this.createErrorElement(field);
      }

      formConfig.fields.set(fieldName, fieldConfig);
    });
  }

  /**
   * バリデーションルールを解析
   */
  parseValidationRules(field) {
    const rules = [];

    // required属性
    if (field.hasAttribute('required')) {
      rules.push({ type: 'required' });
    }

    // type属性に基づくルール
    switch (field.type) {
      case 'email':
        rules.push({ type: 'email' });
        break;
      case 'tel':
        rules.push({ type: 'phone' });
        break;
      case 'url':
        rules.push({ type: 'url' });
        break;
      case 'number':
        rules.push({ type: 'number' });
        break;
    }

    // minlength/maxlength属性
    if (field.hasAttribute('minlength')) {
      rules.push({ 
        type: 'minLength', 
        value: parseInt(field.getAttribute('minlength')) 
      });
    }
    
    if (field.hasAttribute('maxlength')) {
      rules.push({ 
        type: 'maxLength', 
        value: parseInt(field.getAttribute('maxlength')) 
      });
    }

    // pattern属性
    if (field.hasAttribute('pattern')) {
      rules.push({ 
        type: 'pattern', 
        value: field.getAttribute('pattern') 
      });
    }

    // data-validation属性
    const customValidation = field.getAttribute('data-validation');
    if (customValidation) {
      try {
        const customRules = JSON.parse(customValidation);
        rules.push(...customRules);
      } catch (error) {
        console.warn('Invalid validation rules:', customValidation);
      }
    }

    return rules;
  }

  /**
   * エラー表示要素を作成
   */
  createErrorElement(field) {
    const errorId = `${field.name || field.id}_error`;
    let errorElement = document.getElementById(errorId);
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.className = 'form-error';
      errorElement.style.display = 'none';
      errorElement.setAttribute('role', 'alert');
      
      // フィールドの後に挿入
      field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
    
    return errorElement;
  }

  /**
   * フォームイベントを設定
   */
  bindFormEvents(formElement, formConfig) {
    // フォーム送信イベント
    formElement.addEventListener('submit', (event) => {
      this.boundHandlers.handleSubmit(event, formConfig);
    });

    // フィールドイベント
    formConfig.fields.forEach((fieldConfig, fieldName) => {
      const field = fieldConfig.element;

      if (this.options.validateOnInput) {
        field.addEventListener('input', (event) => {
          this.boundHandlers.handleInput(event, fieldConfig);
        });
      }

      if (this.options.validateOnBlur) {
        field.addEventListener('blur', (event) => {
          this.boundHandlers.handleBlur(event, fieldConfig);
        });
      }
    });
  }

  /**
   * 入力イベント処理
   */
  handleInput(event, fieldConfig) {
    const formId = event.target.closest('form').id;
    
    // リアルタイムバリデーション
    this.validateField(formId, fieldConfig.name);
    
    // 自動保存データを更新
    if (this.options.autoSave) {
      this.updateAutoSaveData(formId);
    }
  }

  /**
   * ブラーイベント処理
   */
  handleBlur(event, fieldConfig) {
    const formId = event.target.closest('form').id;
    this.validateField(formId, fieldConfig.name);
  }

  /**
   * 送信イベント処理
   */
  async handleSubmit(event, formConfig) {
    const formId = formConfig.element.id;
    
    if (formConfig.options.preventDefaultSubmit) {
      event.preventDefault();
    }

    try {
      // フォーム全体をバリデーション
      const isValid = this.validateForm(formId);
      
      if (!isValid) {
        this.dispatchEvent('form-service:validation-failed', { formId });
        return false;
      }

      // フォームデータを取得
      const formData = this.getFormData(formId);
      
      // 送信処理
      const result = await this.submitForm(formId, formData);
      
      if (result.success) {
        // 成功時の処理
        this.clearAutoSaveData(formId);
        this.dispatchEvent('form-service:submit-success', { formId, data: formData, result });
      } else {
        // エラー時の処理
        this.dispatchEvent('form-service:submit-error', { formId, error: result.error });
      }
      
      return result.success;
      
    } catch (error) {
      this.handleError('フォーム送信に失敗', error);
      this.dispatchEvent('form-service:submit-error', { formId, error: error.message });
      return false;
    }
  }

  /**
   * フィールドをバリデーション
   */
  validateField(formId, fieldName) {
    const form = this.state.forms.get(formId);
    if (!form) return true;

    const fieldConfig = form.fields.get(fieldName);
    if (!fieldConfig) return true;

    const value = fieldConfig.element.value;
    const errors = [];

    // バリデーションルールを実行
    fieldConfig.validationRules.forEach(rule => {
      const validator = this.defaultValidationRules[rule.type];
      if (validator) {
        const isValid = validator(value, rule.value);
        if (!isValid) {
          let message = this.errorMessages[rule.type] || 'エラーが発生しました';
          
          // メッセージのプレースホルダーを置換
          if (rule.value !== undefined) {
            message = message.replace(`{${rule.type.replace('Length', '')}}`, rule.value);
          }
          
          errors.push(message);
        }
      }
    });

    // エラー表示を更新
    this.updateFieldErrors(fieldConfig, errors);

    // フォームレベルのエラー状態を更新
    if (!this.state.errors.has(formId)) {
      this.state.errors.set(formId, new Map());
    }
    
    const formErrors = this.state.errors.get(formId);
    if (errors.length > 0) {
      formErrors.set(fieldName, errors);
    } else {
      formErrors.delete(fieldName);
    }

    return errors.length === 0;
  }

  /**
   * フォーム全体をバリデーション
   */
  validateForm(formId) {
    const form = this.state.forms.get(formId);
    if (!form) return false;

    let isValid = true;

    form.fields.forEach((fieldConfig, fieldName) => {
      const fieldValid = this.validateField(formId, fieldName);
      if (!fieldValid) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * フィールドエラー表示を更新
   */
  updateFieldErrors(fieldConfig, errors) {
    const field = fieldConfig.element;
    const errorElement = fieldConfig.errorElement;

    if (errors.length > 0) {
      // エラーがある場合
      field.classList.add('form-error-field');
      field.setAttribute('aria-invalid', 'true');
      
      if (errorElement) {
        errorElement.textContent = errors[0]; // 最初のエラーのみ表示
        errorElement.style.display = 'block';
        field.setAttribute('aria-describedby', errorElement.id);
      }
    } else {
      // エラーがない場合
      field.classList.remove('form-error-field');
      field.setAttribute('aria-invalid', 'false');
      
      if (errorElement) {
        errorElement.style.display = 'none';
        field.removeAttribute('aria-describedby');
      }
    }
  }

  /**
   * フォームデータを取得
   */
  getFormData(formId) {
    const form = this.state.forms.get(formId);
    if (!form) return {};

    const data = {};
    
    form.fields.forEach((fieldConfig, fieldName) => {
      const field = fieldConfig.element;
      
      if (field.type === 'checkbox') {
        data[fieldName] = field.checked;
      } else if (field.type === 'radio') {
        if (field.checked) {
          data[fieldName] = field.value;
        }
      } else {
        data[fieldName] = field.value;
      }
    });

    return data;
  }

  /**
   * フォームを送信
   */
  async submitForm(formId, formData) {
    try {
      this.state.isSubmitting = true;
      
      if (this.options.submitEndpoint) {
        // API経由で送信
        const response = await this.apiClient.post(this.options.submitEndpoint, formData);
        return { success: true, data: response };
      } else {
        // カスタム送信処理
        return { success: true, data: formData };
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      this.state.isSubmitting = false;
    }
  }

  /**
   * 自動保存を開始
   */
  startAutoSave() {
    if (!this.options.autoSave) return;

    this.timers.autoSave = setInterval(() => {
      this.saveAllFormsData();
    }, this.options.autoSaveInterval);
  }

  /**
   * 自動保存を停止
   */
  stopAutoSave() {
    if (this.timers.autoSave) {
      clearInterval(this.timers.autoSave);
      this.timers.autoSave = null;
    }
  }

  /**
   * すべてのフォームデータを保存
   */
  saveAllFormsData() {
    this.state.forms.forEach((form, formId) => {
      if (form.options.autoSave) {
        this.updateAutoSaveData(formId);
      }
    });
  }

  /**
   * 自動保存データを更新
   */
  updateAutoSaveData(formId) {
    try {
      const formData = this.getFormData(formId);
      const storageKey = `${this.options.storageKey}_${formId}`;
      
      this.storageManager.setLocal(storageKey, {
        data: formData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.warn('自動保存に失敗:', error);
    }
  }

  /**
   * 保存されたデータを読み込み
   */
  loadSavedData() {
    this.state.forms.forEach((form, formId) => {
      this.loadFormData(formId);
    });
  }

  /**
   * フォームデータを読み込み
   */
  loadFormData(formId) {
    try {
      const storageKey = `${this.options.storageKey}_${formId}`;
      const savedData = this.storageManager.getLocal(storageKey);
      
      if (savedData && savedData.data) {
        this.setFormData(formId, savedData.data);
        
        this.dispatchEvent('form-service:data-loaded', { 
          formId, 
          data: savedData.data,
          timestamp: savedData.timestamp 
        });
      }
      
    } catch (error) {
      console.warn('データ読み込みに失敗:', error);
    }
  }

  /**
   * フォームデータを設定
   */
  setFormData(formId, data) {
    const form = this.state.forms.get(formId);
    if (!form) return;

    form.fields.forEach((fieldConfig, fieldName) => {
      if (data.hasOwnProperty(fieldName)) {
        const field = fieldConfig.element;
        const value = data[fieldName];
        
        if (field.type === 'checkbox') {
          field.checked = Boolean(value);
        } else if (field.type === 'radio') {
          field.checked = field.value === value;
        } else {
          field.value = value || '';
        }
      }
    });
  }

  /**
   * 自動保存データをクリア
   */
  clearAutoSaveData(formId) {
    try {
      const storageKey = `${this.options.storageKey}_${formId}`;
      this.storageManager.remove(storageKey, 'local');
    } catch (error) {
      console.warn('自動保存データのクリアに失敗:', error);
    }
  }

  /**
   * ページ離脱前の処理
   */
  handleBeforeUnload(event) {
    // 未保存の変更があるかチェック
    let hasUnsavedChanges = false;
    
    this.state.forms.forEach((form, formId) => {
      const formErrors = this.state.errors.get(formId);
      if (formErrors && formErrors.size > 0) {
        hasUnsavedChanges = true;
      }
    });

    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '未保存の変更があります。ページを離れますか？';
      return event.returnValue;
    }
  }

  /**
   * カスタムバリデーションルールを追加
   */
  addValidationRule(name, validator, errorMessage) {
    this.defaultValidationRules[name] = validator;
    this.errorMessages[name] = errorMessage;
  }

  /**
   * フォームをリセット
   */
  resetForm(formId) {
    const form = this.state.forms.get(formId);
    if (!form) return;

    // フォーム要素をリセット
    form.element.reset();

    // エラー状態をクリア
    this.state.errors.delete(formId);
    
    form.fields.forEach((fieldConfig) => {
      this.updateFieldErrors(fieldConfig, []);
    });

    // 自動保存データをクリア
    this.clearAutoSaveData(formId);

    this.dispatchEvent('form-service:form-reset', { formId });
  }

  /**
   * フォームエラーを取得
   */
  getFormErrors(formId) {
    const formErrors = this.state.errors.get(formId);
    return formErrors ? Object.fromEntries(formErrors) : {};
  }

  /**
   * フォームが有効かチェック
   */
  isFormValid(formId) {
    const formErrors = this.state.errors.get(formId);
    return !formErrors || formErrors.size === 0;
  }

  /**
   * カスタムイベントを発火
   */
  dispatchEvent(eventName, detail = {}) {
    try {
      const event = new CustomEvent(eventName, { detail });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('イベント発火エラー:', error);
    }
  }

  /**
   * エラーハンドリング
   */
  handleError(message, error) {
    console.error(`[FormService] ${message}:`, error);
    
    this.dispatchEvent('form-service:error', {
      message,
      error: error.message
    });
  }

  /**
   * 現在の状態を取得
   */
  getState() {
    return {
      isInitialized: this.state.isInitialized,
      formsCount: this.state.forms.size,
      isSubmitting: this.state.isSubmitting
    };
  }

  /**
   * オプションを更新
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // 自動保存間隔が変更された場合は再開
    if (newOptions.autoSaveInterval) {
      this.stopAutoSave();
      this.startAutoSave();
    }
    
    this.dispatchEvent('form-service:options-updated', { options: this.options });
  }

  /**
   * サービスを破棄
   */
  destroy() {
    try {
      // 自動保存を停止
      this.stopAutoSave();
      
      // イベントリスナーを削除
      window.removeEventListener('beforeunload', this.boundHandlers.handleBeforeUnload);
      
      // フォームイベントリスナーを削除
      this.state.forms.forEach((form) => {
        // フォーム要素のイベントリスナーは自動的に削除される
      });
      
      // 状態をリセット
      this.state.isInitialized = false;
      this.state.forms.clear();
      this.state.errors.clear();
      
      this.dispatchEvent('form-service:destroyed');
      
    } catch (error) {
      this.handleError('サービスの破棄に失敗', error);
    }
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormService;
} else if (typeof window !== 'undefined') {
  window.FormService = FormService;
} 