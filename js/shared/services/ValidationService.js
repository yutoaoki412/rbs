/**
 * バリデーションサービス
 * 統一されたバリデーション機能を提供
 * @version 2.0.0
 */

import { BaseService } from '../../lib/base/BaseService.js';

export class ValidationService extends BaseService {
  constructor() {
    super('ValidationService');
    
    // バリデーションルール
    this.validators = new Map();
    this.customValidators = new Map();
    
    // エラーメッセージ
    this.errorMessages = new Map();
    
    // バリデーション設定
    this.config = {
      stopOnFirstError: false,
      trimStrings: true,
      convertTypes: true
    };
  }

  /**
   * サービス初期化
   * @protected
   * @returns {Promise<void>}
   */
  async doInit() {
    // 組み込みバリデーターの登録
    this.registerBuiltInValidators();
    
    // デフォルトエラーメッセージの設定
    this.setupDefaultErrorMessages();
    
    this.log('バリデーションサービス初期化完了');
  }

  /**
   * 組み込みバリデーターの登録
   * @private
   */
  registerBuiltInValidators() {
    // 必須項目
    this.addValidator('required', (value) => {
      return value !== null && value !== undefined && value !== '';
    });

    // 文字列長
    this.addValidator('minLength', (value, params) => {
      if (typeof value !== 'string') return false;
      return value.length >= params.min;
    });

    this.addValidator('maxLength', (value, params) => {
      if (typeof value !== 'string') return false;
      return value.length <= params.max;
    });

    // 数値範囲
    this.addValidator('min', (value, params) => {
      const num = Number(value);
      return !isNaN(num) && num >= params.min;
    });

    this.addValidator('max', (value, params) => {
      const num = Number(value);
      return !isNaN(num) && num <= params.max;
    });

    // パターンマッチング
    this.addValidator('pattern', (value, params) => {
      if (typeof value !== 'string') return false;
      const regex = new RegExp(params.pattern);
      return regex.test(value);
    });

    // メールアドレス
    this.addValidator('email', (value) => {
      if (typeof value !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    });

    // URL
    this.addValidator('url', (value) => {
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });

    // 数値
    this.addValidator('numeric', (value) => {
      return !isNaN(Number(value)) && isFinite(Number(value));
    });

    // 整数
    this.addValidator('integer', (value) => {
      const num = Number(value);
      return Number.isInteger(num);
    });

    // 日付
    this.addValidator('date', (value) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    });

    // 配列
    this.addValidator('array', (value) => {
      return Array.isArray(value);
    });

    // オブジェクト
    this.addValidator('object', (value) => {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    });

    // 同一性チェック
    this.addValidator('same', (value, params, data) => {
      return value === data[params.field];
    });

    // 日本語文字チェック
    this.addValidator('japanese', (value) => {
      if (typeof value !== 'string') return false;
      const japaneseRegex = /^[ひらがなカタカナ漢字ー\s]+$/;
      return japaneseRegex.test(value);
    });

    // 半角英数字
    this.addValidator('alphanumeric', (value) => {
      if (typeof value !== 'string') return false;
      const alphanumericRegex = /^[a-zA-Z0-9]+$/;
      return alphanumericRegex.test(value);
    });
  }

  /**
   * デフォルトエラーメッセージの設定
   * @private
   */
  setupDefaultErrorMessages() {
    this.errorMessages.set('required', '{field}は必須項目です');
    this.errorMessages.set('minLength', '{field}は{min}文字以上で入力してください');
    this.errorMessages.set('maxLength', '{field}は{max}文字以下で入力してください');
    this.errorMessages.set('min', '{field}は{min}以上の値を入力してください');
    this.errorMessages.set('max', '{field}は{max}以下の値を入力してください');
    this.errorMessages.set('pattern', '{field}の形式が正しくありません');
    this.errorMessages.set('email', '有効なメールアドレスを入力してください');
    this.errorMessages.set('url', '有効なURLを入力してください');
    this.errorMessages.set('numeric', '{field}は数値で入力してください');
    this.errorMessages.set('integer', '{field}は整数で入力してください');
    this.errorMessages.set('date', '有効な日付を入力してください');
    this.errorMessages.set('array', '{field}は配列である必要があります');
    this.errorMessages.set('object', '{field}はオブジェクトである必要があります');
    this.errorMessages.set('same', '{field}は{field}と一致する必要があります');
    this.errorMessages.set('japanese', '{field}は日本語で入力してください');
    this.errorMessages.set('alphanumeric', '{field}は半角英数字で入力してください');
  }

