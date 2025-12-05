import {db} from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { OnRampTransactions } from "../../../components/OnRampTransaction";
import { P2PTransactions } from "../../../components/P2PTransactions";

async function getOnRampTransactions() {
    const session = await getServerSession(authOptions);
    const txns = await db.onRampTransaction.findMany({
        where: {
            userId: Number(session?.user?.id)
        },
        orderBy: {
            startTime: 'desc'
        }
    });
    return txns.map(t => ({
        time: t.startTime,
        amount: t.amount,
        status: t.status,
        provider: t.provider
    }))
}

async function getP2PTransactions() {
    const session = await getServerSession(authOptions);
    const txns = await db.p2pTransfer.findMany({
        where: {
            OR: [
                { fromUserId: Number(session?.user?.id) },
                { toUserId: Number(session?.user?.id) }
            ]
        },
        orderBy: {
            timestamp: 'desc'
        }
    });

    return txns.map(t => ({
        time: t.timestamp,
        amount: t.amount,
        // Using the literal type cast to fix the TypeScript error
        type: (t.fromUserId === Number(session?.user?.id) ? "Sent" : "Received") as "Sent" | "Received"
    }));
}

export default async function() {
    const onRampTransactions = await getOnRampTransactions();
    const p2pTransactions = await getP2PTransactions();

    return <div className="w-full">
        <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">
            Transactions
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
            <div>
                <h2 className="text-2xl font-bold mb-4">Wallet Funding</h2>
                <OnRampTransactions transactions={onRampTransactions} />
            </div>
            <div>
                <h2 className="text-2xl font-bold mb-4">P2P Transfers</h2>
                <P2PTransactions transactions={p2pTransactions} />
            </div>
        </div>
    </div>
}