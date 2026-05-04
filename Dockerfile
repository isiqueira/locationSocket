FROM node:20-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install --omit=dev

COPY --chown=node:node . .

USER node

EXPOSE 4000

CMD [ "node", "src/app.js" ]
