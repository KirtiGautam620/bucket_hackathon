#!/bin/bash
# verification.sh

# 1. Create a dummy lead
echo "Creating dummy lead..."
LEAD_ID="test-lead-$(date +%s)"
response=$(curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$LEAD_ID\", \"name\": \"Test User\", \"createdAt\": $(date +%s)}")

echo "Create Lead Response: $response"

# 2. Create a dummy image file
echo "Creating dummy image..."
echo "fake image content" > test_image.jpg

# 3. Upload the image
echo "Uploading image..."
upload_response=$(curl -s -X POST http://localhost:3000/api/upload-image \
  -F "leadId=$LEAD_ID" \
  -F "image=@test_image.jpg;type=image/jpeg")

echo "Upload Image Response: $upload_response"

# 4. Cleanup
rm test_image.jpg
