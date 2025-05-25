/**
 * レッスン状況管理API
 * GET: 現在の状況を取得
 * POST: 状況を更新
 */

export async function onRequestGet(context) {
  try {
    const { env } = context;
    
    // KVストレージから現在の状況を取得
    const statusData = await env.RBS_KV.get('lesson_status');
    
    if (!statusData) {
      // デフォルトの状況を返す
      const defaultStatus = {
        overallStatus: 'scheduled',
        overallNote: '',
        lessons: [
          {
            timeSlot: '17:00-17:50',
            courseName: 'ベーシックコース（年長〜小3）',
            status: 'scheduled',
            note: ''
          },
          {
            timeSlot: '18:00-18:50',
            courseName: 'アドバンスコース（小4〜小6）',
            status: 'scheduled',
            note: ''
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      
      return Response.json(defaultStatus);
    }
    
    return Response.json(JSON.parse(statusData));
    
  } catch (error) {
    console.error('Status GET error:', error);
    return Response.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // 認証チェック（簡易版）
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      // 認証ヘッダーがない場合はボディから認証情報を確認
      const body = await request.json();
      
      // 管理画面からの直接アクセスの場合は認証をスキップ
      // 実際の運用では適切な認証を実装してください
    }
    
    const statusData = await request.json();
    
    // データの検証
    if (!statusData.overallStatus || !Array.isArray(statusData.lessons)) {
      return Response.json(
        { error: '無効なデータ形式です' },
        { status: 400 }
      );
    }
    
    // タイムスタンプを追加
    statusData.lastUpdated = new Date().toISOString();
    
    // KVストレージに保存
    await env.RBS_KV.put('lesson_status', JSON.stringify(statusData));
    
    return Response.json({
      success: true,
      message: 'レッスン状況が更新されました',
      data: statusData
    });
    
  } catch (error) {
    console.error('Status POST error:', error);
    return Response.json(
      { error: 'データの保存に失敗しました' },
      { status: 500 }
    );
  }
} 