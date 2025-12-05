import { SendCard } from "../../../components/SendCard";
import { P2PTransactions } from "../../../components/P2PTransactions"; // Fixed: Added ../ to match the correct path
import { db } from "@repo/db/client"; 
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

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
        type: t.fromUserId === Number(session?.user?.id) ? "Sent" : "Received"
    } as const));
}

export default async function() {
    const transactions = await getP2PTransactions();

    return <div className="w-full">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
            <div>
                <SendCard />
            </div>
            <div>
                <P2PTransactions transactions={transactions} />
            </div>
        </div>
    </div>
}