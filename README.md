# Overview
Two microservices(Transactions, Ledgers) were designed in this assigment. In this assigment, I simulated how transactions are processed in blockchain environment for simple asset transfer transactions.

These two microservices communicates each other using RabbitMQ to process the transactions securely. 
1. Transactions Service gets the transaction requests and sends it to Ledger Service over TRANSACTIONS_QUEUE to save them into the shared ledger by setting the inital transaction status as Pending.
2. The Ledger Service listens to TRANSACTIONS_QUEUE and if new transaction comes calls the "Smart Contract(implemented as random sleep here)" and get the transaction status(Completed or Cancelled).
3. Once the Ledger Service gets the update from "Smart Contract", sends the update status to Transactions Service iver STATUS_QUEUE.
4. Transaction Service listens to STATUS_QUEUE, and once any update observed, update its own properties to return updated status to users.

# Enviroment
## OS
Ubuntu 20.04
## Node
Node v20.18.2
## Docker
Docker

# Setup & Run
### Run RabbitMQ DB by docker
`docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management`
### Create .env file
Copy the .env.example file to .env and set the environment variables. RABBITMQ_URL should be localhost here.
### Run Transaction Service
1. Navigate to the directory
`cd ./transaction-services`
2. Install dependencies
`npm install`
3. Run the service
`npm run start`
### Run Transaction Service
1. Navigate to the directory
`cd ./ledger-services`
2. Install dependencies
`npm install`
3. Run the service
`npm run start`
### Test
In the root directory, run test.sh file
`. test.sh`

# Summary
The main challenge is how to communicate between 2 microservices for scalable and secure communication.
To deal with inter-service communication's asynchronous aspect, which requires each service does not directly affects other service, I considered messae queue systems.
Among those Redis, RabbitMQ, Kafka etc. I selected RabbitMQ which would be great for complex messaging patterns, later in the complete project.
