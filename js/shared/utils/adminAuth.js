/**
 * セキュア管理者認証ユーティリティ
 * メタデータベース権限管理による完全セキュリティ
 * @version 1.0.0
 */

/**
 * 統一的な管理者権限チェック関数
 * @param {Object} user - Supabaseユーザーオブジェクト
 * @returns {boolean} 管理者権限の有無
 */
export function isAdminUser(user) {
  if (!user) {
    console.log('[AdminAuth] 権限チェック: ユーザーなし ❌');
    return false;
  }
  
  // 1. メタデータのroleをチェック（優先）
  if (user.user_metadata && user.user_metadata.role === 'admin') {
    console.log('[AdminAuth] 権限チェック: メタデータ権限 ✅', {
      email: user.email,
      role: user.user_metadata.role,
      method: 'metadata'
    });
    return true;
  }
  
  // 2. フォールバック: 管理者メールアドレスの確認
  const adminEmails = ['yaoki412rad@gmail.com'];
  const hasAdminEmail = adminEmails.includes(user.email);
  
  if (hasAdminEmail) {
    console.log('[AdminAuth] 権限チェック: メールアドレス権限 ✅', {
      email: user.email,
      method: 'email_fallback'
    });
    return true;
  }
  
  console.log('[AdminAuth] 権限チェック: 権限なし ❌', {
    email: user.email,
    hasMetadata: !!user.user_metadata,
    metadataRole: user.user_metadata?.role || 'none'
  });
  
  return false;
}

/**
 * 管理者権限の詳細情報を取得
 * @param {Object} user - Supabaseユーザーオブジェクト
 * @returns {Object} 権限詳細情報
 */
export function getAdminAuthDetails(user) {
  if (!user) {
    return {
      isAdmin: false,
      method: 'none',
      hasMetadata: false,
      hasAdminEmail: false,
      details: 'ユーザーが存在しません'
    };
  }
  
  const hasMetadataRole = user.user_metadata && user.user_metadata.role === 'admin';
  const adminEmails = ['yaoki412rad@gmail.com'];
  const hasAdminEmail = adminEmails.includes(user.email);
  
  return {
    isAdmin: hasMetadataRole || hasAdminEmail,
    method: hasMetadataRole ? 'metadata' : (hasAdminEmail ? 'email_fallback' : 'none'),
    hasMetadata: hasMetadataRole,
    hasAdminEmail: hasAdminEmail,
    email: user.email,
    metadataRole: user.user_metadata?.role || null,
    details: hasMetadataRole 
      ? 'メタデータ権限による認証' 
      : hasAdminEmail 
        ? 'メールアドレス権限による認証（フォールバック）'
        : '管理者権限なし'
  };
}

/**
 * 管理者権限エラーメッセージを生成
 * @param {Object} user - Supabaseユーザーオブジェクト
 * @returns {string} エラーメッセージ
 */
export function getAdminAuthErrorMessage(user) {
  if (!user) {
    return '認証が必要です。ログインしてください。';
  }
  
  const details = getAdminAuthDetails(user);
  
  if (details.isAdmin) {
    return null; // エラーなし
  }
  
  return `管理者権限がありません。アカウント: ${user.email}`;
}

/**
 * 管理者権限チェック（例外スロー版）
 * @param {Object} user - Supabaseユーザーオブジェクト
 * @throws {Error} 権限がない場合
 */
export function requireAdminUser(user) {
  const errorMessage = getAdminAuthErrorMessage(user);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

/**
 * デバッグ用: 管理者権限情報をコンソール出力
 * @param {Object} user - Supabaseユーザーオブジェクト
 */
export function debugAdminAuth(user) {
  console.group('🔐 管理者権限デバッグ情報');
  
  const details = getAdminAuthDetails(user);
  
  console.log('基本情報:', {
    email: details.email || 'なし',
    isAdmin: details.isAdmin ? '✅ 管理者' : '❌ 一般ユーザー',
    method: details.method
  });
  
  console.log('権限詳細:', {
    hasMetadata: details.hasMetadata ? '✅' : '❌',
    hasAdminEmail: details.hasAdminEmail ? '✅' : '❌',
    metadataRole: details.metadataRole || 'なし'
  });
  
  console.log('判定結果:', details.details);
  
  if (user && user.user_metadata) {
    console.log('ユーザーメタデータ:', user.user_metadata);
  }
  
  console.groupEnd();
}

/**
 * 管理者権限チェック設定
 */
export const ADMIN_AUTH_CONFIG = {
  // 管理者メールアドレスリスト（フォールバック用）
  adminEmails: ['yaoki412rad@gmail.com'],
  
  // 必要なメタデータロール
  requiredRole: 'admin',
  
  // デバッグモード
  debugMode: false
};

/**
 * 設定を更新
 * @param {Object} newConfig - 新しい設定
 */
export function updateAdminAuthConfig(newConfig) {
  Object.assign(ADMIN_AUTH_CONFIG, newConfig);
  console.log('[AdminAuth] 設定更新:', ADMIN_AUTH_CONFIG);
} 