import type { ToolApprovalResponse } from '@/types';
import { sessionManager } from '@/lib/claude/session-manager';

type ApprovalResolver = (response: ToolApprovalResponse) => void;

/**
 * ツール実行承認の待機と解決を管理するシングルトン
 * サーバーサイドでSSE接続を跨いで承認リクエストを管理する
 */
class ApprovalManager {
  private pendingApprovals = new Map<string, ApprovalResolver>();

  /**
   * クライアントからの承認応答を待機
   * @param requestId 一意のリクエストID
   * @param sessionId セッションID（タイムアウト時のinterrupt用）
   * @param timeoutMs タイムアウト時間（デフォルト1時間、0で無制限）
   * @returns 承認応答
   */
  waitForApproval(
    requestId: string,
    sessionId: string,
    timeoutMs = 60 * 60 * 1000
  ): Promise<ToolApprovalResponse> {
    return new Promise((resolve) => {
      this.pendingApprovals.set(requestId, resolve);

      // タイムアウト処理（0の場合は無制限）
      if (timeoutMs > 0) {
        setTimeout(async () => {
          if (this.pendingApprovals.has(requestId)) {
            this.pendingApprovals.delete(requestId);
            // 停止ボタンと同じ動作: interruptQueryを呼ぶ
            console.log(`[ApprovalManager] Timeout for request ${requestId}, interrupting session ${sessionId}`);
            await sessionManager.interruptQuery(sessionId);
            resolve({ requestId, decision: 'interrupt' });
          }
        }, timeoutMs);
      }
    });
  }

  /**
   * セッションに関連する全ての待機中リクエストを中断として解決
   * @param sessionId セッションID
   * @returns 中断されたリクエストIDの配列
   */
  interruptAllForSession(sessionId: string): string[] {
    const interruptedIds: string[] = [];
    // Note: 現在の実装ではsessionIdとrequestIdの対応を保持していないため、
    // 全ての待機中リクエストを中断する（単一セッション想定）
    for (const [requestId, resolver] of this.pendingApprovals.entries()) {
      resolver({ requestId, decision: 'interrupt' });
      interruptedIds.push(requestId);
    }
    this.pendingApprovals.clear();
    return interruptedIds;
  }

  /**
   * 待機中の承認リクエストを解決
   * @param requestId リクエストID
   * @param response 承認応答
   * @returns 解決に成功したかどうか
   */
  resolveApproval(requestId: string, response: ToolApprovalResponse): boolean {
    const resolver = this.pendingApprovals.get(requestId);
    if (resolver) {
      resolver(response);
      this.pendingApprovals.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * 待機中の承認リクエスト数を取得
   */
  getPendingCount(): number {
    return this.pendingApprovals.size;
  }

  /**
   * 特定のリクエストが待機中かどうか確認
   */
  isPending(requestId: string): boolean {
    return this.pendingApprovals.has(requestId);
  }
}

// シングルトンインスタンス
export const approvalManager = new ApprovalManager();
