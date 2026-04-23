import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatView } from "@/components/chat/ChatView";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();
  const userId = session.user.id;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId } },
    },
    include: {
      participants: { include: { user: true } },
    },
  });

  if (!conversation) notFound();

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { sender: true },
  });

  const allConversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const formattedConversations = allConversations.map((conv) => ({
    id: conv.id,
    type: conv.type as "DM",
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    participants: conv.participants
      .filter((p) => p.userId !== userId)
      .map((p) => ({
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
        isOnline: false,
        lastSeenAt: p.user.lastSeenAt.toISOString(),
      })),
    lastMessage: conv.messages[0]
      ? {
          id: conv.messages[0].id,
          conversationId: conv.messages[0].conversationId,
          senderId: conv.messages[0].senderId,
          content: conv.messages[0].content,
          type: conv.messages[0].type as "TEXT",
          createdAt: conv.messages[0].createdAt.toISOString(),
          editedAt: conv.messages[0].editedAt?.toISOString() || null,
        }
      : null,
    unreadCount: 0,
  }));

  const other = conversation.participants.find((p) => p.userId !== userId);

  const formattedMessages = messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    type: m.type as "TEXT",
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() || null,
  }));

  return (
    <div className="flex h-full">
      <div className="hidden lg:block">
        <ConversationList conversations={formattedConversations} />
      </div>
      <ChatView
        conversationId={conversationId}
        currentUserId={userId}
        otherUser={{
          id: other!.user.id,
          username: other!.user.username,
          displayName: other!.user.displayName,
          avatarUrl: other!.user.avatarUrl,
          isOnline: false,
          lastSeenAt: other!.user.lastSeenAt.toISOString(),
        }}
        initialMessages={formattedMessages}
      />
    </div>
  );
}
