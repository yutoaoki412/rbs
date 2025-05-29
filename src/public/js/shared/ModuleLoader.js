/**
 * モジュールローダー
 * JavaScriptファイルの動的読み込みを管理
 */
class ModuleLoader {
  constructor() {
    this.loadedModules = new Set();
    this.loadingPromises = new Map();
    this.dependencies = new Map();
    this.basePath = '/js/';
  }

  /**
   * ベースパスを設定
   * @param {string} path - ベースパス
   */
  setBasePath(path) {
    this.basePath = path.endsWith('/') ? path : path + '/';
  }

  /**
   * モジュールを読み込み
   * @param {string|string[]} modules - モジュール名または配列
   * @returns {Promise} 読み込み完了のPromise
   */
  async load(modules) {
    const moduleList = Array.isArray(modules) ? modules : [modules];
    const promises = moduleList.map(module => this.loadSingle(module));
    
    try {
      await Promise.all(promises);
      console.log(`[ModuleLoader] モジュール読み込み完了:`, moduleList);
    } catch (error) {
      console.error(`[ModuleLoader] モジュール読み込みエラー:`, error);
      throw error;
    }
  }

  /**
   * 単一モジュールを読み込み
   * @param {string} moduleName - モジュール名
   * @returns {Promise} 読み込み完了のPromise
   */
  async loadSingle(moduleName) {
    // 既に読み込み済みの場合はスキップ
    if (this.loadedModules.has(moduleName)) {
      return;
    }

    // 読み込み中の場合は既存のPromiseを返す
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // 依存関係を先に読み込み
    const deps = this.dependencies.get(moduleName) || [];
    if (deps.length > 0) {
      await this.load(deps);
    }

    // モジュールを読み込み
    const promise = this.loadScript(moduleName);
    this.loadingPromises.set(moduleName, promise);

    try {
      await promise;
      this.loadedModules.add(moduleName);
      this.loadingPromises.delete(moduleName);
      
      eventBus.emit('module:loaded', { moduleName });
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  /**
   * スクリプトファイルを読み込み
   * @param {string} moduleName - モジュール名
   * @returns {Promise} 読み込み完了のPromise
   */
  loadScript(moduleName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const url = this.resolveModulePath(moduleName);
      
      script.src = url;
      script.async = true;
      
      script.onload = () => {
        console.log(`[ModuleLoader] 読み込み完了: ${moduleName}`);
        resolve();
      };
      
      script.onerror = () => {
        const error = new Error(`モジュールの読み込みに失敗しました: ${moduleName}`);
        console.error(`[ModuleLoader] 読み込みエラー: ${moduleName}`, error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * モジュールパスを解決
   * @param {string} moduleName - モジュール名
   * @returns {string} 完全なURL
   */
  resolveModulePath(moduleName) {
    // 既にフルパスの場合はそのまま返す
    if (moduleName.startsWith('http') || moduleName.startsWith('/')) {
      return moduleName;
    }

    // 拡張子がない場合は.jsを追加
    const fileName = moduleName.endsWith('.js') ? moduleName : `${moduleName}.js`;
    
    return this.basePath + fileName;
  }

  /**
   * 依存関係を設定
   * @param {string} moduleName - モジュール名
   * @param {string[]} deps - 依存モジュール配列
   */
  setDependencies(moduleName, deps) {
    this.dependencies.set(moduleName, deps);
  }

  /**
   * 複数の依存関係を一括設定
   * @param {Object} depsMap - 依存関係マップ
   */
  setDependenciesMap(depsMap) {
    Object.entries(depsMap).forEach(([module, deps]) => {
      this.setDependencies(module, deps);
    });
  }

  /**
   * モジュールが読み込み済みかチェック
   * @param {string} moduleName - モジュール名
   * @returns {boolean} 読み込み済みかどうか
   */
  isLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }

  /**
   * 読み込み済みモジュール一覧を取得
   * @returns {string[]} モジュール名配列
   */
  getLoadedModules() {
    return Array.from(this.loadedModules);
  }

  /**
   * 条件付きモジュール読み込み
   * @param {string} moduleName - モジュール名
   * @param {Function} condition - 条件関数
   * @returns {Promise} 読み込み完了のPromise
   */
  async loadIf(moduleName, condition) {
    if (condition()) {
      await this.load(moduleName);
    }
  }

  /**
   * 遅延読み込み
   * @param {string} moduleName - モジュール名
   * @param {number} delay - 遅延時間（ミリ秒）
   * @returns {Promise} 読み込み完了のPromise
   */
  async loadDelayed(moduleName, delay = 0) {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return this.load(moduleName);
  }

  /**
   * 並列読み込み（順序を保証しない）
   * @param {string[]} modules - モジュール名配列
   * @returns {Promise} 全読み込み完了のPromise
   */
  async loadParallel(modules) {
    const promises = modules.map(module => this.loadSingle(module));
    await Promise.all(promises);
  }

  /**
   * 順次読み込み（順序を保証）
   * @param {string[]} modules - モジュール名配列
   * @returns {Promise} 全読み込み完了のPromise
   */
  async loadSequential(modules) {
    for (const module of modules) {
      await this.loadSingle(module);
    }
  }

  /**
   * モジュールをアンロード（開発用）
   * @param {string} moduleName - モジュール名
   */
  unload(moduleName) {
    this.loadedModules.delete(moduleName);
    
    // スクリプトタグを削除
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src.includes(moduleName)) {
        script.remove();
      }
    });
    
    eventBus.emit('module:unloaded', { moduleName });
  }

  /**
   * 全モジュールをクリア
   */
  clear() {
    this.loadedModules.clear();
    this.loadingPromises.clear();
    this.dependencies.clear();
  }

  /**
   * デバッグ情報を出力
   */
  debug() {
    console.group('[ModuleLoader] デバッグ情報');
    console.log('読み込み済みモジュール:', Array.from(this.loadedModules));
    console.log('読み込み中モジュール:', Array.from(this.loadingPromises.keys()));
    console.log('依存関係:', Object.fromEntries(this.dependencies));
    console.log('ベースパス:', this.basePath);
    console.groupEnd();
  }
}

// シングルトンインスタンスを作成
const moduleLoader = new ModuleLoader();

// ベースパスを設定
moduleLoader.setBasePath('/src/public/js/');

// 依存関係を設定
moduleLoader.setDependenciesMap({
  'components/ui/NewsCard': ['core/base/Component'],
  'components/ui/UIInteractionManager': ['core/base/Component', 'core/events/EventBus']
});

// グローバルに公開
window.ModuleLoader = ModuleLoader;
window.moduleLoader = moduleLoader; 