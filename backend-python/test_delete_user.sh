#!/bin/bash
# Test script for DELETE /api/admin/delete-user endpoint
# Usage: ./test_delete_user.sh user@example.com

EMAIL=${1:-"test@example.com"}
ADMIN_SECRET="coiledspring_dev"

echo "======================================"
echo "Testing DELETE /api/admin/delete-user"
echo "======================================"
echo ""
echo "Target email: $EMAIL"
echo "Admin secret: $ADMIN_SECRET"
echo ""

curl -X DELETE "http://localhost:8000/api/admin/delete-user?email=$EMAIL" \
  -H "X-Admin-Secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo ""
echo "======================================"
echo "Test complete"
echo "======================================"
