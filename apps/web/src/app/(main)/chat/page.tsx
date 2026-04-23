import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConversationList } from "@/components/chat/ConversationList";

export default async function ChatPage() {
  const session = await auth();

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: session!.user!.id } },
    },
    include: {
      participants: {
        include: { user: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const formatted = conversations.map((conv) => ({
    id: conv.id,
    type: conv.type as "DM",
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    participants: conv.participants
      .filter((p) => p.userId !== session!.user!.id)
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

  return (
    <div className="flex h-full">
      <ConversationList conversations={formatted} />
      <div className="hidden flex-1 items-center justify-center lg:flex">
        <div className="text-center">
          <p className="text-6xl font-bold text-accent-primary/20">as.</p>
          <p className="mt-4 text-text-muted">
            Выберите чат или начните новый
          </p>
        </div>
      </div>
    </div>
  );
}
