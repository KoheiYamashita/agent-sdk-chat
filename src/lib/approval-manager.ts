import type { ToolApprovalResponse } from '@/types';

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
   * @param timeoutMs タイムアウト時間（デフォルト5分）
   * @returns 承認応答
   */
  waitForApproval(requestId: string, timeoutMs = 5 * 60 * 1000): Promise<ToolApprovalResponse> {
    return new Promise((resolve) => {
      this.pendingApprovals.set(requestId, resolve);

      // タイムアウト処理
      setTimeout(() => {
        if (this.pendingApprovals.has(requestId)) {
          this.pendingApprovals.delete(requestId);
          resolve({ requestId, decision: 'deny' });
        }
      }, timeoutMs);
    });
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
