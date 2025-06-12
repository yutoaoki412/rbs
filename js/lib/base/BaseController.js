/**
 * 基底コントローラークラス
 * 全てのコントローラーが継承すべき共通機能を提供
 * @version 2.0.0
 */

import { BaseService } from './BaseService.js';

export class BaseController extends BaseService {
  constructor(controllerName = 'BaseController') {
    super(controllerName);
    
    // モデルとビューの管理
    this.models = new Map();
    this.views = new Map();
    
    // アクション管理
    this.actions = new Map();
    this.beforeActions = new Map();
    this.afterActions = new Map();
    
    // バリデーション
    this.validators = new Map();
    
    // セキュリティ
    this.securityFilters = [];
  }

  /**
   * コントローラー初期化
   * @protected
   * @returns {Promise<void>}
   */
  async doInit() {
    // モデルの初期化
    await this.initModels();
    
    // ビューの初期化
    await this.initViews();
    
    // アクションの登録
    this.registerActions();
    
    // バリデーターの登録
    this.registerValidators();
    
    // セキュリティフィルターの設定
    this.setupSecurityFilters();
    
    this.log('コントローラー初期化完了');
  }

  /**
   * モデルの初期化
   * @protected
   * @returns {Promise<void>}
   */
  async initModels() {
    // 継承クラスでオーバーライド
  }

  /**
   * ビューの初期化
   * @protected
   * @returns {Promise<void>}
   */
  async initViews() {
    // 継承クラスでオーバーライド
  }

  /**
   * アクションの登録
   * @protected
   */
  registerActions() {
    // 継承クラスでオーバーライド
  }

  /**
   * バリデーターの登録
   * @protected
   */
  registerValidators() {
    // 継承クラスでオーバーライド
  }

  /**
   * セキュリティフィルターの設定
   * @protected
   */
  setupSecurityFilters() {
    // 継承クラスでオーバーライド
  }

  /**
   * モデルの追加
   * @param {string} name - モデル名
   * @param {*} model - モデルインスタンス
   */
  addModel(name, model) {
    this.models.set(name, model);
    this.emit('modelAdded', { name, model });
  }

  /**
   * モデルの取得
   * @param {string} name - モデル名
   * @returns {*}
   */
  getModel(name) {
    return this.models.get(name);
  }

  /**
   * ビューの追加
   * @param {string} name - ビュー名
   * @param {*} view - ビューインスタンス
   */
  addView(name, view) {
    this.views.set(name, view);
    this.emit('viewAdded', { name, view });
  }

  /**
   * ビューの取得
   * @param {string} name - ビュー名
   * @returns {*}
   */
  getView(name) {
    return this.views.get(name);
  }

  /**
   * アクションの追加
   * @param {string} name - アクション名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - オプション
   */
  addAction(name, handler, options = {}) {
    this.actions.set(name, {
      handler,
      ...options
    });
    this.emit('actionAdded', { name, options });
  }

  /**
   * 前処理アクションの追加
   * @param {string} actionName - アクション名
   * @param {Function} beforeHandler - 前処理ハンドラー
   */
  addBeforeAction(actionName, beforeHandler) {
    if (!this.beforeActions.has(actionName)) {
      this.beforeActions.set(actionName, []);
    }
    this.beforeActions.get(actionName).push(beforeHandler);
  }

  /**
   * 後処理アクションの追加
   * @param {string} actionName - アクション名
   * @param {Function} afterHandler - 後処理ハンドラー
   */
  addAfterAction(actionName, afterHandler) {
    if (!this.afterActions.has(actionName)) {
      this.afterActions.set(actionName, []);
    }
    this.afterActions.get(actionName).push(afterHandler);
  }

  /**
   * アクションの実行
   * @param {string} actionName - アクション名
   * @param {*} params - パラメータ
   * @param {Object} context - コンテキスト
   * @returns {Promise<*>}
   */
  async executeAction(actionName, params = null, context = {}) {
    if (!this.isReady()) {
      throw new Error(`${this.serviceName}: コントローラーが初期化されていません`);
    }

    const action = this.actions.get(actionName);
    if (!action) {
      throw new Error(`${this.serviceName}: アクション '${actionName}' が見つかりません`);
    }

    try {
      this.debug(`アクション実行開始: ${actionName}`, params);
      
      // セキュリティフィルターのチェック
      await this.runSecurityFilters(actionName, params, context);
      
      // バリデーション
      await this.validateAction(actionName, params);
      
      // 前処理の実行
      await this.runBeforeActions(actionName, params, context);
      
      // メインアクションの実行
      const result = await action.handler.call(this, params, context);
      
      // 後処理の実行
      await this.runAfterActions(actionName, params, context, result);
      
      this.debug(`アクション実行完了: ${actionName}`, result);
      this.emit('actionExecuted', { actionName, params, result });
      
      return result;
      
    } catch (error) {
      this.handleError(`アクション実行エラー (${actionName})`, error);
      this.emit('actionError', { actionName, params, error });
      throw error;
    }
  }

  /**
   * セキュリティフィルターの実行
   * @private
   * @param {string} actionName - アクション名
   * @param {*} params - パラメータ
   * @param {Object} context - コンテキスト
   */
  async runSecurityFilters(actionName, params, context) {
    for (const filter of this.securityFilters) {
      const allowed = await filter.call(this, actionName, params, context);
      if (!allowed) {
        throw new Error(`セキュリティフィルターによりアクション '${actionName}' がブロックされました`);
      }
    }
  }

