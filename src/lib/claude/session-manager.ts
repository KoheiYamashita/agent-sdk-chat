/**
 * セッションマネージャー
 *
 * アクティブなSDK Queryオブジェクトを管理し、
 * セッションの中断機能を提供します。
 */

import type { Query } from '@anthropic-ai/claude-agent-sdk';

class SessionManager {
  private activeQueries = new Map<string, Query>();

  /**
   * Queryオブジェクトを登録
   */
  registerQuery(sessionId: string, query: Query): void {
    if (this.activeQueries.has(sessionId)) {
      console.warn(
        `[SessionManager] Session ${sessionId} already has an active query, will be replaced`
      );
    }
    this.activeQueries.set(sessionId, query);
    console.log(
      `[SessionManager] Registered query for session ${sessionId}. Active queries: ${this.activeQueries.size}`
    );
  }

  /**
   * Queryオブジェクトを登録解除
   */
  unregisterQuery(sessionId: string): void {
    const deleted = this.activeQueries.delete(sessionId);
    if (deleted) {
      console.log(
        `[SessionManager] Unregistered query for session ${sessionId}. Active queries: ${this.activeQueries.size}`
      );
    }
  }

  /**
   * クエリを中断
   */
  async interruptQuery(sessionId: string): Promise<boolean> {
    const query = this.activeQueries.get(sessionId);
    if (!query) {
      console.warn(`[SessionManager] No active query found for session ${sessionId}`);
      return false;
    }

    try {
      console.log(`[SessionManager] Interrupting query for session ${sessionId}...`);
      await query.interrupt();
      console.log(`[SessionManager] Query interrupted for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`[SessionManager] Failed to interrupt query for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * セッションにアクティブなクエリがあるか確認
   */
  hasActiveQuery(sessionId: string): boolean {
    return this.activeQueries.has(sessionId);
  }

  /**
   * アクティブなクエリ数を取得
   */
  getActiveQueryCount(): number {
    return this.activeQueries.size;
  }

  /**
   * 全てのアクティブなセッションIDを取得
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeQueries.keys());
  }
}

// シングルトンインスタンスをエクスポート
export const sessionManager = new SessionManager();
