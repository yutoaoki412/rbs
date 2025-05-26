/**
 * バリデーションユーティリティ
 * フォーム入力値の検証機能を提供
 */
class Validator {
  constructor() {
    this.errors = [];
    this.rules = new Map();
    this.messages = new Map();
    this.setupDefaultMessages();
  }

  /**
   * デフォルトエラーメッセージを設定
   */
  setupDefaultMessages() {
    this.messages.set('required', 'この項目は必須です');
    this.messages.set('email', '有効なメールアドレスを入力してください');
    this.messages.set('url', '有効なURLを入力してください');
    this.messages.set('number', '数値を入力してください');
    this.messages.set('integer', '整数を入力してください');
    this.messages.set('min', '最小値は{min}です');
    this.messages.set('max', '最大値は{max}です');
    this.messages.set('minLength', '最低{minLength}文字入力してください');
    this.messages.set('maxLength', '最大{maxLength}文字まで入力可能です');
    this.messages.set('pattern', '入力形式が正しくありません');
    this.messages.set('date', '有効な日付を入力してください');
    this.messages.set('time', '有効な時刻を入力してください');
    this.messages.set('phone', '有効な電話番号を入力してください');
    this.messages.set('zipcode', '有効な郵便番号を入力してください');
  }

  /**
   * バリデーションルールを追加
   * @param {string} field - フィールド名
   * @param {Array} rules - ルール配列
   * @returns {Validator}
   */
  field(field, rules) {
    this.rules.set(field, rules);
    return this;
  }

  /**
   * カスタムメッセージを設定
   * @param {string} field - フィールド名
   * @param {string} rule - ルール名
   * @param {string} message - メッセージ
   * @returns {Validator}
   */
  message(field, rule, message) {
    const key = `${field}.${rule}`;
    this.messages.set(key, message);
    return this;
  }

