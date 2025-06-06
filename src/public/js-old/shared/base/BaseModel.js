/**
 * 基底モデルクラス
 * 全てのデータモデルが継承すべき共通機能を提供
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';

export class BaseModel extends BaseService {
  constructor(modelName = 'BaseModel', schema = {}) {
    super(modelName);
    
    // スキーマ定義
    this.schema = schema;
    
    // データ管理
    this.data = {};
    this.originalData = {};
    this.isDirty = false;
    
    // バリデーション
    this.validators = new Map();
    this.validationErrors = new Map();
    
    // 関連モデル
    this.relationships = new Map();
    
    // イベントフック
    this.hooks = {
      beforeSave: [],
      afterSave: [],
      beforeLoad: [],
      afterLoad: [],
      beforeDelete: [],
      afterDelete: [],
      beforeValidate: [],
      afterValidate: []
    };
  }

  /**
   * モデル初期化
   * @protected
   * @returns {Promise<void>}
   */
  async doInit() {
    // スキーマの検証
    this.validateSchema();
    
    // バリデーターの設定
    this.setupValidators();
    
    // 関連モデルの設定
    this.setupRelationships();
    
    this.log('モデル初期化完了');
  }

  /**
   * スキーマの検証
   * @private
   */
  validateSchema() {
    if (typeof this.schema !== 'object' || this.schema === null) {
      throw new Error(`${this.serviceName}: スキーマは有効なオブジェクトである必要があります`);
    }
    
    // デフォルト値の設定
    for (const [field, definition] of Object.entries(this.schema)) {
      if (definition.default !== undefined) {
        this.data[field] = definition.default;
      }
    }
  }

  /**
   * バリデーターの設定
   * @protected
   */
  setupValidators() {
    for (const [field, definition] of Object.entries(this.schema)) {
      if (definition.validators) {
        definition.validators.forEach(validator => {
          this.addValidator(field, validator);
        });
      }
    }
  }

  /**
   * 関連モデルの設定
   * @protected
   */
  setupRelationships() {
    // 継承クラスでオーバーライド
  }

  /**
   * データの設定
   * @param {Object} data - データ
   * @param {boolean} markClean - クリーンマークするか
   */
  setData(data, markClean = false) {
    this.data = { ...this.data, ...data };
    
    if (markClean) {
      this.markClean();
    } else {
      this.markDirty();
    }
    
    this.emit('dataChanged', { data: this.data });
  }

  /**
   * データの取得
   * @param {string} field - フィールド名（省略可）
   * @returns {*}
   */
  getData(field = null) {
    if (field) {
      return this.data[field];
    }
    return { ...this.data };
  }

  /**
   * フィールドの設定
   * @param {string} field - フィールド名
   * @param {*} value - 値
   */
  set(field, value) {
    // スキーマのチェック
    if (this.schema[field] && this.schema[field].type) {
      value = this.castValue(field, value);
    }
    
    const oldValue = this.data[field];
    this.data[field] = value;
    
    this.markDirty();
    this.emit('fieldChanged', { field, oldValue, newValue: value });
  }

  /**
   * フィールドの取得
   * @param {string} field - フィールド名
   * @returns {*}
   */
  get(field) {
    return this.data[field];
  }

  /**
   * 値のキャスト
   * @private
   * @param {string} field - フィールド名
   * @param {*} value - 値
   * @returns {*}
   */
  castValue(field, value) {
    const type = this.schema[field].type;
    
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return value instanceof Date ? value : new Date(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : {};
      default:
        return value;
    }
  }

  /**
   * ダーティマークの設定
   */
  markDirty() {
    this.isDirty = true;
    this.emit('markedDirty');
  }

  /**
   * クリーンマークの設定
   */
  markClean() {
    this.isDirty = false;
    this.originalData = { ...this.data };
    this.emit('markedClean');
  }

  /**
   * 変更の確認
   * @returns {boolean}
   */
  isChanged() {
    return this.isDirty;
  }

  /**
   * 変更されたフィールドの取得
   * @returns {Object}
   */
  getChangedFields() {
    const changed = {};
    for (const [field, value] of Object.entries(this.data)) {
      if (this.originalData[field] !== value) {
        changed[field] = {
          old: this.originalData[field],
          new: value
        };
      }
    }
    return changed;
  }

  /**
   * バリデーターの追加
   * @param {string} field - フィールド名
   * @param {Function} validator - バリデーター関数
   */
  addValidator(field, validator) {
    if (!this.validators.has(field)) {
      this.validators.set(field, []);
    }
    this.validators.get(field).push(validator);
  }

  /**
   * バリデーションの実行
   * @param {Array<string>} fields - 対象フィールド（省略時は全フィールド）
   * @returns {Promise<boolean>}
   */
  async validate(fields = null) {
    this.validationErrors.clear();
    
    // フックの実行
    await this.runHooks('beforeValidate');
    
    const fieldsToValidate = fields || Object.keys(this.data);
    
    for (const field of fieldsToValidate) {
      const validators = this.validators.get(field) || [];
      const value = this.data[field];
      
      for (const validator of validators) {
        try {
          const isValid = await validator.call(this, value, field, this.data);
          if (!isValid) {
            this.addValidationError(field, `バリデーションエラー: ${field}`);
          }
        } catch (error) {
          this.addValidationError(field, error.message);
        }
      }
    }
    
    const isValid = this.validationErrors.size === 0;
    
    // フックの実行
    await this.runHooks('afterValidate', { isValid });
    
    this.emit('validated', { isValid, errors: this.getValidationErrors() });
    
    return isValid;
  }

  /**
   * バリデーションエラーの追加
   * @param {string} field - フィールド名
   * @param {string} message - エラーメッセージ
   */
  addValidationError(field, message) {
    if (!this.validationErrors.has(field)) {
      this.validationErrors.set(field, []);
    }
    this.validationErrors.get(field).push(message);
  }

  /**
   * バリデーションエラーの取得
   * @param {string} field - フィールド名（省略時は全エラー）
   * @returns {Array|Object}
   */
  getValidationErrors(field = null) {
    if (field) {
      return this.validationErrors.get(field) || [];
    }
    return Object.fromEntries(this.validationErrors);
  }

  /**
   * バリデーション状態の確認
   * @returns {boolean}
   */
  isValid() {
    return this.validationErrors.size === 0;
  }

  /**
   * データの保存
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async save(options = {}) {
    try {
      // フックの実行
      await this.runHooks('beforeSave', options);
      
      // バリデーション
      if (!options.skipValidation) {
        const isValid = await this.validate();
        if (!isValid) {
          throw new Error('バリデーションエラーのため保存できません');
        }
      }
      
      // 実際の保存処理
      const result = await this.doSave(options);
      
      // クリーンマーク
      if (!options.keepDirty) {
        this.markClean();
      }
      
      // フックの実行
      await this.runHooks('afterSave', { result, options });
      
      this.emit('saved', { result, options });
      
      return result;
      
    } catch (error) {
      this.handleError('保存エラー', error);
      throw error;
    }
  }

  /**
   * 実際の保存処理
   * @protected
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async doSave(options) {
    // 継承クラスでオーバーライド
    throw new Error(`${this.serviceName}: doSave メソッドが実装されていません`);
  }

  /**
   * データの読み込み
   * @param {*} query - クエリ
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async load(query, options = {}) {
    try {
      // フックの実行
      await this.runHooks('beforeLoad', { query, options });
      
      // 実際の読み込み処理
      const result = await this.doLoad(query, options);
      
      // データの設定
      if (result) {
        this.setData(result, true);
      }
      
      // フックの実行
      await this.runHooks('afterLoad', { result, query, options });
      
      this.emit('loaded', { result, query, options });
      
      return result;
      
    } catch (error) {
      this.handleError('読み込みエラー', error);
      throw error;
    }
  }

  /**
   * 実際の読み込み処理
   * @protected
   * @param {*} query - クエリ
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async doLoad(query, options) {
    // 継承クラスでオーバーライド
    throw new Error(`${this.serviceName}: doLoad メソッドが実装されていません`);
  }

  /**
   * データの削除
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async delete(options = {}) {
    try {
      // フックの実行
      await this.runHooks('beforeDelete', options);
      
      // 実際の削除処理
      const result = await this.doDelete(options);
      
      // データのクリア
      this.data = {};
      this.markClean();
      
      // フックの実行
      await this.runHooks('afterDelete', { result, options });
      
      this.emit('deleted', { result, options });
      
      return result;
      
    } catch (error) {
      this.handleError('削除エラー', error);
      throw error;
    }
  }

  /**
   * 実際の削除処理
   * @protected
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async doDelete(options) {
    // 継承クラスでオーバーライド
    throw new Error(`${this.serviceName}: doDelete メソッドが実装されていません`);
  }

  /**
   * リフレッシュ（再読み込み）
   * @param {Object} options - オプション
   * @returns {Promise<*>}
   */
  async refresh(options = {}) {
    const id = this.getId();
    if (!id) {
      throw new Error('IDが設定されていないため、リフレッシュできません');
    }
    
    return await this.load(id, options);
  }

  /**
   * IDの取得
   * @returns {*}
   */
  getId() {
    return this.data.id || this.data._id || null;
  }

  /**
   * フックの追加
   * @param {string} hookName - フック名
   * @param {Function} callback - コールバック関数
   */
  addHook(hookName, callback) {
    if (this.hooks[hookName]) {
      this.hooks[hookName].push(callback);
    }
  }

  /**
   * フックの実行
   * @private
   * @param {string} hookName - フック名
   * @param {*} data - データ
   */
  async runHooks(hookName, data = null) {
    const hooks = this.hooks[hookName] || [];
    for (const hook of hooks) {
      await hook.call(this, data);
    }
  }

  /**
   * 関連モデルの追加
   * @param {string} name - 関連名
   * @param {BaseModel} model - モデル
   * @param {Object} options - オプション
   */
  addRelationship(name, model, options = {}) {
    this.relationships.set(name, { model, options });
  }

  /**
   * 関連モデルの取得
   * @param {string} name - 関連名
   * @returns {*}
   */
  getRelated(name) {
    const relationship = this.relationships.get(name);
    return relationship ? relationship.model : null;
  }

  /**
   * JSONシリアライゼーション
   * @returns {Object}
   */
  toJSON() {
    return {
      ...this.data,
      _meta: {
        modelName: this.serviceName,
        isDirty: this.isDirty,
        isValid: this.isValid(),
        lastModified: new Date().toISOString()
      }
    };
  }

  /**
   * 複製
   * @returns {BaseModel}
   */
  clone() {
    const cloned = new this.constructor(this.serviceName, this.schema);
    cloned.setData(this.getData(), false);
    return cloned;
  }

  /**
   * モデルの破棄
   * @protected
   * @returns {Promise<void>}
   */
  async doDestroy() {
    // 関連モデルの破棄
    for (const [name, relationship] of this.relationships) {
      if (relationship.model && typeof relationship.model.destroy === 'function') {
        try {
          await relationship.model.destroy();
        } catch (error) {
          this.warn(`関連モデル破棄エラー (${name}):`, error);
        }
      }
    }
    
    // データのクリア
    this.data = {};
    this.originalData = {};
    this.validationErrors.clear();
    this.validators.clear();
    this.relationships.clear();
    
    // フックのクリア
    Object.keys(this.hooks).forEach(key => {
      this.hooks[key] = [];
    });
    
    this.log('モデル破棄完了');
  }

  /**
   * モデル状態の取得
   * @returns {Object}
   */
  getStatus() {
    return {
      ...super.getStatus(),
      isDirty: this.isDirty,
      isValid: this.isValid(),
      hasData: Object.keys(this.data).length > 0,
      validationErrors: this.getValidationErrors(),
      relationships: Array.from(this.relationships.keys())
    };
  }
} 