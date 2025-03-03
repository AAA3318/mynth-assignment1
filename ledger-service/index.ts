import express, { Request, Response } from "express";
import amqp from "amqplib";
import dotenv from "dotenv";
import path from "path";

const app = express();
app.use(express.json());

dotenv.config({ path: path.join(__dirname, "../.env") });
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const TRANSACTION_QUEUE = process.env.TRANSACTION_QUEUE || "transactions";
const STATUS_QUEUE = process.env.STATUS_QUEUE || "status";

type Transaction = {
  id: number;
  sender: string;
  receiver: string;
  amount: number;
  status: string;
  timestamp: Date;
};

let processedTransactions: Transaction[] = [];

/*
  This function is simulating of calling smart contract
  It waits for random time from 2s ~ 7s
  Returns random state of transaction 80% Success
*/
const processTransaction = async (
  transaction: Transaction
): Promise<string> => {
  console.log("Processing transaction:", transaction.id);
  await new Promise((res) => setTimeout(res, Math.random() * 5000 + 2000));
  const status: string = Math.random() < 0.8 ? "Completed" : "Cancelled";
  console.log(`${transaction.id}: ${status}`);
  return status;
};

/*
  This function updates transaction status to transaction-service
*/
const updateStatus = async (id: string, status: string) => {
  // Create the channel
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(STATUS_QUEUE, { durable: true });

  channel.sendToQueue(
    STATUS_QUEUE,
    Buffer.from(JSON.stringify({ id, status }))
  );
  await channel.close();
  await connection.close();
};

/*
  This function receive transactions from transaction-service
*/
const recevieTransactions = async () => {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(TRANSACTION_QUEUE, { durable: true });
  console.log("Ledger Service listening for transactions...");
  channel.consume(TRANSACTION_QUEUE, async (msg) => {
    if (msg !== null) {
      const transaction = JSON.parse(msg.content.toString());
      const status: string = await processTransaction(transaction);
      transaction.status = status;
      processedTransactions.push(transaction);
      await updateStatus(transaction.id, status);
      channel.ack(msg);
    }
  });
};
recevieTransactions().catch(console.error);

/*
  API Endpoint for getting all transaction status
*/
app.get("/transactions", (req: Request, res: Response) => {
  res.json({ transactions: processedTransactions });
});

app.listen(3002, () => {
  console.log("Ledger Service running on port 3002");
});
