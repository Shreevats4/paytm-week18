"use server"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { db } from "@repo/db/client";

export async function p2pTransfer(to: string, amount: number) {
  const session = await getServerSession(authOptions);
  const from = session?.user?.id;

  if (!from) {
    return {
      message: "Error while sending",
    };
  }

  // optional: basic validation
  if (!amount || amount <= 0) {
    return {
      message: "Invalid amount",
    };
  }

  const toUser = await db.user.findFirst({
    where: {
      number: to,
    },
  });

  if (!toUser) {
    return {
      message: "User not found",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      // Get sender balance
      const fromBalance = await tx.balance.findUnique({
        where: { userId: Number(from) },
      });

      if (!fromBalance || fromBalance.amount < amount) {
        throw new Error("Insufficient funds");
      }

      // Decrement sender balance
      await tx.balance.update({
        where: { userId: Number(from) },
        data: { amount: { decrement: amount } },
      });

      // Increment receiver balance (create row if it doesn't exist)
      await tx.balance.upsert({
        where: { userId: toUser.id },
        update: {
          amount: { increment: amount },
        },
        create: {
          userId: toUser.id,
          amount: amount,
          locked: 0, // adjust default if your schema needs something else
        },
      });
    });

    return {
      message: "Transfer successful",
    };
  } catch (e: any) {
    console.error(e);
    return {
      message: e?.message || "Transfer failed",
    };
  }
}
