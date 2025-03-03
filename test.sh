#!/bin/bash  

API_URL="http://localhost:3001/transaction"  
JSON_DATA='{"sender":"Alice","receiver":"Bob","amount":100}'   
IDs=()  

# Send POST requests and collect IDs  
for i in {1..10}; do  
    RESPONSE=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "$JSON_DATA")  
    ID=$(echo "$RESPONSE" | jq -r '.id')  # Assuming the response contains an 'id' field  
    IDs+=("$ID")  
done
echo "10 transactions sent"

# Sleep for 10 seconds  
sleep 10  

# Check the status for each ID in two services to validate the communication
transactions=$(echo "$LEGEND_RESPONSE" | jq -c '.transactions[]')  
for ID in "${IDs[@]}"; do  
    URL="http://localhost:3001/status/$ID"  
    RESPONSE=$(curl -s -X GET "$URL")  
    TRANSACTION_STATUS=$(echo "$RESPONSE" | jq -r '.status')
    URL="http://localhost:3002/transactions/$ID"
    RESPONSE=$(curl -s -X GET "$URL")  
    LEDGER_STATUS=$(echo "$RESPONSE" | jq -r '.status')
    if [ "$LEDGER_STATUS" = "$TRANSACTION_STATUS" ]; then  
        echo -e "\e[32mTest Passed\e[0m for $ID"  
    else
        echo -e "\e[31mTest Failed\e[0m for $ID"
    fi
done  
