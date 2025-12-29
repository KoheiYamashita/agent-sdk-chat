import type { ToolApprovalRequest, ToolApprovalResponse } from '@/types';
import { sessionManager } from '@/lib/claude/session-manager';

type ApprovalResolver = (response: ToolApprovalResponse) => void;

interface PendingApproval {
  resolver: ApprovalResolver;
  sessionId: string;
  request: ToolApprovalRequest;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * ツール実行承認の待機と解決を管理するシングルトン
 * サーバーサイドでSSE接続を跨いで承認リクエストを管理する
 */
class ApprovalManager {
  private pendingApprovals = new Map<string, PendingApproval>();

  /**
   * クライアントからの承認応答を待機
   * @param requestId 一意のリクエストID
   * @param sessionId セッションID（タイムアウト時のinterrupt用）
   * @param request ツール承認リクエスト情報
   * @param timeoutMs タイムアウト時間（デフォルト1時間、0で無制限）
   * @returns 承認応答
   */
  waitForApproval(
    requestId: string,
    sessionId: string,
    request: ToolApprovalRequest,
    timeoutMs = 60 * 60 * 1000
  ): Promise<ToolApprovalResponse> {
    return new Promise((resolve) => {
      const pending: PendingApproval = {
        resolver: resolve,
        sessionId,
        request,
      };

      // タイムアウト処理（0の場合は無制限）
      if (timeoutMs > 0) {
        pending.timeoutId = setTimeout(async () => {
          if (this.pendingApprovals.has(requestId)) {
            this.pendingApprovals.delete(requestId);
            // 停止ボタンと同じ動作: interruptQueryを呼ぶ
            console.log(`[ApprovalManager] Timeout for request ${requestId}, interrupting session ${sessionId}`);
            await sessionManager.interruptQuery(sessionId);
            resolve({ requestId, decision: 'interrupt' });
          }
        }, timeoutMs);
      }

      this.pendingApprovals.set(requestId, pending);
    });
  }

  /**
   * セッションに関連する全ての待機中リクエストを中断として解決
   * @param sessionId セッションID
   * @returns 中断されたリクエストIDの配列
   */
  interruptAllForSession(sessionId: string): string[] {
    const interruptedIds: string[] = [];
    for (const [requestId, pending] of this.pendingApprovals.entries()) {
      if (pending.sessionId === sessionId) {
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
        pending.resolver({ requestId, decision: 'interrupt' });
        interruptedIds.push(requestId);
        this.pendingApprovals.delete(requestId);
      }
    }
    return interruptedIds;
  }

  /**
   * 待機中の承認リクエストを解決
   * @param requestId リクエストID
   * @param response 承認応答
   * @returns 解決に成功したかどうか
   */
  resolveApproval(requestId: string, response: ToolApprovalResponse): boolean {
    const pending = this.pendingApprovals.get(requestId);
    if (pending) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.resolver(response);
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

  /**
   * セッションの待機中承認リクエストを取得
   * @param sessionId セッションID
   * @returns 待機中の承認リクエスト、なければnull
   */
  getPendingForSession(sessionId: string): ToolApprovalRequest | null {
    for (const pending of this.pendingApprovals.values()) {
      if (pending.sessionId === sessionId) {
        return pending.request;
      }
    }
    return null;
  }
}

// シングルトンインスタンス
export const approvalManager = new ApprovalManager();