  /**
   * データを検証
   * @param {Object} data - 検証対象データ
   * @returns {Object} 検証結果
   */
  validate(data) {
    this.errors = [];
    
    for (const [field, rules] of this.rules) {
      const value = this.getValue(data, field);
      
      for (const rule of rules) {
        const result = this.validateRule(field, value, rule);
        if (!result.valid) {
          this.errors.push({
            field: field,
            rule: rule.name || rule,
            message: result.message,
            value: value
          });
        }
      }
    }
    
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      getFieldErrors: (field) => this.getFieldErrors(field),
      getFirstError: (field) => this.getFirstError(field)
    };
  }

  /**
   * オブジェクトから値を取得（ドット記法対応）
   * @param {Object} obj - オブジェクト
   * @param {string} path - パス
   * @returns {any}
   */
  getValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 単一ルールを検証
   * @param {string} field - フィールド名
   * @param {any} value - 値
   * @param {string|Object} rule - ルール
   * @returns {Object}
   */
  validateRule(field, value, rule) {
    const ruleName = typeof rule === 'string' ? rule : rule.name;
    const ruleParams = typeof rule === 'object' ? rule : {};
    
    switch (ruleName) {
      case 'required':
        return this.validateRequired(value);
      case 'email':
        return this.validateEmail(value);
      case 'url':
        return this.validateUrl(value);
      case 'number':
        return this.validateNumber(value);
      case 'integer':
        return this.validateInteger(value);
      case 'min':
        return this.validateMin(value, ruleParams.value);
      case 'max':
        return this.validateMax(value, ruleParams.value);
      case 'minLength':
        return this.validateMinLength(value, ruleParams.value);
      case 'maxLength':
        return this.validateMaxLength(value, ruleParams.value);
      case 'pattern':
        return this.validatePattern(value, ruleParams.pattern);
      case 'date':
        return this.validateDate(value);
      case 'time':
        return this.validateTime(value);
      case 'phone':
        return this.validatePhone(value);
      case 'zipcode':
        return this.validateZipcode(value);
      case 'custom':
        return this.validateCustom(value, ruleParams.validator);
      default:
        return { valid: true };
    }
  }

  /**
   * 必須チェック
   * @param {any} value - 値
   * @returns {Object}
   */
  validateRequired(value) {
    const valid = value !== null && value !== undefined && value !== '';
    return {
      valid,
      message: valid ? '' : this.messages.get('required')
    };
  }

  /**
   * メールアドレスチェック
   * @param {string} value - 値
   * @returns {Object}
   */
  validateEmail(value) {
    if (!value) return { valid: true };
    
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = pattern.test(value);
    
    return {
      valid,
      message: valid ? '' : this.messages.get('email')
    };
  }

  /**
   * URLチェック
   * @param {string} value - 値
   * @returns {Object}
   */
  validateUrl(value) {
    if (!value) return { valid: true };
    
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return {
        valid: false,
        message: this.messages.get('url')
      };
    }
  }

  /**
   * 数値チェック
   * @param {any} value - 値
   * @returns {Object}
   */
  validateNumber(value) {
    if (!value) return { valid: true };
    
    const valid = !isNaN(Number(value));
    return {
      valid,
      message: valid ? '' : this.messages.get('number')
    };
  }

  /**
   * 整数チェック
   * @param {any} value - 値
   * @returns {Object}
   */
  validateInteger(value) {
    if (!value) return { valid: true };
    
    const num = Number(value);
    const valid = !isNaN(num) && Number.isInteger(num);
    
    return {
      valid,
      message: valid ? '' : this.messages.get('integer')
    };
  }

  /**
   * 最小値チェック
   * @param {any} value - 値
   * @param {number} min - 最小値
   * @returns {Object}
   */
  validateMin(value, min) {
    if (!value) return { valid: true };
    
    const num = Number(value);
    const valid = !isNaN(num) && num >= min;
    
    return {
      valid,
      message: valid ? '' : this.messages.get('min').replace('{min}', min)
    };
  }

  /**
   * 最大値チェック
   * @param {any} value - 値
   * @param {number} max - 最大値
   * @returns {Object}
   */
  validateMax(value, max) {
    if (!value) return { valid: true };
    
    const num = Number(value);
    const valid = !isNaN(num) && num <= max;
    
    return {
      valid,
      message: valid ? '' : this.messages.get('max').replace('{max}', max)
    };
  }

  /**
   * 最小文字数チェック
   * @param {string} value - 値
   * @param {number} minLength - 最小文字数
   * @returns {Object}
   */
  validateMinLength(value, minLength) {
    if (!value) return { valid: true };
    
    const valid = String(value).length >= minLength;
    
    return {
      valid,
      message: valid ? '' : this.messages.get('minLength').replace('{minLength}', minLength)
    };
  }

  /**
   * 最大文字数チェック
   * @param {string} value - 値
   * @param {number} maxLength - 最大文字数
   * @returns {Object}
   */
  validateMaxLength(value, maxLength) {
    if (!value) return { valid: true };
    
    const valid = String(value).length <= maxLength;
    
    return {
      valid,
      message: valid ? '' : this.messages.get('maxLength').replace('{maxLength}', maxLength)
    };
  }

  /**
   * パターンチェック
   * @param {string} value - 値
   * @param {RegExp|string} pattern - パターン
   * @returns {Object}
   */
  validatePattern(value, pattern) {
    if (!value) return { valid: true };
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const valid = regex.test(String(value));
    
    return {
      valid,
      message: valid ? '' : this.messages.get('pattern')
    };
  }

  /**
   * 日付チェック
   * @param {string} value - 値
   * @returns {Object}
   */
  validateDate(value) {
    if (!value) return { valid: true };
    
    const date = new Date(value);
    const valid = !isNaN(date.getTime());
    
    return {
      valid,
      message: valid ? '' : this.messages.get('date')
    };
  }

  /**
   * 時刻チェック
   * @param {string} value - 値
   * @returns {Object}
   */
  validateTime(value) {
    if (!value) return { valid: true };
    
    const pattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const valid = pattern.test(value);
    
    return {
      valid,
      message: valid ? '' : this.messages.get('time')
    };
  }

  /**
   * 電話番号チェック
   * @param {string} value - 値
   * @returns {Object}
   */
  validatePhone(value) {
    if (!value) return { valid: true };
    
    // 日本の電話番号パターン
    const pattern = /^(\+81|0)[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}$/;
    const valid = pattern.test(value.replace(/[\s\-]/g, ''));
    
    return {
      valid,
      message: valid ? '' : this.messages.get('phone')
    };
  }

  /**
   * 郵便番号チェック
   * @param {string} value - 値
   * @returns {Object}
   */
  validateZipcode(value) {
    if (!value) return { valid: true };
    
    // 日本の郵便番号パターン
    const pattern = /^\d{3}-?\d{4}$/;
    const valid = pattern.test(value);
    
    return {
      valid,
      message: valid ? '' : this.messages.get('zipcode')
    };
  }

  /**
   * カスタムバリデーション
   * @param {any} value - 値
   * @param {Function} validator - バリデーター関数
   * @returns {Object}
   */
  validateCustom(value, validator) {
    try {
      const result = validator(value);
      
      if (typeof result === 'boolean') {
        return {
          valid: result,
          message: result ? '' : 'バリデーションエラー'
        };
      }
      
      return result;
    } catch (error) {
      return {
        valid: false,
        message: error.message || 'バリデーションエラー'
      };
    }
  }

  /**
   * フィールドのエラーを取得
   * @param {string} field - フィールド名
   * @returns {Array}
   */
  getFieldErrors(field) {
    return this.errors.filter(error => error.field === field);
  }

  /**
   * フィールドの最初のエラーを取得
   * @param {string} field - フィールド名
   * @returns {string|null}
   */
  getFirstError(field) {
    const fieldErrors = this.getFieldErrors(field);
    return fieldErrors.length > 0 ? fieldErrors[0].message : null;
  }

  /**
   * エラーをクリア
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * ルールをクリア
   */
  clearRules() {
    this.rules.clear();
  }
}

