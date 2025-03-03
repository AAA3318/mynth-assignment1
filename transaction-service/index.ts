import express, { Request, Response } from "express";
import amqp from "amqplib";
import crypto from "crypto";
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

let transactionStatus: Record<string, string> = {};

/*
  Function when transaction status updated
*/
const onUpdateTransactionStatus = (id: string, status: string): void => {
  transactionStatus[id] = status;
  console.log(`Transaction ${id}: ${status}`);
};
/*
  This function sends transaction details to ledger service
*/
const sendTransaction = async (transaction: Transaction): Promise<void> => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(TRANSACTION_QUEUE, { durable: true });

    channel.sendToQueue(
      TRANSACTION_QUEUE,
      Buffer.from(JSON.stringify(transaction))
    );
    console.log("Transaction Sent.", transaction);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
};

/*
  Receives status updates of each transaction
*/
const receiveStatusUpdates = async (): Promise<void> => {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(STATUS_QUEUE, { durable: true });
  console.log("Listening for status updates...");
  channel.consume(STATUS_QUEUE, (msg) => {
    if (msg !== null) {
      const { id, status } = JSON.parse(msg.content.toString());
      onUpdateTransactionStatus(id, status);
      channel.ack(msg);
    }
  });
};
receiveStatusUpdates().catch(console.error);

/*
  POST 
   {
      sender: "John",
      receiver: "Bob",
      amount: 80
   }
*/
app.post("/transaction", async (req: Request, res: Response) => {
  const transactionId = crypto
    .createHash("sha256")
    .update(JSON.stringify({ ...req.body, timestamp: Date.now() }))
    .digest("hex");

  const transaction: Transaction = {
    ...req.body,
    id: transactionId,
    timestamp: Date.now(),
    status: "Pending",
  };

  transactionStatus[transaction.id] = "Pending";

  await sendTransaction(transaction);
  res.json(transaction);
});

/*
  GET
  id: string
*/
app.get("/status/:id", (req: Request, res: Response) => {
  res.json({ status: transactionStatus[parseInt(req.params.id)] || "Unknown" });
});

app.listen(3001, () => {
  console.log("Transaction Service running on port 3001");
});
