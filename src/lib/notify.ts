import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/enums";

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    },
  });
}

export async function notifyMany(
  userIds: string[],
  params: Omit<Parameters<typeof notify>[0], "userId">
) {
  await Promise.all(userIds.map((userId) => notify({ ...params, userId })));
}