  /**
   * バリデーションの実行
   * @private
   * @param {string} actionName - アクション名
   * @param {*} params - パラメータ
   */
  async validateAction(actionName, params) {
    const validator = this.validators.get(actionName);
    if (validator) {
      const isValid = await validator.call(this, params);
      if (!isValid) {
        throw new Error(`アクション '${actionName}' のバリデーションに失敗しました`);
      }
    }
  }

  /**
   * 前処理アクションの実行
   * @private
   * @param {string} actionName - アクション名
   * @param {*} params - パラメータ
   * @param {Object} context - コンテキスト
   */
  async runBeforeActions(actionName, params, context) {
    const beforeActions = this.beforeActions.get(actionName) || [];
    for (const beforeAction of beforeActions) {
      await beforeAction.call(this, params, context);
    }
  }

  /**
   * 後処理アクションの実行
   * @private
   * @param {string} actionName - アクション名
   * @param {*} params - パラメータ
   * @param {Object} context - コンテキスト
   * @param {*} result - アクション結果
   */
  async runAfterActions(actionName, params, context, result) {
    const afterActions = this.afterActions.get(actionName) || [];
    for (const afterAction of afterActions) {
      await afterAction.call(this, params, context, result);
    }
  }

  /**
   * バリデーターの追加
   * @param {string} actionName - アクション名
   * @param {Function} validator - バリデーター関数
   */
  addValidator(actionName, validator) {
    this.validators.set(actionName, validator);
  }

  /**
   * セキュリティフィルターの追加
   * @param {Function} filter - フィルター関数
   */
  addSecurityFilter(filter) {
    this.securityFilters.push(filter);
  }

  /**
   * レスポンスの送信
   * @param {*} data - レスポンスデータ
   * @param {string} status - ステータス
   * @returns {Object}
   */
  respond(data, status = 'success') {
    const response = {
      status,
      data,
      timestamp: new Date().toISOString(),
      controller: this.serviceName
    };
    
    this.emit('responseGenerated', response);
    return response;
  }

  /**
   * エラーレスポンスの送信
   * @param {Error|string} error - エラー
   * @param {string} code - エラーコード
   * @returns {Object}
   */
  respondError(error, code = 'GENERAL_ERROR') {
    const response = {
      status: 'error',
      error: {
        message: error.message || error,
        code,
        timestamp: new Date().toISOString()
      },
      controller: this.serviceName
    };
    
    this.emit('errorResponseGenerated', response);
    return response;
  }

  /**
   * リダイレクト
   * @param {string} url - リダイレクト先URL
   * @param {Object} options - オプション
   */
  redirect(url, options = {}) {
    this.emit('redirectRequested', { url, options });
    
    if (options.replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  }

  /**
   * ビューのレンダリング
   * @param {string} viewName - ビュー名
   * @param {Object} data - レンダリングデータ
   * @returns {Promise<*>}
   */
  async render(viewName, data = {}) {
    const view = this.getView(viewName);
    if (!view) {
      throw new Error(`ビュー '${viewName}' が見つかりません`);
    }
    
    try {
      this.debug(`ビューレンダリング: ${viewName}`, data);
      
      const result = await view.render(data);
      
      this.emit('viewRendered', { viewName, data, result });
      return result;
      
    } catch (error) {
      this.handleError(`ビューレンダリングエラー (${viewName})`, error);
      throw error;
    }
  }

  /**
   * モデルデータの取得
   * @param {string} modelName - モデル名
   * @param {*} query - クエリ
   * @returns {Promise<*>}
   */
  async fetchModelData(modelName, query = null) {
    const model = this.getModel(modelName);
    if (!model) {
      throw new Error(`モデル '${modelName}' が見つかりません`);
    }
    
    try {
      return await model.fetch(query);
    } catch (error) {
      this.handleError(`モデルデータ取得エラー (${modelName})`, error);
      throw error;
    }
  }

  /**
   * モデルデータの保存
   * @param {string} modelName - モデル名
   * @param {*} data - データ
   * @returns {Promise<*>}
   */
  async saveModelData(modelName, data) {
    const model = this.getModel(modelName);
    if (!model) {
      throw new Error(`モデル '${modelName}' が見つかりません`);
    }
    
    try {
      return await model.save(data);
    } catch (error) {
      this.handleError(`モデルデータ保存エラー (${modelName})`, error);
      throw error;
    }
  }

  /**
   * コントローラーの破棄
   * @protected
   * @returns {Promise<void>}
   */
  async doDestroy() {
    // ビューの破棄
    for (const [name, view] of this.views) {
      if (view && typeof view.destroy === 'function') {
        try {
          await view.destroy();
        } catch (error) {
          this.warn(`ビュー破棄エラー (${name}):`, error);
        }
      }
    }
    
    // モデルの破棄
    for (const [name, model] of this.models) {
      if (model && typeof model.destroy === 'function') {
        try {
          await model.destroy();
        } catch (error) {
          this.warn(`モデル破棄エラー (${name}):`, error);
        }
      }
    }
    
    // 管理データのクリア
    this.models.clear();
    this.views.clear();
    this.actions.clear();
    this.beforeActions.clear();
    this.afterActions.clear();
    this.validators.clear();
    this.securityFilters.length = 0;
    
    this.log('コントローラー破棄完了');
  }

  /**
   * コントローラー状態の取得
   * @returns {Object}
   */
  getStatus() {
    return {
      ...super.getStatus(),
      models: Array.from(this.models.keys()),
      views: Array.from(this.views.keys()),
      actions: Array.from(this.actions.keys()),
      validators: Array.from(this.validators.keys()),
      securityFilters: this.securityFilters.length
    };
  }
} 