/**
 * 記事バリデーター
 */
class ArticleValidator extends Validator {
  constructor() {
    super();
    this.setupArticleRules();
  }

  /**
   * 記事用のバリデーションルールを設定
   */
  setupArticleRules() {
    this.field('title', [
      'required',
      { name: 'maxLength', value: 100 }
    ]);

    this.field('date', [
      'required',
      'date'
    ]);

    this.field('category', [
      'required',
      {
        name: 'custom',
        validator: (value) => {
          const validCategories = ['announcement', 'trial', 'media', 'important'];
          return {
            valid: validCategories.includes(value),
            message: '有効なカテゴリーを選択してください'
          };
        }
      }
    ]);

    this.field('excerpt', [
      'required',
      { name: 'maxLength', value: 200 }
    ]);

    this.field('content', [
      'required',
      { name: 'minLength', value: 10 }
    ]);
  }
}

/**
 * ログインバリデーター
 */
class LoginValidator extends Validator {
  constructor() {
    super();
    this.setupLoginRules();
  }

  /**
   * ログイン用のバリデーションルールを設定
   */
  setupLoginRules() {
    this.field('password', [
      'required',
      { name: 'minLength', value: 8 }
    ]);
  }
}

/**
 * レッスン状況バリデーター
 */
class StatusValidator extends Validator {
  constructor() {
    super();
    this.setupStatusRules();
  }

  /**
   * レッスン状況用のバリデーションルールを設定
   */
  setupStatusRules() {
    this.field('overallStatus', [
      'required',
      {
        name: 'custom',
        validator: (value) => {
          const validStatuses = ['running', 'scheduled', 'cancelled'];
          return {
            valid: validStatuses.includes(value),
            message: '有効なステータスを選択してください'
          };
        }
      }
    ]);

    this.field('overallNote', [
      { name: 'maxLength', value: 100 }
    ]);
  }
}

// デフォルトインスタンス
const validator = new Validator();
const articleValidator = new ArticleValidator();
const loginValidator = new LoginValidator();
const statusValidator = new StatusValidator();

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Validator,
    ArticleValidator,
    LoginValidator,
    StatusValidator,
    validator,
    articleValidator,
    loginValidator,
    statusValidator
  };
} else {
  window.Validator = Validator;
  window.ArticleValidator = ArticleValidator;
  window.LoginValidator = LoginValidator;
  window.StatusValidator = StatusValidator;
  window.validator = validator;
  window.articleValidator = articleValidator;
  window.loginValidator = loginValidator;
  window.statusValidator = statusValidator;
} 