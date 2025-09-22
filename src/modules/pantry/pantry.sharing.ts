import { customAlphabet } from "nanoid";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/shared/database/connection";
import { users, pantryFollowers } from "@/shared/database/schema";
import { NotFoundError, BadRequestError } from "@/shared/utils/errors";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
export async function getCurrentPantry(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      primaryPantryOwnerId: true,
      pantryInviteCode: true,
    },
  });

  if (!user) {
    throw new NotFoundError("Người dùng không tồn tại");
  }

  if (!user.primaryPantryOwnerId) {
    return {
      type: "personal" as const,
      ownerId: user.id,
      ownerName: user.name,
      inviteCode: user.pantryInviteCode,
      isOwner: true,
    };
  }

  const pantryOwner = await db.query.users.findFirst({
    where: eq(users.id, user.primaryPantryOwnerId),
    columns: {
      id: true,
      name: true,
      pantryInviteCode: true,
    },
  });

  if (!pantryOwner) {
    await db
      .update(users)
      .set({ primaryPantryOwnerId: null })
      .where(eq(users.id, userId));

    return {
      type: "personal" as const,
      ownerId: user.id,
      ownerName: user.name,
      inviteCode: user.pantryInviteCode,
      isOwner: true,
    };
  }

  return {
    type: "shared" as const,
    ownerId: pantryOwner.id,
    ownerName: pantryOwner.name,
    inviteCode: pantryOwner.pantryInviteCode,
    isOwner: false,
  };
}

export async function leavePantry(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      primaryPantryOwnerId: true,
    },
  });

  if (!user) {
    throw new NotFoundError("Người dùng không tồn tại");
  }

  if (!user.primaryPantryOwnerId) {
    throw new BadRequestError("Bạn đang sử dụng kho cá nhân");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(pantryFollowers)
      .where(eq(pantryFollowers.followerId, userId));

    await tx
      .update(users)
      .set({ primaryPantryOwnerId: null })
      .where(eq(users.id, userId));
  });

  return {
    message: "Đã rời khỏi kho chia sẻ, quay về kho cá nhân",
  };
}

export async function canUserAddToPantry(
  userId: string,
  pantryOwnerId: string,
) {
  if (userId === pantryOwnerId) {
    return { canAdd: true, isOwner: true };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      primaryPantryOwnerId: true,
    },
  });

  return {
    canAdd: user?.primaryPantryOwnerId === pantryOwnerId,
    isOwner: false,
  };
}

export async function getInviteCode(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      pantryInviteCode: true,
      name: true,
    },
  });

  if (!user) {
    throw new NotFoundError("Người dùng không tồn tại");
  }

  if (user.pantryInviteCode) {
    return {
      code: user.pantryInviteCode,
      ownerName: user.name,
    };
  }

  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    code = generateCode();

    const existing = await db.query.users.findFirst({
      where: eq(users.pantryInviteCode, code),
    });

    if (!existing) {
      await db
        .update(users)
        .set({ pantryInviteCode: code })
        .where(eq(users.id, userId));

      return {
        code,
        ownerName: user.name,
      };
    }

    attempts++;
  }

  throw new Error("Không thể tạo mã mời. Vui lòng thử lại.");
}

export async function joinPantryByCode(code: string, followerId: string) {
  const normalizedCode = code.toUpperCase().trim();
  const pantryOwner = await db.query.users.findFirst({
    where: eq(users.pantryInviteCode, normalizedCode),
    columns: {
      id: true,
      name: true,
    },
  });

  if (!pantryOwner) {
    throw new NotFoundError("Mã mời không hợp lệ");
  }

  if (pantryOwner.id === followerId) {
    throw new BadRequestError("Đây là mã mời của bạn");
  }

  const existingFollow = await db.query.pantryFollowers.findFirst({
    where: (followers, { and, eq }) =>
      and(
        eq(followers.pantryOwnerId, pantryOwner.id),
        eq(followers.followerId, followerId),
      ),
  });

  if (existingFollow) {
    throw new BadRequestError(`Bạn đã theo dõi kho của ${pantryOwner.name}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(pantryFollowers)
      .where(eq(pantryFollowers.followerId, followerId));

    await tx.insert(pantryFollowers).values({
      pantryOwnerId: pantryOwner.id,
      followerId,
    });

    await tx
      .update(users)
      .set({ primaryPantryOwnerId: pantryOwner.id })
      .where(eq(users.id, followerId));
  });

  return {
    message: `Đã tham gia kho của ${pantryOwner.name}`,
    pantryOwner: {
      id: pantryOwner.id,
      name: pantryOwner.name,
    },
  };
}

export async function getMyFollowers(userId: string) {
  const result = await db
    .select({
      followerId: pantryFollowers.followerId,
      followerName: users.name,
      followerAvatar: users.avatarUrl,
      followedAt: pantryFollowers.followedAt,
    })
    .from(pantryFollowers)
    .innerJoin(users, eq(pantryFollowers.followerId, users.id))
    .where(eq(pantryFollowers.pantryOwnerId, userId))
    .orderBy(desc(pantryFollowers.followedAt));

  return result;
}

export async function removeFollower(ownerId: string, followerId: string) {
  const result = await db
    .delete(pantryFollowers)
    .where(
      and(
        eq(pantryFollowers.pantryOwnerId, ownerId),
        eq(pantryFollowers.followerId, followerId),
      ),
    )
    .returning({ deleted: pantryFollowers.followerId });

  if (!result.length) {
    throw new NotFoundError("Người dùng không theo dõi kho của bạn");
  }

  return { message: "Đã xóa người theo dõi" };
}