  /**
   * カスタムバリデーターの追加
   * @param {string} name - バリデーター名
   * @param {Function} validator - バリデーター関数
   * @param {string} errorMessage - エラーメッセージ
   */
  addValidator(name, validator, errorMessage = null) {
    this.validators.set(name, validator);
    
    if (errorMessage) {
      this.errorMessages.set(name, errorMessage);
    }
  }

  /**
   * エラーメッセージの設定
   * @param {string} validator - バリデーター名
   * @param {string} message - メッセージテンプレート
   */
  setErrorMessage(validator, message) {
    this.errorMessages.set(validator, message);
  }

  /**
   * 単一フィールドのバリデーション
   * @param {*} value - 値
   * @param {Array|Object} rules - バリデーションルール
   * @param {string} fieldName - フィールド名
   * @param {Object} allData - 全データ（他フィールド参照用）
   * @returns {Promise<Object>}
   */
  async validateField(value, rules, fieldName = 'field', allData = {}) {
    const errors = [];
    
    // 前処理
    if (this.config.trimStrings && typeof value === 'string') {
      value = value.trim();
    }

    // ルールの正規化
    const normalizedRules = this.normalizeRules(rules);

    for (const rule of normalizedRules) {
      try {
        const isValid = await this.executeValidator(value, rule, allData);
        
        if (!isValid) {
          const errorMessage = this.generateErrorMessage(rule, fieldName);
          errors.push(errorMessage);
          
          if (this.config.stopOnFirstError) {
            break;
          }
        }
      } catch (error) {
        this.handleError(`バリデーション実行エラー (${rule.name})`, error);
        errors.push(`${fieldName}のバリデーションでエラーが発生しました`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      value
    };
  }

  /**
   * 複数フィールドのバリデーション
   * @param {Object} data - データ
   * @param {Object} schema - バリデーションスキーマ
   * @returns {Promise<Object>}
   */
  async validate(data, schema) {
    const results = {};
    const allErrors = {};
    let isValid = true;

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = data[fieldName];
      const result = await this.validateField(value, rules, fieldName, data);
      
      results[fieldName] = result;
      
      if (!result.isValid) {
        allErrors[fieldName] = result.errors;
        isValid = false;
      }
    }

    return {
      isValid,
      errors: allErrors,
      results,
      data
    };
  }

  /**
   * ルールの正規化
   * @private
   * @param {Array|Object|string} rules - ルール
   * @returns {Array}
   */
  normalizeRules(rules) {
    if (typeof rules === 'string') {
      // 文字列形式: "required|minLength:3|maxLength:100"
      return rules.split('|').map(rule => {
        const [name, ...params] = rule.split(':');
        return {
          name: name.trim(),
          params: params.length > 0 ? this.parseParams(params.join(':')) : {}
        };
      });
    }
    
    if (Array.isArray(rules)) {
      // 配列形式
      return rules.map(rule => {
        if (typeof rule === 'string') {
          return { name: rule, params: {} };
        }
        return rule;
      });
    }
    
    if (typeof rules === 'object') {
      // オブジェクト形式
      return Object.entries(rules).map(([name, params]) => ({
        name,
        params: params || {}
      }));
    }
    
    return [];
  }

  /**
   * パラメータの解析
   * @private
   * @param {string} paramString - パラメータ文字列
   * @returns {Object}
   */
  parseParams(paramString) {
    try {
      // JSON形式の場合
      if (paramString.startsWith('{') || paramString.startsWith('[')) {
        return JSON.parse(paramString);
      }
      
      // 数値の場合
      if (/^\d+$/.test(paramString)) {
        return { value: parseInt(paramString) };
      }
      
      // カンマ区切りの場合
      if (paramString.includes(',')) {
        const values = paramString.split(',').map(v => v.trim());
        return { values };
      }
      
      // 単一値の場合
      return { value: paramString };
      
    } catch (error) {
      this.warn('パラメータ解析エラー:', error);
      return { value: paramString };
    }
  }

  /**
   * バリデーターの実行
   * @private
   * @param {*} value - 値
   * @param {Object} rule - ルール
   * @param {Object} allData - 全データ
   * @returns {Promise<boolean>}
   */
  async executeValidator(value, rule, allData) {
    const validator = this.validators.get(rule.name);
    
    if (!validator) {
      throw new Error(`バリデーター '${rule.name}' が見つかりません`);
    }
    
    // 非同期バリデーターの場合
    if (validator.constructor.name === 'AsyncFunction') {
      return await validator(value, rule.params, allData);
    }
    
    // 同期バリデーターの場合
    return validator(value, rule.params, allData);
  }

  /**
   * エラーメッセージの生成
   * @private
   * @param {Object} rule - ルール
   * @param {string} fieldName - フィールド名
   * @returns {string}
   */
  generateErrorMessage(rule, fieldName) {
    const template = this.errorMessages.get(rule.name) || `${fieldName}の${rule.name}バリデーションに失敗しました`;
    
    // テンプレート変数の置換
    let message = template.replace(/{field}/g, fieldName);
    
    // パラメータの置換
    for (const [key, value] of Object.entries(rule.params)) {
      const placeholder = new RegExp(`{${key}}`, 'g');
      message = message.replace(placeholder, value);
    }
    
    return message;
  }

  /**
   * 条件付きバリデーション
   * @param {Object} data - データ
   * @param {string} fieldName - フィールド名
   * @param {Array|Object} rules - ルール
   * @param {Function} condition - 条件関数
   * @returns {Promise<Object>}
   */
  async validateIf(data, fieldName, rules, condition) {
    if (await condition(data)) {
      return await this.validateField(data[fieldName], rules, fieldName, data);
    }
    
    return {
      isValid: true,
      errors: [],
      value: data[fieldName],
      skipped: true
    };
  }

  /**
   * フォームバリデーション（DOM要素対応）
   * @param {Element} form - フォーム要素
   * @param {Object} schema - バリデーションスキーマ
   * @returns {Promise<Object>}
   */
  async validateForm(form, schema) {
    const formData = new FormData(form);
    const data = {};
    
    // FormDataをオブジェクトに変換
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    const result = await this.validate(data, schema);
    
    // DOM要素にエラー表示
    this.displayFormErrors(form, result.errors);
    
    return result;
  }

  /**
   * フォームエラーの表示
   * @private
   * @param {Element} form - フォーム要素
   * @param {Object} errors - エラー
   */
  displayFormErrors(form, errors) {
    // 既存のエラー表示をクリア
    form.querySelectorAll('.validation-error').forEach(el => el.remove());
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    // 新しいエラーを表示
    for (const [fieldName, fieldErrors] of Object.entries(errors)) {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        field.classList.add('is-invalid');
        
        // エラーメッセージ要素を作成
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error text-danger';
        errorDiv.textContent = fieldErrors[0]; // 最初のエラーのみ表示
        
        // フィールドの後に挿入
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
      }
    }
  }

  /**
   * 設定の更新
   * @param {Object} newConfig - 新しい設定
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * バリデーターの削除
   * @param {string} name - バリデーター名
   */
  removeValidator(name) {
    this.validators.delete(name);
    this.errorMessages.delete(name);
  }

  /**
   * 利用可能なバリデーターの取得
   * @returns {Array<string>}
   */
  getAvailableValidators() {
    return Array.from(this.validators.keys());
  }

  /**
   * サービスの破棄
   * @protected
   * @returns {Promise<void>}
   */
  async doDestroy() {
    this.validators.clear();
    this.customValidators.clear();
    this.errorMessages.clear();
    
    this.log('バリデーションサービス破棄完了');
  }
}

// シングルトンインスタンス
export const validationService = new ValidationService(); 