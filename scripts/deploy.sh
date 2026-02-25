#!/bin/bash
cd /home/ubuntu/riseup-backend || exit
source /home/ubuntu/.nvm/nvm.sh
npm install
APP_NAME="riseup-backend"
if pm2 describe "$APP_NAME" > /dev/null; then
  echo "Restarting $APP_NAME..."
  pm2 restart "$APP_NAME" --update-env
else
  echo "Starting $APP_NAME..."
  pm2 start npm --name "$APP_NAME" -- run start
fi
