import { ChatContainer } from '@/components/chat';

interface SessionPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;
  return <ChatContainer sessionId={sessionId} />;
}
